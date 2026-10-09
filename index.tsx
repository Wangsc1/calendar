import { Button, HStack, Image, List, Navigation, NavigationStack, Picker, Script, Section, Spacer, Text, Widget, useState } from 'scripting'
import { Appearance, WEEKDAY_NAMES, chinaToday, layoutDates, readAppearance, saveAppearance, defaultAppearance, normalizeAppearance } from './calendar'
import { loadHoliday, scriptingHolidayIO } from './holidays'
import { VERSION } from './version'

let busy = false
async function feedback(action: () => Promise<string | null>) {
  if (busy) return
  busy = true
  try {
    const message = await action()
    if (message) await Dialog.alert({ title: '双周农历', message: message.slice(0, 320), buttonLabel: '好' })
  } catch (error) { await Dialog.alert({ title: '操作失败', message: String(error).slice(0, 320), buttonLabel: '好' }) }
  finally { busy = false }
}
function persist(next: Appearance, apply: (value: Appearance) => void): boolean {
  const value = normalizeAppearance(next)
  if (!saveAppearance(value)) { void Dialog.alert({ title: '保存失败', message: '设置未保存，请稍后重试。' }); return false }
  apply(value)
  Widget.reloadAll()
  return true
}
function RowLabel({ title, symbol, color }: { title: string; symbol: string; color: string }) {
  return <HStack spacing={12}>
    <Image systemName={symbol} foregroundStyle={color} frame={{ width: 24 }} />
    <Text foregroundStyle="white">{title}</Text>
  </HStack>
}
function PreviewButton() {
  return <Button title="预览小组件" foregroundStyle="systemBlue" action={() => {
    void feedback(async () => { await Widget.preview({ family: 'systemMedium' }); return null })
  }} />
}
function Page() {
  const dismiss = Navigation.useDismiss()
  const [settings, setSettings] = useState(readAppearance())
  return <NavigationStack>
    <List navigationTitle="日历设置" navigationBarTitleDisplayMode="inline" listStyle="insetGroup"
      preferredColorScheme="dark" scrollContentBackground="hidden" background="#000000"
      toolbar={{ cancellationAction: <Button title="完成" action={dismiss} /> }}>
      <Section header={<HStack><Text>高级</Text><Spacer /><Text>{VERSION}</Text></HStack>}>
        <Picker label={<RowLabel title="每周首日" symbol="calendar" color="systemOrange" />} pickerStyle="menu"
          value={settings.weekStart} onChanged={(value: number) => {
            if (persist({ ...settings, weekStart: value }, setSettings)) {
              void feedback(async () => '已保存并请求刷新；iOS刷新可能延迟。')
            }
          }}>
          {[1, 2, 3, 4, 5, 6, 0].map(day => <Text tag={day}>{`周${WEEKDAY_NAMES[day]}`}</Text>)}
        </Picker>
        <HStack>
          <RowLabel title="休班显示" symbol="briefcase.fill" color="systemBlue" /><Spacer />
          <Picker title="休班显示" pickerStyle="segmented" frame={{ width: 110 }} value={settings.holidayStyle}
            onChanged={(value: 'text' | 'dot') => { persist({ ...settings, holidayStyle: value }, setSettings) }}>
            <Text tag="text">字</Text><Text tag="dot">点</Text>
          </Picker>
        </HStack>
        <HStack>
          <RowLabel title="今日显示" symbol="circle.fill" color="systemRed" /><Spacer />
          <Picker title="今日显示" pickerStyle="segmented" frame={{ width: 110 }} value={settings.todayShape}
            onChanged={(value: 'circle' | 'square') => { persist({ ...settings, todayShape: value }, setSettings) }}>
            <Text tag="circle">圆</Text><Text tag="square">方</Text>
          </Picker>
        </HStack>
        <Button role="destructive" action={() => { void feedback(async () => {
          if (!await Dialog.confirm({ title: '重置所有设置', message: '仅重置本脚本外观与每周首日，不删除假日缓存。', confirmLabel: '重置', cancelLabel: '取消' })) return null
          if (!persist(defaultAppearance(), setSettings)) return null
          return '外观设置已重置，假日缓存保留；iOS刷新可能延迟。'
        }) }}><RowLabel title="重置所有设置" symbol="arrow.counterclockwise" color="systemOrange" /></Button>
      </Section>
      <Section header={<Text>预览小组件</Text>}><PreviewButton /></Section>
      <Section header={<Text>数据</Text>}>
        <Button title="刷新假日缓存" action={() => { void feedback(async () => {
          const today = chinaToday(), years = Array.from(new Set([...layoutDates(today, 'month', settings.weekStart), ...layoutDates(today, 'week', settings.weekStart)].map(d => d.year)))
          const results = await Promise.all(years.map(y => loadHoliday(y, scriptingHolidayIO, true)))
          Widget.reloadAll()
          return results.map(r => r.source).join('；')
        }) }} />
      </Section>
    </List>
  </NavigationStack>
}
async function run() {
  await Navigation.present({ element: <Page /> })
  Script.exit()
}
run()
