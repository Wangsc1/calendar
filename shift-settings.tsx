import { Button, ForEach, HStack, List, Navigation, Picker, RoundedRectangle, Section, Text, TextField, VStack, Widget, ZStack, useMemo, useState } from 'scripting'
import { Shift, ShiftRead, ShiftSettings, ShiftStyle, SHIFT_COLORS, MAX_SHIFTS, removeShift } from './shifts'
import { ShiftBadge } from './shift-badge'
import { ShiftEditor, commitShiftEditor } from './shift-editor'
import { ShiftDatePicker } from './shift-date-picker'

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
  return <VStack alignment="leading" spacing={8}>
    <HStack spacing={12}>
      {(['normal', 'transparent'] as ShiftStyle[]).map(style => <Button buttonStyle="plain" action={() => onChanged({ style })}>
        <HStack spacing={4}>
          <Text foregroundStyle="systemGreen">{(shift.style ?? 'normal') === style ? '◉' : '○'}</Text>
          <Text>{style === 'normal' ? '普通' : '透明'}</Text>
        </HStack>
      </Button>)}
    </HStack>
    {[0, 1, 2, 3].map(row => <HStack spacing={6} frame={{ maxWidth: 'infinity' }}>
      {SHIFT_COLORS.slice(row * 8, row * 8 + 8).map(c => <ColorSwatch color={c.value} selected={shift.color === c.value}
        onSelect={() => onChanged({ color: c.value })} />)}
    </HStack>)}
    {!SHIFT_COLORS.some(c => c.value === shift.color) ? <HStack spacing={8} frame={{ width: 100 }}>
      <Text font={12} foregroundStyle="secondaryLabel">原颜色</Text>
      <ColorSwatch color={shift.color} selected onSelect={() => {}} />
    </HStack> : null}
  </VStack>
}

type DeleteRequest = { shift: Shift; handled: boolean }

export function ShiftSettingsPage({ editor, onSaved }: { editor: ShiftEditor; onSaved: (value: ShiftRead) => void }) {
  const [draft, applyDraft] = useState<ShiftSettings>(editor.draft)
  const [dateText, applyDate] = useState(editor.dateText)
  const [notice, setNotice] = useState(editor.saved.error || '')
  const [deletion] = useState<{ current: DeleteRequest | null; presented: boolean }>({ current: null, presented: false })
  const [deleteRequest, setDeleteRequest] = useState<DeleteRequest | null>(null)
  const [deletePresented, setDeletePresented] = useState(false)
  const [datePicker] = useState({ active: false })
  // 更新稳定会话后再重绘；旧onDisappear闭包也会读取最新输入，不用effect清理保存。
  const setDraft = (value: ShiftSettings) => { editor.draft = value; applyDraft(value) }
  const setDateText = (value: string) => { editor.dateText = value; applyDate(value) }
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
    const current = editor.draft, next = removeShift(current, request.shift.id)
    if (!next.cycle.length) {
      setNotice('该班次占据全部循环位置，删除后循环将为空。班次和原排班未改动。'); return
    }
    if (next !== current) setDraft(next)
  }
  const chooseDate = async () => {
    if (datePicker.active || !editor.visible) return
    // 先设门闩再呈现：被模态日历遮盖不等于离开设置，不能触发返回保存。
    datePicker.active = true
    let confirmed: string | null = null
    try {
      await Navigation.present({
        element: <ShiftDatePicker initialDate={editor.dateText} onConfirm={key => { confirmed = key }} />,
        modalPresentationStyle: 'pageSheet',
      })
      if (confirmed !== null) setDateText(confirmed)
    } catch {
      setNotice('无法打开日期选择器，基准日期未更改，请重试。')
    } finally { datePicker.active = false }
  }
  const leave = () => {
    if (datePicker.active || deletion.presented || !editor.visible) return
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
    return <ForEach count={rows.length} itemBuilder={i => rows[i]} />
  }, [draft.shifts, editor])
  return <List navigationTitle="倒班设置" navigationBarTitleDisplayMode="inline" listStyle="insetGroup"
    scrollContentBackground="hidden" background="systemGroupedBackground"
    onAppear={() => { editor.visible = true; applyDraft(editor.draft); applyDate(editor.dateText); setNotice(editor.saved.error || '') }}
    onDisappear={leave}
    // 绑定在稳定的页面List，而不是可能被删除的行；不再从左滑回调调用全局Dialog.confirm。
    alert={{
      title: deleteRequest ? `删除“${deleteRequest.shift.name}”？` : '删除班次？',
      isPresented: deletePresented, onChanged: showDeleteConfirmation,
      message: <Text>会移除循环中该班次的所有位置；若被引用，需重新选择基准位置。返回时自动保存。</Text>,
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
    <Section header={<Text>班次设置</Text>}>
      {shiftRows}
      <Button title="新建班次" action={() => {
        if (editor.draft.shifts.length >= MAX_SHIFTS) { void Dialog.alert({ message: '最多12种班次。' }); return }
        let n = 1
        while (editor.draft.shifts.some(s => s.id === `s${n}`)) n++
        // 只增加类型，不改循环与基准；旧行删除回调另有对象身份保护，复用空闲ID也不会误删新类型。
        setDraft({ ...editor.draft, shifts: [...editor.draft.shifts, { id: `s${n}`, name: '', color: SHIFT_COLORS[0].value, style: 'normal' }] })
      }} />
    </Section>
    <Section header={<Text>基准日期及当日位置</Text>}>
      <Button title={`基准日期：${dateText || '请选择日期'}`} action={() => { void chooseDate() }} />
      <Picker title="基准日是循环的" pickerStyle="menu" value={draft.anchorIndex === null ? -1 : draft.anchorIndex}
        onChanged={(value: number) => setDraft({ ...editor.draft, anchorIndex: value < 0 ? null : value })}>
        <Text tag={-1}>请选择位置</Text>
        {draft.cycle.map((id, i) => {
          const shift = draft.shifts.find(s => s.id === id)!
          return <ShiftBadge shift={shift} tag={i} text={`第${i + 1}天 · ${shift.name || '未命名'}`} width={140} height={18} />
        })}
      </Picker>
    </Section>
  </List>
}
