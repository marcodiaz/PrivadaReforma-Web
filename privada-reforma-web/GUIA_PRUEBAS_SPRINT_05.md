# Guia de Pruebas Sprint 0.5 (Local Demo)

Esta guia explica como probar el flujo actual en local: login por rol, QR demo, incidencias con apoyo (`+1/-1`) y logout.

## 1. Arranque local

1. En la carpeta `privada-reforma-web`, ejecutar:
```bash
npm run dev
```
2. Abrir en navegador:
`http://127.0.0.1:5173/login`

## 2. Cuentas demo locales

En la pantalla de login hay botones de autollenado para estas cuentas:

1. `Ana Lopez`
- Email: `ana.lopez@privadareforma.mx`
- Rol: `Residente`
- Unidad: `Casa 17`

2. `Carlos Mena`
- Email: `carlos.mena@privadareforma.mx`
- Rol: `Guardia`
- Unidad: `Caseta Norte`

3. `Laura Ortega`
- Email: `laura.ortega@privadareforma.mx`
- Rol: `Comite`
- Unidad: `Casa 4`

Flujo:
1. Tocar una cuenta demo (autocompleta email y rol).
2. Pulsar `Entrar`.

## 3. Logout

Ahora existe boton `Salir` en header para layouts de:
- App residencial/admin
- Ops guardia

Flujo:
1. Pulsar `Salir`.
2. Debe regresar a `/login`.

Alternativa manual:
- Navegar directo a `http://127.0.0.1:5173/login`.

## 4. Prueba de QR demo

### 4.1 Residente/Inquilino
1. Login como `Ana Lopez`.
2. Ir a `Visitas` (`/app/visits`).
3. Verificar 2 pases activos:
- QR temporal: "Visita temporal: plomero" (con vigencia).
- QR permanente: "Persona de confianza: Maria (nana)".

### 4.2 Guardia
1. Logout.
2. Login como `Carlos Mena`.
3. Ir a `Escanear` (`/guard/scan`).
4. Confirmar que aparecen los mismos QR activos para validacion en caseta.

## 5. Prueba de incidencias con apoyo (+1/-1)

### 5.1 Vista residente
1. Login como `Ana Lopez`.
2. Ir a `Incidencias` (`/app/incidents`).
3. Verificar:
- Lista ordenada por prioridad (score = apoyos - restas).
- Boton `+1 Apoyar`.
- Boton `-1 Restar`.
- Mayor score = mayor visibilidad/prioridad.

4. Dar varios `+1` a una incidencia hasta score >= 3.
5. Confirmar tarjeta de "Alerta comunitaria activa".

### 5.2 Vista comunicados
1. Ir a `Comunicados` (`/app/announcements`).
2. Verificar que incidencias con score alto salen como notificacion comunitaria.

### 5.3 Vista guardia
1. Logout.
2. Login como `Carlos Mena`.
3. Ir a `Incidencias` (`/guard/incidents`).
4. Verificar:
- Orden priorizado por score.
- La incidencia mas apoyada queda arriba (Prioridad #1).
- Boton `Atender rapido` cambia estado a `in_progress`.
- Se puede agregar y guardar comentario de guardia.

## 6. Notas de alcance actual

1. Es una demo local en memoria (sin backend).
2. Los cambios de apoyo/comentarios viven mientras la sesion del navegador siga abierta.
3. En refresh duro puede reiniciarse el estado demo.
