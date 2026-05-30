import { useMemo } from 'react'
import { useParams } from 'react-router-dom'

import { MOCK_TAGS } from '../../lib/mocks/tags.js'
import { BackButton } from '../../shared/ui/BackButton/BackButton.jsx'

import styles from './TransactionTag.module.css'

export function TransactionTag() {
  const { tagId } = useParams()

  const tag = useMemo(
    () => MOCK_TAGS.find((item) => item.id === tagId) ?? null,
    [tagId],
  )

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <BackButton />
      </header>

      <main className={styles.content}>
        <h1 className={styles.title}>{tag?.name ?? 'Категория'}</h1>
        {tag ? (
          <>
            <p className={styles.meta}>ID: {tag.id}</p>
            <p className={styles.placeholder}>
              Скоро здесь появятся операции по выбранной категории
            </p>
          </>
        ) : (
          <p className={styles.placeholder}>Категория не найдена</p>
        )}
      </main>
    </div>
  )
}
