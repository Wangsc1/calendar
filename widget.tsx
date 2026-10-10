import { HStack, Spacer, SVG, Text, VStack, ZStack, Widget, gradient } from 'scripting'
import { chinaToday, layoutDates, nextChinaMidnight, dayInfo, MIN_YEAR, MAX_YEAR, readAppearance, widgetLayout, WEEKDAY_NAMES } from './calendar'
import { holidayOn, loadHoliday, scriptingHolidayIO } from './holidays'
import { DateLabel, lightSVG, renderCalendarSVG } from './render'

async function run() {
  const today = chinaToday(), settings = readAppearance(), mode = widgetLayout(Widget.family)
  const range = layoutDates(today, mode, settings.weekStart)
  if (range.some(d => d.year < MIN_YEAR || d.year > MAX_YEAR)) {
    Widget.present(<Text widgetBackground={{ light: '#ffffff', dark: '#28282a' }}>农历支持1901—2099年；当前范围超出边界</Text>)
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
      padding={{ top: Math.round(inset * 0.8), bottom: Math.round(inset * 0.8), leading: inset, trailing: inset }}
      frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'leading' }}
      widgetBackground={{ light: gradient('linear', { colors: ['#ffffff', '#f2f2f4'], startPoint: 'top', endPoint: 'bottom' }), dark: gradient('linear', { colors: ['#363636', '#262626'], startPoint: 'top', endPoint: 'bottom' }) }}>
      <Spacer />
      <HStack spacing={0}>
        <Text font={20} fontWeight="medium" foregroundStyle="#e74748" lineLimit={1}>{`周${WEEKDAY_NAMES[i.weekday]}`}</Text>
        <Spacer />
        {mark ? <Text font={settings.holidayStyle === 'dot' ? 10 : 12} fontWeight="bold" foregroundStyle={markColor}>
          {settings.holidayStyle === 'dot' ? '●' : mark.isOffDay ? '休' : '班'}</Text> : null}
      </HStack>
      <Text font={76} fontWeight="regular" foregroundStyle={{ light: '#1c1c1e', dark: '#ffffff' }} lineLimit={1} minScaleFactor={0.7}
        frame={{ height: 55 }} padding={{ top: 4, bottom: 4 }}>{String(today.day)}</Text>
      <VStack alignment="leading" spacing={0}>
        <Text font={19} foregroundStyle={{ light: '#1c1c1e', dark: '#ffffff' }} lineLimit={1} minScaleFactor={0.75}>{`${today.year}年${today.month}月`}</Text>
        <Text font={19} foregroundStyle={{ light: '#1c1c1e', dark: '#ffffff' }} lineLimit={1} minScaleFactor={0.75}>{yearInfo}</Text>
        <Text font={19} foregroundStyle={{ light: '#1c1c1e', dark: '#ffffff' }} lineLimit={1} minScaleFactor={0.75}>{lunarInfo}</Text>
      </VStack>
      <Spacer />
    </VStack>, { reloadPolicy: { policy: 'after', date: nextChinaMidnight() } })
    return
  }
  // 中号上下外边距由各16点缩为各12点，多出的高度分给日期行距。
  const width = Math.max(110, size.width - 32), height = Math.max(110, size.height - (mode === 'week' ? 24 : 32))
  const labels: DateLabel[] = []
  const code = renderCalendarSVG(today, holidays, mode, settings, width, height, labels)
  // SVG坐标与ZStack同尺寸；文字基线换算为中心点（系统数字字形约0.35倍字号）。
  const dayColor = (c: string) => c === '#ffffff' ? '#ffffff'
    : c === '#626269' ? { light: '#c7c7cc', dark: '#626269' }
    : c === '#94949a' ? { light: '#8e8e93', dark: '#94949a' }
    : { light: '#1c1c1e', dark: '#f7f7f8' }
  Widget.present(<VStack frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} widgetBackground={{ light: '#ffffff', dark: '#28282a' }}>
    <ZStack frame={{ width, height }}>
      <SVG code={{ light: lightSVG(code), dark: code }} resizable scaleToFit renderingMode="original" antialiased frame={{ width, height }} />
      {labels.map(l => <Text font={l.size} fontWeight="semibold" foregroundStyle={dayColor(l.color)} lineLimit={1}
        fixedSize position={{ x: l.x, y: l.y - l.size * .35 }}>{l.text}</Text>)}
    </ZStack>
  </VStack>, { reloadPolicy: { policy: 'after', date: nextChinaMidnight() } })
}
run()
