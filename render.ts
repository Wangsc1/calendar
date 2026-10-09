import { CivilDate, dayInfo, dateKey, fortnight, weekOrder, WEEKDAY_NAMES, isWeekend, DEFAULT_WEEK_START } from './calendar'
import { HolidayResult, holidayOn } from './holidays'
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
export function calendarSVG(today: CivilDate, holidays: HolidayResult[], width = 306, height = 126, weekStart = DEFAULT_WEEK_START): string {
  const w = Math.max(260, width), h = Math.max(120, height)
  const col = w / 7, rowGap = (h - 43) / 2
  const txt = (x: number, y: number, s: string, size: number, color: string, weight = 400) =>
    `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-weight="${weight}" fill="${color}">${esc(s)}</text>`
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><g font-family="-apple-system, PingFang SC, Helvetica, sans-serif">`]
  weekOrder(weekStart).forEach((day, i) => out.push(txt(col * (i + .5), 12, WEEKDAY_NAMES[day], 11, isWeekend(day) ? '#94949a' : '#f3f3f5')))
  fortnight(today, weekStart).forEach((d, i) => {
    const info = dayInfo(d), x = col * ((i % 7) + .5), y = 40 + Math.floor(i / 7) * rowGap
    const isToday = dateKey(today) === info.key
    const color = isToday ? '#ffffff' : isWeekend(info.weekday) ? '#94949a' : '#f7f7f8'
    if (isToday) out.push(`<circle cx="${x}" cy="${y + 2}" r="20" fill="#e74748"/>`)
    out.push(txt(x, y, String(d.day), 20, color, 500))
    // 今天的红底涵盖农历/节日标签；标签最长5字，局部缩小不挤占邻列。
    const label = isToday || info.lunarDay === 1 ? info.lunarLabel : info.label
    out.push(txt(x, y + 14, label, label.length > 4 ? 8 : 10, color))
    if (info.lunarDay === 1) out.push(`<line x1="${x - 8}" y1="${y + 23}" x2="${x + 8}" y2="${y + 23}" stroke="#e74748" stroke-width="2"/>`)
    const holiday = holidayOn(d, holidays)
    if (holiday) out.push(txt(x + 15, y - 12, holiday.isOffDay ? '休' : '班', 9, holiday.isOffDay ? '#55a9ff' : '#ffad52', 600))
  })
  const info = dayInfo(today)
  out.push(txt(w / 2, h - 2, `${today.year}年${today.month}月${today.day}日  ${info.footer}`, 10, '#dddde1'))
  out.push('</g></svg>')
  return out.join('')
}
export function compactSVG(today: CivilDate, holidays: HolidayResult[]): string {
  const i = dayInfo(today), holiday = holidayOn(today, holidays)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="126" height="126" viewBox="0 0 126 126"><g text-anchor="middle" font-family="-apple-system, PingFang SC, sans-serif" fill="white"><text x="63" y="15" font-size="12">${today.month}月${today.day}日 周${['日','一','二','三','四','五','六'][i.weekday]}</text><circle cx="63" cy="55" r="28" fill="#e74748"/><text x="63" y="58" font-size="27">${today.day}</text><text x="63" y="75" font-size="11">${esc(i.lunarLabel)}</text><text x="63" y="103" font-size="11">${esc(i.footer)}</text>${holiday ? `<text x="105" y="40" font-size="11" fill="${holiday.isOffDay ? '#55a9ff' : '#ffad52'}">${holiday.isOffDay ? '休' : '班'}</text>` : ''}<text x="63" y="121" font-size="10" fill="#bcbcc4">双周日历 · 中号更完整</text></g></svg>`
}
