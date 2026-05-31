let lockCount = 0
let savedOverflow = ''

/** Блокирует скролл документа; безопасен при вложенных модалках (ref-count). */
export function lockBodyScroll() {
  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  lockCount += 1

  return () => {
    lockCount -= 1
    if (lockCount <= 0) {
      lockCount = 0
      document.body.style.overflow = savedOverflow
    }
  }
}
