import type { SVGProps } from 'react'
import { ICONS, type IconName } from './iconPaths'

export type { IconName }

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  size?: number
  strokeWidth?: number
  /** 意味を持つアイコンには読み上げ用の名前を付ける。装飾なら省略(aria-hidden になる) */
  label?: string
}

/** 絵文字の代わりに使う SVG アイコン。色は親の color(currentColor)に従う。 */
export default function Icon({ name, size = 20, strokeWidth = 2, label, className, style, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      className={['qs-icon', className].filter(Boolean).join(' ')}
      style={{ flex: 'none', ...style }}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      {...rest}
    >
      {ICONS[name].map((n, i) => {
        if (n[0] === 'path') return <path key={i} d={n[1]} />
        if (n[0] === 'circle') return <circle key={i} cx={n[1]} cy={n[2]} r={n[3]} />
        return <rect key={i} x={n[1]} y={n[2]} width={n[3]} height={n[4]} rx={n[5]} />
      })}
    </svg>
  )
}
