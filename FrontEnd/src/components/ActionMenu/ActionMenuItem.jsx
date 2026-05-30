import styles from './ActionMenu.module.css'

function getItemButtonClassName(item) {
  return [
    styles.itemButton,
    item.destructive ? styles.itemButtonDestructive : null,
    item.secondary ? styles.itemButtonSecondary : null,
    item.disabled ? styles.itemButtonDisabled : null,
  ]
    .filter(Boolean)
    .join(' ')
}

export function ActionMenuItem({ item, isInteractive = true, onSelect }) {
  const isDisabled = Boolean(item.disabled) || !isInteractive

  return (
    <li className={styles.item} role="none">
      <button
        type="button"
        role="menuitem"
        className={getItemButtonClassName(item)}
        disabled={isDisabled}
        onClick={() => onSelect(item)}
      >
        {item.icon ? (
          <img className={styles.itemIcon} src={item.icon} alt="" aria-hidden="true" />
        ) : null}
        <span className={styles.itemLabel}>{item.label}</span>
      </button>
    </li>
  )
}
