import { Button, HStack, Image, List, Navigation, NavigationLink, NavigationStack, Picker, Script, Section, Spacer, Stepper, SVG, Text, VStack, Widget, useEffect, useState } from 'scripting'
import { Appearance, FontKey, LayoutMode, FONT_LIMITS, WEEKDAY_NAMES, chinaToday, layoutDates, readAppearance, saveAppearance, defaultAppearance, normalizeAppearance } from './calendar'
import { HolidayResult, loadHoliday, scriptingHolidayIO } from './holidays'
import { renderCalendarSVG } from './render'
import { VERSION } from './version'

const modes: LayoutMode[] = ['day', 'week', 'month']
const modeNames = { day: '日组件', week: '周组件', month: '月组件' }
const families = { day: 'systemSmall', week: 'systemMedium', month: 'systemLarge' } as const
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
function PreviewButton({ mode = 'week' }: { mode?: LayoutMode }) {
  return <Button title="预览小组件" foregroundStyle="systemBlue" action={() => {
    void feedback(async () => { await Widget.preview({ family: families[mode] }); return null })
  }} />
}
function CustomPage({ initial, onSaved }: { initial: Appearance; onSaved: (value: Appearance) => void }) {
  const [settings, setSettings] = useState(initial)
  const [mode, setMode] = useState<LayoutMode>('month')
  const [holidays, setHolidays] = useState<HolidayResult[]>([])
  const today = chinaToday()
  const dateStamp = `${today.year}-${today.month}-${today.day}`
  useEffect(() => {
    let cancelled = false
    const years = Array.from(new Set(layoutDates(today, mode, settings.weekStart).map(d => d.year)))
    void Promise.all(years.map(y => loadHoliday(y, scriptingHolidayIO))).then(data => { if (!cancelled) setHolidays(data) })
    return () => { cancelled = true }
  }, [mode, settings.weekStart, dateStamp])
  const width = mode === 'day' ? 126 : 306, height = mode === 'week' ? 126 : mode === 'day' ? 126 : 306
  const update = (next: Appearance) => persist(next, value => { setSettings(value); onSaved(value) })
  const adjust = (key: FontKey, delta: number) => {
    const [min, max] = FONT_LIMITS[mode][key]
    const value = Math.max(min, Math.min(max, settings.fonts[mode][key] + delta))
    if (value === settings.fonts[mode][key]) return
    update({ ...settings, fonts: { ...settings.fonts, [mode]: { ...settings.fonts[mode], [key]: value } } })
  }
  return <List navigationTitle="小组件自定义" navigationBarTitleDisplayMode="inline"
    listStyle="insetGroup" preferredColorScheme="dark" scrollContentBackground="hidden" background="#000000">
    <Section>
      <VStack frame={{ maxWidth: 'infinity' }} padding={8}>
        <SVG code={renderCalendarSVG(today, holidays, mode, settings, width, height)} resizable scaleToFit antialiased
          renderingMode="original" frame={{ maxWidth: 'infinity', height }} />
      </VStack>
      <Picker title="组件尺寸" pickerStyle="segmented" value={mode} onChanged={(value: LayoutMode) => setMode(value)}>
        {modes.map(value => <Text tag={value}>{modeNames[value]}</Text>)}
      </Picker>
    </Section>
    <Section header={<Text>字体大小</Text>}>
      {(['weekday', 'date', 'lunar', 'today'] as FontKey[]).map(key => {
        const names = { weekday: '星期', date: '日期', lunar: mode === 'day' ? '节假日' : '农历信息', today: '今日信息' }
        return <Stepper title={`${names[key]}：${settings.fonts[mode][key]}`} onIncrement={() => adjust(key, 1)} onDecrement={() => adjust(key, -1)} />
      })}
    </Section>
    <Section header={<Text>预览小组件</Text>}><PreviewButton mode={mode} /></Section>
  </List>
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
        <NavigationLink destination={<CustomPage initial={settings} onSaved={setSettings} />}>
          <RowLabel title="小组件自定义" symbol="slider.horizontal.3" color="systemPurple" />
        </NavigationLink>
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
