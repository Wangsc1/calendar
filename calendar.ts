import { Solar } from './vendor/lunar'

export const MIN_YEAR = 1901
export const MAX_YEAR = 2099
export type CivilDate = { year: number; month: number; day: number }
export type DayInfo = CivilDate & {
  key: string; weekday: number; lunarMonth: number; lunarDay: number
  lunarLabel: string; festivals: string[]; term: string; label: string; footer: string
}
const pad = (n: number) => String(n).padStart(2, '0')
export function dateKey(d: CivilDate): string { return `${d.year}-${pad(d.month)}-${pad(d.day)}` }
export function chinaToday(now = new Date()): CivilDate {
  const d = new Date(now.getTime() + 8 * 3600000)
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
}
export function addDays(d: CivilDate, n: number): CivilDate {
  const x = new Date(Date.UTC(d.year, d.month - 1, d.day + n))
  return { year: x.getUTCFullYear(), month: x.getUTCMonth() + 1, day: x.getUTCDate() }
}
export function weekday(d: CivilDate): number { return new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay() }
export function fortnight(d: CivilDate): CivilDate[] {
  const monday = addDays(d, -((weekday(d) + 6) % 7))
  return Array.from({ length: 14 }, (_, i) => addDays(monday, i))
}
// 传统节日只在非闰月匹配；小年有地域差异，分别显示北/南。
const traditional: Record<string, string> = {
  '1-1': '春节', '1-15': '元宵', '2-2': '龙抬头', '5-5': '端午',
  '7-7': '七夕', '7-15': '中元', '8-15': '中秋', '9-9': '重阳',
  '12-8': '腊八', '12-23': '小年(北)', '12-24': '小年(南)',
}
const solarFestivals: Record<string, string> = { '1-1': '元旦', '5-1': '劳动节', '10-1': '国庆节' }
export function dayInfo(d: CivilDate): DayInfo {
  if (d.year < MIN_YEAR || d.year > MAX_YEAR) throw new Error(`农历支持${MIN_YEAR}—${MAX_YEAR}年`)
  const l = Solar.fromYmd(d.year, d.month, d.day).getLunar()
  const m = l.getMonth(), day = l.getDay()
  const festivals: string[] = []
  if (m > 0 && traditional[`${m}-${day}`]) festivals.push(traditional[`${m}-${day}`])
  // 不固定腊月三十：下一天农历年份变化才是除夕（兼容腊月廿九）。
  const next = addDays(d, 1)
  const nl = Solar.fromYmd(next.year, next.month, next.day).getLunar()
  if (l.getYear() !== nl.getYear()) festivals.push('除夕')
  const sf = solarFestivals[`${d.month}-${d.day}`]
  if (sf) festivals.push(sf)
  const term = l.getJieQi()
  const lunarMonth = `${l.getMonthInChinese()}月` // 库已在闰月名称前加“闰”，不要重复添加
  const lunarLabel = day === 1 ? lunarMonth : l.getDayInChinese()
  // 格子优先传统/公历节日，其次节气，再次农历；首页完整列表保留同日所有信息。
  const label = festivals[0] || term || lunarLabel
  return { ...d, key: dateKey(d), weekday: weekday(d), lunarMonth: m, lunarDay: day,
    lunarLabel, festivals, term, label,
    footer: `${l.getYearInGanZhi()}${l.getYearShengXiao()}年 ${lunarMonth}${l.getDayInChinese()}` }
}
export function nextChinaMidnight(now = new Date()): Date {
  const d = addDays(chinaToday(now), 1)
  return new Date(Date.UTC(d.year, d.month - 1, d.day) - 8 * 3600000 + 60000)
}
