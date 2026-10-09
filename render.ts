import { CivilDate, dayInfo, dateKey, layoutDates, weekOrder, WEEKDAY_NAMES, isWeekend, Appearance, LayoutMode, defaultAppearance, MIN_YEAR, MAX_YEAR } from './calendar'
import { HolidayResult, holidayOn } from './holidays'
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
function text(x: number, y: number, s: string, size: number, color = '#f7f7f8', weight = 400): string {
  return `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-weight="${weight}" fill="${color}">${esc(s)}</text>`
}
function fit(size: number, s: string, width: number): number {
  // 以中文全宽估计上限，避免长月份/节日/底部信息挤出真实小组件容器。
  const units = Array.from(s).reduce((n, c) => n + (c.charCodeAt(0) > 255 ? 1 : .6), 0)
  return Math.min(size, width / Math.max(1, units))
}
function todayShape(x: number, y: number, radius: number, settings: Appearance): string {
  return settings.todayShape === 'circle'
    ? `<circle data-role="today" cx="${x}" cy="${y}" r="${radius}" fill="#e74748"/>`
    : `<rect data-role="today" x="${x - radius}" y="${y - radius}" width="${radius * 2}" height="${radius * 2}" rx="5" fill="#e74748"/>`
}
function badge(d: CivilDate, holidays: HolidayResult[], x: number, y: number, settings: Appearance): string {
  const day = holidayOn(d, holidays)
  if (!day) return ''
  const color = day.isOffDay ? '#55a9ff' : '#ffad52'
  return settings.holidayStyle === 'dot'
    ? `<circle data-role="holiday" cx="${x}" cy="${y - 3}" r="2.5" fill="${color}"/>`
    : text(x, y, day.isOffDay ? '休' : '班', 9, color, 700)
}
export function renderCalendarSVG(today: CivilDate, holidays: HolidayResult[], mode: LayoutMode, settings: Appearance, width: number, height: number): string {
  const w = Math.max(110, width), h = Math.max(110, height), f = settings.fonts[mode]
  const days = layoutDates(today, mode, settings.weekStart)
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" rx="16" fill="${mode === 'day' ? '#1c1c1e' : '#28282a'}"/><g font-family="-apple-system, PingFang SC, Helvetica, sans-serif">`]
  if (days.some(d => d.year < MIN_YEAR || d.year > MAX_YEAR)) {
    out.push(text(w / 2, h / 2, '农历支持1901—2099年', fit(12, '农历支持1901—2099年', w - 12)))
  } else if (mode === 'day') {
    const i = dayInfo(today), x = w * .097, available = w * .806
    const scale = Math.min(w / 126, h / 126)
    const sizeFor = (size: number, value: string) => fit(size * .8 * scale, value, available)
    const left = (y: number, value: string, size: number, color = '#ffffff', weight = 400) =>
      text(x, y, value, size, color, weight).replace('text-anchor="middle"', 'text-anchor="start"')
    const weekday = `周${WEEKDAY_NAMES[i.weekday]}`, gregorian = `${today.year}年${today.month}月`
    const weekdaySize = sizeFor(f.weekday, weekday), infoSize = sizeFor(f.today, gregorian)
    const weekdayY = h * .207, infoY = h * .687
    // 按可见墨迹边缘居中，不取两个baseline的中点。数字近似Helvetica的
    // cap-height/下沿，中文按PingFang常规字形上沿/下沿估计；并随用户字号重算。
    const weekdayBottom = weekdayY + weekdaySize * .10, infoTop = infoY - infoSize * .80
    const digitSize = sizeFor(f.date, String(today.day))
    const digitY = (weekdayBottom + infoTop) / 2 + digitSize * (.73 - .02) / 2
    out.push(left(weekdayY, weekday, weekdaySize, '#e74748', 500))
    out.push(left(digitY, String(today.day), digitSize))
    out.push(badge(today, holidays, w * .88, h * .16, settings))
    // 普通日期不重复显示农历日；只有实际节日/节气才在日期与年月之间显示。
    const event = i.festivals.join(' / ') || i.term
    if (event) {
      const digitBottom = digitY + digitSize * .02
      const gap = Math.max(0, infoTop - digitBottom)
      const eventSize = Math.min(sizeFor(f.lunar, event), gap * .62)
      out.push(left((digitBottom + infoTop) / 2 + eventSize * .35, event, eventSize))
    }
    const [yearInfo, lunarInfo] = i.footer.split(' ')
    out.push(left(infoY, gregorian, infoSize))
    out.push(left(h * .805, yearInfo, sizeFor(f.today, yearInfo)))
    out.push(left(h * .923, lunarInfo, sizeFor(f.today, lunarInfo)))
  } else {
    const month = mode === 'month', col = w / 7
    const headerY = month ? 39 : 15, firstY = month ? 63 : 39
    const rowGap = month ? (h - 86) / 6 : (h - 44) / 2
    if (month) out.push(text(w / 2, 18, `${today.year}年${today.month}月`, f.today, '#dddde1', 600))
    weekOrder(settings.weekStart).forEach((day, index) => {
      out.push(text(col * (index + .5), headerY, `周${WEEKDAY_NAMES[day]}`, Math.min(f.weekday, (col - 4) / 2), isWeekend(day) ? '#94949a' : '#f3f3f5'))
    })
    days.forEach((d, index) => {
      const info = dayInfo(d), x = col * ((index % 7) + .5), y = firstY + Math.floor(index / 7) * rowGap
      const current = dateKey(today) === info.key, outside = month && d.month !== today.month
      const color = current ? '#ffffff' : outside ? '#626269' : isWeekend(info.weekday) ? '#94949a' : '#f7f7f8'
      const size = Math.min(f.date, rowGap * .53, col * .6), lunarSize = Math.min(f.lunar, rowGap * .27)
      const label = current || info.lunarDay === 1 ? info.lunarLabel : info.label
      const labelY = y + lunarSize + 4
      const radius = Math.min(col * .46, rowGap * .49)
      if (current) out.push(todayShape(x, y + 1, radius, settings))
      out.push(text(x, y, String(d.day), size, color, 700))
      out.push(text(x, labelY, label, fit(lunarSize, label, current ? Math.min(col - 6, radius * 1.6) : col - 6), color))
      if (info.lunarDay === 1) out.push(`<line x1="${x - 7}" y1="${labelY + 3}" x2="${x + 7}" y2="${labelY + 3}" stroke="#e74748" stroke-width="2"/>`)
      out.push(badge(d, holidays, x + col * .34, y - 10, settings))
    })
    const i = dayInfo(today), footer = `${today.year}年${today.month}月${today.day}日  ${i.footer}`
    out.push(text(w / 2, h - 3, footer, fit(f.today, footer, w - 8), '#dddde1'))
  }
  out.push('</g></svg>')
  return out.join('')
}
// 保留已有模块调用签名；桌面及实时自定义页面直接共用renderCalendarSVG。
export function calendarSVG(today: CivilDate, holidays: HolidayResult[], width = 306, height = 126, weekStart = 1): string {
  return renderCalendarSVG(today, holidays, 'week', { ...defaultAppearance(), weekStart }, width, height)
}
export function compactSVG(today: CivilDate, holidays: HolidayResult[]): string {
  return renderCalendarSVG(today, holidays, 'day', defaultAppearance(), 126, 126)
}
