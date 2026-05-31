import { create } from 'zustand'

import { getAccessToken, getTokens } from '../lib/api/auth.js'
import { useOnboardingStore } from './useOnboardingStore.js'

export const useAuthStore = create((set, get) => ({
  user: null,
  isLoading: false,
  error: null,

  fetchUser: async () => {
    set({ isLoading: true, error: null })

    try {
      const { user } = get()

      if (user && getAccessToken()) {
        set({ isLoading: false, error: null })
        return
      }

      const loginData = await getTokens()
      if (!loginData?.user) {
        throw new Error('User profile is empty')
      }

      set({ user: loginData.user, isLoading: false, error: null })
      useOnboardingStore.getState().open()
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || 'Failed to fetch user'
      set({ user: null, isLoading: false, error: message })
    }
  },

  clearUser: () => {
    set({ user: null, error: null })
  },
}))
