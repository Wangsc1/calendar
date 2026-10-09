# 本地验证记录（1.0.0基础验证与1.1.0增量验证）

验证时间：2026-10-09，北京时间。工作目录 `/opt/openbear/workspace/lunar-work/`；项目交付目录 `/opt/openbear/workspace/artifacts/lunar-calendar/`。测试工具和下载依赖没有放入源码包。

## 1.1.0周起始日增量验证

验证时间：2026-10-09 21:08，北京时间。先读取官方 `views/controls/picker/zh.md`：数值value、onChanged、带tag的Text选项、menu样式均为官方接口。设置页使用该单选Picker，预览仍只调用 `Widget.preview`，没有自绘仿预览。

限定新增验证共6组通过（没有重跑农历全范围对照）：

1. 7种开始日 × 7种今天星期 × 4个日期窗口（2026-10、2026年底、2027年初、2024闰日），共196个双周范围：14天唯一且连续、首日/第8日等于选定星期、今天总在第一周；默认周一范围保持不变。
2. 7种SVG表头排序与真实周末灰色：逐一核对全部14个日期颜色，今天仍白字红底，包括周末当天。
3. 缺失、字符串、负数、7、非整数、NaN、Infinity、布尔及对象Storage值均默认周一；0—6各值保存并从同一 `calendar.weekStart.v1` 重读成功。
4. Storage读写抛错/返回false处理：默认读取或明确保存失败，不伪造保存成功。
5. 本地Hook/Navigation/Widget/Storage Mock实际执行两个TSX入口：Picker7选项；逐项变更保存偏好并发出刷新请求；说明页双周14条明细跟随选择；原生preview按钮调用官方接口并执行widget入口；另行运行桌面入口得到相同表头和范围。固定今天2026-12-20覆盖选择引发的跨年数据范围；缺少2027休班数据不猜休班。**Mock不证明iPhone原生UI或跨进程Storage落盘时序。**
6. 原地更新未清除Storage，14文件固定名单与1.0.0相同，没有新增模块，旧版更新器仍能接受1.1.0清单。

TypeScript严格检查使用原有文档派生有限声明，补充官方Picker签名/tag属性后通过；两个受影响TSX入口与本地依赖通过语法/模块解析。发布manifest全部14条摘要与源码一致，script.json、version.ts及清单版本均为1.1.0；ZIP完整性及逐文件一致性检查通过。

输出：`ALL 6 WEEK-START CHECK GROUPS PASSED`；`lunar-work/week-output.txt` SHA-256：`d864ca7fe830229034c4d3e6f778a7baa64a29307b1c88d579dcad19ced2229d`。相关Mock、脚本和依赖仅在独立临时目录，未放进安装包。周起始日Picker与真实Widget/原生预览仍待iOS验收，刷新时机由iOS决定。

## 1.0.0既有基础验证（本轮未重跑）

Node.js 22.16.0、本地TypeScript严格检查与esbuild。UTC和America/Los_Angeles两个宿主时区下均通过 **20组检查**：

1. `2026-10-09` → `丙午马年 八月廿九`；双周为10月5—18日。
2. 2025-01-28及2026-02-16均为腊月廿九除夕，2026-02-17春节；春节前使用乙巳蛇年，不按立春改年。
3. 周一开始；2026-12-31跨年双周至2027-01-10；周日跨月和2024闰日。
4. 北京时间午夜前后与次日00:01刷新请求，不受宿主时区影响。
5. 2025-07-25标签为`闰六月`、底部为`乙巳蛇年 闰六月初一`，没有重复加“闰”。
6. 拒绝1900/2100越界农历。
7. 香港天文台2025及2026全部**730天农历（含初一月份及闰月）、48次节气日期**逐日核对，繁简字体规范化后全一致。
8. 1901—2099所有公历日检查：闰月不误标春节、元宵、龙抬头、端午、七夕、中元、中秋、重阳、腊八、小年；2026关键节日日期另行断言。
9. 独立按国务院原文生成七个放假区间、六个调休上班日，与内置数据全部**39条**比较一致。2026-10-10为“班”；元宵不自动生成“休”。
10. 2026首次完全离线使用内置，未发起网络请求。
11. 无数据年份网络失败只返回无数据；农历仍计算；失败24小时限流。
12. 2026强制刷新网络失败返回核实内置。
13. 损坏缓存、Storage读写异常不影响核实内置和农历。
14. 有效网络数据保存缓存；空通知来源、非法日期、重复日期拒绝。
15. SVG XML解析有效；今天红底农历、节日/节气标签、初一月份红短线、休班颜色和底部完整日期均在源码输出中验证。验证尺寸306×126；**没有进行iOS中文字体或像素外观验证**。
16. 更新先全部下载SHA-256校验，再备份和写入；固定名单不包含本机script.json/Storage。
17. 下载/摘要失败零源码写入。
18. 中途部分写入失败恢复全部旧文件。
19. 回滚失败明确显示恢复位置；拒绝清单路径名单扩张。
20. 同版不自动安装；强制同版重新下载可用；拒绝降级。

严格TypeScript诊断通过：`tsc -p lunar-work/tsconfig.json`。**声明边界**：应用特有接口为从官方文档提取的有限声明，UI children部分宽泛；未连接iPhone获取其完整官方声明。因此这证明本项目自有类型和已覆盖接口签名通过，不是完整Scripting运行时类型验证。两个TSX入口及其全部本地依赖通过esbuild语法/模块解析打包（`scripting`保留为外部模块，生成物只在临时目录）。

测试输出最后一行：`ALL 20 CHECK GROUPS PASSED`。输出SHA-256：`8124c8241a5418ce4847c15f9868626848d748318b5a89f8e90cfca8ff184a99`。

## 权威材料与可复核来源

- 官方站点 https://scriptingapp.github.io/ 及 https://scriptingapp.github.io/llms.txt
- 官方App Store完整文档ZIP：https://raw.githubusercontent.com/ScriptingApp/ScriptingApp.github.io/main/scripting/App%20Store/Scripting%20Documentation.zip
  - 下载文件SHA-256：`4d2ce839faba78aa5407f2a5fa6b9d65b4b4282ca2c45ab2d72994f836a7b15b`
  - 阅读widget_api、views/svg、storage、request/fetch、script/api、file_manager、crypto、data、scrollview/button、官方index及Hook使用示例。
- 已读任务开发指南全文；附件PNG已读取解码（1206×611，RGB，主色深灰）；布局依据用户逐项外观要求。工具环境未提供原生图片查看界面，没有声称完成截图逐像素复刻。
- 香港天文台：https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T2025c.txt 和 T2026c.txt
  - 2025 SHA-256：`7a2803584dcd12a38a13e3710e643369996f59e690d684b9e3705fc5e988ebc2`
  - 2026 SHA-256：`7b0831acb16a5a72a1ab553205e938b2f658c3837e06440f22c084e1a39832dd`
- 国务院：https://www.gov.cn/zhengce/zhengceku/202511/content_7047091.htm （国办发明电〔2025〕7号）
- 开放数据：https://raw.githubusercontent.com/NateScarlet/holiday-cn/master/2026.json
  - 下载文件SHA-256：`0dcfd8004351e132ce15e8444de4df123265b3f490f7e2f8346631122cb5b709`
- 农历库lunar-javascript 1.7.7：https://github.com/6tail/lunar-javascript ，MIT许可随包保留；未调用库的HolidayUtil来推断休班。

## 尚未验证

无iPhone连接或Scripting原生运行环境；没有真机安装、SVG实际字体渲染、主屏幕中号布局/着色、午夜刷新、Widget.preview及远程更新端到端验证。更新仍是多文件写入，不是原子事务。本次只准备本地1.1.0源码包，没有执行GitHub写入；1.1.0远程更新和一键导入需发布后端到端验收。

最短手机验收：本地安装并打开说明页 → 选择每周开始（含周日/周三） → 原生中号预览 → 添加主屏幕中号 → 检查今天圆底、农历中文、休班、完整底部 → 主动刷新缓存 → 发布后检查更新。若Scripting内提示具体API/类型错误，应以手机同步的官方声明为准反馈，而不是认为本地模拟已证明真机兼容。
