import { RouterProvider } from 'react-router-dom'
import { AppProviders } from './app/providers/AppProviders'
import { router } from './app/router'
import { GlobalStatus } from './shared/ui'

const App = () => {
  return (
    <AppProviders>
      <GlobalStatus />
      <RouterProvider router={router} />
    </AppProviders>
  )
}

export default App
