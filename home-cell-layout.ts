import { CALENDAR_SHIFT_INSET, calendarHighlight } from './calendar-geometry'

// 首页49点日期格：只读取格宽；所有纵向位置明确，不把SwiftUI文字行高当作测量基准。
export function homeCellLayout(width: number) {
  const x = width / 2, dateBaseline = 18, lunarBaseline = 30
  // 与目标月历18点日期布局的红底相同：日期顶部至未压缩农历横线的包围范围。
  const today = calendarHighlight(dateBaseline - 18 * .75, dateBaseline + 9 + 6 + 3, 18 * .95)
  return {
    width, height: 49, x, dateBaseline, lunarBaseline,
    dateCenterY: dateBaseline - 18 * .35,
    lunarCenterY: lunarBaseline - 10 * .35,
    lunarLineY: lunarBaseline + 3,
    todayCenterY: today.centerY, todayDiameter: today.radius * 2,
    shiftWidth: Math.max(0, width - CALENDAR_SHIFT_INSET * 2), shiftHeight: 11, shiftCenterY: 40.5,
  }
}
