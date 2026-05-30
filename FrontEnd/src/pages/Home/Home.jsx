import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import iconArrow from '../../assets/icons/icon_arrow.svg'
import { ChipCarousel } from '../../shared/ui/ChipCarousel/ChipCarousel.jsx'
import { AiChatWidget } from '../../shared/ui/AiChatWidget/AiChatWidget.jsx'
import {
  CATEGORY_LABEL_BY_ID,
  PRODUCT_TYPE_TO_CATEGORY_ID,
} from '../../lib/constants/productTypeMap.js'
import { useAccountsStore } from '../../stores/useAccountsStore.js'

import styles from './Home.module.css'

const rub = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
})

const ALL_CATEGORY_ID = 'all'

export function Home() {
  const navigate = useNavigate()

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const products = useAccountsStore((s) => s.products)
  const selectedCategoryId = useAccountsStore((s) => s.selectedCategoryId)
  const setSelectedCategory = useAccountsStore((s) => s.setSelectedCategory)

  const categories = useMemo(() => {
    const ids = new Set()
    for (const p of products) {
      const categoryId = PRODUCT_TYPE_TO_CATEGORY_ID[p.product_type]
      if (categoryId) ids.add(categoryId)
    }

    const result = [{ id: ALL_CATEGORY_ID, label: 'Все' }]
    for (const id of ids) {
      result.push({ id, label: CATEGORY_LABEL_BY_ID[id] || id })
    }
    return result
  }, [products])

  const goToAccounts = () => navigate('/accounts')

  const balance = useMemo(() => {
    const filtered =
      selectedCategoryId === ALL_CATEGORY_ID
        ? products
        : products.filter(
            (p) => PRODUCT_TYPE_TO_CATEGORY_ID[p.product_type] === selectedCategoryId,
          )
    return filtered.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  }, [products, selectedCategoryId])

  return (
    <div className={styles.page}>
      <div className={styles.topCarousel}>
        <ChipCarousel
          items={categories}
          activeId={selectedCategoryId}
          onSelect={setSelectedCategory}
        />
      </div>

      <section className={styles.balanceSection} aria-label="Баланс">
        <div className={styles.balanceCardOuter}>
          <div className={styles.balanceInner} aria-hidden="true" />
          <button
            type="button"
            className={styles.balanceCard}
            onClick={goToAccounts}
            aria-label="Перейти к банковским продуктам"
          >
            <div className={styles.balanceLabel}>Текущий баланс</div>
            <div className={styles.balanceValue}>{rub.format(balance)}</div>

            <div className={styles.miniCard} aria-hidden="true">
              <div className={styles.miniCardTop}>3310</div>
              <div className={styles.miniCardBottom}>МИР</div>
            </div>
          </button>
        </div>
      </section>

      <div className={styles.downLinkWrap}>
        <button
          type="button"
          className={styles.downLink}
          onClick={goToAccounts}
          aria-label="Перейти к банковским продуктам"
        >
          <img className={styles.downLinkIcon} alt="" src={iconArrow} />
        </button>
      </div>

      <div className={styles.headingWrap}>
        <h1 className={styles.heading}>
          Чем могу
          <br />
          помочь?
        </h1>
        <p className={styles.headingAccent}>Спросите что-нибудь у Cash Ask</p>
      </div>

      <div className={styles.grow} />

      <div className={styles.chatWrap}>
        <AiChatWidget
          onGoToChat={() => navigate('/chat')}
          onSubmit={() => navigate('/chat')}
        />
      </div>
    </div>
  )
}

