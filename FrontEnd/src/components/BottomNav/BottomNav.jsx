import { useLocation, useNavigate } from 'react-router-dom'

import { ACTION_MENU_DIALOG_ID } from '../../lib/actionMenu/actionMenuConstants.js'
import { useActionMenuStore } from '../../stores/useActionMenuStore.js'

import iconMenu from '../../assets/icons/icon-menu.svg'
import iconWallet from '../../assets/icons/icon-wallet.svg'
import iconTasks from '../../assets/icons/icon-tasks.svg'
import iconPlus from '../../assets/icons/icon-plus.svg'

import styles from './BottomNav.module.css'

const BOTTOM_NAV_PATHS = ['/', '/transactions']

const NAV_ITEMS = [
  {
    id: 'menu',
    label: 'Меню',
    to: '/',
    icon: iconMenu,
    isActive: (pathname) => pathname === '/',
  },
  {
    id: 'wallet',
    label: 'Кошелёк',
    to: '/transactions',
    icon: iconWallet,
    isActive: (pathname) =>
      pathname === '/transactions' || pathname.startsWith('/transactions/'),
  },
  {
    id: 'tasks',
    label: 'Задачи',
    to: '/settings',
    icon: iconTasks,
    isActive: (pathname) =>
      pathname === '/settings' || pathname.startsWith('/settings/'),
  },
]

export function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isActionMenuOpen = useActionMenuStore((state) => state.isOpen)
  const openActionMenu = useActionMenuStore((state) => state.open)

  if (!BOTTOM_NAV_PATHS.includes(pathname)) {
    return null
  }

  return (
    <nav className={styles.root} aria-label="Нижняя навигация">
      <div className={styles.pill}>
        {NAV_ITEMS.map((item) => {
          const active = item.isActive(pathname)

          return (
            <button
              key={item.id}
              type="button"
              className={[styles.item, active ? styles.itemActive : null]
                .filter(Boolean)
                .join(' ')}
              onClick={() => navigate(item.to)}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
            >
              <img className={styles.icon} src={item.icon} alt="" aria-hidden="true" />
            </button>
          )
        })}
      </div>

      <button
        type="button"
        className={[styles.plusButton, isActionMenuOpen ? styles.plusButtonOpen : null]
          .filter(Boolean)
          .join(' ')}
        aria-label={isActionMenuOpen ? 'Меню открыто' : 'Добавить'}
        aria-expanded={isActionMenuOpen}
        aria-controls={ACTION_MENU_DIALOG_ID}
        onClick={() => {
          if (!isActionMenuOpen) {
            openActionMenu()
          }
        }}
      >
        <img
          className={[styles.plusIcon, isActionMenuOpen ? styles.plusIconOpen : null]
            .filter(Boolean)
            .join(' ')}
          src={iconPlus}
          alt=""
          aria-hidden="true"
        />
      </button>
    </nav>
  )
}
