import { CivilDate, dayInfo, dateKey, layoutDates, weekOrder, WEEKDAY_NAMES, isWeekend, Appearance, MIN_YEAR, MAX_YEAR } from './calendar'
import { HolidayResult, holidayOn } from './holidays'
import { ShiftSettings, shiftOn } from './shifts'
import { shiftPaint } from './shift-style'
import { CALENDAR_SHIFT_INSET, CALENDAR_TODAY_CORNER, calendarHighlight } from './calendar-geometry'
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
    : `<rect data-role="today" x="${x - radius}" y="${y - radius}" width="${radius * 2}" height="${radius * 2}" rx="${CALENDAR_TODAY_CORNER}" fill="#e74748"/>`
}
function badge(d: CivilDate, holidays: HolidayResult[], x: number, y: number, settings: Appearance, size = 9, weight = 700, stroke = 0): string {
  const day = holidayOn(d, holidays)
  if (!day) return ''
  const color = day.isOffDay ? '#55a9ff' : '#ffad52'
  return settings.holidayStyle === 'dot'
    ? `<circle data-role="holiday" cx="${x}" cy="${y - 3}" r="2.5" fill="${color}"/>`
    : text(x, y, day.isOffDay ? '休' : '班', size, color, weight, stroke)
}
export type DateLabel = { x: number; y: number; size: number; text: string; color: string }
export function renderCalendarSVG(today: CivilDate, holidays: HolidayResult[], mode: 'week' | 'month', settings: Appearance, width: number, height: number, dateLabels: DateLabel[], shifts?: ShiftSettings): string {
  const w = Math.max(110, width), h = Math.max(110, height), f = settings.fonts[mode]
  const days = layoutDates(today, mode, settings.weekStart)
  const background = `<rect width="${w}" height="${h}" rx="16" fill="#28282a"/>`
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${background}<g font-family="-apple-system, PingFang SC, Helvetica, sans-serif">`]
  if (days.some(d => d.year < MIN_YEAR || d.year > MAX_YEAR)) {
    out.push(text(w / 2, h / 2, '农历支持1901—2099年', fit(12, '农历支持1901—2099年', w - 12)))
  } else {
    const month = mode === 'month', col = w / 7
    // 中号有班次时两周整体上移3点，页脚不动，净空增加3点；不改变格内度量。
    const weekLift = !month && shiftOn(today, shifts) ? 3 : 0
    const headerY = month ? 39 : 15, firstY = month ? 65 : 46
    const originalRowGap = month ? (h - 43 - firstY) / 5 : h - 43 - firstY
    // 大号页脚移走后，末行下移12点，5处行间隙各增加2.4点；首行不动。
    const rowGap = month ? originalRowGap + 12 / 5 : originalRowGap
    // 回收标题下方7点分给5个行间隙（各+1.4）；格内度量仍沿用原72点起行，红底/农历/标签不变。
    const cellGap = month ? (h - 43 - 72) / 5 : originalRowGap
    // 大号合并当天农历信息，仍用原标题基线；长闰月等按可用宽度缩小字号。
    if (month) {
      const title = `${today.year}年${today.month}月 · ${dayInfo(today).footer}`
      out.push(text(w / 2, 3 - f.today * .12 + 17 * .88, title, fit(17, title, w - 8), '#dddde1', 600))
    }
    weekOrder(settings.weekStart).forEach((day, index) => {
      out.push(text(col * (index + .5), headerY, `周${WEEKDAY_NAMES[day]}`, Math.min(f.weekday, (col - 4) / 2), isWeekend(day) ? '#94949a' : '#f3f3f5'))
    })
    days.forEach((d, index) => {
      const info = dayInfo(d), x = col * ((index % 7) + .5), y = firstY + Math.floor(index / 7) * rowGap - weekLift
      const current = dateKey(today) === info.key, outside = month && d.month !== today.month
      const color = current ? '#ffffff' : outside ? '#626269' : isWeekend(info.weekday) ? '#94949a' : '#f7f7f8'
      // 大号日期/农历字号、粗细及间距与中号一致。
      const wf = settings.fonts.week
      // 日期数字17点、半粗体；红底继续采用原18点布局，尺寸与位置不变。
      const circleSize = Math.min(18, cellGap * .58, col * .62)
      const size = Math.max(1, circleSize - 1), lunarSize = Math.min(wf.lunar, cellGap * .27)
      const label = current || info.lunarDay === 1 ? info.lunarLabel : info.label
      const labelY = y + lunarSize + 6
      // 今日红底以日期顶部到农历下划线的整体为中心；半径刚好包住下划线。
      const lineHalf = 6, lineY = labelY + 3
      const blockTop = y - circleSize * .75
      // 首页、中号与大号使用同一包围规则；按实际文字块定位，不把班次条计入红底。
      const { centerY, radius } = calendarHighlight(blockTop, lineY, circleSize * .95)
      if (current) out.push(todayShape(x, centerY, radius, settings))
      // 由原生Text绘制日期数字，与App首页同字体同字重。
      dateLabels.push({ x, y, size, text: String(d.day), color })
      const shift = shiftOn(d, shifts)
      // 开启排班时仅收紧格内农历间距，为第三行留白；日期、红底、休班及整体尺寸不变。
      const displayLunarSize = shift ? Math.min(lunarSize, 8, cellGap * .2) : lunarSize
      const displayLabelY = shift ? y + Math.min(displayLunarSize + 2, cellGap * .24) : labelY
      out.push(text(x, displayLabelY, label, fit(displayLunarSize, label, current ? Math.min(col - 6, radius * 1.6) : col - 6), color))
      const displayLineY = shift ? displayLabelY + 2 : lineY
      if (info.lunarDay === 1) out.push(`<line x1="${x - lineHalf}" y1="${displayLineY}" x2="${x + lineHalf}" y2="${displayLineY}" stroke="${current ? '#ffffff' : '#e74748'}" stroke-width="2"/>`)
      if (shift) {
        const tagWidth = col - CALENDAR_SHIFT_INSET * 2, tagOffset = Math.min(15, cellGap * .34), tagTop = y + tagOffset
        const baseTagHeight = Math.min(9, cellGap * .22)
        // 沿用既有增高/边界限制；新增行距不再带动班次条变高。
        const tagHeight = Math.min(baseTagHeight + 2, originalRowGap - size * .75 - tagOffset - .25, 40 - f.today * .88 - tagOffset - 1)
        const tagFont = Math.min(7, baseTagHeight * .8)
        const dark = shiftPaint(shift, 'dark'), light = shiftPaint(shift, 'light')
        out.push(`<g data-role="shift" data-date="${info.key}" data-light-background="${light.background}" data-light-foreground="${light.foreground}"><rect x="${x - tagWidth / 2}" y="${tagTop}" width="${tagWidth}" height="${tagHeight}" rx="2" fill="${dark.background}"/>`)
        out.push(text(x, tagTop + baseTagHeight * .8 + (tagHeight - baseTagHeight) / 2, shift.name, fit(tagFont, shift.name, tagWidth - 4), dark.foreground, 600), '</g>')
      }
      // 休/班保持在日期右上角；今天时沿右上方向外推到红底外，不改其他日期位置。
      // 所有日期统一使用今日红底外缘作为休/班定位基准，非今天不绘制红底。
      const half = 7.5 / 2, gap = 1, corner = (radius + gap) * Math.SQRT1_2
      const badgeX = Math.min(x + corner + half, x + col / 2 - half)
      const badgeY = centerY - corner - 1
      out.push(badge(d, holidays, badgeX, badgeY, settings, 7.5, 900, .05))
    })
    if (!month) {
      const i = dayInfo(today), footer = `${today.year}年${today.month}月${today.day}日  ${i.footer}`
      out.push(text(w / 2, h - 3, footer, fit(f.today, footer, w - 8), '#dddde1'))
    }
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
  // 班次有自己的明暗色，必须隔离于日历旧全局颜色替换，防止浅色标签被误映射。
  return code.split(/(<g data-role="shift"[^>]*>[\s\S]*?<\/g>)/g).map(part => {
    if (!part.startsWith('<g data-role="shift"')) return part.replace(/#28282a|#f7f7f8|#f3f3f5|#dddde1|#94949a|#626269/g, c => LIGHT_COLORS[c])
    const background = /data-light-background="(#[0-9a-f]{6})"/.exec(part)?.[1]
    const foreground = /data-light-foreground="(#[0-9a-f]{6})"/.exec(part)?.[1]
    if (!background || !foreground) return part
    return part.replace(/(<rect[^>]* fill=")[^"]+/, (_, prefix: string) => prefix + background)
      .replace(/(<text[^>]* fill=")[^"]+/g, (_, prefix: string) => prefix + foreground)
  }).join('')
}
