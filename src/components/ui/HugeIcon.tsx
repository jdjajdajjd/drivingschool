import { HugeiconsIcon } from '@hugeicons/react'
import type { IconSvgElement, HugeiconsIconProps } from '@hugeicons/react'

export function createHugeIcon(Icon: IconSvgElement) {
  return function HugeIcon({ size = 24, ...props }: Omit<HugeiconsIconProps, 'icon'>) {
    return <HugeiconsIcon icon={Icon} size={size} {...props} />
  }
}
