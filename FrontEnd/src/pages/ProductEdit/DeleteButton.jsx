import styles from './DeleteButton.module.css'

export function DeleteButton({ onClick, disabled }) {
  return (
    <button
      type="button"
      className={styles.root}
      onClick={onClick}
      disabled={disabled}
    >
      Удалить
    </button>
  )
}
