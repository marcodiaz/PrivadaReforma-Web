import { RouterProvider } from 'react-router-dom'
import { AppProviders } from './providers/AppProviders'
import { router } from './router'
import { GlobalStatus } from '../shared/ui'

const App = () => {
  return (
    <AppProviders>
      <GlobalStatus />
      <RouterProvider router={router} />
    </AppProviders>
  )
}

export default App
