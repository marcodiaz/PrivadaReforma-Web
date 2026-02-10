import './App.css'

const modules = [
  'Auth y gestion de usuarios',
  'Acceso por QR',
  'Amenidades (alberca)',
  'Incidencias',
  'Finanzas y transparencia',
]

function App() {
  return (
    <main className="app-shell">
      <h1>Privada Reforma Web</h1>
      <p>MVP inicial para control operativo residencial.</p>
      <ul>
        {modules.map((moduleName) => (
          <li key={moduleName}>{moduleName}</li>
        ))}
      </ul>
    </main>
  )
}

export default App
