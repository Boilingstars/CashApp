import { useMemo } from 'react'

import iconPlus from '../../assets/icons/icon-plus.svg'
import { BackButton } from '../../shared/ui/BackButton/BackButton.jsx'
import { ChipCarousel } from '../../shared/ui/ChipCarousel/ChipCarousel.jsx'
import { ProductCard } from '../../shared/ui/ProductCard/ProductCard.jsx'
import { useAccountsStore } from '../../stores/useAccountsStore.js'
import {
  CATEGORY_LABEL_BY_ID,
  PRODUCT_TYPE_TO_CATEGORY_ID,
} from '../../lib/constants/productTypeMap.js'

import styles from './Accounts.module.css'

const rub = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
})

export function Accounts() {
  const products = useAccountsStore((s) => s.products)

  const { categories, productsByCategory, total } = useMemo(() => {
    const order = []
    const seen = new Set()
    const byCat = {}
    let sum = 0

    for (const p of products) {
      sum += Number(p.amount) || 0

      const categoryId = PRODUCT_TYPE_TO_CATEGORY_ID[p.product_type]
      if (!categoryId) continue

      if (!seen.has(categoryId)) {
        seen.add(categoryId)
        order.push(categoryId)
      }

      if (!byCat[categoryId]) byCat[categoryId] = []
      byCat[categoryId].push(p)
    }

    const chips = [
      { id: 'all', label: 'Все' },
      ...order.map((id) => ({ id, label: CATEGORY_LABEL_BY_ID[id] || id })),
    ]

    return { categories: chips, productsByCategory: byCat, total: sum }
  }, [products])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <BackButton />
        <div className={styles.carouselWrap}>
          <ChipCarousel items={categories} mode="anchor" sticky />
        </div>
      </header>

      <div className={styles.content}>
        <div id="anchor-all" />

        <section className={styles.overallCard} aria-label="Общий баланс">
          <div className={styles.overallLabel}>Общий баланс</div>
          <div className={styles.overallValue}>{rub.format(total)}</div>
        </section>

        {categories
          .filter((c) => c.id !== 'all')
          .map((c) => (
            <section
              key={c.id}
              id={`anchor-${c.id}`}
              data-anchor={c.id}
              className={styles.section}
            >
              <h2 className={styles.sectionTitle}>{c.label}</h2>
              <div className={styles.cards}>
                {(productsByCategory[c.id] || []).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          ))}

        <div className={styles.bottomSpacer} aria-hidden="true" />
      </div>

      <button type="button" className={styles.fab} aria-label="Добавить" onClick={() => {}}>
        <img className={styles.fabIcon} src={iconPlus} alt="" aria-hidden="true" />
      </button>
    </div>
  )
}

