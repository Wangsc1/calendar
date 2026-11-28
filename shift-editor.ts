import { chinaToday, dateKey } from './calendar'
import { ShiftRead, ShiftSettings, saveShifts, validateShifts } from './shifts'

function maxShiftSeq(config: ShiftSettings): number {
  return config.shifts.reduce((max, s) => {
    const m = /^s(\d{1,4})$/.exec(s.id)
    return m ? Math.max(max, Number(m[1])) : max
  }, 0)
}
function editableSnapshot(config: ShiftSettings): string {
  return JSON.stringify({
    enabled: config.enabled,
    shifts: config.shifts.map(s => ({
      id: s.id,
      name: s.name.trim(),
      color: s.color,
      style: s.style ?? 'normal',
    })),
  })
}

// Home持有整个编辑会话，返回失败时草稿仍在；生命周期回调只读该稳定对象的最新值。
export type ShiftEditor = {
  draft: ShiftSettings; saved: ShiftRead; visible: boolean; editError: boolean
  storageBroken: boolean; nextShiftSeq: number
}
export function createShiftEditor(state: ShiftRead): ShiftEditor {
  return {
    draft: state.config, saved: state, visible: false, editError: false,
    storageBroken: Boolean(state.error), nextShiftSeq: maxShiftSeq(state.config) + 1,
  }
}
export function allocateShiftId(editor: ShiftEditor): string {
  let n = Math.max(1, editor.nextShiftSeq, maxShiftSeq(editor.saved.config) + 1, maxShiftSeq(editor.draft) + 1)
  if (n <= 9999) {
    editor.nextShiftSeq = n + 1
    return `s${n}`
  }
  const reserved = new Set([...editor.saved.config.shifts.map(s => s.id), ...editor.draft.shifts.map(s => s.id)])
  n = 1
  while (reserved.has(`s${n}`) && n < 9999) n++
  if (editor.draft.shifts.some(s => s.id === `s${n}`)) {
    n = 1
    while (editor.draft.shifts.some(s => s.id === `s${n}`)) n++
  }
  return `s${n}`
}
// 只改变设置草稿的每日循环；读取历史存储不会转换或写入。
export function orderedShiftDraft(config: ShiftSettings): ShiftSettings {
  return { ...config, cycle: config.shifts.map(s => s.id) }
}
export type ShiftCommit = { changed: boolean; state: ShiftRead; error: string | null }
export function commitShiftEditor(editor: ShiftEditor): ShiftCommit {
  const failed = (message: string): ShiftCommit => {
    const error = `${message}。未应用修改，原排班保留；草稿在本次打开期间保留，请重新进入倒班设置修正或重试。`
    editor.saved = { ...editor.saved, error }; editor.editError = true
    return { changed: false, state: editor.saved, error }
  }
  const previous = editor.saved.config, draft = orderedShiftDraft(editor.draft)
  // 仅打开查看或改动后还原（含首次安装、旧版配置及坏存储回退模板），均不写入存储、不提前锁定或重置起算日。
  if (editableSnapshot(draft) === editableSnapshot(previous)) {
    if (!editor.storageBroken) {
      editor.draft = orderedShiftDraft(previous)
      if (editor.editError) { editor.saved = { config: previous, error: null }; editor.editError = false }
    }
    return { changed: false, state: editor.saved, error: null }
  }
  const structureChanged = JSON.stringify(draft.shifts.map(s => s.id)) !== JSON.stringify(previous.shifts.map(s => s.id))
  // 标记区分旧手选基准（即使旧cycle碰巧已等于列表）与已接受新规则的存储。
  const reset = previous.cycleRule !== 'list-daily-v1' || !previous.anchorDate || previous.anchorIndex === null || structureChanged
  let value: ShiftSettings
  try {
    value = validateShifts({ ...draft, cycleRule: 'list-daily-v1',
      anchorDate: reset ? dateKey(chinaToday()) : previous.anchorDate, anchorIndex: 0 })
  } catch (error) { return failed(String(error).replace(/^Error: /, '')) }
  if (!editor.storageBroken && JSON.stringify(value) === JSON.stringify(validateShifts(previous))) {
    editor.draft = value
    if (editor.editError) { editor.saved = { config: previous, error: null }; editor.editError = false }
    return { changed: false, state: editor.saved, error: null }
  }
  if (!saveShifts(value)) return failed('保存失败，请稍后重试')
  editor.draft = value
  editor.saved = { config: value, error: null }
  editor.editError = false
  editor.storageBroken = false
  editor.nextShiftSeq = Math.max(editor.nextShiftSeq, maxShiftSeq(value) + 1)
  return { changed: true, state: editor.saved, error: null }
}
