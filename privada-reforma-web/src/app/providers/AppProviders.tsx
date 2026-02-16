import type { PropsWithChildren } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../../shared/api/queryClient'
import { DemoDataProvider } from '../../shared/state/DemoDataContext'
import { SupabaseAuthProvider } from '../../shared/auth/SupabaseAuthProvider'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <SupabaseAuthProvider>
        <DemoDataProvider>{children}</DemoDataProvider>
      </SupabaseAuthProvider>
    </QueryClientProvider>
  )
}
