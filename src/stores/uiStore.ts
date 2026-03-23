import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  darkMode: boolean
  model: string // Model selected by user
  contextCompression: boolean // Automatic context compression
  toggleDarkMode: () => void
  setDarkMode: (dark: boolean) => void
  setModel: (model: string) => void
  setContextCompression: (compact: boolean) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      darkMode: true,
      model: 'gemini-2.0-flash',
      contextCompression: false,

      toggleDarkMode: () => {
        const next = !get().darkMode
        set({ darkMode: next })
        document.documentElement.classList.toggle('light', !next)
      },

      setDarkMode: (dark: boolean) => {
        set({ darkMode: dark })
        document.documentElement.classList.toggle('light', !dark)
      },

      setModel: (model: string) => {
        set({ model })
      },

      setContextCompression: (compact: boolean) => {
        set({ contextCompression: compact })
      },
    }),
    {
      name: 'somniloq-ui',
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.classList.toggle('light', !state.darkMode)
        }
      },
    }
  )
)
