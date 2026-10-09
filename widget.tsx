import { HStack, Spacer, SVG, Text, VStack, Widget, gradient } from 'scripting'
import { chinaToday, layoutDates, nextChinaMidnight, dayInfo, MIN_YEAR, MAX_YEAR, readAppearance, widgetLayout, WEEKDAY_NAMES } from './calendar'
import { holidayOn, loadHoliday, scriptingHolidayIO } from './holidays'
import { renderCalendarSVG } from './render'

async function run() {
  const today = chinaToday(), settings = readAppearance(), mode = widgetLayout(Widget.family)
  const range = layoutDates(today, mode, settings.weekStart)
  if (range.some(d => d.year < MIN_YEAR || d.year > MAX_YEAR)) {
    Widget.present(<Text widgetBackground="#28282a">农历支持1901—2099年；当前范围超出边界</Text>)
    return
  }
  const years = Array.from(new Set(range.map(d => d.year)))
  const holidays = await Promise.all(years.map(y => loadHoliday(y, scriptingHolidayIO)))
  if (Widget.family.startsWith('accessory')) {
    const i = dayInfo(today)
    Widget.present(<Text font={11}>{`${today.month}月${today.day}日 ${i.label} ${i.footer}`}</Text>, {
      reloadPolicy: { policy: 'after', date: nextChinaMidnight() },
    })
    return
  }
  const size = Widget.displaySize
  if (mode === 'day') {
    // 小号使用原生文字和系统小组件边距，避免SVG在内容区内被二次缩放。
    const i = dayInfo(today), mark = holidayOn(today, holidays)
    const [yearInfo, lunarInfo] = i.footer.split(' ')
    const markColor = mark?.isOffDay ? '#55a9ff' : '#ffad52'
    // 预览实测内容贴边，按右侧参考卡约10.2%内边距显式留白。
    const inset = Math.round(Math.min(size.width, size.height) * 0.102)
    Widget.present(<VStack alignment="leading" spacing={0}
      padding={{ top: inset, bottom: inset, leading: inset, trailing: inset }}
      frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'leading' }}
      widgetBackground={gradient('linear', { colors: ['#363636', '#262626'], startPoint: 'top', endPoint: 'bottom' })}>
      <HStack spacing={0}>
        <Text font={18} fontWeight="medium" foregroundStyle="#e74748" lineLimit={1}>{`周${WEEKDAY_NAMES[i.weekday]}`}</Text>
        <Spacer />
        {mark ? <Text font={settings.holidayStyle === 'dot' ? 10 : 12} fontWeight="bold" foregroundStyle={markColor}>
          {settings.holidayStyle === 'dot' ? '●' : mark.isOffDay ? '休' : '班'}</Text> : null}
      </HStack>
      <Spacer />
      <Text font={51} fontWeight="regular" foregroundStyle="#ffffff" lineLimit={1} minScaleFactor={0.7}>{String(today.day)}</Text>
      <Spacer />
      <VStack alignment="leading" spacing={2}>
        <Text font={14} foregroundStyle="#ffffff" lineLimit={1} minScaleFactor={0.75}>{`${today.year}年${today.month}月`}</Text>
        <Text font={14} foregroundStyle="#ffffff" lineLimit={1} minScaleFactor={0.75}>{yearInfo}</Text>
        <Text font={14} foregroundStyle="#ffffff" lineLimit={1} minScaleFactor={0.75}>{lunarInfo}</Text>
      </VStack>
    </VStack>, { reloadPolicy: { policy: 'after', date: nextChinaMidnight() } })
    return
  }
  const width = Math.max(110, size.width - 32), height = Math.max(110, size.height - 32)
  const code = renderCalendarSVG(today, holidays, mode, settings, width, height)
  Widget.present(<VStack frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} widgetBackground="#28282a">
    <SVG code={code} resizable scaleToFit renderingMode="original" antialiased frame={{ width, height }} />
  </VStack>, { reloadPolicy: { policy: 'after', date: nextChinaMidnight() } })
}
run()
