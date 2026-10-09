import { SVG, Text, VStack, Widget } from 'scripting'
import { chinaToday, fortnight, nextChinaMidnight, dayInfo, MIN_YEAR, MAX_YEAR } from './calendar'
import { loadHoliday, scriptingHolidayIO } from './holidays'
import { calendarSVG, compactSVG } from './render'

async function run() {
  const today = chinaToday()
  const range = fortnight(today)
  if (range.some(d => d.year < MIN_YEAR || d.year > MAX_YEAR)) {
    Widget.present(<Text widgetBackground="#28282a">农历支持1901—2099年；当前双周超出边界</Text>)
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
  const width = Math.max(126, size.width - 32)
  const height = Widget.family === 'systemLarge' ? 158 : Math.max(120, size.height - 32)
  const small = Widget.family === 'systemSmall'
  const code = small ? compactSVG(today, holidays) : calendarSVG(today, holidays, width, height)
  Widget.present(<VStack
    frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}
    widgetBackground="#28282a"
  >
    <SVG code={code} resizable renderingMode="original" antialiased
      frame={{ width, height: small ? Math.min(width, height) : height }} />
  </VStack>, { reloadPolicy: { policy: 'after', date: nextChinaMidnight() } })
}
run()
