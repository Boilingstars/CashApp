import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { useDragScroll } from '../../../lib/hooks/useDragScroll.js'
import { Chip } from '../Chip/Chip.jsx'

import styles from './ChipCarousel.module.css'

export function ChipCarousel({
  items,
  activeId,
  onSelect,
  getLabel,
  className,
  mode = 'filter',
  sticky = false,
}) {
  const indicatorRef = useRef(null)
  const itemRefs = useRef(new Map())
  const activeIdRef = useRef(activeId)
  const { scrollerRef, isDragging, dragHandlers } = useDragScroll({ threshold: 8 })
  const [activeAnchorId, setActiveAnchorId] = useState(
    mode === 'anchor' ? (activeId ?? (items?.[0] ? (typeof items[0] === 'string' ? items[0] : items[0].id) : undefined)) : undefined,
  )

  const ids = useMemo(
    () => items.map((item) => (typeof item === 'string' ? item : item.id)),
    [items],
  )

  const updateIndicator = () => {
    const scroller = scrollerRef.current
    const indicator = indicatorRef.current
    if (!scroller || !indicator) return

    const el = itemRefs.current.get(activeIdRef.current)
    if (!el) {
      indicator.style.opacity = '0'
      indicator.style.width = '0px'
      indicator.style.transform = 'translateX(0px)'
      return
    }

    // offsetLeft is relative to scroller's content box, which is what we need
    const left = el.offsetLeft
    const width = el.offsetWidth

    indicator.style.opacity = '1'
    indicator.style.width = `${width}px`
    indicator.style.transform = `translateX(${left}px)`
  }

  useLayoutEffect(() => {
    activeIdRef.current = mode === 'anchor' ? activeAnchorId : activeId
    updateIndicator()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, activeAnchorId, ids.join('|'), mode])

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const onScroll = () => updateIndicator()
    scroller.addEventListener('scroll', onScroll, { passive: true })

    const ro = new ResizeObserver(() => updateIndicator())
    ro.observe(scroller)

    return () => {
      scroller.removeEventListener('scroll', onScroll)
      ro.disconnect()
    }
  }, [])

  return (
    <div
      className={[styles.root, sticky ? styles.sticky : null, className]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        ref={scrollerRef}
        className={[
          styles.scroller,
          isDragging ? styles.scrollerDragging : null,
        ]
          .filter(Boolean)
          .join(' ')}
        role="tablist"
        aria-label="Категории"
        {...dragHandlers}
      >
        <div ref={indicatorRef} className={styles.activePill} aria-hidden="true" />

        {items.map((item) => {
          const id = typeof item === 'string' ? item : item.id
          const label =
            typeof getLabel === 'function'
              ? getLabel(item)
              : typeof item === 'string'
                ? item
                : item.label

          const isActive = id === (mode === 'anchor' ? activeAnchorId : activeId)

          const handleClick =
            mode === 'anchor'
              ? () => {
                  setActiveAnchorId(id)
                  const target =
                    document.getElementById(`anchor-${id}`) ||
                    document.querySelector(`[data-anchor="${id}"]`)
                  if (!target) return

                  const header = scrollerRef.current?.closest('header')
                  const headerOffset = header
                    ? header.getBoundingClientRect().height
                    : 0

                  const y =
                    target.getBoundingClientRect().top +
                    window.scrollY -
                    headerOffset -
                    2

                  window.scrollTo({ top: y, behavior: 'smooth' })
                }
              : () => onSelect?.(id)

          return (
            <Chip
              key={id}
              active={isActive}
              onClick={handleClick}
              variant="carousel"
              size="md"
              aria-pressed={isActive}
              ref={(node) => {
                if (node) itemRefs.current.set(id, node)
                else itemRefs.current.delete(id)
              }}
            >
              {label}
            </Chip>
          )
        })}
      </div>
    </div>
  )
}

