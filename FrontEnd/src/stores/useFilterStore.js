import { create } from 'zustand'

const createInitialState = () => ({
  selectedCategories: [],
  periodType: null,
  customDateRange: {
    from: null,
    to: null,
  },
  selectedAccountNumbers: [],
  selectedOperations: [],
})

export const useFilterStore = create((set) => ({
  ...createInitialState(),

  toggleCategory: (categoryName) =>
    set((state) => {
      const isSelected = state.selectedCategories.includes(categoryName)

      return {
        selectedCategories: isSelected
          ? state.selectedCategories.filter((item) => item !== categoryName)
          : [...state.selectedCategories, categoryName],
      }
    }),

  setPeriodType: (periodType) => set({ periodType }),

  setCustomDateRange: ({ from, to }) =>
    set({
      customDateRange: {
        from,
        to,
      },
    }),

  toggleAccountNumber: (accountNumber) =>
    set((state) => {
      const isSelected = state.selectedAccountNumbers.includes(accountNumber)

      return {
        selectedAccountNumbers: isSelected
          ? state.selectedAccountNumbers.filter((item) => item !== accountNumber)
          : [...state.selectedAccountNumbers, accountNumber],
      }
    }),

  toggleOperation: (operation) =>
    set((state) => {
      const isSelected = state.selectedOperations.includes(operation)

      return {
        selectedOperations: isSelected
          ? state.selectedOperations.filter((item) => item !== operation)
          : [...state.selectedOperations, operation],
      }
    }),

  resetFilters: () => set(createInitialState()),
}))
