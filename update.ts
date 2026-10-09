import { Script } from 'scripting'
import { VERSION } from './version'
export const UPDATE_ROOT = 'https://raw.githubusercontent.com/Wangsc1/calendar/main/'
export const UPDATE_FILES = [
  'index.tsx', 'widget.tsx', 'calendar.ts', 'holidays.ts', 'holiday-2026.ts', 'render.ts',
  'update.ts', 'version.ts', 'vendor/lunar.js', 'vendor/lunar.d.ts',
  'licenses/lunar-javascript-MIT.txt', 'licenses/holiday-cn-MIT.txt', 'LICENSE', 'README.md',
]
export interface UpdateIO {
  getText(path: string): Promise<string>
  hash(text: string): string
  read(path: string): Promise<string>
  write(path: string, text: string): Promise<void>
  backup(files: Record<string, string>): Promise<void>
}
interface Manifest { version: string; files: Record<string, string> }
export function validateManifest(raw: unknown): Manifest {
  if (!raw || typeof raw !== 'object') throw new Error('更新清单无效')
  const m = raw as Manifest
  if (!/^\d+\.\d+\.\d+$/.test(m.version) || !m.files || typeof m.files !== 'object' ||
      Object.keys(m.files).length !== UPDATE_FILES.length ||
      !UPDATE_FILES.every(f => typeof m.files[f] === 'string' && /^[a-f0-9]{64}$/.test(m.files[f]))) throw new Error('更新清单版本/文件/摘要无效')
  return m
}
export function newer(a: string, b: string): boolean {
  const x = a.split('.').map(Number), y = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) { if (x[i] !== y[i]) return x[i] > y[i] }
  return false
}
export async function updateProject(io: UpdateIO, force = false, currentVersion = VERSION): Promise<string> {
  const m = validateManifest(JSON.parse(await io.getText('update-manifest.json')))
  if (!force && !newer(m.version, currentVersion)) return `当前已是最新版 ${currentVersion}`
  if (newer(currentVersion, m.version)) throw new Error('远程版本较旧，拒绝降级')
  const staged: Record<string, string> = {}, original: Record<string, string> = {}
  // 所有下载和SHA-256检验成功之前绝不修改源码。
  for (const f of UPDATE_FILES) {
    const text = await io.getText(f)
    if (!text.trim() || io.hash(text) !== m.files[f]) throw new Error(`${f} 校验失败，未修改本地源码`)
    staged[f] = text
  }
  if (!staged['version.ts'].includes(`'${m.version}'`)) throw new Error('清单与源码版本不一致')
  for (const f of UPDATE_FILES) original[f] = await io.read(f)
  await io.backup(original)
  try {
    for (const f of UPDATE_FILES) await io.write(f, staged[f])
  } catch (error) {
    const failed: string[] = []
    for (const f of UPDATE_FILES) { try { await io.write(f, original[f]) } catch { failed.push(f) } }
    throw new Error(`更新写入失败：${String(error)}；${failed.length ? `回滚失败：${failed.join('、')}，请从.calendar-update-backup恢复` : '已回滚源码'}`)
  }
  return `已更新到 ${m.version}。请关闭此页面，重新运行脚本，再刷新小组件。本机script.json与Storage未覆盖。`
}
export const scriptingUpdateIO: UpdateIO = {
  getText: async path => {
    const r = await fetch(UPDATE_ROOT + path + '?t=' + Date.now(), { timeout: 15 })
    if (!r.ok) throw new Error(`更新HTTP ${r.status}（${path}）；仓库未发布或网络不可用`)
    return r.text()
  },
  hash: text => {
    const data = Data.fromRawString(text)
    if (!data) throw new Error('UTF-8转换失败')
    return Crypto.sha256(data).toHexString().toLowerCase()
  },
  read: path => FileManager.readAsString(`${Script.directory}/${path}`),
  write: (path, text) => FileManager.writeAsString(`${Script.directory}/${path}`, text),
  backup: async files => {
    const root = `${Script.directory}/.calendar-update-backup`
    await FileManager.createDirectory(root, true)
    // JSON备份保留完整原文；不存在script.json或Storage配置。
    await FileManager.writeAsString(`${root}/files.json`, JSON.stringify(files))
  },
}
