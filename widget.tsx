import { SVG, Text, VStack, Widget, gradient } from 'scripting'
import { chinaToday, layoutDates, nextChinaMidnight, dayInfo, MIN_YEAR, MAX_YEAR, readAppearance, widgetLayout } from './calendar'
import { loadHoliday, scriptingHolidayIO } from './holidays'
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
    // 官方displaySize为完整组件points；不再减32，固定frame避免二次缩小。
    // 文档没有WidgetKit contentMarginsDisabled接口；仅使用已公开的safe-area修饰符。
    const width = size.width, height = size.height
    Widget.present(<VStack spacing={0} padding={0} ignoresSafeArea
      frame={{ width, height }}
      widgetBackground={gradient('linear', { colors: ['#363636', '#262626'], startPoint: 'top', endPoint: 'bottom' })}>
      <SVG code={renderCalendarSVG(today, holidays, mode, settings, width, height)}
        resizable scaleToFit renderingMode="original" antialiased frame={{ width, height }} />
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
