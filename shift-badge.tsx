import { RoundedRectangle, Text, ZStack } from 'scripting'
import type { Shift } from './shifts'
import { shiftLabelFont, shiftPaint } from './shift-style'

// App、原生日组件与设置预览共用；SVG也调用同一个shiftPaint。
export function ShiftBadge({ shift, font = 10, width, height = 15, text, tag, insetText = false }: {
  shift: Shift; font?: number; width?: number; height?: number; text?: string; tag?: string | number; insetText?: boolean
}) {
  const light = shiftPaint(shift, 'light'), dark = shiftPaint(shift, 'dark')
  if (insetText && width !== undefined) return <ZStack frame={{ width, height }}>
    <RoundedRectangle cornerRadius={3} fill={{ light: light.background, dark: dark.background }} frame={{ width, height }} />
    <Text tag={tag} font={shiftLabelFont(text || shift.name || '班次', font, width, height)} fontWeight="medium" lineLimit={1} minScaleFactor={0.6}
      foregroundStyle={{ light: light.foreground, dark: dark.foreground }} frame={{ width: Math.max(0, width - 6), height: Math.max(0, height - 2) }}>{text || shift.name || '班次'}</Text>
  </ZStack>
  return <Text tag={tag} font={font} fontWeight="medium" lineLimit={1} minScaleFactor={0.6}
    foregroundStyle={{ light: light.foreground, dark: dark.foreground }}
    frame={width === undefined ? { maxWidth: 'infinity', height } : { width, height }}
    background={<RoundedRectangle cornerRadius={3} fill={{ light: light.background, dark: dark.background }} />}>
    {text || shift.name || '班次'}
  </Text>
}
