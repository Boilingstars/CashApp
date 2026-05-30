import { create } from 'zustand'

/** @typedef {'list' | 'newIncome' | 'newExpense' | 'newExpenseSuccess'} ActionMenuScreen */

/** @typedef {'details' | 'meta'} NewExpenseStep */

/**
 * @typedef {Object} NewExpenseDraft
 * @property {NewExpenseStep} step
 * @property {string} amount
 * @property {string} categoryName
 * @property {string} accountId
 * @property {string} customServiceName
 * @property {string} cashback
 * @property {string | null} date — YYYY-MM-DD
 */

const createNewExpenseDraft = () => ({
  step: 'details',
  amount: '',
  categoryName: '',
  accountId: '',
  customServiceName: '',
  cashback: '',
  date: null,
})

export const useActionMenuStore = create((set) => ({
  isOpen: false,
  /** @type {ActionMenuScreen} */
  activeScreen: 'list',
  /** @type {NewExpenseDraft | null} */
  newExpenseDraft: null,
  resumeAfterDatePick: false,
  isExpenseDatePickerActive: false,
  expenseDatePickerReturnPath: null,

  open: () => set({ isOpen: true, activeScreen: 'list' }),

  close: () =>
    set({
      isOpen: false,
      activeScreen: 'list',
      newExpenseDraft: null,
      resumeAfterDatePick: false,
      isExpenseDatePickerActive: false,
      expenseDatePickerReturnPath: null,
    }),

  showNewIncome: () => set({ activeScreen: 'newIncome' }),

  showNewExpense: () =>
    set({
      activeScreen: 'newExpense',
      newExpenseDraft: createNewExpenseDraft(),
    }),

  showNewExpenseSuccess: () =>
    set({
      activeScreen: 'newExpenseSuccess',
      newExpenseDraft: null,
    }),

  /** @param {Partial<NewExpenseDraft>} patch */
  patchNewExpenseDraft: (patch) =>
    set((state) => ({
      newExpenseDraft: state.newExpenseDraft
        ? { ...state.newExpenseDraft, ...patch }
        : null,
    })),

  /** @param {string} returnPath */
  openExpenseDatePicker: (returnPath) =>
    set({
      isOpen: false,
      resumeAfterDatePick: true,
      isExpenseDatePickerActive: true,
      expenseDatePickerReturnPath: returnPath,
    }),

  /** @param {string} dateKey — YYYY-MM-DD */
  completeExpenseDatePick: (dateKey) =>
    set((state) => ({
      newExpenseDraft: state.newExpenseDraft
        ? { ...state.newExpenseDraft, date: dateKey, step: 'meta' }
        : null,
      resumeAfterDatePick: true,
    })),

  resumeMenuAfterDatePick: () =>
    set({
      isOpen: true,
      resumeAfterDatePick: false,
      isExpenseDatePickerActive: false,
      expenseDatePickerReturnPath: null,
    }),
}))
