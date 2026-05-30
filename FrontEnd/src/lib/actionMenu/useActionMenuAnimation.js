import { useEffect, useRef, useState } from 'react'

import { ACTION_MENU_CLOSE_MS } from './actionMenuConstants.js'

/**
 * Mount / visible для enter и exit без гонок при быстром open-close.
 */
export function useActionMenuAnimation(isOpen) {
  const [isMounted, setIsMounted] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const generationRef = useRef(0)

  useEffect(() => {
    if (isOpen) {
      generationRef.current += 1
      const generation = generationRef.current

      setIsMounted(true)
      setIsVisible(false)

      let rafOuter = 0
      let rafInner = 0

      rafOuter = requestAnimationFrame(() => {
        rafInner = requestAnimationFrame(() => {
          if (generationRef.current === generation) {
            setIsVisible(true)
          }
        })
      })

      return () => {
        cancelAnimationFrame(rafOuter)
        cancelAnimationFrame(rafInner)
      }
    }

    setIsVisible(false)

    const generation = generationRef.current
    const timeoutId = window.setTimeout(() => {
      if (generationRef.current === generation) {
        setIsMounted(false)
      }
    }, ACTION_MENU_CLOSE_MS)

    return () => window.clearTimeout(timeoutId)
  }, [isOpen])

  return { isMounted, isVisible }
}
