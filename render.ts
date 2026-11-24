import { CivilDate, dayInfo, dateKey, layoutDates, weekOrder, WEEKDAY_NAMES, isWeekend, Appearance, MIN_YEAR, MAX_YEAR } from './calendar'
import { HolidayResult, holidayOn } from './holidays'
import { ShiftSettings, shiftOn } from './shifts'
import { shiftLabelFont, shiftPaint } from './shift-style'
import { CALENDAR_SHIFT_INSET, CALENDAR_TODAY_CORNER } from './calendar-geometry'
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
  const background = `<rect width="${w}" height="${h}" rx="16" fill="#141416"/>`
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${background}<g font-family="-apple-system, PingFang SC, Helvetica, sans-serif">`]
  if (days.some(d => d.year < MIN_YEAR || d.year > MAX_YEAR)) {
    out.push(text(w / 2, h / 2, '农历支持1901—2099年', fit(12, '农历支持1901—2099年', w - 12)))
  } else {
    const month = mode === 'month', col = w / 7
    const headerY = month ? 39 : 15, rows = month ? 6 : 2
    const gridTop = headerY + (month ? 6 : 7)
    const gridBot = month ? h - 2 : h - 3 - f.today * .92 - 4
    const rowH = (gridBot - gridTop) / rows
    const wf = settings.fonts.week
    const hasGridShift = days.some(d => Boolean(shiftOn(d, shifts)))
    // 统一按行高计算红底与倒班条：红底严格居中包住公历+农历视觉合块，并在倒班开启时与下方班次条保持净空。
    const tagHeight = hasGridShift ? Math.min(11, Math.max(7.5, rowH * .215)) : 0
    const circleToTagGap = hasGridShift ? Math.min(3.2, Math.max(2, rowH * .062)) : 0
    const interRowGap = hasGridShift ? Math.min(3.5, Math.max(1.8, rowH * .055)) : Math.min(6, Math.max(2.5, rowH * .1))
    const diameter = hasGridShift
      ? Math.min(34.5, rowH - tagHeight - circleToTagGap - interRowGap, col - 4)
      : Math.min(38, rowH - interRowGap, col - 4)
    const radius = Math.max(4, diameter / 2)
    const size = Math.max(1, hasGridShift ? Math.min(17, diameter * .49) : Math.min(17, diameter * .47))
    const displayLunarSize = hasGridShift ? Math.min(wf.lunar, 8, diameter * .24) : Math.min(wf.lunar, diameter * .25)
    const inkGap = hasGridShift ? Math.max(1.4, size * .135) : Math.max(2, size * .2)
    // 日期采用原生Text（中心在 y - 0.35*size，iOS字形顶/底相对基线 y 为 -0.722*size 至 -0.018*size），
    // 农历采用SVG text（中文墨迹相对基线约 -0.86*fs 至 +0.10*fs），令合块视觉中心严格等于红底中心。
    const dateInkH = size * .704, lunarInkH = displayLunarSize * .96
    const totalInkH = dateInkH + inkGap + lunarInkH
    const contentH = hasGridShift ? diameter + circleToTagGap + tagHeight : diameter
    const contentTop = (rowH - contentH) / 2
    const centerYOffset = contentTop + radius
    const inkTopOffset = centerYOffset - totalInkH / 2
    const dateYOffset = inkTopOffset + size * .722
    const lunarYOffset = inkTopOffset + dateInkH + inkGap + displayLunarSize * .86
    const lineYOffset = lunarYOffset + displayLunarSize * .1 + (hasGridShift ? 1.4 : 1.8)
    const tagTopOffset = contentTop + diameter + circleToTagGap
    // 大号合并当天农历信息，仍用原标题基线；长闰月等按可用宽度缩小字号。
    if (month) {
      const title = `${today.year}年${today.month}月 · ${dayInfo(today).footer}`
      out.push(text(w / 2, 3 - f.today * .12 + 17 * .88, title, fit(17, title, w - 8), '#dddde1', 600))
    }
    weekOrder(settings.weekStart).forEach((day, index) => {
      out.push(text(col * (index + .5), headerY, `周${WEEKDAY_NAMES[day]}`, Math.min(f.weekday, (col - 4) / 2), isWeekend(day) ? '#94949a' : '#f3f3f5'))
    })
    days.forEach((d, index) => {
      const info = dayInfo(d), x = col * ((index % 7) + .5)
      const rowTop = gridTop + Math.floor(index / 7) * rowH
      const y = rowTop + dateYOffset, centerY = rowTop + centerYOffset
      const current = dateKey(today) === info.key, outside = month && d.month !== today.month
      const color = current ? '#ffffff' : outside ? '#626269' : isWeekend(info.weekday) ? '#94949a' : '#f7f7f8'
      const label = current || info.lunarDay === 1 ? info.lunarLabel : info.label
      const lineHalf = 6
      if (current) out.push(todayShape(x, centerY, radius, settings))
      // 由原生Text绘制日期数字，与App首页同字体同字重。
      dateLabels.push({ x, y, size, text: String(d.day), color })
      const displayLabelY = rowTop + lunarYOffset
      out.push(text(x, displayLabelY, label, fit(displayLunarSize, label, current ? Math.min(col - 6, radius * 1.6) : col - 6), color))
      const displayLineY = rowTop + lineYOffset
      if (info.lunarDay === 1) out.push(`<line x1="${x - lineHalf}" y1="${displayLineY}" x2="${x + lineHalf}" y2="${displayLineY}" stroke="${current ? '#ffffff' : '#e74748'}" stroke-width="2"/>`)
      const shift = shiftOn(d, shifts)
      if (shift) {
        const tagWidth = col - CALENDAR_SHIFT_INSET * 2, tagTop = rowTop + tagTopOffset
        const tagFont = shiftLabelFont(shift.name, 8, tagWidth, tagHeight)
        const dark = shiftPaint(shift, 'dark'), light = shiftPaint(shift, 'light')
        out.push(`<g data-role="shift" data-date="${info.key}" data-light-background="${light.background}" data-light-foreground="${light.foreground}"><rect x="${x - tagWidth / 2}" y="${tagTop}" width="${tagWidth}" height="${tagHeight}" rx="2" fill="${dark.background}"/>`)
        out.push(text(x, tagTop + tagHeight / 2 + tagFont * .38, shift.name, tagFont, dark.foreground, 600), '</g>')
      }
      // 休/班保持在日期右上角；所有日期统一使用今日红底外缘作为休/班定位基准，非今天不绘制红底。
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
  '#141416': '#ffffff', '#f7f7f8': '#1c1c1e', '#f3f3f5': '#1c1c1e', '#dddde1': '#3a3a3c',
  '#94949a': '#8e8e93', '#626269': '#c7c7cc',
}
export function lightSVG(code: string): string {
  // 班次有自己的明暗色，必须隔离于日历旧全局颜色替换，防止浅色标签被误映射。
  return code.split(/(<g data-role="shift"[^>]*>[\s\S]*?<\/g>)/g).map(part => {
    if (!part.startsWith('<g data-role="shift"')) return part.replace(/#141416|#f7f7f8|#f3f3f5|#dddde1|#94949a|#626269/g, c => LIGHT_COLORS[c])
    const background = /data-light-background="(#[0-9a-f]{6})"/.exec(part)?.[1]
    const foreground = /data-light-foreground="(#[0-9a-f]{6})"/.exec(part)?.[1]
    if (!background || !foreground) return part
    return part.replace(/(<rect[^>]* fill=")[^"]+/, (_, prefix: string) => prefix + background)
      .replace(/(<text[^>]* fill=")[^"]+/g, (_, prefix: string) => prefix + foreground)
  }).join('')
}
