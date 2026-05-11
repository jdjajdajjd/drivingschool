import { HugeiconsIcon } from '@hugeicons/react'
import type { IconSvgObject, HugeiconsIconProps } from '@hugeicons/react'

export function createHugeIcon(Icon: IconSvgObject) {
  return function HugeIcon({ size = 24, ...props }: Omit<HugeiconsIconProps, 'icon'>) {
    return <HugeiconsIcon icon={Icon} size={size} {...props} />
  }
}
