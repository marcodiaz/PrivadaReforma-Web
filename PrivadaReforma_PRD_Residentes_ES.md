# Privada Reforma
## PRD para validacion con residentes (MVP Web)

Fecha: 10 de febrero de 2026
Version: 1.0
Alcance inicial: 1 condominio (~100 departamentos)

## 1. Proposito
Construir una app propia para la privada que reemplace Residentia, con mejor experiencia, reglas claras y trazabilidad operativa.

## 2. Problemas actuales
- Flujo de visitas mejorable y poco flexible.
- Falta de controles mas estrictos para adeudos.
- Gestion de incidencias y seguimiento poco transparente.
- Necesidad de reportes claros para residentes y mesa directiva.

## 3. Objetivo del MVP
Entregar una primera version funcional en web que cubra:
- Acceso de visitas por QR.
- Control de adeudos con restricciones automaticas.
- Reserva de alberca con reglas y costos claros.
- Reporte de incidencias con SLA para guardias.
- Resumen financiero mensual para transparencia.

## 4. Tipos de usuario
- Admin
- Residente
- Inquilino
- Guardia
- Mantenimiento
- Miembro de mesa directiva

Nota: una persona puede tener mas de un rol (ejemplo: residente y mesa directiva).

## 5. Funcionalidades MVP
### 5.1 Acceso por QR
- QR de un uso.
- QR con vigencia por periodo (semana, mes, anio).
- Para QR de larga vigencia, se solicita foto del invitado.
- Guardia valida QR e identidad visual en caseta.

### 5.2 Modo Deuda
- Si hay adeudo, la cuenta entra en Modo Deuda.
- Se muestra monto pendiente y restricciones.
- Restricciones:
  - No crear nuevos QR.
  - Se invalidan QR activos/futuros del deudor.
  - No reservar alberca.
- Regla operativa: guardia no abre acceso vehicular al deudor.
- Si no paga despues de 2 semanas, aparece en lista de deudores visible para residentes.

### 5.3 Reserva de alberca
- Disponible inicialmente viernes y sabado.
- Costo base: MXN 5,000.
- Deposito reembolsable incluido: MXN 2,500.
- Maximo de invitados: 35.
- Invitado extra: MXN 2,500.
- Se requiere aceptar responsiva antes de confirmar.

### 5.4 Incidencias
- Reporte de ruido excesivo, mascotas/suciedad e incumplimientos.
- Guardia debe acusar recibo en 15 minutos maximo.
- Guardia documenta accion con nota y/o foto.

### 5.5 Mantenimiento
- Bitacora de tareas realizadas y pendientes.
- Evidencia fotografica cuando aplique.

### 5.6 Avisos y comunicacion
- Avisos oficiales por parte de admin/mesa directiva.
- Chat no incluido en MVP.
- Integracion WhatsApp propuesta para fase posterior.

### 5.7 Transparencia financiera
- Vista mensual resumida de ingresos y egresos por categoria.
- Inquilino no ve datos de cuotas ni modulo financiero.

## 6. Reglas de permisos clave
- Solo admin crea residentes.
- Solo residente verificado crea inquilinos.
- Inquilino puede generar QR y reservar amenidades.
- Inquilino no tiene acceso a deuda ni finanzas.

## 7. Escenario sin internet en caseta
- Validacion manual con identificacion.
- Registro en bitacora fisica.
- Carga posterior en sistema (fase operativa).

## 8. Entregables del MVP
- App web operativa para residentes, guardias y admin.
- Dashboard basico de seguimiento.
- Exportables CSV/PDF de operaciones.

## 9. Criterios de exito (piloto)
- Reduccion de tiempos en caseta.
- Cumplimiento del SLA de incidencias (15 min).
- Mejor percepcion de orden y transparencia.
- Adopcion activa por residentes en primeras semanas.

## 10. Fuera de alcance (por ahora)
- App iOS/Android nativa.
- Chat entre vecinos.
- Automatizacion total de mensajeria por WhatsApp.
- Flujo final para repartidores (Uber Eats/Amazon), queda para siguiente fase.

## 11. Siguientes pasos
1. Recibir feedback de residentes.
2. Ajustar reglas sensibles (deuda, privacidad, transparencia).
3. Congelar alcance final del MVP.
4. Iniciar diseno UX/UI y backlog tecnico.
