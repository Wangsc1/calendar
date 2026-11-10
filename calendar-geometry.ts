// 首页原生布局与组件SVG共用：今日底形包住日期顶部至农历横线；班次条两侧各留5点。
export const CALENDAR_SHIFT_INSET = 5
export const CALENDAR_TODAY_CORNER = 5
export function calendarHighlight(blockTop: number, lineY: number, minimumRadius: number) {
  const centerY = (blockTop + lineY) / 2
  return { centerY, radius: Math.max(Math.hypot(6, lineY - centerY) + 2.5, minimumRadius) }
}
