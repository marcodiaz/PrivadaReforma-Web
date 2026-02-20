import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react'

export type AppLanguage = 'es' | 'en'

const STORAGE_KEY = 'app_language_v1'

const translations = {
  es: {
    adminOperation: 'Operacion administrativa',
    residence: 'Residencia',
    validatingSession: 'Validando sesion...',
    logout: 'Salir',
    packagesCount: 'Paquetes',
    profileTitle: 'Perfil',
    profileDescription: 'Preferencias de usuario (base inicial).',
    language: 'Idioma',
    spanish: 'Espanol',
    english: 'Ingles',
    name: 'Nombre',
    email: 'Correo',
    department: 'Departamento',
  },
  en: {
    adminOperation: 'Administrative operations',
    residence: 'Residence',
    validatingSession: 'Validating session...',
    logout: 'Sign out',
    packagesCount: 'Packages',
    profileTitle: 'Profile',
    profileDescription: 'User preferences (base version).',
    language: 'Language',
    spanish: 'Spanish',
    english: 'English',
    name: 'Name',
    email: 'Email',
    department: 'Unit',
  },
} as const

type TranslationKey = keyof typeof translations.es

type LanguageContextValue = {
  language: AppLanguage
  setLanguage: (language: AppLanguage) => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function readStoredLanguage(): AppLanguage {
  if (typeof window === 'undefined') {
    return 'es'
  }
  const value = window.localStorage.getItem(STORAGE_KEY)
  return value === 'en' ? 'en' : 'es'
}

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<AppLanguage>(readStoredLanguage)

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage(nextLanguage: AppLanguage) {
        setLanguageState(nextLanguage)
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, nextLanguage)
        }
      },
      t(key: TranslationKey) {
        return translations[language][key]
      },
    }),
    [language],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}
