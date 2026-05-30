import { useEffect, useRef, useState } from 'react'

import { getActionMenuItems } from './actionMenuRouteMap.js'

/**
 * Замораживает набор пунктов при открытии; закрывает меню при смене маршрута.
 */
export function useActionMenuItems(isOpen, pathname, onClose) {
  const [displayItems, setDisplayItems] = useState([])
  const prevPathnameRef = useRef(pathname)
  const wasOpenRef = useRef(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setDisplayItems(getActionMenuItems(pathname))
    }
    wasOpenRef.current = isOpen
  }, [isOpen, pathname])

  useEffect(() => {
    if (prevPathnameRef.current === pathname) return
    prevPathnameRef.current = pathname
    if (isOpen) {
      onCloseRef.current()
    }
  }, [pathname, isOpen])

  return displayItems
}
