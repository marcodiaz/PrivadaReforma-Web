# AGENTS.md - App Quick Context

Primary workspace guide:

- `C:\Users\marco.diaz\OneDrive - Thermo Fisher Scientific\Documents\Codex Projects\Privada Reforma\AGENTS.md`

This local file exists so agents launched from this subfolder still find guidance quickly.

## Most Important Commands on This Machine

Use these if `node`/`npm` are not recognized:

- `C:\Progra~1\nodejs\node.exe node_modules\typescript\bin\tsc -p tsconfig.app.json --noEmit`
- `C:\Progra~1\nodejs\node.exe node_modules\vitest\vitest.mjs run`
- `C:\Progra~1\nodejs\node.exe node_modules\vite\bin\vite.js build`

## Critical Invariants

1. Preserve QR `displayCode` format `DDDD-NNNN`.
2. Preserve guard manual validation behavior and collision detection.
3. Preserve offline queue + audit synchronization logic.
4. Keep mobile-first dark/neutral UI language currently in place unless requested otherwise.

