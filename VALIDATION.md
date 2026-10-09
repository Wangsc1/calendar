# 本地验证记录（1.0.0）

验证时间：2026-10-09，北京时间。工作目录 `/opt/openbear/workspace/lunar-work/`；项目交付目录 `/opt/openbear/workspace/artifacts/lunar-calendar/`。测试工具和下载依赖没有放入源码包。

## 已验证结果

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

无iPhone连接或Scripting原生运行环境；没有真机安装、SVG实际字体渲染、主屏幕中号布局/着色、午夜刷新、Widget.preview及远程更新端到端验证。更新仍是多文件写入，不是原子事务。公开仓库发布由主控执行，本包没有执行GitHub写入；更新和一键导入需仓库发布后测试。

最短手机验收：本地安装并打开说明页 → 中号预览 → 添加主屏幕中号 → 检查今天圆底、农历中文、休班、完整底部 → 主动刷新缓存 → 发布后检查更新。若Scripting内提示具体API/类型错误，应以手机同步的官方声明为准反馈，而不是认为本地模拟已证明真机兼容。
