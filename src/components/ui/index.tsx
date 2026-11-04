import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import Icon, { type IconName } from './Icon'

export { default as Icon } from './Icon'
export type { IconName } from './Icon'

const cx = (...a: Array<string | false | null | undefined>) => a.filter(Boolean).join(' ')

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'buzz'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: IconName
  block?: boolean
}

/** 標準ボタン。タップ領域は md 以上で 44px 以上。 */
export function Button({ variant = 'secondary', size = 'md', icon, block, className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={cx('qs-btn', `qs-btn--${variant}`, `qs-btn--${size}`, block && 'qs-btn--block', className)} {...rest}>
      {icon && <Icon name={icon} size={size === 'lg' ? 22 : 18} />}
      {children}
    </button>
  )
}

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  icon: IconName
  /** アイコンだけのボタンなので、読み上げ用の名前は必須 */
  label: string
  variant?: 'secondary' | 'ghost'
  badge?: number
}

export function IconButton({ icon, label, variant = 'ghost', badge, className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button type={type} aria-label={label} title={label} className={cx('qs-iconbtn', `qs-iconbtn--${variant}`, className)} {...rest}>
      <Icon name={icon} size={20} />
      {badge ? <span className="qs-badge" aria-hidden="true">{badge > 99 ? '99+' : badge}</span> : null}
    </button>
  )
}

type Tone = 'accent' | 'win' | 'lose' | 'gold' | 'neutral'
export function Chip({ tone = 'accent', icon, children, className }: { tone?: Tone; icon?: IconName; children: ReactNode; className?: string }) {
  return (
    <span className={cx('qs-chip', `qs-chip--${tone}`, className)}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  )
}

export function Card({ padded = true, accent, className, ...rest }: HTMLAttributes<HTMLDivElement> & { padded?: boolean; accent?: boolean }) {
  return <div className={cx('qs-card', padded && 'qs-card--pad', accent && 'qs-card--accent', className)} {...rest} />
}

/** ユーザーのアイコン。画像が無ければ名前の頭文字(絵文字は使わない)。 */
export function Avatar({ name, src, size = 40, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const initial = Array.from(name.trim())[0] ?? '?'
  return src
    ? <img className={cx('qs-avatar', className)} src={src} alt="" width={size} height={size} style={{ width: size, height: size }} />
    : <span className={cx('qs-avatar', className)} aria-hidden="true" style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}>{initial}</span>
}

export function ProgressBar({ value, label, tone = 'accent' }: { value: number; label: string; tone?: 'accent' | 'timer' }) {
  const v = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className="qs-progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={v}>
      <div className={cx('qs-progress__fill', `qs-progress__fill--${tone}`)} style={{ width: `${v}%` }} />
    </div>
  )
}
