# Guia rapida de tracking (sin Jira)

## Opcion recomendada
- Documentacion y feedback: Notion
- Ejecucion tecnica: GitHub Projects

## 1) Notion (importar backlog)
1. Abre Notion y crea una pagina: `Privada Reforma - Backlog`.
2. Selecciona `Import` -> `CSV`.
3. Elige `PrivadaReforma_Backlog_Notion.csv`.
4. Configura vista `Board` agrupada por `Estado`.
5. Crea vistas adicionales:
- `Sprint actual` (filtro por `Sprint`).
- `Alta prioridad` (filtro `Prioridad = Alta`).
- `Guardia` (filtro por `Rol owner = Guardia`).

## 2) GitHub Projects (issues seed)
1. Crea repo (publico o privado).
2. Crea labels: `epic`, `story`, `task`, `bug`, `mvp`, `high`, `medium`, `low`.
3. Crea milestones: `Sprint 0` a `Sprint 6`.
4. Abre `PrivadaReforma_GitHub_Issues_Seed.md` y crea los issues copiando cada bloque.
5. Crea un `Project` tipo Board con columnas:
- `Backlog`
- `Ready`
- `In Progress`
- `Review`
- `Done`

## 3) Convencion minima
- Cada issue debe tener: objetivo, alcance, criterios de aceptacion.
- No mover a `Done` sin evidencia (captura, PR o demo).
- Mantener maximo 1-2 tareas activas por persona.

## 4) Cadencia sugerida
- Planeacion semanal (30 min).
- Revision de avance 2 veces por semana (15 min).
- Retro mensual con residentes piloto.
