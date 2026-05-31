import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'

import { ACTION_MENU_DIALOG_ID } from '../../lib/actionMenu/actionMenuConstants.js'
import { runActionMenuHandler } from '../../lib/actionMenu/actionMenuHandlers.js'
import { useActionMenuAnimation } from '../../lib/actionMenu/useActionMenuAnimation.js'
import { useActionMenuEffects } from '../../lib/actionMenu/useActionMenuEffects.js'
import { useActionMenuItems } from '../../lib/actionMenu/useActionMenuItems.js'
import { useActionMenuStore } from '../../stores/useActionMenuStore.js'

import { ActionMenuList } from './ActionMenuList.jsx'
import { ActionMenuNewExpense } from './ActionMenuNewExpense.jsx'
import { ActionMenuNewExpenseSuccess } from './ActionMenuNewExpenseSuccess.jsx'
import { ActionMenuNewIncome } from './ActionMenuNewIncome.jsx'

import styles from './ActionMenu.module.css'

export { ACTION_MENU_DIALOG_ID } from '../../lib/actionMenu/actionMenuConstants.js'

export function ActionMenu() {
  const { pathname } = useLocation()
  const isOpen = useActionMenuStore((state) => state.isOpen)
  const activeScreen = useActionMenuStore((state) => state.activeScreen)
  const close = useActionMenuStore((state) => state.close)
  const showNewIncome = useActionMenuStore((state) => state.showNewIncome)
  const showNewExpense = useActionMenuStore((state) => state.showNewExpense)

  const panelRef = useRef(null)
  const [isClosing, setIsClosing] = useState(false)
  const dialogTitleId = useId()

  const { isMounted, isVisible } = useActionMenuAnimation(isOpen)
  const displayItems = useActionMenuItems(isOpen, pathname, close)

  const handleClose = useCallback(() => {
    if (!isOpen || isClosing) return
    setIsClosing(true)
    close()
  }, [close, isClosing, isOpen])

  useActionMenuEffects(isOpen, handleClose)

  const resumeAfterDatePick = useActionMenuStore((state) => state.resumeAfterDatePick)
  const resumeMenuAfterDatePick = useActionMenuStore((state) => state.resumeMenuAfterDatePick)
  const isExpenseDatePickerActive = useActionMenuStore((state) => state.isExpenseDatePickerActive)

  useEffect(() => {
    if (!isOpen) {
      setIsClosing(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!resumeAfterDatePick || pathname.includes('/date-picker')) return
    resumeMenuAfterDatePick()
  }, [pathname, resumeAfterDatePick, resumeMenuAfterDatePick])

  useEffect(() => {
    if (!isVisible || !panelRef.current) return
    panelRef.current.focus({ preventScroll: true })
  }, [isVisible])

  const handleOverlayClick = () => {
    handleClose()
  }

  const handleItemSelect = (item) => {
    if (item.disabled || isClosing || !isVisible) return

    if (item.actionKey === 'newIncome') {
      showNewIncome()
      return
    }

    if (item.actionKey === 'newExpense') {
      showNewExpense()
      return
    }

    runActionMenuHandler(item.actionKey)
    handleClose()
  }

  const handleConfirmIncome = () => {
    handleClose()
  }

  const isFormScreen = activeScreen === 'newIncome' || activeScreen === 'newExpense'
  const isSuccessScreen = activeScreen === 'newExpenseSuccess'

  if (pathname.includes('/date-picker') || isExpenseDatePickerActive) {
    return null
  }

  if (!isMounted) {
    return null
  }

  const panelClassName = [
    styles.panel,
    activeScreen === 'list' ? styles.panelList : null,
    isSuccessScreen ? styles.panelSuccess : null,
    isFormScreen ? styles.panelForm : null,
    isVisible ? styles.panelVisible : null,
  ]
    .filter(Boolean)
    .join(' ')

  const isInteractive = isVisible && !isClosing

  const dialogLabels = {
    newIncome: 'Новое поступление',
    newExpense: 'Новая трата',
    newExpenseSuccess: 'Успешно',
    list: 'Быстрые действия',
  }
  const dialogLabel = dialogLabels[activeScreen] ?? dialogLabels.list

  return createPortal(
    <div className={styles.root}>
      <button
        type="button"
        className={styles.overlay}
        aria-label="Закрыть меню"
        tabIndex={isInteractive ? 0 : -1}
        onClick={handleOverlayClick}
      />
      <div
        ref={panelRef}
        id={ACTION_MENU_DIALOG_ID}
        className={panelClassName}
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        tabIndex={-1}
      >
        <p id={dialogTitleId} className={styles.srOnly}>
          {dialogLabel}
        </p>
        {activeScreen === 'newIncome' ? (
          <ActionMenuNewIncome
            isInteractive={isInteractive}
            onBack={handleClose}
            onConfirm={handleConfirmIncome}
          />
        ) : activeScreen === 'newExpenseSuccess' ? (
          <ActionMenuNewExpenseSuccess isInteractive={isInteractive} onClose={handleClose} />
        ) : activeScreen === 'newExpense' ? (
          <ActionMenuNewExpense isInteractive={isInteractive} onBack={handleClose} />
        ) : (
          <ActionMenuList items={displayItems} isInteractive={isInteractive} onSelect={handleItemSelect} />
        )}
      </div>
    </div>,
    document.body,
  )
}
