import { CivilDate, dayInfo, dateKey, layoutDates, weekOrder, WEEKDAY_NAMES, isWeekend, Appearance, LayoutMode, defaultAppearance, MIN_YEAR, MAX_YEAR } from './calendar'
import { HolidayResult, holidayOn } from './holidays'
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
function text(x: number, y: number, s: string, size: number, color = '#f7f7f8', weight = 400, stroke = 0): string {
  const one = (dx: number, dy: number) => `<text x="${x + dx}" y="${y + dy}" text-anchor="middle" font-size="${size}" font-weight="${weight}" fill="${color}">${esc(s)}</text>`
  if (stroke <= 0) return one(0, 0)
  // iOS SVG字重最高只到粗体且忽略描边；用同色多次微偏移叠印实现更粗笔画。
  const offsets: [number, number][] = [[0, 0], [-stroke, 0], [stroke, 0], [0, -stroke], [0, stroke], [-stroke, -stroke], [stroke, -stroke], [-stroke, stroke], [stroke, stroke]]
  return offsets.map(([dx, dy]) => one(dx, dy)).join('')
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
function badge(d: CivilDate, holidays: HolidayResult[], x: number, y: number, settings: Appearance, size = 9, weight = 700, stroke = 0): string {
  const day = holidayOn(d, holidays)
  if (!day) return ''
  const color = day.isOffDay ? '#55a9ff' : '#ffad52'
  return settings.holidayStyle === 'dot'
    ? `<circle data-role="holiday" cx="${x}" cy="${y - 3}" r="2.5" fill="${color}"/>`
    : text(x, y, day.isOffDay ? '休' : '班', size, color, weight, stroke)
}
export function renderCalendarSVG(today: CivilDate, holidays: HolidayResult[], mode: LayoutMode, settings: Appearance, width: number, height: number): string {
  const w = Math.max(110, width), h = Math.max(110, height), f = settings.fonts[mode]
  const days = layoutDates(today, mode, settings.weekStart)
  const background = mode === 'day'
    ? `<defs><linearGradient id="small-background" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#363636"/><stop offset="1" stop-color="#262626"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#small-background)"/>`
    : `<rect width="${w}" height="${h}" rx="16" fill="#28282a"/>`
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${background}<g font-family="-apple-system, PingFang SC, Helvetica, sans-serif">`]
  if (days.some(d => d.year < MIN_YEAR || d.year > MAX_YEAR)) {
    out.push(text(w / 2, h / 2, '农历支持1901—2099年', fit(12, '农历支持1901—2099年', w - 12)))
  } else if (mode === 'day') {
    // IMG_4558右侧491方卡为新基准，使用完整Widget尺寸，不沿用旧126内卡校准。
    // 固定设计与旧Storage.fonts.day无关；只有长文本按可用宽度收缩。
    const i = dayInfo(today), x = w * 50 / 491, available = w * 391 / 491
    const scale = Math.min(w, h) / 491
    const left = (referenceY: number, value: string, referenceSize: number, color = '#ffffff', weight = 400) =>
      text(x, h * referenceY / 491, value, fit(referenceSize * scale, value, available), color, weight)
        .replace('text-anchor="middle"', 'text-anchor="start"')
    out.push(left(96, `周${WEEKDAY_NAMES[i.weekday]}`, 60, '#e74748', 500))
    out.push(left(253, String(today.day), 150))
    out.push(badge(today, holidays, w * .88, h * .16, settings))
    const event = i.festivals.join(' / ') || i.term
    if (event) out.push(left(282, event, 20))
    const [yearInfo, lunarInfo] = i.footer.split(' ')
    out.push(left(334, `${today.year}年${today.month}月`, 44))
    out.push(left(389, yearInfo, 44))
    out.push(left(444, lunarInfo, 44))
  } else {
    const month = mode === 'month', col = w / 7
    const headerY = month ? 50 : 15, firstY = month ? 76 : 44
    const rowGap = month ? (h - 98) / 6 : (h - 44) / 2
    if (month) out.push(text(w / 2, 22, `${today.year}年${today.month}月`, f.today, '#dddde1', 600))
    weekOrder(settings.weekStart).forEach((day, index) => {
      out.push(text(col * (index + .5), headerY, `周${WEEKDAY_NAMES[day]}`, Math.min(f.weekday, (col - 4) / 2), isWeekend(day) ? '#94949a' : '#f3f3f5'))
    })
    days.forEach((d, index) => {
      const info = dayInfo(d), x = col * ((index % 7) + .5), y = firstY + Math.floor(index / 7) * rowGap
      const current = dateKey(today) === info.key, outside = month && d.month !== today.month
      const color = current ? '#ffffff' : outside ? '#626269' : isWeekend(info.weekday) ? '#94949a' : '#f7f7f8'
      // 大号日期/农历字号、粗细及间距与中号一致。
      const wf = settings.fonts.week
      const size = Math.min(wf.date + 1, rowGap * .58, col * .62), lunarSize = Math.min(wf.lunar, rowGap * .27)
      const label = current || info.lunarDay === 1 ? info.lunarLabel : info.label
      const labelY = y + lunarSize + 6
      // 大号今日圆点与中号同为列宽比例，不随月视图行距放大。
      const radius = Math.min(col * .46, (month ? col * .46 : rowGap * .49)) * .88 * 1.06
      const centerY = month ? y + 1 : (y - size * .75 + labelY) / 2
      if (current) out.push(todayShape(x, centerY, radius, settings))
      out.push(text(x, y, String(d.day), size, color, 900, .1))
      out.push(text(x, labelY, label, fit(lunarSize, label, current ? Math.min(col - 6, radius * 1.6) : col - 6), color))
      if (info.lunarDay === 1 && (month || !current)) out.push(`<line x1="${x - 7}" y1="${labelY + 3}" x2="${x + 7}" y2="${labelY + 3}" stroke="#e74748" stroke-width="2"/>`)
      // 今天的标记按红底外缘定位，保持字/点完整位于高亮外。
      const badgeX = x + col * .32
      // 标记文字基线放在红底上沿之外；点标记也随之上移。
      const badgeY = current && !month ? centerY - radius - 3 : y - 10
      out.push(badge(d, holidays, badgeX, badgeY, settings, 7.5, 900, .05))
    })
    const i = dayInfo(today), footer = `${today.year}年${today.month}月${today.day}日  ${i.footer}`
    out.push(text(w / 2, h - 3, footer, fit(f.today, footer, w - 8), '#dddde1'))
  }
  out.push('</g></svg>')
  return out.join('')
}
// 日间模式配色：按深色版颜色逐项映射，红/蓝/橙强调色保持不变，今日红底上的白字不变。
const LIGHT_COLORS: Record<string, string> = {
  '#28282a': '#ffffff', '#f7f7f8': '#1c1c1e', '#f3f3f5': '#1c1c1e', '#dddde1': '#3a3a3c',
  '#94949a': '#8e8e93', '#626269': '#c7c7cc',
}
export function lightSVG(code: string): string {
  return code.replace(/#28282a|#f7f7f8|#f3f3f5|#dddde1|#94949a|#626269/g, c => LIGHT_COLORS[c])
}
// 保留已有模块调用签名；桌面与原生Widget预览均执行同一渲染入口。
export function calendarSVG(today: CivilDate, holidays: HolidayResult[], width = 306, height = 126, weekStart = 1): string {
  return renderCalendarSVG(today, holidays, 'week', { ...defaultAppearance(), weekStart }, width, height)
}
export function compactSVG(today: CivilDate, holidays: HolidayResult[]): string {
  return renderCalendarSVG(today, holidays, 'day', defaultAppearance(), 126, 126)
}
