import { chinaToday, dateKey } from './calendar'
import { ShiftRead, ShiftSettings, saveShifts, validateShifts } from './shifts'

// Home持有整个编辑会话，返回失败时草稿仍在；生命周期回调只读该稳定对象的最新值。
export type ShiftEditor = {
  draft: ShiftSettings; saved: ShiftRead; visible: boolean; editError: boolean
}
export function createShiftEditor(state: ShiftRead): ShiftEditor {
  return { draft: state.config, saved: state, visible: false, editError: false }
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
  // 坏存储回退模板不因仅查看/返回而覆盖原数据；用户实际修改后才尝试保存。
  if (editor.saved.error && !editor.editError && JSON.stringify(draft) === JSON.stringify(orderedShiftDraft(previous))) {
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
  if (JSON.stringify(value) === JSON.stringify(validateShifts(previous))) {
    if (editor.editError) { editor.saved = { config: previous, error: null }; editor.editError = false }
    return { changed: false, state: editor.saved, error: null }
  }
  if (!saveShifts(value)) return failed('保存失败，请稍后重试')
  editor.draft = value
  editor.saved = { config: value, error: null }; editor.editError = false
  return { changed: true, state: editor.saved, error: null }
}
