import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import styles from './GlassSelect.module.css'

export function GlassSelect({ value, onChange, options, ariaLabel, size = 'default' }) {
  const [isOpen, setIsOpen] = useState(false)
  const listboxId = useId()

  const selectedOption = options.find((option) => option.value === value)
  const displayLabel = selectedOption?.label ?? value

  const close = () => setIsOpen(false)

  useEffect(() => {
    if (!isOpen) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleSelect = (nextValue) => {
    onChange(nextValue)
    close()
  }

  const chevronClassName = [styles.chevron, isOpen ? styles.chevronOpen : null].filter(Boolean).join(' ')

  const modal = isOpen
    ? createPortal(
        <div className={styles.portal} role="presentation">
          <button
            type="button"
            className={styles.overlay}
            aria-label="Закрыть список"
            onClick={close}
          />
          <ul
            id={listboxId}
            className={styles.panelModal}
            role="listbox"
            aria-label={ariaLabel}
            onClick={(event) => event.stopPropagation()}
          >
            {options.map((option) => {
              const isSelected = option.value === value
              const optionClassName = [styles.option, isSelected ? styles.optionSelected : null]
                .filter(Boolean)
                .join(' ')

              return (
                <li key={option.value} className={styles.item} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={optionClassName}
                    onClick={() => handleSelect(option.value)}
                  >
                    {option.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>,
        document.body,
      )
    : null

  return (
    <>
      <div
        className={[styles.root, size === 'compact' ? styles.rootCompact : null].filter(Boolean).join(' ')}
      >
        <button
          type="button"
          className={styles.trigger}
          aria-label={ariaLabel}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          onClick={() => setIsOpen((open) => !open)}
        >
          {displayLabel}
        </button>
        <span className={chevronClassName} aria-hidden="true" />
      </div>
      {modal}
    </>
  )
}
