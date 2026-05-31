import { create } from 'zustand'

export const useOnboardingStore = create((set, get) => ({
  isActive: false,
  stepIndex: 0,

  open: () => {
    if (get().isActive) return
    set({ isActive: true, stepIndex: 0 })
  },

  nextStep: () => {
    const { stepIndex } = get()
    const lastIndex = 3
    if (stepIndex >= lastIndex) {
      get().complete()
      return
    }
    set({ stepIndex: stepIndex + 1 })
  },

  complete: () => {
    set({ isActive: false, stepIndex: 0 })
  },

  skip: () => {
    get().complete()
  },
}))
