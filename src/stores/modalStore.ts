import { create } from 'zustand'

interface ModalOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  destructive?: boolean
  onConfirm?: () => void | Promise<void>
  onCancel?: () => void
}

interface ModalState {
  isOpen: boolean
  type: 'alert' | 'confirm'
  options: ModalOptions | null
  
  alert: (message: string, options?: Omit<ModalOptions, 'message'>) => void
  confirm: (message: string, options?: Omit<ModalOptions, 'message'>) => void
  close: () => void
}

export const useModalStore = create<ModalState>((set) => ({
  isOpen: false,
  type: 'alert',
  options: null,

  alert: (message, options) => set({
    isOpen: true,
    type: 'alert',
    options: { message, ...options }
  }),

  confirm: (message, options) => set({
    isOpen: true,
    type: 'confirm',
    options: { message, ...options }
  }),

  close: () => set({ isOpen: false, options: null })
}))
