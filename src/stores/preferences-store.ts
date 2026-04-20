import { create } from 'zustand'
import { devtools, persist, createJSONStorage } from 'zustand/middleware'
import { PersistenceManager } from '@/infrastructure/persistence/PersistenceManager'

export type Theme = 'light' | 'dark' | 'system'
export type Language = 'en' | 'es' | 'fr' | 'de' | 'ja'
export type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'
export type TimeFormat = '12h' | '24h'
export type StorageStrategy = 'indexedDB' | 'localStorage' | 'cookies'

interface NotificationPreferences {
  email: boolean
  push: boolean
  sound: boolean
  criticalAlerts: boolean
  complianceReports: boolean
  systemUpdates: boolean
}

interface PreferencesState {
  // Theme
  theme: Theme
  setTheme: (theme: Theme) => void

  // Localization
  language: Language
  setLanguage: (language: Language) => void
  dateFormat: DateFormat
  setDateFormat: (format: DateFormat) => void
  timeFormat: TimeFormat
  setTimeFormat: (format: TimeFormat) => void
  timezone: string
  setTimezone: (timezone: string) => void

  // Notifications
  notifications: NotificationPreferences
  updateNotifications: (prefs: Partial<NotificationPreferences>) => void
  toggleNotification: (key: keyof NotificationPreferences) => void

  // Performance
  autoRefresh: boolean
  setAutoRefresh: (enabled: boolean) => void
  refreshInterval: number // in seconds
  setRefreshInterval: (interval: number) => void
  animationsEnabled: boolean
  setAnimationsEnabled: (enabled: boolean) => void
  reducedMotion: boolean
  setReducedMotion: (enabled: boolean) => void

  // Storage
  storageStrategy: StorageStrategy
  setStorageStrategy: (strategy: StorageStrategy) => void
  autoSave: boolean
  setAutoSave: (enabled: boolean) => void
  cloudSync: boolean
  setCloudSync: (enabled: boolean) => void

  // Accessibility
  fontSize: 'small' | 'medium' | 'large'
  setFontSize: (size: 'small' | 'medium' | 'large') => void
  highContrast: boolean
  setHighContrast: (enabled: boolean) => void
  keyboardShortcuts: boolean
  setKeyboardShortcuts: (enabled: boolean) => void

  // Data preferences
  defaultTimeRange: '1h' | '24h' | '7d' | '30d'
  setDefaultTimeRange: (range: '1h' | '24h' | '7d' | '30d') => void
  defaultMetricView: 'percentage' | 'absolute'
  setDefaultMetricView: (view: 'percentage' | 'absolute') => void

  // Reset
  resetPreferences: () => void
}

const defaultNotifications: NotificationPreferences = {
  email: true,
  push: true,
  sound: false,
  criticalAlerts: true,
  complianceReports: true,
  systemUpdates: false,
}

export const usePreferencesStore = create<PreferencesState>()(
  devtools(
    persist(
      (set) => ({
        // Theme
        theme: 'system',
        setTheme: (theme) => {
          set({ theme })
          // Apply theme to document
          if (typeof window !== 'undefined') {
            const root = document.documentElement
            if (theme === 'system') {
              const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
              root.classList.toggle('dark', systemTheme === 'dark')
            } else {
              root.classList.toggle('dark', theme === 'dark')
            }
          }
        },

        // Localization
        language: 'en',
        setLanguage: (language) => set({ language }),
        dateFormat: 'MM/DD/YYYY',
        setDateFormat: (format) => set({ dateFormat: format }),
        timeFormat: '12h',
        setTimeFormat: (format) => set({ timeFormat: format }),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        setTimezone: (timezone) => set({ timezone }),

        // Notifications
        notifications: defaultNotifications,
        updateNotifications: (prefs) =>
          set((state) => ({
            notifications: { ...state.notifications, ...prefs },
          })),
        toggleNotification: (key) =>
          set((state) => ({
            notifications: {
              ...state.notifications,
              [key]: !state.notifications[key],
            },
          })),

        // Performance
        autoRefresh: true,
        setAutoRefresh: (enabled) => set({ autoRefresh: enabled }),
        refreshInterval: 300, // 5 minutes
        setRefreshInterval: (interval) => set({ refreshInterval: interval }),
        animationsEnabled: true,
        setAnimationsEnabled: (enabled) => set({ animationsEnabled: enabled }),
        reducedMotion: false,
        setReducedMotion: (enabled) => set({ reducedMotion: enabled }),

        // Storage
        storageStrategy: 'indexedDB',
        setStorageStrategy: (strategy) => {
          set({ storageStrategy: strategy })
          // Update PersistenceManager strategy
          try {
            const persistence = PersistenceManager.getInstance()
            persistence.setStrategy(strategy)
          } catch (error) {
            console.error('Failed to set storage strategy:', error)
          }
        },
        autoSave: true,
        setAutoSave: (enabled) => set({ autoSave: enabled }),
        cloudSync: false,
        setCloudSync: (enabled) => set({ cloudSync: enabled }),

        // Accessibility
        fontSize: 'medium',
        setFontSize: (size) => {
          set({ fontSize: size })
          // Apply font size to document
          if (typeof window !== 'undefined') {
            const root = document.documentElement
            root.classList.remove('text-sm', 'text-base', 'text-lg')
            const sizeClass = {
              small: 'text-sm',
              medium: 'text-base',
              large: 'text-lg',
            }[size]
            root.classList.add(sizeClass)
          }
        },
        highContrast: false,
        setHighContrast: (enabled) => set({ highContrast: enabled }),
        keyboardShortcuts: true,
        setKeyboardShortcuts: (enabled) => set({ keyboardShortcuts: enabled }),

        // Data preferences
        defaultTimeRange: '24h',
        setDefaultTimeRange: (range) => set({ defaultTimeRange: range }),
        defaultMetricView: 'percentage',
        setDefaultMetricView: (view) => set({ defaultMetricView: view }),

        // Reset
        resetPreferences: () =>
          set({
            theme: 'system',
            language: 'en',
            dateFormat: 'MM/DD/YYYY',
            timeFormat: '12h',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            notifications: defaultNotifications,
            autoRefresh: true,
            refreshInterval: 300,
            animationsEnabled: true,
            reducedMotion: false,
            storageStrategy: 'indexedDB',
            autoSave: true,
            cloudSync: false,
            fontSize: 'medium',
            highContrast: false,
            keyboardShortcuts: true,
            defaultTimeRange: '24h',
            defaultMetricView: 'percentage',
          }),
      }),
      {
        name: 'preferences-store',
        storage: createJSONStorage(() => ({
          getItem: async (name) => {
            // Skip during SSR
            if (typeof window === 'undefined') {
              return null
            }

            try {
              const persistence = PersistenceManager.getInstance()
              const data = await persistence.load(name)
              return data ? JSON.stringify(data) : null
            } catch (error) {
              console.error('Error loading preferences from persistence:', error)
              return null
            }
          },
          setItem: async (name, value) => {
            // Skip during SSR
            if (typeof window === 'undefined') {
              return
            }

            try {
              const persistence = PersistenceManager.getInstance()
              // value is already a string from Zustand, parse it first
              const parsedValue = typeof value === 'string' ? JSON.parse(value) : value
              await persistence.save(name, parsedValue)
            } catch (error) {
              console.error('Error saving preferences to persistence:', error)
            }
          },
          removeItem: async (name) => {
            // Skip during SSR
            if (typeof window === 'undefined') {
              return
            }

            try {
              const persistence = PersistenceManager.getInstance()
              await persistence.delete(name)
            } catch (error) {
              console.error('Error removing preferences from persistence:', error)
            }
          },
        })),
      }
    ),
    {
      name: 'preferences-store',
    }
  )
)