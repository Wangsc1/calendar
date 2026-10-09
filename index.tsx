import { Button, Circle, HStack, Image, List, Navigation, NavigationStack, Picker, RoundedRectangle, Script, ScrollView, Section, Spacer, Text, VStack, Widget, useEffect, useState } from 'scripting'
import { Appearance, CivilDate, MAX_YEAR, MIN_YEAR, WEEKDAY_NAMES, chinaToday, dateKey, dayInfo, isWeekend, layoutDates, monthGrid, readAppearance, saveAppearance, defaultAppearance, normalizeAppearance, weekOrder } from './calendar'
import { HolidayResult, holidayOn, loadHoliday, scriptingHolidayIO } from './holidays'
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
function SettingsPage({ settings, setSettings, close }: { settings: Appearance; setSettings: (value: Appearance) => void; close: () => void }) {
  return <NavigationStack>
    <List navigationTitle="日历设置" navigationBarTitleDisplayMode="inline" listStyle="insetGroup"
      preferredColorScheme="dark" scrollContentBackground="hidden" background="#000000"
      toolbar={{ cancellationAction: <Button title="完成" action={close} /> }}>
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
const shiftMonth = (d: CivilDate, n: number): CivilDate => {
  const index = d.year * 12 + d.month - 1 + n
  return { year: Math.floor(index / 12), month: index % 12 + 1, day: 1 }
}
function DayCell({ d, month, today, selected, holidays, settings, onSelect }: {
  d: CivilDate; month: number; today: string; selected: string; holidays: HolidayResult[]; settings: Appearance; onSelect: (d: CivilDate) => void
}) {
  const info = dayInfo(d), isToday = info.key === today, isSelected = info.key === selected && !isToday
  const outside = d.month !== month, mark = holidayOn(d, holidays)
  const dim = outside ? 0.35 : isWeekend(info.weekday) ? 0.55 : 1
  const color = isToday ? 'white' : 'white'
  const label = isToday || info.lunarDay === 1 ? info.lunarLabel : info.label
  const markColor = mark?.isOffDay ? '#55a9ff' : '#ffad52'
  const shape = settings.todayShape === 'circle'
    ? <Circle fill={isToday ? '#e74748' : 'rgba(255,255,255,0.14)'} frame={{ width: 50, height: 50 }} />
    : <RoundedRectangle cornerRadius={10} fill={isToday ? '#e74748' : 'rgba(255,255,255,0.14)'} frame={{ width: 50, height: 50 }} />
  return <VStack spacing={1} frame={{ maxWidth: 'infinity', height: 58 }} opacity={isToday ? 1 : dim}
    background={isToday || isSelected ? shape : undefined} contentShape="rect" onTapGesture={() => onSelect(d)}
    overlay={mark ? { alignment: 'topTrailing', content: <Text font={10} fontWeight="heavy" foregroundStyle={markColor}
      padding={{ top: 3, trailing: 4 }}>{settings.holidayStyle === 'dot' ? '●' : mark.isOffDay ? '休' : '班'}</Text> } : undefined}>
    <Text font={22} fontWeight="bold" foregroundStyle={color} lineLimit={1}>{String(d.day)}</Text>
    <Text font={12} fontWeight="medium" foregroundStyle={color} lineLimit={1} minScaleFactor={0.6}
      underline={info.lunarDay === 1 ? '#e74748' : undefined}>{label}</Text>
  </VStack>
}
function HomePage() {
  const dismiss = Navigation.useDismiss()
  const today = chinaToday(), todayKey = dateKey(today)
  const [settings, setSettings] = useState(readAppearance())
  const [view, setView] = useState<CivilDate>({ year: today.year, month: today.month, day: 1 })
  const [selected, setSelected] = useState<CivilDate>(today)
  const [holidays, setHolidays] = useState<HolidayResult[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const days = monthGrid(view, settings.weekStart)
  useEffect(() => {
    let cancelled = false
    const years = Array.from(new Set(days.map(d => d.year)))
    void Promise.all(years.map(y => loadHoliday(y, scriptingHolidayIO))).then(data => { if (!cancelled) setHolidays(data) })
    return () => { cancelled = true }
  }, [view.year, view.month, settings.weekStart])
  const move = (n: number) => {
    const next = shiftMonth(view, n)
    if (next.year < MIN_YEAR || next.year > MAX_YEAR) return
    setView(next)
  }
  const info = dayInfo(selected)
  const rows = Array.from({ length: 6 }, (_, r) => days.slice(r * 7, r * 7 + 7))
  return <NavigationStack>
    <ScrollView preferredColorScheme="dark" background="#000000"
      toolbar={{
        cancellationAction: <Button title="关闭" action={dismiss} />,
        topBarTrailing: <Button title="" systemImage="ellipsis.circle" action={() => setShowSettings(true)}
          sheet={{ isPresented: showSettings, onChanged: setShowSettings,
            content: <SettingsPage settings={settings} setSettings={setSettings} close={() => setShowSettings(false)} /> }} />,
      }}>
      <VStack alignment="leading" spacing={18} padding={{ leading: 16, trailing: 16, top: 8, bottom: 24 }}>
        <Text font={40} fontWeight="bold" foregroundStyle="white" onTapGesture={() => {
          setView({ year: today.year, month: today.month, day: 1 }); setSelected(today)
        }}>{`${today.year}年${today.month}月${today.day}日`}</Text>
        <HStack spacing={28} frame={{ maxWidth: 'infinity' }}>
          <Button title="" systemImage="chevron.left" foregroundStyle="#e74748" action={() => move(-1)} />
          <Text font={30} fontWeight="semibold" foregroundStyle="white" monospacedDigit>{`${view.year} / ${view.month}`}</Text>
          <Button title="" systemImage="chevron.right" foregroundStyle="#e74748" action={() => move(1)} />
        </HStack>
        <VStack spacing={8}>
          <HStack spacing={0}>
            {weekOrder(settings.weekStart).map(day => <Text font={19} frame={{ maxWidth: 'infinity' }}
              foregroundStyle={isWeekend(day) ? '#8e8e93' : 'white'}>{`周${WEEKDAY_NAMES[day]}`}</Text>)}
          </HStack>
          {rows.map(row => <HStack spacing={0}>
            {row.map(d => <DayCell d={d} month={view.month} today={todayKey} selected={dateKey(selected)}
              holidays={holidays} settings={settings} onSelect={value => setSelected(value)} />)}
          </HStack>)}
        </VStack>
        <Text font={18} foregroundStyle="#8e8e93">{`${selected.year}年${selected.month}月${selected.day}日 ${info.footer}${info.festivals.length ? ' ' + info.festivals.join(' ') : ''}${info.term ? ' ' + info.term : ''}`}</Text>
      </VStack>
    </ScrollView>
  </NavigationStack>
}
async function run() {
  await Navigation.present({ element: <HomePage /> })
  Script.exit()
}
run()
