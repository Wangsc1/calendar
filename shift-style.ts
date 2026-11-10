import type { Shift } from './shifts'

export type ShiftPaint = { background: string; foreground: string }
// 固定班次框内左右各3点；上下预留各10%（最多1点），再按1.1em限制高度。原生另有单行缩放。
export function shiftLabelFont(name: string, preferred: number, width: number, height: number): number {
  const units = Array.from(name).reduce((n, c) => n + (c.charCodeAt(0) > 255 ? 1 : .6), 0)
  return Math.max(0, Math.min(preferred, (width - 6) / Math.max(1, units), (height - Math.min(2, height * .2)) / 1.1))
}
function rgb(hex: string): number[] {
  return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
}
function mix(color: string, target: string, amount: number): string {
  const a = rgb(color), b = rgb(target)
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * amount).toString(16).padStart(2, '0')).join('')
}
function luminance(color: string): number {
  const [r, g, b] = rgb(color).map(v => {
    const n = v / 255
    return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4
  })
  return .2126 * r + .7152 * g + .0722 * b
}
function contrast(a: string, b: string): number {
  const x = luminance(a), y = luminance(b)
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05)
}
function readable(color: string, background: string, target: string): string {
  for (let step = 0; step <= 50; step++) {
    const candidate = mix(color, target, step / 50)
    if (contrast(candidate, background) >= 4.5) return candidate
  }
  return target
}
const cache = new Map<string, ShiftPaint>()
// 背景与文字分别计算，绝不对标签整体应用opacity。原始颜色始终保存在配置中。
export function shiftPaint(shift: Pick<Shift, 'color' | 'style'>, theme: 'light' | 'dark'): ShiftPaint {
  const key = `${shift.color}/${shift.style ?? 'normal'}/${theme}`
  const cached = cache.get(key)
  if (cached) return cached
  let paint: ShiftPaint
  if (shift.style === 'transparent') {
    // 对受控明暗表面预混合浅色/低饱和底，文字保持独立且不透明。
    const background = mix(shift.color, theme === 'light' ? '#ffffff' : '#202024', theme === 'light' ? .84 : .76)
    paint = { background, foreground: readable(shift.color, background, theme === 'light' ? '#000000' : '#ffffff') }
  } else {
    paint = { background: readable(shift.color, '#ffffff', '#000000'), foreground: '#ffffff' }
  }
  cache.set(key, paint)
  return paint
}
