import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { useAccountsStore } from '../../stores/useAccountsStore.js'
import { useAuthStore } from '../../stores/useAuthStore.js'
import { useTransactionsStore } from '../../stores/useTransactionsStore.js'
import { useOnboardingStore } from '../../stores/useOnboardingStore.js'
import { ActionMenu } from '../ActionMenu/ActionMenu.jsx'
import { BottomNav } from '../BottomNav/BottomNav.jsx'
import { Onboarding } from '../Onboarding/Onboarding.jsx'

import styles from './AppShell.module.css'

export function AppShell({ withBottomNav }) {
  const fetchUser = useAuthStore((state) => state.fetchUser)
  const user = useAuthStore((state) => state.user)
  const authLoading = useAuthStore((state) => state.isLoading)
  const authError = useAuthStore((state) => state.error)

  const fetchProducts = useAccountsStore((state) => state.fetchProducts)
  const productsLoaded = useAccountsStore((state) => state.productsLoaded)

  const fetchOperations = useTransactionsStore((state) => state.fetchOperations)
  const transactionsLoaded = useTransactionsStore((state) => state.transactionsLoaded)

  const isOnboardingActive = useOnboardingStore((state) => state.isActive)

  useEffect(() => {
    let cancelled = false

    async function init() {
      await fetchUser()
      if (cancelled) return

      if (useAuthStore.getState().user) {
        await Promise.all([fetchProducts(), fetchOperations()])
      }
    }

    init()

    return () => {
      cancelled = true
    }
  }, [])

  const { pathname } = useLocation()
  const isHomePage = pathname === '/'

  const mainClassName = [
    withBottomNav ? styles.contentWithNav : styles.content,
    isHomePage ? styles.contentNoScroll : null,
  ]
    .filter(Boolean)
    .join(' ')

  const isAuthPending = authLoading || (!user && !authError)
  const isProductsPending = Boolean(user) && !productsLoaded
  const isTransactionsPending = Boolean(user) && !transactionsLoaded
  const isLoading = isAuthPending || isProductsPending || isTransactionsPending

  let mainContent
  if (authError) {
    mainContent = (
      <div className={styles.stateMessage}>
        Не удалось подключиться. Попробуйте позже.
      </div>
    )
  } else if (isLoading) {
    mainContent = <div className={styles.stateMessage}>Загрузка...</div>
  } else {
    mainContent = <Outlet />
  }

  return (
    <div className={styles.root}>
      <main className={mainClassName}>{mainContent}</main>
      {!isOnboardingActive ? <ActionMenu /> : null}
      {withBottomNav && !isOnboardingActive ? <BottomNav /> : null}
      {isOnboardingActive ? <Onboarding /> : null}
    </div>
  )
}
