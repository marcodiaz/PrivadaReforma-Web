/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import type { UserRole } from '../domain/auth'
import {
  LOCAL_ACCOUNTS,
  LOCAL_INCIDENTS,
  LOCAL_QR_PASSES,
  type Incident,
  type LocalAccount,
  type QrPass,
} from '../domain/demoData'

type DemoDataContextValue = {
  accounts: LocalAccount[]
  qrPasses: QrPass[]
  incidents: Incident[]
  supportIncident: (incidentId: string) => void
  opposeIncident: (incidentId: string) => void
  markIncidentInProgress: (incidentId: string) => void
  addGuardComment: (incidentId: string, comment: string) => void
  findAccountByRole: (role: UserRole) => LocalAccount | undefined
}

const DemoDataContext = createContext<DemoDataContextValue | null>(null)

export function DemoDataProvider({ children }: PropsWithChildren) {
  const [incidents, setIncidents] = useState<Incident[]>(LOCAL_INCIDENTS)

  function supportIncident(incidentId: string) {
    setIncidents((previous) =>
      previous.map((incident) =>
        incident.id === incidentId
          ? { ...incident, supports: incident.supports + 1 }
          : incident,
      ),
    )
  }

  function opposeIncident(incidentId: string) {
    setIncidents((previous) =>
      previous.map((incident) =>
        incident.id === incidentId
          ? { ...incident, opposes: incident.opposes + 1 }
          : incident,
      ),
    )
  }

  function markIncidentInProgress(incidentId: string) {
    setIncidents((previous) =>
      previous.map((incident) =>
        incident.id === incidentId ? { ...incident, status: 'in_progress' } : incident,
      ),
    )
  }

  function addGuardComment(incidentId: string, comment: string) {
    const cleanComment = comment.trim()
    if (!cleanComment) {
      return
    }

    setIncidents((previous) =>
      previous.map((incident) =>
        incident.id === incidentId
          ? {
              ...incident,
              guardComments: [...incident.guardComments, cleanComment],
            }
          : incident,
      ),
    )
  }

  function findAccountByRole(role: UserRole) {
    return LOCAL_ACCOUNTS.find((account) => account.role === role)
  }

  const value = useMemo<DemoDataContextValue>(
    () => ({
      accounts: LOCAL_ACCOUNTS,
      qrPasses: LOCAL_QR_PASSES,
      incidents,
      supportIncident,
      opposeIncident,
      markIncidentInProgress,
      addGuardComment,
      findAccountByRole,
    }),
    [incidents],
  )

  return <DemoDataContext.Provider value={value}>{children}</DemoDataContext.Provider>
}

export function useDemoData() {
  const context = useContext(DemoDataContext)
  if (!context) {
    throw new Error('useDemoData must be used within DemoDataProvider')
  }

  return context
}
