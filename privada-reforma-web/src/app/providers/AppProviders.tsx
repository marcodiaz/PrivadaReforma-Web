import type { PropsWithChildren } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../../shared/api/queryClient'
import { DemoDataProvider } from '../../shared/state/DemoDataContext'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <DemoDataProvider>{children}</DemoDataProvider>
    </QueryClientProvider>
  )
}
