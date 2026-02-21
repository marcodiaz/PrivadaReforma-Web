import type { PropsWithChildren } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../../shared/api/queryClient'
import { DemoDataProvider } from '../../shared/state/DemoDataContext'
import { SupabaseAuthProvider } from '../../shared/auth/SupabaseAuthProvider'
import { LanguageProvider } from '../../shared/i18n/LanguageContext'
import { ThemeProvider } from '../../shared/theme/ThemeContext'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ThemeProvider>
          <SupabaseAuthProvider>
            <DemoDataProvider>{children}</DemoDataProvider>
          </SupabaseAuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  )
}
