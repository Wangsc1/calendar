import { Button, HStack, List, Picker, Section, Text, TextField, VStack, Widget, useState } from 'scripting'
import { ShiftRead, ShiftSettings, SHIFT_COLORS, MAX_CYCLE, MAX_SHIFTS, replaceCycle, removeShift, saveShifts, shiftsReady, validateShifts } from './shifts'

export function ShiftSettingsPage({ state, onSaved }: { state: ShiftRead; onSaved: (value: ShiftRead) => void }) {
  const [draft, setDraft] = useState<ShiftSettings>(state.config)
  const [dateText, setDateText] = useState(state.config.anchorDate || '')
  const [notice, setNotice] = useState(state.error || '')
  const changeCycle = (cycle: string[]) => { setDraft(replaceCycle(draft, cycle)); setNotice('循环已更改，请重新选择基准日的循环位置。') }
  const editShift = (id: string, update: { name?: string; color?: string }) => {
    setDraft({ ...draft, shifts: draft.shifts.map(s => s.id === id ? { ...s, ...update } : s) })
  }
  const save = () => {
    let value: ShiftSettings
    try { value = validateShifts({ ...draft, anchorDate: dateText.trim() || null }) }
    catch (error) { void Dialog.alert({ title: '请检查倒班设置', message: String(error) }); return }
    if (!saveShifts(value)) {
      setNotice('保存失败，未应用修改。请重试；桌面组件仍使用原设置。')
      void Dialog.alert({ title: '保存失败', message: '倒班设置未保存，请稍后重试。' })
      return
    }
    setDraft(value); setDateText(value.anchorDate || '')
    onSaved({ config: value, error: null })
    Widget.reloadAll()
    setNotice(shiftsReady(value) ? '已保存并请求刷新组件；iOS刷新可能延迟。' : '已保存；未开启或未完成基准设置，不显示排班。')
  }
  return <List navigationTitle="倒班设置" navigationBarTitleDisplayMode="inline" listStyle="insetGroup"
    scrollContentBackground="hidden" background="systemGroupedBackground">
    <Section header={<Text>倒班显示</Text>}>
      <Picker title="倒班显示" pickerStyle="segmented" value={draft.enabled ? 1 : 0}
        onChanged={(value: number) => setDraft({ ...draft, enabled: value === 1 })}>
        <Text tag={0}>关闭</Text><Text tag={1}>开启</Text>
      </Picker>
      <Text font={13} foregroundStyle="secondaryLabel">{!draft.enabled ? '已关闭；不显示排班。' : !dateText.trim() || draft.anchorIndex === null ? '未配置：请填写基准日期，并明确选择该日的循环位置。' : '待保存：按基准日向前、向后循环计算。'}</Text>
      <Text font={13} foregroundStyle="secondaryLabel">默认仅提供班次模板，不代表实际排班。所有编辑需点击底部“保存并刷新”；直接返回不保存。</Text>
      {notice ? <Text font={13} foregroundStyle="systemOrange">{notice}</Text> : null}
    </Section>
    <Section header={<Text>班次名称与颜色（1—4字，最多12种）</Text>}>
      {draft.shifts.map((s, i) => <VStack alignment="leading" spacing={6}>
        <TextField title={`班次${i + 1}`} value={s.name} prompt="请输入班次名称"
          onChanged={(name: string) => editShift(s.id, { name })} />
        <HStack>
          <Picker title="颜色" value={s.color} pickerStyle="menu" onChanged={(color: string) => editShift(s.id, { color })}>
            {SHIFT_COLORS.map(c => <Text tag={c.value} foregroundStyle={c.value}>{c.name}</Text>)}
          </Picker>
          <Button title="删除班次" role="destructive" action={() => {
            if (draft.shifts.length === 1) { void Dialog.alert({ title: '保留一个班次', message: '至少需保留一个班次。' }); return }
            void Dialog.confirm({ title: `删除“${s.name}”？`, message: '会移除循环中该班次的所有位置；若被引用，需重新选择基准位置。点击保存后生效。', confirmLabel: '删除', cancelLabel: '取消' }).then(ok => {
              if (ok) { setDraft(removeShift(draft, s.id)); setNotice('班次已从草稿移除，请检查循环和基准位置后保存。') }
            })
          }} />
        </HStack>
      </VStack>)}
      <Button title="新建班次" action={() => {
        if (draft.shifts.length >= MAX_SHIFTS) { void Dialog.alert({ message: '最多12种班次。' }); return }
        let n = 1
        while (draft.shifts.some(s => s.id === `s${n}`)) n++
        setDraft({ ...draft, shifts: [...draft.shifts, { id: `s${n}`, name: '', color: SHIFT_COLORS[0].value }] })
      }} />
    </Section>
    <Section header={<Text>{`循环顺序（${draft.cycle.length}天，最多60天）`}</Text>}>
      <Text font={13} foregroundStyle="secondaryLabel">每个位置代表一天；可重复选择同一班次形成连续多天。更改顺序或删除位置后，请重新确认基准位置。</Text>
      {draft.cycle.map((id, i) => <VStack alignment="leading" spacing={4}>
        <Picker title={`第${i + 1}天`} value={id} pickerStyle="menu" onChanged={(value: string) => changeCycle(draft.cycle.map((x, j) => j === i ? value : x))}>
          {draft.shifts.map(s => <Text tag={s.id} foregroundStyle={s.color}>{s.name || '未命名'}</Text>)}
        </Picker>
        <HStack spacing={16}>
          {i > 0 ? <Button title="上移" action={() => {
            const cycle = [...draft.cycle]; [cycle[i - 1], cycle[i]] = [cycle[i], cycle[i - 1]]; changeCycle(cycle)
          }} /> : null}
          {i < draft.cycle.length - 1 ? <Button title="下移" action={() => {
            const cycle = [...draft.cycle]; [cycle[i + 1], cycle[i]] = [cycle[i], cycle[i + 1]]; changeCycle(cycle)
          }} /> : null}
          <Button title="移除这一天" role="destructive" action={() => changeCycle(draft.cycle.filter((_, j) => j !== i))} />
        </HStack>
      </VStack>)}
      <Button title="添加一天" action={() => {
        if (draft.cycle.length >= MAX_CYCLE) { void Dialog.alert({ message: '循环最多60天。' }); return }
        changeCycle([...draft.cycle, draft.shifts[0].id])
      }} />
    </Section>
    <Section header={<Text>基准日期及当日位置</Text>}>
      <TextField title="基准日期" prompt="YYYY-MM-DD（必填才显示）" value={dateText} onChanged={setDateText} />
      <Picker title="基准日是循环的" pickerStyle="menu" value={draft.anchorIndex === null ? -1 : draft.anchorIndex}
        onChanged={(value: number) => setDraft({ ...draft, anchorIndex: value < 0 ? null : value })}>
        <Text tag={-1}>请选择位置</Text>
        {draft.cycle.map((id, i) => <Text tag={i}>{`第${i + 1}天 · ${draft.shifts.find(s => s.id === id)?.name || '未命名'}`}</Text>)}
      </Picker>
      <Text font={13} foregroundStyle="secondaryLabel">日期按北京时间自然日计算，格式如2026-11-10。重复班次请按“第几天”选择，不仅按名称选择。基准日前也按相同循环倒推；任一项未配置都不显示排班。</Text>
    </Section>
    <Section><Button title="保存并刷新" action={save} /></Section>
  </List>
}
