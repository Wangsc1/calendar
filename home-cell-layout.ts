import { CALENDAR_SHIFT_INSET } from './calendar-geometry'

// 首页56点日期格：只读取格宽；所有纵向位置明确，不把SwiftUI文字行高当作测量基准。
// 按iOS真机字形视觉中心（18pt数字与10pt农历合块中心）将今日/选中底形居中，并与下方倒班条留出4点间距。
export const HOME_CELL_HEIGHT = 56
export const HOME_HOLIDAY_OFFSET_Y = -20

export function homeCellLayout(width: number) {
  const x = width / 2
  const todayCenterY = 19, todayDiameter = 38
  const dateCenterY = 13.1, lunarCenterY = 27.1
  return {
    width, height: HOME_CELL_HEIGHT, x,
    dateCenterY,
    lunarCenterY,
    lunarLineY: 33.6,
    todayCenterY, todayDiameter,
    shiftWidth: Math.max(0, width - CALENDAR_SHIFT_INSET * 2), shiftHeight: 13, shiftCenterY: 48.5,
  }
}
