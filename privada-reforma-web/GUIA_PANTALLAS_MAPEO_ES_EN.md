# Privada Reforma - Mapeo de Pantallas (ES/EN)

Documento bilingue que mapea cada screenshot compartido contra su funcionalidad real en la app web.

Base de revision:
- `AGENTS.md` (root y app)
- rutas en `src/app/router.tsx`
- navegacion/layout en `src/app/layouts/AppLayout.tsx`
- modulos en `src/features/app/pages.tsx`, `src/features/admin/pages.tsx`, `src/features/packages/pages.tsx`
- reglas de estado en `src/shared/state/DemoDataContext.tsx`

## Screenshot 01 - Admin Finanzas > Adeudos
- Vista: **Operacion administrativa** / rol **Administrador / Comite**
- Ruta: `/admin/debts`
- ES: Pantalla placeholder para control de morosidad y cobranza.
- EN: Placeholder screen for delinquency tracking and collection follow-up.
- Estado actual: solo lectura, sin formulario operativo.

## Screenshot 02 - Admin Finanzas > Reportes (Exportaciones)
- Vista: **Exportaciones**
- Ruta: `/admin/exports`
- ES: Placeholder para generacion de reportes CSV/PDF para operacion/comite.
- EN: Placeholder for CSV/PDF report generation for operations/board.
- Estado actual: sin boton de descarga real en esta pantalla.

## Screenshot 03 - Admin Moderacion > Reports
- Vista: **Reports**
- Ruta: `/admin/reports`
- ES: Moderacion comunitaria; lista reportes abiertos de incidencias/mascotas/marketplace.
- EN: Community moderation; lists open reports from incidents/pets/marketplace.
- Lo que muestra el screenshot: estado vacio (`Sin reportes abiertos`).
- Acciones (cuando hay reportes):
  - `Eliminar contenido` (borra objetivo y cierra reporte como actioned).
  - `Remover reporte` (descarta reporte como dismissed).

## Screenshot 04 - Admin Finanzas > Finanzas
- Vista: **Finanzas**
- Ruta: `/admin/finance`
- ES: Placeholder para ingresos, egresos, presupuesto y transparencia.
- EN: Placeholder for income, expenses, budgeting, and transparency.

## Screenshot 05 - Admin Moderacion > Paquetes
- Vista: **Paquetes**
- Ruta: `/admin/packages`
- ES: Vista global de paqueteria (solo lectura) con conteo en resguardo y filtro por estado.
- EN: Global package overview (read-only) with held-count and status filter.
- Acciones:
  - Filtro `Todos / En resguardo / Listo para entrega / Entregado`.
  - Lista por unidad y fecha.

## Screenshot 06 - Admin Operacion > Push
- Vista: **Push Notifications**
- Ruta: `/admin/push`
- ES: Envio manual de notificaciones por usuario, unidad, rol o global.
- EN: Manual push delivery by user, unit, role, or global target.
- Campos clave: destino, titulo, mensaje, URL destino, tag, incluirme.
- Validaciones: mensaje obligatorio y destino obligatorio segun modo.

## Screenshot 07 - Residente > Incidencias (lista)
- Vista: **Incidencias**
- Ruta: `/app/incidents`
- ES: Feed comunitario de incidencias con voto `+1/-1`, score y reporte a moderacion.
- EN: Community incidents feed with `+1/-1` voting, score, and moderation report action.
- Acciones visibles:
  - `+1 Apoyar`
  - `-1 Restar`
  - `Reportar`
  - Boton `+` para crear nueva incidencia.

## Screenshot 08 - Residente > Perfil (antes de actualizar nombre)
- Vista: **Perfil**
- Ruta: `/app/profile`
- ES: Datos de cuenta + formulario para nombre visible + cambio de contrasena.
- EN: Account data + visible-name form + password update section.
- Lo que hace:
  - Muestra nombre/correo/departamento.
  - Permite editar `Nombre visible` y enviar `Actualizar nombre`.
  - Permite cambiar contrasena con validacion.

## Screenshot 09 - Residente > Perfil (despues de actualizar nombre)
- Vista: **Perfil**
- Ruta: `/app/profile`
- ES: Confirmacion de exito (`Nombre actualizado.`) tras actualizar metadata de usuario.
- EN: Success confirmation (`Nombre actualizado.`) after user metadata update.

## Screenshot 10 - Residente/Comite > Finanzas
- Vista: **Finanzas**
- Ruta: `/app/finance`
- ES: Placeholder de estado de cuenta/cuotas/transparencia.
- EN: Placeholder for account statement/fees/transparency.

## Screenshot 11 - Residente > Incidencias (modal Nueva incidencia)
- Vista: modal **Nueva incidencia** sobre `/app/incidents`
- ES: Formulario para alta de incidencia con titulo, descripcion, categoria y prioridad.
- EN: Incident creation form with title, description, category, and priority.
- Accion principal: `Crear incidencia`.

## Screenshot 12 - Residente > Visitas (registro QR)
- Vista: **Reg. Visita Programada**
- Ruta: `/app/visits`
- ES: Alta de visitante y generacion de QR de acceso; muestra tarjeta del QR creado.
- EN: Visitor registration and access QR generation; shows newly created QR card.
- Reglas clave (AGENTS + estado):
  - Departamento 4 digitos; ultimo digito debe ser `1` o `2`.
  - Formato de codigo: `DDDD-NNNN`.
  - `temporal` -> single use.
  - `time_limit` -> vigencia semana/mes/permanente.
  - Para mes/permanente se exige foto del visitante.

## Screenshot 13 - Residente > Estacionamiento
- Vista: **Estacionamiento**
- Ruta: `/app/parking`
- ES: Reporte directo a guardia sobre cajon asignado a la unidad (`E-<DEPTO>`).
- EN: Direct report to guard for the unit-assigned parking spot (`E-<UNIT>`).
- Acciones:
  - Crear reporte (`Reportar a guardia`).
  - Ver historial propio en `Mis reportes`.

## Screenshot 14 - Residente > Marketplace
- Vista: formulario **Nueva publicacion**
- Ruta: `/app/marketplace`
- ES: Publicar articulo vecinal con foto, precio, condicion, contacto y WhatsApp.
- EN: Publish a neighborhood listing with photo, price, condition, contact, and WhatsApp.
- Accion principal: `Publicar en marketplace`.
- Estado vacio mostrado: `Aun no hay publicaciones.`

## Screenshot 15 - Residente/Comite > Paquetes
- Vista: **Paquetes**
- Ruta: `/app/packages`
- ES: Flujo seguro de entrega: guardia resguarda -> residente confirma -> guardia entrega.
- EN: Secure delivery flow: guard stores -> resident confirms -> guard delivers.
- Lo visible:
  - Conteo en resguardo.
  - Paquete con estado `RECOLECCION SOLICITADA`.
  - CTA para mostrar historial.

## Screenshot 16 - Residente > Modal QR de visita
- Vista: modal **Residencia QR** desde `/app/visits`
- ES: Muestra QR escaneable, datos de visitante, token y acciones de compartir/eliminar.
- EN: Shows scannable QR, visitor data, token, and share/delete actions.
- Acciones:
  - `Copiar Link De Acceso`
  - `Cerrar`
  - `Borrar QR`

## Screenshot 17 - Residente > Mascotas
- Vista: modulo de comunidad de mascotas
- Ruta: `/app/pets`
- ES: Alta de mascota (nombre/foto/comentarios) y feed comunitario con detalle/reporte.
- EN: Pet post creation (name/photo/comments) plus community feed with detail/report.
- Acciones visibles:
  - `Publicar mascota`
  - `Ver detalle`
  - `Reportar` (envia a moderacion).

---

## Nota de navegacion (importante para React Native)
- El admin usa doble barra inferior:
  - Seccion superior: `Operacion`, `Moderacion`, `Finanzas`.
  - Submenu inferior dependiente de seccion.
- El residente usa barra inferior unica:
  - `Inicio`, `Visitas`, `Paquetes`, `Incidencias`, `Perfil`.
- Badge de paquetes aparece cuando hay paquetes en resguardo.

## Nota de alcance
- Varias pantallas en screenshots son **placeholders funcionales de navegacion** (sin CRUD completo aun), especialmente:
  - `/admin/debts`
  - `/admin/exports`
  - `/admin/finance`
  - `/app/finance`

---

## React Native Implementation Notes (ES/EN)

Objetivo: mapear cada pantalla web a una implementacion RN y marcar extensiones guard-first (alertas, vibracion, SOS).

### 1) Admin Adeudos (`/admin/debts`)
- RN ES: crear `DebtsScreen` con lista por unidad, estado de pago, y acciones de seguimiento.
- RN EN: build `DebtsScreen` with per-unit status and collection follow-up actions.
- Estado recomendado:
  - `query`: debts by unit, aging buckets.
  - `mutations`: reminder, settlement mark, agreement note.
- Push:
  - recordatorio de adeudo segmentado por unidad/rol.

### 2) Admin Exportaciones (`/admin/exports`)
- RN ES: `ExportsScreen` con cola de exportaciones (CSV/PDF) y descarga diferida.
- RN EN: `ExportsScreen` with async export jobs and deferred download.
- Nota tecnica:
  - evitar generar PDF en dispositivo; usar funcion backend y polling de job.

### 3) Admin Reports Moderacion (`/admin/reports`)
- RN ES: `ModerationReportsScreen` con acciones `dismiss` y `delete target`.
- RN EN: `ModerationReportsScreen` with `dismiss` and `delete target` flows.
- Guardrail:
  - confirmacion doble antes de borrar contenido.
  - auditoria de moderador obligatoria.

### 4) Admin Finanzas (`/admin/finance`) y App Finanzas (`/app/finance`)
- RN ES: separar vista admin (global) y vista residente (estado de cuenta personal).
- RN EN: split admin (global finance) and resident (personal statement) views.
- Minimo:
  - periodos, balance, movimientos, evidencia PDF.

### 5) Admin Paquetes (`/admin/packages`)
- RN ES: `AdminPackagesScreen` con filtros + drill-down por unidad y tracking timeline.
- RN EN: `AdminPackagesScreen` with filters + per-unit timeline details.
- Extra RN:
  - busqueda por unidad/codigo.
  - filtros persistentes en almacenamiento local.

### 6) Admin Push (`/admin/push`)
- RN ES: mantener envio por usuario/unidad/rol/global; agregar plantillas de mensajes.
- RN EN: keep user/unit/role/global targeting; add message templates.
- Push ops:
  - `high-priority` para seguridad.
  - trazabilidad de envio (sent/delivered/open when available).

### 7) Residente Incidencias (`/app/incidents`)
- RN ES: `IncidentsScreen` + `CreateIncidentModal` con voto local optimista y reconciliacion.
- RN EN: `IncidentsScreen` + `CreateIncidentModal` with optimistic voting and sync reconciliation.
- Guard-first extension:
  - cuando una incidencia cruza umbral (score/prioridad), disparar alerta a guardia.

### 8-9) Residente Perfil (`/app/profile`)
- RN ES: `ProfileScreen` con update de nombre/password y gestion de permisos push.
- RN EN: `ProfileScreen` with name/password updates and push permission controls.
- Nota:
  - manejar permiso push por plataforma (Android 13+, iOS provisional/full).

### 10) Residente Finanzas (`/app/finance`)
- RN ES: misma base que web, pero lista para “estado de cuenta descargable”.
- RN EN: same core as web, prepared for downloadable account statements.

### 11) Modal Nueva Incidencia (sobre `/app/incidents`)
- RN ES: usar modal full-screen o bottom sheet con validaciones en cliente.
- RN EN: use full-screen modal or bottom sheet with client-side validation.
- Campos:
  - titulo, descripcion, categoria, prioridad.
  - adjunto de evidencia (foto/video) como extension RN.

### 12) Residente Visitas (`/app/visits`)
- RN ES: `VisitsScreen` con alta QR y `QrDetailModal`.
- RN EN: `VisitsScreen` with QR creation and `QrDetailModal`.
- Invariantes (no romper):
  - `DDDD-NNNN`, validacion depto 4 digitos, ultimo 1/2, reglas temporalidad/foto.
- Guard-first extension:
  - deep link para validacion rapida en app de guardia.

### 13) Residente Estacionamiento (`/app/parking`)
- RN ES: `ParkingReportScreen` con envio inmediato a cola de guardia.
- RN EN: `ParkingReportScreen` with immediate dispatch to guard queue.
- Alerting:
  - notificacion push + vibracion fuerte al guardia para reportes nuevos.
  - escalamiento si no se atiende en SLA.

### 14) Residente Marketplace (`/app/marketplace`)
- RN ES: `MarketplaceScreen` con publicacion/edicion/reporte y contacto WhatsApp.
- RN EN: `MarketplaceScreen` with post/edit/report and WhatsApp contact.
- Moderacion:
  - reportes crean ticket visible en `/admin/reports`.

### 15) Residente/Comite Paquetes (`/app/packages`)
- RN ES: `PackagesScreen` con estados `stored -> ready_for_pickup -> delivered`.
- RN EN: `PackagesScreen` with `stored -> ready_for_pickup -> delivered` flow.
- Guard-first:
  - cola “listo para entregar” con alertas activas al guardia.

### 16) Modal QR Residencia (desde `/app/visits`)
- RN ES: `QrModal` con QR, token, copiar link, borrar QR.
- RN EN: `QrModal` with QR, token, copy link, delete action.
- Seguridad:
  - boton de borrado con confirmacion.
  - expiracion visible y badge de estado.

### 17) Residente Mascotas (`/app/pets`)
- RN ES: `PetsScreen` con publicacion, detalle, comentarios, y reporte.
- RN EN: `PetsScreen` with create/detail/comments/report.
- Moderacion:
  - reportes conectados a flujo admin.

---

## Guard-Centric RN Modules (New Beyond Web)

### A) SOS / Panic
- ES: boton SOS persistente en app guardia con prioridad maxima, vibracion continua y ack obligatorio.
- EN: persistent SOS panic control for guard app with max-priority alerts, continuous vibration, and required acknowledgment.
- Recomendado:
  - estados `new -> acknowledged -> in_progress -> resolved`.
  - timer SLA y escalamiento automatico.

### B) Alert Console (Parking/Incidents/SOS)
- ES: bandeja unificada para guardia con prioridad, timestamp, fuente, unidad y accion rapida.
- EN: unified guard alert inbox with priority, timestamp, source, unit, and quick actions.
- Recomendado:
  - orden por severidad + antiguedad.
  - “quiet hours” configurable solo para alertas no criticas.

### C) Vibration/Audio Policies
- ES: perfiles de alerta por tipo (SOS, estacionamiento, incidencia) y anti-spam con deduplicacion.
- EN: per-type alert profiles (SOS/parking/incidents) with anti-spam deduplication.
- Tecnico:
  - Android: canales de notificacion por severidad.
  - iOS: categorias + critical alerts (si aplica compliance/permisos).

---

## Publishing and Cost Strategy (ES/EN)

### Opcion 1: Sin publicar en stores (menor costo inicial)
- ES: distribuir APK interna (Android) + TestFlight privado (iOS) para piloto.
- EN: internal APK distribution (Android) + private TestFlight (iOS) for pilot.
- Pros: menor costo y tiempo.
- Contras: friccion de instalacion y limites de escala.

### Opcion 2: Publicar formalmente
- ES:
  - Google Play: pago unico de cuenta developer.
  - Apple App Store: suscripcion anual developer.
- EN:
  - Google Play: one-time developer account fee.
  - Apple App Store: annual developer subscription.
- Adicional:
  - costos de push backend, monitoreo, almacenamiento de medios, analytics.

### Recomendacion de rollout
1. Piloto guardia-first sin store (grupo cerrado).
2. Medir alert fatigue, tiempos SLA, estabilidad push.
3. Endurecer moderacion/seguridad.
4. Publicar cuando KPIs operativos esten estables.
