import { SVG, Text, VStack, Widget } from 'scripting'
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
  const width = Math.max(110, size.width - 32), height = Math.max(110, size.height - 32)
  const code = renderCalendarSVG(today, holidays, mode, settings, width, height)
  Widget.present(<VStack frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} widgetBackground={mode === 'day' ? '#1c1c1e' : '#28282a'}>
    <SVG code={code} resizable scaleToFit renderingMode="original" antialiased frame={{ width, height }} />
  </VStack>, { reloadPolicy: { policy: 'after', date: nextChinaMidnight() } })
}
run()
