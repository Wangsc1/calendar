import { Button, EditButton, ForEach, HStack, List, Picker, RoundedRectangle, Section, Spacer, Text, TextField, VStack, Widget, ZStack, useState } from 'scripting'
import { Shift, ShiftRead, ShiftSettings, ShiftStyle, SHIFT_COLORS, MAX_SHIFTS, moveCycle, replaceCycle, removeShift } from './shifts'
import { ShiftBadge } from './shift-badge'
import { ShiftEditor, commitShiftEditor } from './shift-editor'

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
          <ShiftBadge shift={{ ...shift, style }} text={style === 'normal' ? '普通' : '透明'} width={64} height={24} font={13} />
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
    <HStack spacing={8}>
      <Text font={12} foregroundStyle="secondaryLabel">预览</Text>
      <ShiftBadge shift={shift} width={76} height={22} font={13} />
    </HStack>
  </VStack>
}

export function ShiftSettingsPage({ editor, onSaved }: { editor: ShiftEditor; onSaved: (value: ShiftRead) => void }) {
  const [draft, applyDraft] = useState<ShiftSettings>(editor.draft)
  const [dateText, applyDate] = useState(editor.dateText)
  const [notice, setNotice] = useState(editor.saved.error || '')
  // 更新稳定会话后再重绘；旧onDisappear闭包也会读取最新输入，不用effect清理保存。
  const setDraft = (value: ShiftSettings) => { editor.draft = value; applyDraft(value) }
  const setDateText = (value: string) => { editor.dateText = value; applyDate(value) }
  const changeCycle = (cycle: string[]) => setDraft(replaceCycle(editor.draft, cycle))
  const editShift = (id: string, update: Partial<Pick<Shift, 'name' | 'color' | 'style'>>) => {
    setDraft({ ...editor.draft, shifts: editor.draft.shifts.map(s => s.id === id ? { ...s, ...update } : s) })
  }
  const leave = () => {
    if (!editor.visible) return
    editor.visible = false
    const previous = editor.saved, result = commitShiftEditor(editor)
    if (result.state !== previous) onSaved(result.state)
    if (result.changed) Widget.reloadAll()
    if (result.error) void Dialog.alert({ title: '倒班设置未保存', message: result.error })
  }
  return <List navigationTitle="倒班设置" navigationBarTitleDisplayMode="inline" listStyle="insetGroup"
    scrollContentBackground="hidden" background="systemGroupedBackground"
    onAppear={() => { editor.visible = true; applyDraft(editor.draft); applyDate(editor.dateText); setNotice(editor.saved.error || '') }}
    onDisappear={leave}>
    <Section header={<Text>倒班显示</Text>}>
      <Picker title="倒班显示" pickerStyle="segmented" value={draft.enabled ? 1 : 0}
        onChanged={(value: number) => setDraft({ ...editor.draft, enabled: value === 1 })}>
        <Text tag={0}>关闭</Text><Text tag={1}>开启</Text>
      </Picker>
      {notice ? <Text font={13} foregroundStyle="systemOrange">{notice}</Text> : null}
    </Section>
    <Section header={<HStack frame={{ maxWidth: 'infinity' }}><Text>班次设置</Text><Spacer /><EditButton /></HStack>}>
      <Text font={13} foregroundStyle="secondaryLabel">班次名称与样式（1—4字，最多12种）</Text>
      {draft.shifts.map((s, i) => <VStack alignment="leading" spacing={6} trailingSwipeActions={{
        allowsFullSwipe: false,
        actions: [<Button title="删除班次" role="destructive" action={() => {
          if (editor.draft.shifts.length === 1) { void Dialog.alert({ title: '保留一个班次', message: '至少需保留一个班次。' }); return }
          void Dialog.confirm({ title: `删除“${s.name}”？`, message: '会移除循环中该班次的所有位置；若被引用，需重新选择基准位置。返回时自动保存。', confirmLabel: '删除', cancelLabel: '取消' }).then(ok => {
            if (ok && editor.visible) setDraft(removeShift(editor.draft, s.id))
          })
        }} />],
      }}>
        <TextField title={`班次${i + 1}`} value={s.name} prompt="请输入班次名称"
          onChanged={(name: string) => editShift(s.id, { name })} />
        <ShiftAppearance shift={s} onChanged={update => editShift(s.id, update)} />
      </VStack>)}
      <Button title="新建班次" action={() => {
        if (editor.draft.shifts.length >= MAX_SHIFTS) { void Dialog.alert({ message: '最多12种班次。' }); return }
        let n = 1
        while (editor.draft.shifts.some(s => s.id === `s${n}`)) n++
        setDraft({ ...editor.draft, shifts: [...editor.draft.shifts, { id: `s${n}`, name: '', color: SHIFT_COLORS[0].value, style: 'normal' }] })
      }} />
      <Text font={13} foregroundStyle="secondaryLabel">{`循环顺序（${draft.cycle.length}天）`}</Text>
      <Text font={13} foregroundStyle="secondaryLabel">每个位置代表一天，可重复选择同一班次。点“编辑”后拖动右侧排序手柄；循环变更后请重新确认基准位置。</Text>
      <ForEach count={draft.cycle.length} onMove={(indices: number[], offset: number) => {
        // 只移动循环天，不移动上方班次类型；忽略陈旧列表回调。
        if (draft.cycle !== editor.draft.cycle) return
        setDraft(moveCycle(editor.draft, indices, offset))
      }} itemBuilder={i => <VStack key={`cycle-${i}`} alignment="leading" spacing={4}>
        <Picker title={`第${i + 1}天`} value={draft.cycle[i]} pickerStyle="menu" onChanged={(value: string) => changeCycle(editor.draft.cycle.map((x, j) => j === i ? value : x))}>
          {draft.shifts.map(s => <ShiftBadge shift={s} tag={s.id} text={s.name || '未命名'} width={76} height={18} />)}
        </Picker>
        <Button title="移除这一天" role="destructive" action={() => changeCycle(editor.draft.cycle.filter((_, j) => j !== i))} />
      </VStack>} />
      <Button title="添加一天" action={() => changeCycle([...editor.draft.cycle, editor.draft.shifts[0].id])} />
    </Section>
    <Section header={<Text>基准日期及当日位置</Text>}>
      <TextField title="基准日期" prompt="YYYY-MM-DD（必填才显示）" value={dateText} onChanged={setDateText} />
      <Picker title="基准日是循环的" pickerStyle="menu" value={draft.anchorIndex === null ? -1 : draft.anchorIndex}
        onChanged={(value: number) => setDraft({ ...editor.draft, anchorIndex: value < 0 ? null : value })}>
        <Text tag={-1}>请选择位置</Text>
        {draft.cycle.map((id, i) => {
          const shift = draft.shifts.find(s => s.id === id)!
          return <ShiftBadge shift={shift} tag={i} text={`第${i + 1}天 · ${shift.name || '未命名'}`} width={140} height={18} />
        })}
      </Picker>
      <Text font={13} foregroundStyle="secondaryLabel">日期按北京时间自然日计算，格式如2026-11-10。重复班次请按“第几天”选择，不仅按名称选择。基准日前也按相同循环倒推；任一项未配置都不显示排班。</Text>
    </Section>
  </List>
}
