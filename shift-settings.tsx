import { Button, EditButton, ForEach, HStack, Image, List, Picker, RoundedRectangle, Section, Spacer, Text, TextField, VStack, Widget, ZStack, useMemo, useState } from 'scripting'
import { Shift, ShiftRead, ShiftSettings, ShiftStyle, SHIFT_COLORS, LEGACY_SHIFT_COLORS, MAX_SHIFTS } from './shifts'
import { ShiftBadge } from './shift-badge'
import { ShiftEditor, commitShiftEditor, orderedShiftDraft } from './shift-editor'

// 仅合并展示色板：保留新色顺序，再追加未重复的合法旧色；不迁移任何已存颜色。
const APPEARANCE_COLORS = [...SHIFT_COLORS, ...LEGACY_SHIFT_COLORS].filter((c, i, all) => all.findIndex(x => x.value === c.value) === i)

function ColorSwatch({ color, selected, onSelect }: { color: string; selected: boolean; onSelect: () => void }) {
  return <Button buttonStyle="plain" action={onSelect} frame={{ minWidth: 0, maxWidth: 'infinity' }}>
    <ZStack frame={{ maxWidth: 'infinity', height: 30 }}>
      <RoundedRectangle cornerRadius={3} fill={color} stroke={{ shapeStyle: '#8e8e93', strokeStyle: { lineWidth: .5 } }} />
      {selected ? <Text font={14} fontWeight="bold" foregroundStyle="white" frame={{ width: 18, height: 18 }}
        background={<RoundedRectangle cornerRadius={4} fill="#202024" />}>✓</Text> : null}
    </ZStack>
  </Button>
}
function ShiftAppearance({ shift, onChanged }: { shift: Shift; onChanged: (update: Partial<Pick<Shift, 'name' | 'color' | 'style'>>) => void }) {
  const [colorsExpanded, setColorsExpanded] = useState(false)
  return <VStack alignment="leading" spacing={8}>
    <HStack spacing={12}>
      {(['normal', 'transparent'] as ShiftStyle[]).map(style => <Button buttonStyle="plain" action={() => onChanged({ style })}>
        <ZStack frame={{ width: 72, height: 32 }}>
          <ShiftBadge shift={{ ...shift, style }} text={style === 'normal' ? '普通' : '透明'} width={64} height={24} font={13} />
          {(shift.style ?? 'normal') === style ? <RoundedRectangle cornerRadius={6} fill="clear"
            stroke={{ shapeStyle: 'systemGreen', strokeStyle: { lineWidth: 2 } }} frame={{ width: 72, height: 32 }} /> : null}
        </ZStack>
      </Button>)}
      <Spacer />
      <Button buttonStyle="plain" action={() => setColorsExpanded(!colorsExpanded)}>
        <Image systemName={colorsExpanded ? 'chevron.up' : 'chevron.down'} foregroundStyle="secondaryLabel"
          frame={{ width: 44, height: 32 }} />
      </Button>
    </HStack>
    {colorsExpanded ? Array.from({ length: Math.ceil(APPEARANCE_COLORS.length / 8) }, (_, row) => <HStack spacing={6} frame={{ maxWidth: 'infinity' }}>
      {Array.from({ length: 8 }, (_, col) => {
        const c = APPEARANCE_COLORS[row * 8 + col]
        return c ? <ColorSwatch color={c.value} selected={shift.color === c.value}
          onSelect={() => onChanged({ color: c.value })} />
          : <Spacer frame={{ minWidth: 0, maxWidth: 'infinity', minHeight: 30, maxHeight: 30 }} />
      })}
    </HStack>) : null}
  </VStack>
}

type DeleteRequest = { shift: Shift; handled: boolean }

export function ShiftSettingsPage({ editor, onSaved }: { editor: ShiftEditor; onSaved: (value: ShiftRead) => void }) {
  const [draft, applyDraft] = useState<ShiftSettings>(editor.draft)
  const [notice, setNotice] = useState(editor.saved.error || '')
  const [deletion] = useState<{ current: DeleteRequest | null; presented: boolean }>({ current: null, presented: false })
  const [deleteRequest, setDeleteRequest] = useState<DeleteRequest | null>(null)
  const [deletePresented, setDeletePresented] = useState(false)
  // 更新稳定会话后再重绘；旧onDisappear闭包也会读取最新输入，不用effect清理保存。
  const setDraft = (value: ShiftSettings) => { editor.draft = orderedShiftDraft(value); applyDraft(editor.draft) }
  const moveShifts = (indices: number[], newOffset: number) => {
    if (!editor.visible || deletion.presented) return
    const current = editor.draft.shifts
    if (!indices.length || new Set(indices).size !== indices.length || indices.some(i => !Number.isInteger(i) || i < 0 || i >= current.length) ||
      !Number.isInteger(newOffset) || newOffset < 0 || newOffset > current.length) return
    const sorted = [...indices].sort((a, b) => a - b), moving = sorted.map(i => current[i])
    const next = current.filter((_, i) => !sorted.includes(i))
    // 与AI账号排序相同：原生目标偏移指向原列表，先扣除目标之前已移出的项。
    next.splice(newOffset - sorted.filter(i => i < newOffset).length, 0, ...moving)
    if (next.every((s, i) => s === current[i])) return
    setDraft({ ...editor.draft, shifts: next })
  }
  const editShift = (id: string, update: Partial<Pick<Shift, 'name' | 'color' | 'style'>>) => {
    setDraft({ ...editor.draft, shifts: editor.draft.shifts.map(s => s.id === id ? { ...s, ...update } : s) })
  }
  const showDeleteConfirmation = (presented: boolean) => {
    deletion.presented = presented
    setDeletePresented(presented)
  }
  const requestDelete = (shift: Shift) => {
    if (deletion.presented || !editor.visible || !editor.draft.shifts.includes(shift)) return
    if (editor.draft.shifts.length <= 1) { setNotice('至少需保留一个班次。'); return }
    const request: DeleteRequest = { shift, handled: false }
    deletion.current = request
    setDeleteRequest(request)
    showDeleteConfirmation(true)
  }
  const finishDelete = (request: DeleteRequest, confirmed: boolean) => {
    // 动作保留请求快照，不依赖原生onChanged(false)与按钮动作的先后顺序。
    if (request.handled || deletion.current !== request) return
    request.handled = true
    showDeleteConfirmation(false)
    if (!confirmed || !editor.visible || !editor.draft.shifts.includes(request.shift)) return
    if (editor.draft.shifts.length <= 1) { setNotice('至少需保留一个班次。'); return }
    setDraft({ ...editor.draft, shifts: editor.draft.shifts.filter(s => s.id !== request.shift.id) })
  }
  const leave = () => {
    if (deletion.presented || !editor.visible) return
    editor.visible = false
    const previous = editor.saved, result = commitShiftEditor(editor)
    if (result.state !== previous) onSaved(result.state)
    if (result.changed) Widget.reloadAll()
    if (result.error) void Dialog.alert({ title: '倒班设置未保存', message: result.error })
  }
  // 弹窗开关不改变班次：复用ForEach、构建回调及行的JS节点，不因弹窗开关重新创建。
  // 编辑/增删时shifts数组才变化；回调读取稳定editor/deletion，不捕获弹窗请求状态。
  const shiftRows = useMemo(() => {
    const rows = draft.shifts.map((s, i) => <VStack key={s.id} alignment="leading" spacing={6} trailingSwipeActions={{
      allowsFullSwipe: false,
      actions: [<Button title="删除班次" tint="red" action={() => requestDelete(s)} />],
    }}>
      <TextField title={`班次${i + 1}`} value={s.name} prompt="请输入班次名称"
        onChanged={(name: string) => editShift(s.id, { name })} />
      <ShiftAppearance shift={s} onChanged={update => editShift(s.id, update)} />
    </VStack>)
    return <ForEach count={rows.length} itemBuilder={i => rows[i]} onMove={moveShifts} />
  }, [draft.shifts, editor])
  return <List navigationTitle="倒班设置" navigationBarTitleDisplayMode="inline" listStyle="insetGroup"
    scrollContentBackground="hidden" background="systemGroupedBackground"
    onAppear={() => { editor.visible = true; setDraft(editor.draft); setNotice(editor.saved.error || '') }}
    onDisappear={leave}
    // 绑定在稳定的页面List，而不是可能被删除的行；不再从左滑回调调用全局Dialog.confirm。
    alert={{
      title: deleteRequest ? `删除“${deleteRequest.shift.name}”？` : '删除班次？',
      isPresented: deletePresented, onChanged: showDeleteConfirmation,
      message: <Text>会删除该班次；其余班次按列表顺序每天一班循环，返回保存后从当天第一班重新起算。</Text>,
      actions: <>
        <Button title="删除" role="destructive" action={() => { if (deleteRequest) finishDelete(deleteRequest, true) }} />
        <Button title="取消" role="cancel" action={() => { if (deleteRequest) finishDelete(deleteRequest, false) }} />
      </>,
    }}>
    <Section header={<Text>倒班显示</Text>}>
      <Picker title="倒班显示" pickerStyle="segmented" value={draft.enabled ? 1 : 0}
        onChanged={(value: number) => setDraft({ ...editor.draft, enabled: value === 1 })}>
        <Text tag={0}>关闭</Text><Text tag={1}>开启</Text>
      </Picker>
      {notice ? <Text font={13} foregroundStyle="systemOrange">{notice}</Text> : null}
    </Section>
    <Section header={<HStack frame={{ maxWidth: 'infinity' }}><Text>班次设置</Text><Spacer /><EditButton /></HStack>}
      footer={<Text>班次循环按照以上排序从当日开始循环</Text>}>
      {shiftRows}
      <Button title="新建班次" action={() => {
        if (editor.draft.shifts.length >= MAX_SHIFTS) { void Dialog.alert({ message: '最多12种班次。' }); return }
        let n = 1
        while (editor.draft.shifts.some(s => s.id === `s${n}`)) n++
        // 新班次追加到每日循环；旧行回调另有对象身份保护，复用空闲ID也不会误删新类型。
        setDraft({ ...editor.draft, shifts: [...editor.draft.shifts, { id: `s${n}`, name: '', color: SHIFT_COLORS[0].value, style: 'normal' }] })
      }} />
    </Section>
  </List>
}
