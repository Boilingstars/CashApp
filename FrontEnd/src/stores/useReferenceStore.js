import { create } from 'zustand'

import { listCategories } from '../lib/api/categories.js'
import { listServices } from '../lib/api/services.js'
import { getAccessToken } from '../lib/api/auth.js'
import { getExpenseCategories } from '../lib/utils/getExpenseCategories.js'
import { getExpenseServiceNameExamples } from '../lib/utils/getExpenseServiceNameExamples.js'

const namesToReferenceItems = (names) =>
  names.map((name, index) => ({ id: index, name }))

/** TEMP: fallback на mock helpers, если GET /api/services|categories/ недоступен. */
const applyMockFallback = () => ({
  services: namesToReferenceItems(getExpenseServiceNameExamples()),
  categories: namesToReferenceItems(getExpenseCategories()),
  usedFallback: true,
})

/**
 * TEMP: глобальный store для справочников services/categories.
 * Сейчас нужен только в ActionMenuNewExpense.
 * TODO: если reference-данные не понадобятся в других экранах — упростить
 * до локальной загрузки (useEffect + useState) прямо в ActionMenuNewExpense.
 */
export const useReferenceStore = create((set, get) => ({
  services: [],
  categories: [],
  loaded: false,
  loading: false,
  error: null,
  /** TEMP: true — данные из mock helpers, не из API */
  usedFallback: false,

  fetchReference: async () => {
    const { loaded, loading } = get()
    if (loaded || loading) return
    if (!getAccessToken()) return

    set({ loading: true, error: null })

    try {
      const [services, categories] = await Promise.all([listServices(), listCategories()])

      set({
        services,
        categories,
        loaded: true,
        loading: false,
        error: null,
        usedFallback: false,
      })
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        err.message ||
        'Failed to fetch reference data'

      // TEMP: см. applyMockFallback — до стабильного API остаёмся на моках
      set({
        ...applyMockFallback(),
        loaded: true,
        loading: false,
        error: message,
      })
    }
  },
}))
