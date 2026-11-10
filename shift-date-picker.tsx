import { Button, DatePicker, HStack, Navigation, NavigationStack, Text, VStack, useState } from 'scripting'
import { MAX_YEAR, MIN_YEAR, chinaToday, dateKey } from './calendar'
import { parseShiftDate } from './shifts'

// DatePicker绑定的是毫秒时间戳，且当前官方environments无timeZone/calendar覆盖。
// 这里的本地正午仅是UI年月日的载体，不是排班发生的时刻；存储仍为北京自然日字符串。
export function pickerDateValue(key: string): number {
  const d = parseShiftDate(key)
  if (!d) throw new Error('无效的基准日期')
  return new Date(d.year, d.month - 1, d.day, 12).getTime()
}
export function pickerCivilDate(value: number): string | null {
  if (!Number.isFinite(value)) return null
  const d = new Date(value)
  const key = dateKey({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() })
  return parseShiftDate(key) ? key : null
}
function initialCandidate(key: string): number {
  const today = chinaToday()
  const fallback = today.year < MIN_YEAR ? `${MIN_YEAR}-01-01` : today.year > MAX_YEAR ? `${MAX_YEAR}-12-31` : dateKey(today)
  return pickerDateValue(parseShiftDate(key) ? key : fallback)
}

export function ShiftDatePicker({ initialDate, onConfirm }: { initialDate: string; onConfirm: (key: string) => void }) {
  const dismiss = Navigation.useDismiss()
  // 稳定对象读取最新候选，避免同一渲染中的onChanged/确认捕获旧值。候选不触碰设置草稿。
  const [selection] = useState({ value: initialCandidate(initialDate), valid: true, done: false })
  const [value, setValue] = useState(selection.value)
  const [error, setError] = useState('')
  return <NavigationStack>
    <VStack navigationTitle="选择基准日期" navigationBarTitleDisplayMode="inline" padding={16} spacing={12}>
      <DatePicker title="基准日期" value={value} displayedComponents={['date']} datePickerStyle="graphical"
        startDate={new Date(MIN_YEAR, 0, 1).getTime()} endDate={new Date(MAX_YEAR, 11, 31, 23, 59, 59, 999).getTime()}
        onChanged={(next: number) => {
          if (selection.done) return
          selection.valid = pickerCivilDate(next) !== null
          if (selection.valid) { selection.value = next; setValue(next); setError('') }
          else setError('请选择1901—2099年的有效日期。')
        }} />
      {error ? <Text font={13} foregroundStyle="systemOrange">{error}</Text> : null}
      <HStack spacing={32}>
        <Button title="取消" action={() => { if (!selection.done) { selection.done = true; dismiss() } }} />
        <Button title="确认" action={() => {
          if (selection.done || !selection.valid) return
          const key = pickerCivilDate(selection.value)
          if (!key) { setError('请选择1901—2099年的有效日期。'); return }
          selection.done = true; onConfirm(key); dismiss()
        }} />
      </HStack>
    </VStack>
  </NavigationStack>
}
