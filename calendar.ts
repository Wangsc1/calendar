import { Solar } from './vendor/lunar'

export const MIN_YEAR = 1901
export const MAX_YEAR = 2099
export const DEFAULT_WEEK_START = 1 // 与Date星期编号一致：周日0，周一1，…周六6。
export const WEEK_START_KEY = 'calendar.weekStart.v1'
export const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六']
export function normalizeWeekStart(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6 ? value : DEFAULT_WEEK_START
}
export type LayoutMode = 'day' | 'week' | 'month'
export function widgetLayout(family: string): LayoutMode {
  return family === 'systemSmall' || family.startsWith('accessory') ? 'day' : family === 'systemLarge' ? 'month' : 'week'
}
export type FontKey = 'weekday' | 'date' | 'lunar' | 'today'
export type FontSizes = Record<FontKey, number>
export type Appearance = { schema: 2; weekStart: number; holidayStyle: 'text' | 'dot'; todayShape: 'circle' | 'square'; fonts: Record<LayoutMode, FontSizes> }
export const APPEARANCE_KEY = 'calendar.appearance.v2'
export const FONT_LIMITS: Record<LayoutMode, Record<FontKey, [number, number]>> = {
  day: { weekday: [12, 24], date: [32, 56], lunar: [8, 14], today: [10, 18] },
  week: { weekday: [10, 16], date: [12, 20], lunar: [8, 11], today: [10, 16] },
  month: { weekday: [10, 16], date: [12, 20], lunar: [8, 11], today: [10, 16] },
}
export function defaultAppearance(): Appearance {
  return { schema: 2, weekStart: 1, holidayStyle: 'text', todayShape: 'circle', fonts: {
    day: { weekday: 20, date: 50, lunar: 10, today: 15 },
    week: { weekday: 14, date: 16, lunar: 9, today: 14 },
    month: { weekday: 14, date: 16, lunar: 9, today: 14 },
  } }
}
export function normalizeAppearance(raw: unknown, legacyWeekStart: unknown = 1): Appearance {
  const out = defaultAppearance()
  const x = raw && typeof raw === 'object' ? raw as Partial<Appearance> : {}
  out.weekStart = normalizeWeekStart(x.weekStart === undefined ? legacyWeekStart : x.weekStart)
  out.holidayStyle = x.holidayStyle === 'dot' ? 'dot' : 'text'
  out.todayShape = x.todayShape === 'square' ? 'square' : 'circle'
  for (const mode of ['day', 'week', 'month'] as LayoutMode[]) for (const key of ['weekday', 'date', 'lunar', 'today'] as FontKey[]) {
    const n = x.fonts?.[mode]?.[key], [min, max] = FONT_LIMITS[mode][key]
    if (typeof n === 'number' && Number.isFinite(n)) out.fonts[mode][key] = Math.max(min, Math.min(max, Math.round(n)))
  }
  return out
}
export function readAppearance(): Appearance {
  let raw: unknown, legacy: unknown
  try { raw = Storage.get<unknown>(APPEARANCE_KEY) } catch { /* 默认外观仍可渲染 */ }
  try { legacy = Storage.get<unknown>(WEEK_START_KEY) } catch { /* 兼容1.1.0旧偏好 */ }
  return normalizeAppearance(raw, legacy)
}
export function saveAppearance(value: Appearance): boolean {
  try { return Storage.set(APPEARANCE_KEY, normalizeAppearance(value)) } catch { return false }
}
export function resetAppearance(): boolean { return saveAppearance(defaultAppearance()) }
export function readWeekStart(): number { return readAppearance().weekStart }
export function saveWeekStart(value: number): boolean {
  return normalizeWeekStart(value) === value && saveAppearance({ ...readAppearance(), weekStart: value })
}
export function weekOrder(start = DEFAULT_WEEK_START): number[] {
  return Array.from({ length: 7 }, (_, i) => (normalizeWeekStart(start) + i) % 7)
}
export function isWeekend(day: number): boolean { return day === 0 || day === 6 }
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
export function fortnight(d: CivilDate, start = DEFAULT_WEEK_START): CivilDate[] {
  const first = addDays(d, -((weekday(d) - normalizeWeekStart(start) + 7) % 7))
  return Array.from({ length: 14 }, (_, i) => addDays(first, i))
}
export function monthGrid(d: CivilDate, start = DEFAULT_WEEK_START): CivilDate[] {
  const first = { year: d.year, month: d.month, day: 1 }
  const begin = addDays(first, -((weekday(first) - normalizeWeekStart(start) + 7) % 7))
  return Array.from({ length: 42 }, (_, i) => addDays(begin, i))
}
export function layoutDates(d: CivilDate, mode: LayoutMode, start = DEFAULT_WEEK_START): CivilDate[] {
  return mode === 'day' ? [d] : mode === 'month' ? monthGrid(d, start) : fortnight(d, start)
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
