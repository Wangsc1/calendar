import { builtin2026 } from './holiday-2026'
import { dateKey, CivilDate } from './calendar'

export type HolidayDay = { name: string; date: string; isOffDay: boolean }
export type HolidayData = { year: number; papers: string[]; days: HolidayDay[] }
export type HolidayResult = { data: HolidayData | null; source: string }
export interface HolidayIO {
  get(key: string): unknown
  set(key: string, value: unknown): boolean
  fetchYear(year: number): Promise<unknown>
}
export function validateHoliday(raw: unknown, year: number): HolidayData {
  if (!raw || typeof raw !== 'object') throw new Error('假日数据不是对象')
  const x = raw as Partial<HolidayData>
  if (x.year !== year || !Array.isArray(x.papers) || !x.papers.length ||
      !x.papers.every(p => typeof p === 'string' && /^https:\/\/www\.gov\.cn\//.test(p)) ||
      !Array.isArray(x.days) || !x.days.length || x.days.length > 100) throw new Error('假日年份/官方通知来源无效')
  const seen = new Set<string>()
  for (const day of x.days) {
    if (!day || typeof day.name !== 'string' || !day.name || day.name.length > 32 ||
        typeof day.date !== 'string' || !new RegExp(`^${year}-\\d{2}-\\d{2}$`).test(day.date) ||
        typeof day.isOffDay !== 'boolean' || seen.has(day.date)) throw new Error('假日日期/休班格式无效')
    const [y, m, d] = day.date.split('-').map(Number)
    const t = new Date(Date.UTC(y, m - 1, d))
    if (t.getUTCFullYear() !== y || t.getUTCMonth() + 1 !== m || t.getUTCDate() !== d) throw new Error('假日日期不存在')
    seen.add(day.date)
  }
  return { year, papers: x.papers, days: x.days }
}
export async function loadHoliday(year: number, io: HolidayIO, force = false, now = Date.now()): Promise<HolidayResult> {
  const key = `calendar.holiday.v1.${year}`
  let fallback: HolidayData | null = year === 2026 ? validateHoliday(builtin2026, year) : null
  let cachedAt = 0
  try {
    const c = io.get(key) as { data?: unknown; at?: number } | null
    if (c) { fallback = validateHoliday(c.data, year); cachedAt = typeof c.at === 'number' ? c.at : 0 }
  } catch { /* 损坏缓存不影响内置数据和农历 */ }
  if (!force && fallback && (year === 2026 || now - cachedAt < 7 * 86400000)) {
    return { data: fallback, source: cachedAt ? `${year}年缓存` : '2026年已核实内置' }
  }
  // 无数据年份每天最多一次失败重试；不把周末或传统节日当成法定休假。
  let attempt: unknown
  try { attempt = io.get(`${key}.attempt`) } catch { /* 存储不可读仍可联网 */ }
  if (!force && !fallback && typeof attempt === 'number' && now - attempt < 86400000) return { data: null, source: `${year}年休班未取得` }
  try {
    try { io.set(`${key}.attempt`, now) } catch { /* 缓存不可写仍可取数 */ }
    const data = validateHoliday(await io.fetchYear(year), year)
    let saved = false
    try { saved = io.set(key, { data, at: now }) } catch { /* 本次仍显示已验证数据 */ }
    return { data, source: `${year}年联网${saved ? '已缓存' : '（缓存写入失败）'}` }
  } catch {
    return { data: fallback, source: fallback ? `${year}年离线${cachedAt ? '缓存' : '内置'}` : `${year}年休班未取得` }
  }
}
export function holidayOn(d: CivilDate, results: HolidayResult[]): HolidayDay | undefined {
  return results.find(r => r.data?.year === d.year)?.data?.days.find(x => x.date === dateKey(d))
}
export const scriptingHolidayIO: HolidayIO = {
  get: key => Storage.get<unknown>(key),
  set: (key, value) => Storage.set(key, value),
  fetchYear: async year => {
    const response = await fetch(`https://raw.githubusercontent.com/NateScarlet/holiday-cn/master/${year}.json`, { timeout: 5 })
    if (!response.ok) throw new Error(`假日HTTP ${response.status}`)
    return await response.json()
  },
}
