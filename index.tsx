import { Button, Navigation, NavigationStack, Picker, Script, ScrollView, Text, VStack, Widget, useState } from 'scripting'
import { chinaToday, dayInfo, fortnight, dateKey, MIN_YEAR, MAX_YEAR, readWeekStart, saveWeekStart, WEEKDAY_NAMES } from './calendar'
import { HolidayResult, loadHoliday, scriptingHolidayIO, holidayOn } from './holidays'
import { updateProject, scriptingUpdateIO } from './update'
import { VERSION } from './version'

let locked = false
function Page({ initial }: { initial: HolidayResult[] }) {
  const dismiss = Navigation.useDismiss()
  const [holidays, setHolidays] = useState(initial)
  const [weekStart, setWeekStart] = useState(readWeekStart())
  const [message, setMessage] = useState('点击中号预览可查看Scripting实际渲染。休=公布放假；班=调休上班；无标记不代表放假。')
  const today = chinaToday(), range = fortnight(today, weekStart)
  const supported = range.every(d => d.year >= MIN_YEAR && d.year <= MAX_YEAR)
  const runAction = async (action: () => Promise<string>) => {
    if (locked) return
    locked = true
    setMessage('处理中，请稍候…')
    try { setMessage(await action()) } catch (e) { setMessage(`失败：${String(e)}`) } finally { locked = false }
  }
  return <NavigationStack>
    <ScrollView navigationTitle={`双周农历 ${VERSION}`}>
      <VStack spacing={14} padding={16}>
        <Picker title="每周开始" pickerStyle="menu" value={weekStart} onChanged={(value: number) => {
          void runAction(async () => {
            if (!saveWeekStart(value)) return '周起始日保存失败，保留原设置；请稍后重试。'
            setWeekStart(value)
            Widget.reloadAll()
            const dates = fortnight(chinaToday(), value)
            const years = Array.from(new Set(dates.map(d => d.year)))
            setHolidays(await Promise.all(years.map(y => loadHoliday(y, scriptingHolidayIO))))
            return `已保存为周${WEEKDAY_NAMES[value]}开始，并请求刷新小组件；iOS实际刷新可能延迟。`
          })
        }}>
          {[1, 2, 3, 4, 5, 6, 0].map(day => <Text tag={day}>{`周${WEEKDAY_NAMES[day]}`}</Text>)}
        </Picker>
        {!supported ? <Text>当前日期超出农历1901—2099年支持范围</Text> : null}
        <Button title="预览中号小组件" action={() => { void runAction(async () => { await Widget.preview({ family: 'systemMedium' }); return '预览已关闭。请到主屏幕添加Scripting中号小组件并选择calendar。' }) }} />
        <Text>{message}</Text>
        <Text>{holidays.map(r => r.source).join('；')}</Text>
        <Button title="联网刷新假日缓存" action={() => { void runAction(async () => {
          const years = Array.from(new Set(range.map(d => d.year)))
          const data = await Promise.all(years.map(y => loadHoliday(y, scriptingHolidayIO, true)))
          setHolidays(data); Widget.reloadAll()
          return data.map(r => r.source).join('；')
        }) }} />
        <Button title="检查并安装源码更新" action={() => { void runAction(() => updateProject(scriptingUpdateIO)) }} />
        <Button title="强制重新下载当前版本" action={() => { void runAction(() => updateProject(scriptingUpdateIO, true)) }} />
        <Button title="请求刷新小组件" action={() => { Widget.reloadAll(); setMessage('已请求刷新，实际时机由iOS决定。') }} />
        <Text>{`周${WEEKDAY_NAMES[weekStart]}开始，包含今天的一周＋下一周。原生预览与桌面小组件读取同一已保存设置；选择变更后iOS刷新可能延迟。按北京时间确定今天；周一至周五白色，周末按真实星期灰色，红底为今天。农历初一显示月份与红色短线。中号为主，小号仅今日，大号显示双周；锁屏简化文字。`}</Text>
        <Text>传统节日：春节、元宵、龙抬头、端午、七夕、中元、中秋、重阳、腊八、小年(北腊月廿三/南廿四)、除夕；不在闰月重复。另有元旦、劳动节、国庆节。24节气按北京时间算法离线计算。</Text>
        <Text>1901—2099年农历/节气离线可用。2026年休班已内置核实；其他年份只使用开放数据中带官方通知来源的安排，联网失败只用旧缓存，没有确切数据则不显示休/班。周末灰色不等于法定休假。</Text>
        <Text>更新只从Wangsc1/calendar下载固定文件并检查SHA-256；全部通过后才写入，保留Storage和本机script.json。写入失败尝试回滚并报告；进程被iOS中断仍可能留下部分更新，备份在.calendar-update-backup/files.json。</Text>
        <Text>以下为双周完整信息（今天优先农历；初一优先月份；其余节日优先于节气/农历）：</Text>
        {supported ? range.map(d => {
          const i = dayInfo(d), h = holidayOn(d, holidays)
          return <Text>{`${dateKey(d)}  ${i.footer}${i.festivals.length ? ' · ' + i.festivals.join(' / ') : ''}${i.term ? ' · ' + i.term : ''}${h ? ' · ' + h.name + (h.isOffDay ? ' 休' : ' 班') : ''}`}</Text>
        }) : null}
        <Button title="完成" action={dismiss} />
      </VStack>
    </ScrollView>
  </NavigationStack>
}
async function run() {
  const range = fortnight(chinaToday(), readWeekStart())
  const initial = await Promise.all(Array.from(new Set(range.map(d => d.year))).map(y => loadHoliday(y, scriptingHolidayIO)))
  await Navigation.present({ element: <Page initial={initial} /> })
  Script.exit()
}
run()
