import { Button, Circle, HStack, Image, List, Navigation, NavigationStack, Picker, Rectangle, RoundedRectangle, Script, ScrollView, Section, Spacer, Text, VStack, Widget, useEffect, useState } from 'scripting'
import { Appearance, CivilDate, MAX_YEAR, MIN_YEAR, WEEKDAY_NAMES, chinaToday, dateKey, dayInfo, isWeekend, layoutDates, monthGrid, readAppearance, saveAppearance, normalizeAppearance, weekOrder } from './calendar'
import { HolidayResult, holidayOn, loadHoliday, scriptingHolidayIO } from './holidays'
import { VERSION } from './version'

let busy = false
async function feedback(action: () => Promise<string | null>) {
  if (busy) return
  busy = true
  try {
    const message = await action()
    if (message) await Dialog.alert({ title: '日历', message: message.slice(0, 320), buttonLabel: '好' })
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
    <Text foregroundStyle="label">{title}</Text>
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
      scrollContentBackground="hidden" background="systemGroupedBackground"
      toolbar={{ cancellationAction: <Button title="完成" action={close} /> }}>
      <Section header={<HStack><Text>设置</Text><Spacer /><Text>{VERSION}</Text></HStack>}>
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
  const color = isToday ? 'white' : 'label'
  const label = isToday || info.lunarDay === 1 ? info.lunarLabel : info.label
  const markColor = mark?.isOffDay ? '#55a9ff' : '#ffad52'
  const shape = settings.todayShape === 'circle'
    ? <Circle fill={isToday ? '#e74748' : 'systemGray5'} frame={{ width: 42, height: 42 }} offset={{ x: 0, y: 1.5 }} />
    : <RoundedRectangle cornerRadius={10} fill={isToday ? '#e74748' : 'systemGray5'} frame={{ width: 42, height: 42 }} offset={{ x: 0, y: 1.5 }} />
  return <VStack spacing={1} frame={{ minWidth: 0, maxWidth: 'infinity', minHeight: 49, maxHeight: 49 }} opacity={isToday ? 1 : dim}
    background={isToday || isSelected ? shape : undefined} contentShape="rect" onTapGesture={() => onSelect(d)}
    // 休/班与小组件一致：所有日期都贴在42点红底的右上外缘，保留约1点间隙。
    overlay={mark ? { alignment: 'center', content: <Text font={9} fontWeight="heavy" foregroundStyle={markColor}
      offset={{ x: 21, y: -18 }}>{settings.holidayStyle === 'dot' ? '●' : mark.isOffDay ? '休' : '班'}</Text> } : undefined}>
    <Text font={18} fontWeight="semibold" foregroundStyle={color} lineLimit={1}>{String(d.day)}</Text>
    <Text font={10} fontWeight="medium" foregroundStyle={color} lineLimit={1} minScaleFactor={0.6}
      overlay={info.lunarDay === 1 ? { alignment: 'bottom', content: <Rectangle fill={isToday ? 'white' : '#e74748'}
        frame={{ width: 12, height: 2 }} offset={{ x: 0, y: 3 }} /> } : undefined}>{label}</Text>
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
    <ScrollView background="systemBackground"
      toolbar={{
        cancellationAction: <Button title="关闭" action={dismiss} />,
        topBarTrailing: <Button title="" systemImage="ellipsis.circle" action={() => setShowSettings(true)}
          sheet={{ isPresented: showSettings, onChanged: setShowSettings,
            content: <SettingsPage settings={settings} setSettings={setSettings} close={() => setShowSettings(false)} /> }} />,
      }}>
      <VStack alignment="leading" spacing={18} padding={{ leading: 16, trailing: 16, top: 8, bottom: 24 }}>
        <Text font={34} fontWeight="bold" foregroundStyle="label" onTapGesture={() => {
          setView({ year: today.year, month: today.month, day: 1 }); setSelected(today)
        }}>{`${today.year}年${today.month}月${today.day}日`}</Text>
        <HStack spacing={36} frame={{ maxWidth: 'infinity' }}>
          <Button title="" systemImage="chevron.left" foregroundStyle="#e74748" action={() => move(-1)} />
          <Text font={21} fontWeight="semibold" foregroundStyle="label" monospacedDigit>{`${view.year} / ${view.month}`}</Text>
          <Button title="" systemImage="chevron.right" foregroundStyle="#e74748" action={() => move(1)} />
        </HStack>
        <VStack spacing={8} contentShape="rect" onDragGesture={{
          minDistance: 20,
          onEnded: details => {
            // 水平滑动明显大于竖直滑动才翻页，避免和页面上下滚动冲突。
            const dx = details.predictedEndTranslation.width, dy = details.translation.height
            if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return
            move(dx < 0 ? 1 : -1)
          }
        }}>
          <HStack spacing={0}>
            {weekOrder(settings.weekStart).map(day => <Text font={16} frame={{ maxWidth: 'infinity' }}
              foregroundStyle={isWeekend(day) ? 'secondaryLabel' : 'label'}>{`周${WEEKDAY_NAMES[day]}`}</Text>)}
          </HStack>
          {rows.map(row => <HStack spacing={0} frame={{ maxWidth: 'infinity' }}>
            {row.map(d => <DayCell d={d} month={view.month} today={todayKey} selected={dateKey(selected)}
              holidays={holidays} settings={settings} onSelect={value => setSelected(value)} />)}
          </HStack>)}
        </VStack>
        <Text font={14} foregroundStyle="secondaryLabel">{`${selected.year}年${selected.month}月${selected.day}日 ${info.footer}${info.festivals.length ? ' ' + info.festivals.join(' ') : ''}${info.term ? ' ' + info.term : ''}`}</Text>
      </VStack>
    </ScrollView>
  </NavigationStack>
}
async function run() {
  await Navigation.present({ element: <HomePage /> })
  Script.exit()
}
run()
