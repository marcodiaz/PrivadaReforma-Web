# Prompt listo para nueva ventana de Codex

Copia y pega este prompt en una nueva ventana de Codex (en el folder nuevo donde quieres iniciar el proyecto):

```text
Quiero que actues como mi copiloto tecnico para arrancar el proyecto web "Privada Reforma" desde cero en este folder.

Objetivo inmediato:
1) Conectar este proyecto a mi perfil de Git.
2) Crear repo local con buena base tecnica.
3) Preparar una primera version web en React + TypeScript.
4) Dejar CI basico y estructura lista para crecer.

Tareas exactas que debes ejecutar:
1. Verifica herramientas instaladas: git, node, npm, gh.
2. Si git user/email no estan configurados, pideme estos datos y configuralos (local al repo):
- user.name
- user.email
3. Inicializa repositorio git en este folder.
4. Crea `.gitignore` adecuado para Node/React.
5. Inicializa proyecto con Vite React TypeScript.
6. Crea estructura inicial:
- src/app
- src/features/auth
- src/features/access
- src/features/amenities
- src/features/incidents
- src/features/finance
- src/shared/ui
- src/shared/api
7. Configura lint/format (ESLint + Prettier).
8. Agrega scripts utiles en package.json (dev, build, lint, test).
9. Crea README inicial con:
- objetivo del proyecto
- como correr local
- stack tecnico
- convenciones de ramas
10. Crea commit inicial con mensaje: `chore: bootstrap privada reforma web app`
11. Si `gh` esta autenticado, crea repo remoto en mi cuenta y haz push de `main`.
12. Si `gh` no esta autenticado, dame exactamente los comandos para autenticar y continuar.

Criterios de terminado:
- `npm run dev` funciona
- repo local inicializado con commit
- remoto creado y sincronizado (si hay auth)
- README claro

No me des solo plan: ejecuta los cambios y al final dame resumen con archivos creados y comandos importantes.
```

---

## Comandos manuales alternos (si prefieres hacerlo tu primero)

```powershell
# 1) Crear folder y entrar
mkdir PrivadaReforma-Web
cd PrivadaReforma-Web

# 2) Inicializar git
git init
git branch -M main

# 3) Config Git local (ajusta datos)
git config user.name "TU NOMBRE"
git config user.email "TU_CORREO"

# 4) Crear app React + TS
npm create vite@latest . -- --template react-ts
npm install

# 5) Primer commit
git add .
git commit -m "chore: bootstrap privada reforma web app"

# 6) Crear repo remoto con GitHub CLI (si ya tienes gh auth)
gh repo create PrivadaReforma-Web --private --source . --remote origin --push
```
