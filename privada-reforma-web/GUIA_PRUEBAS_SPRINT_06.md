# Guia de Pruebas Sprint 0.6

## 1) Arranque

1. En `privada-reforma-web` ejecutar:
```bash
npm run dev
```
2. Abrir `http://127.0.0.1:5173/login`

## 2) Login y sesion local

Usa los botones de cuentas demo en login:
- Ana Lopez (resident)
- Juan Perez (tenant)
- Carlos Mena (guard)
- Laura Ortega (board)

`Salir` cierra sesion y vuelve a `/login`.

En modo dev puedes usar `Reset demo data (dev)` para limpiar estado en `localStorage`.

## 3) Incidencias +1/-1

### Crear incidencia
1. Entra como residente o tenant.
2. Ir a `/app/incidents`.
3. Crear incidencia con:
- title
- description
- category
- priority (obligatoria)

### Votar
Reglas esperadas:
1. Si no habia voto y pulsas `+1`, queda `+1`.
2. Si ya habia `+1` y pulsas `-1`, cambia a `-1`.
3. Si pulsas el mismo voto, se elimina (neutral).
4. `supportScore` se recalcula por suma de votos.

### Visibilidad comunitaria
Cuando una incidencia llega a `supportScore >= 3`:
- aparece alerta comunitaria en `/app/incidents`
- se lista en `/app/announcements`

## 4) SLA de guardia (15 min)

1. Entra como guardia.
2. Ir a `/guard/incidents`.
3. Verifica orden:
- SLA mas cercano a vencer
- luego prioridad (high > medium > low)
- luego antiguedad

4. Ver countdown en vivo.
5. Si no tiene `acknowledgedAt` y countdown < 0, debe verse como vencido (rojo).
6. Pulsa `Acusar recibo` y valida status `acknowledged`.

### Resolver con evidencia
1. Intenta resolver sin evidencia: no debe resolver.
2. Agrega evidencia con nota o photoUrl (`Guardar evidencia`).
3. Pulsa `Resolver`: debe pasar a `resolved` y registrar `resolvedAt`.

## 5) QR end-to-end + auditoria

### Crear QR (residente/tenant)
1. Ir a `/app/visits`.
2. Crear QR `single_use` o `time_window`.
3. Regla:
- Si `time_window` supera 7 dias, `visitorPhotoUrl` es obligatorio.

### Escanear QR (guardia)
1. Ir a `/guard/scan`.
2. Pegar `qrValue`.
3. Ver tarjeta con:
- unidad
- vigencia
- status
- foto si aplica
4. Probar `Permitir`:
- en `single_use` pasa a `used`
- se crea evento en auditLog
5. Probar `Rechazar`:
- se crea evento en auditLog

### Bitacora
Ir a `/guard/logbook` y validar eventos de auditoria.

## 6) Offline guard mode

1. Simula offline (DevTools -> Network -> Offline).
2. Verifica banner global de offline.
3. En `/guard/offline`, encola validaciones manuales (permitir/rechazar).
4. Revisa contador de pendientes en `offlineQueue`.
5. Vuelve online.
6. Debe aparecer toast: `"X eventos sincronizados"`.
7. Revisa `/guard/logbook` para confirmar eventos sincronizados.

## 7) Persistencia localStorage

Recarga la pagina:
- sesion, incidencias, qrPasses, auditLog y offlineQueue deben conservarse.

Claves usadas:
- `session`
- `incidents`
- `qrPasses`
- `auditLog`
- `offlineQueue`
