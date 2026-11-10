import { CivilDate, MIN_YEAR, MAX_YEAR, dateKey } from './calendar'

export const SHIFTS_KEY = 'calendar.shifts.v1'
export const MAX_SHIFTS = 12
export const MAX_CYCLE = 60
export const SHIFT_COLORS = [
  { name: '蓝', value: '#287ab8' }, { name: '红', value: '#c54249' },
  { name: '橙', value: '#a95d13' }, { name: '绿', value: '#387d38' },
  { name: '紫', value: '#8650ad' }, { name: '青', value: '#167b83' },
]
export type Shift = { id: string; name: string; color: string }
export type ShiftSettings = {
  schema: 1; enabled: boolean; shifts: Shift[]; cycle: string[]
  anchorDate: string | null; anchorIndex: number | null
}
export type ShiftRead = { config: ShiftSettings; error: string | null }
export function defaultShifts(): ShiftSettings {
  return { schema: 1, enabled: false, shifts: ['白班', '上夜', '下夜', '休息'].map((name, i) => ({
    id: `s${i + 1}`, name, color: SHIFT_COLORS[i].value,
  })), cycle: ['s1', 's2', 's3', 's4'], anchorDate: null, anchorIndex: null }
}
export function parseShiftDate(value: string): CivilDate | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  return year >= MIN_YEAR && year <= MAX_YEAR && d.getUTCFullYear() === year &&
    d.getUTCMonth() + 1 === month && d.getUTCDate() === day ? { year, month, day } : null
}
// 整体校验，不修补坏循环或猜测基准位置，以免静默改变真实排班。
export function validateShifts(raw: unknown): ShiftSettings {
  if (!raw || typeof raw !== 'object') throw new Error('倒班配置格式无效')
  const x = raw as Partial<ShiftSettings>
  if (x.schema !== 1 || typeof x.enabled !== 'boolean' || !Array.isArray(x.shifts) ||
    x.shifts.length < 1 || x.shifts.length > MAX_SHIFTS || !Array.isArray(x.cycle) ||
    x.cycle.length < 1 || x.cycle.length > MAX_CYCLE) throw new Error('班次需1—12种，循环需1—60天')
  const ids = new Set<string>(), names = new Set<string>()
  const shifts = x.shifts.map(s => {
    if (!s || typeof s.id !== 'string' || !/^s\d{1,4}$/.test(s.id) || ids.has(s.id) ||
      typeof s.name !== 'string' || !s.name.trim() || Array.from(s.name.trim()).length > 4 ||
      /[\u0000-\u001f\u007f]/.test(s.name) || names.has(s.name.trim()) ||
      !SHIFT_COLORS.some(c => c.value === s.color)) throw new Error('班次名称须唯一、1—4字，颜色须从列表选择')
    ids.add(s.id); names.add(s.name.trim())
    return { id: s.id, name: s.name.trim(), color: s.color }
  })
  if (!x.cycle.every(id => typeof id === 'string' && ids.has(id))) throw new Error('循环引用了不存在的班次')
  if (x.anchorDate !== null && (typeof x.anchorDate !== 'string' || !parseShiftDate(x.anchorDate))) throw new Error('基准日期须为1901—2099年的有效YYYY-MM-DD日期')
  if (x.anchorIndex !== null && (typeof x.anchorIndex !== 'number' || !Number.isInteger(x.anchorIndex) ||
    x.anchorIndex < 0 || x.anchorIndex >= x.cycle.length)) throw new Error('请选择基准日对应的循环位置')
  return { schema: 1, enabled: x.enabled, shifts, cycle: [...x.cycle], anchorDate: x.anchorDate!, anchorIndex: x.anchorIndex! }
}
export function readShifts(): ShiftRead {
  try {
    const raw = Storage.get<unknown>(SHIFTS_KEY)
    return { config: raw == null ? defaultShifts() : validateShifts(raw), error: null }
  } catch {
    return { config: defaultShifts(), error: '倒班配置无法读取或已损坏，暂不显示排班；原存储未改动。请检查后保存。' }
  }
}
export function saveShifts(value: ShiftSettings): boolean {
  try { return Storage.set(SHIFTS_KEY, validateShifts(value)) } catch { return false }
}
export function shiftsReady(config: ShiftSettings): boolean {
  return config.enabled && config.anchorDate !== null && config.anchorIndex !== null && config.cycle.length > 0
}
export function shiftOn(d: CivilDate, config?: ShiftSettings): Shift | undefined {
  if (!config || !shiftsReady(config)) return undefined
  const anchor = parseShiftDate(config.anchorDate!)
  if (!anchor || !parseShiftDate(dateKey(d))) return undefined
  const delta = (Date.UTC(d.year, d.month - 1, d.day) - Date.UTC(anchor.year, anchor.month - 1, anchor.day)) / 86400000
  const length = config.cycle.length
  const index = ((delta + config.anchorIndex!) % length + length) % length
  return config.shifts.find(s => s.id === config.cycle[index])
}
// 改动循环后清除位置，必须由用户重新确认；同名班次的不同重复位置不混为一谈。
export function replaceCycle(config: ShiftSettings, cycle: string[]): ShiftSettings {
  return { ...config, cycle, anchorIndex: null }
}
export function removeShift(config: ShiftSettings, id: string): ShiftSettings {
  const cycle = config.cycle.filter(item => item !== id)
  const next = { ...config, shifts: config.shifts.filter(s => s.id !== id) }
  return cycle.length === config.cycle.length ? next : replaceCycle(next, cycle)
}
