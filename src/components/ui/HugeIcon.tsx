import type { ComponentType, SVGProps } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import type { IconSvgElement } from '@hugeicons/react'

type IconProps = SVGProps<SVGSVGElement> & {
  size?: string | number
  strokeWidth?: number
  absoluteStrokeWidth?: boolean
}

export type AppIcon = ComponentType<IconProps>

export function createHugeIcon(icon: IconSvgElement): AppIcon {
  return function Icon({ size = 24, color = 'currentColor', strokeWidth = 1.7, ...props }: IconProps) {
    return <HugeiconsIcon icon={icon} size={size} color={color} strokeWidth={strokeWidth} {...props} />
  }
}
