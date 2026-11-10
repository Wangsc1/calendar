import { ShiftRead, ShiftSettings, saveShifts, validateShifts } from './shifts'

// Home持有整个编辑会话，返回失败时草稿仍在；生命周期回调只读该稳定对象的最新值。
export type ShiftEditor = {
  draft: ShiftSettings; dateText: string; saved: ShiftRead; visible: boolean; editError: boolean
}
export function createShiftEditor(state: ShiftRead): ShiftEditor {
  return { draft: state.config, dateText: state.config.anchorDate || '', saved: state, visible: false, editError: false }
}
export type ShiftCommit = { changed: boolean; state: ShiftRead; error: string | null }
export function commitShiftEditor(editor: ShiftEditor): ShiftCommit {
  const failed = (message: string): ShiftCommit => {
    const error = `${message}。未应用修改，原排班保留；草稿在本次打开期间保留，请重新进入倒班设置修正或重试。`
    editor.saved = { ...editor.saved, error }; editor.editError = true
    return { changed: false, state: editor.saved, error }
  }
  let value: ShiftSettings
  try { value = validateShifts({ ...editor.draft, anchorDate: editor.dateText.trim() || null }) }
  catch (error) { return failed(String(error).replace(/^Error: /, '')) }
  const previous = editor.saved.config
  if (JSON.stringify(value) === JSON.stringify(validateShifts(previous))) {
    if (editor.editError) { editor.saved = { config: previous, error: null }; editor.editError = false }
    return { changed: false, state: editor.saved, error: null }
  }
  // 未配置的新用户可编辑模板，但不能用缺失基准的草稿覆盖已经配置的排班。
  if (previous.anchorDate !== null && previous.anchorIndex !== null &&
    (value.anchorDate === null || value.anchorIndex === null)) {
    return failed('基准配置不完整，请重新选择有效日期及循环位置')
  }
  if (!saveShifts(value)) return failed('保存失败，请稍后重试')
  editor.draft = value; editor.dateText = value.anchorDate || ''
  editor.saved = { config: value, error: null }; editor.editError = false
  return { changed: true, state: editor.saved, error: null }
}
