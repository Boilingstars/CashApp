import { forwardRef } from 'react'

import styles from './Chip.module.css'

export const Chip = forwardRef(function Chip(
  {
    children,
    active = false,
    onClick,
    size = 'md',
    variant = 'pill',
    type = 'button',
    disabled = false,
    className,
    'aria-pressed': ariaPressed,
  },
  ref,
) {
  const rootClassName = [
    styles.root,
    styles[`size_${size}`],
    styles[`variant_${variant}`],
    active ? styles.active : null,
    disabled ? styles.disabled : null,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const pressed =
    typeof ariaPressed === 'boolean' ? ariaPressed : onClick ? active : undefined

  return (
    <button
      type={type}
      className={rootClassName}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      ref={ref}
    >
      {children}
    </button>
  )
})

