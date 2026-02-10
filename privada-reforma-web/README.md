# Privada Reforma Web

Aplicacion web MVP para la administracion operativa de la privada Privada Reforma.

## Objetivo del proyecto
Construir una base tecnica escalable para reemplazar Residentia con modulos de:
- Auth y usuarios
- Acceso por QR
- Amenidades (alberca)
- Incidencias
- Finanzas y transparencia

## Stack tecnico
- React 19
- TypeScript
- Vite
- ESLint + Prettier
- Vitest + Testing Library

## Como correr local
```bash
npm install
npm run dev
```

## Scripts utiles
- `npm run dev`: inicia servidor local
- `npm run build`: genera build de produccion
- `npm run lint`: ejecuta lint
- `npm run format`: formatea codigo
- `npm run test`: corre pruebas en modo run

## Convencion de ramas
- `main`: rama estable
- `develop`: integracion continua
- `feature/<modulo>-<descripcion>`: desarrollo de funcionalidades
- `fix/<modulo>-<descripcion>`: correcciones

## Estructura inicial
- `src/app`
- `src/features/auth`
- `src/features/access`
- `src/features/amenities`
- `src/features/incidents`
- `src/features/finance`
- `src/shared/ui`
- `src/shared/api`
