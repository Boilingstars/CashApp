import { Fragment } from 'react'

import { ActionMenuItem } from './ActionMenuItem.jsx'

import styles from './ActionMenu.module.css'

export function ActionMenuList({ items, isInteractive = true, onSelect }) {
  if (!items.length) {
    return null
  }

  return (
    <ul className={styles.list} role="menu" aria-label="Действия">
      {items.map((item) => (
        <Fragment key={item.id}>
          {item.separatorBefore ? <li className={styles.separator} role="separator" /> : null}
          <ActionMenuItem item={item} isInteractive={isInteractive} onSelect={onSelect} />
        </Fragment>
      ))}
    </ul>
  )
}
