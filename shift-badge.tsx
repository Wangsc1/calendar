import { RoundedRectangle, Text } from 'scripting'
import type { Shift } from './shifts'
import { shiftPaint } from './shift-style'

// App、原生日组件与设置预览共用；SVG也调用同一个shiftPaint。
export function ShiftBadge({ shift, font = 10, width, height = 15, text, tag }: {
  shift: Shift; font?: number; width?: number; height?: number; text?: string; tag?: string | number
}) {
  const light = shiftPaint(shift, 'light'), dark = shiftPaint(shift, 'dark')
  return <Text tag={tag} font={font} fontWeight="medium" lineLimit={1} minScaleFactor={0.6}
    foregroundStyle={{ light: light.foreground, dark: dark.foreground }}
    frame={width === undefined ? { maxWidth: 'infinity', height } : { width, height }}
    background={<RoundedRectangle cornerRadius={3} fill={{ light: light.background, dark: dark.background }} />}>
    {text || shift.name || '班次'}
  </Text>
}
