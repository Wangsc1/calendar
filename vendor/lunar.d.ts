export interface LunarDate {
  getYear(): number
  getMonth(): number
  getDay(): number
  getMonthInChinese(): string
  getDayInChinese(): string
  getYearInGanZhi(): string
  getYearShengXiao(): string
  getJieQi(): string
}
export const Solar: { fromYmd(year: number, month: number, day: number): { getLunar(): LunarDate } }
