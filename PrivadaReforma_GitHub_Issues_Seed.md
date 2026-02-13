# Privada Reforma - Seed de Issues para GitHub Projects

## Como usar
1. Crea labels en GitHub: `epic`, `story`, `task`, `bug`, `mvp`, `high`, `medium`, `low`.
2. Crea milestones por sprint: `Sprint 0` a `Sprint 6`.
3. Copia cada bloque como nuevo issue.

---

## EPIC: Auth y Usuarios
Labels: `epic`, `mvp`, `high`
Milestone: `Sprint 1`
Descripcion:
- Login, sesion segura y recuperacion.
- Multirol por usuario.
- Alta de residente (admin) y alta de inquilino (residente).
Criterio de salida:
- Usuarios y permisos operando en UI/API.

## STORY: Login y sesion
Labels: `story`, `high`, `mvp`
Milestone: `Sprint 1`
AC:
- Login valido entrega acceso.
- Refresh token funcional.
- Logout invalida sesion.

## STORY: RBAC multirol
Labels: `story`, `high`, `mvp`
Milestone: `Sprint 1`
AC:
- Un usuario con 2+ roles ve permisos combinados.
- API deniega endpoints sin permiso.

## STORY: Alta de residente por admin
Labels: `story`, `high`, `mvp`
Milestone: `Sprint 1`
AC:
- Solo admin puede crear residentes.
- Residente queda ligado a unidad.

## STORY: Alta de inquilino por residente
Labels: `story`, `high`, `mvp`
Milestone: `Sprint 2`
AC:
- Solo residente verificado puede crear inquilino.
- Inquilino no ve modulos financieros.

---

## EPIC: Acceso y QR
Labels: `epic`, `mvp`, `high`
Milestone: `Sprint 2`
Descripcion:
- Emision de QR de visita.
- Escaneo en caseta.
- Validacion por guardia.

## STORY: QR de un uso y temporal
Labels: `story`, `high`, `mvp`
Milestone: `Sprint 2`
AC:
- QR de un solo uso invalida despues de escanear.
- QR temporal expira automaticamente.

## STORY: QR largo requiere foto
Labels: `story`, `high`, `mvp`
Milestone: `Sprint 2`
AC:
- No se permite QR semana/mes/anio sin foto de invitado.

## STORY: Escaneo en caseta
Labels: `story`, `high`, `mvp`
Milestone: `Sprint 2`
AC:
- Guardia escanea y obtiene estado valido/invalido.
- Se guarda log de entrada.

---

## EPIC: Cobranza y Modo Deuda
Labels: `epic`, `mvp`, `high`
Milestone: `Sprint 3`
Descripcion:
- Restricciones por adeudo.
- Conciliacion SPEI.
- Lista de deudores tras 2 semanas.

## STORY: Activacion de Modo Deuda
Labels: `story`, `high`, `mvp`
Milestone: `Sprint 3`
AC:
- Muestra monto adeudado y advertencia.
- Bloquea nuevos QR.
- Bloquea QR activos/futuros.
- Bloquea reserva de alberca.

## STORY: Lista de deudores
Labels: `story`, `medium`
Milestone: `Sprint 3`
AC:
- Si pasan 14 dias de adeudo, aparece en lista configurable.

## STORY: Registro/conciliacion SPEI
Labels: `story`, `high`, `mvp`
Milestone: `Sprint 3`
AC:
- Admin aplica pago y reduce adeudo.
- Al saldar, Modo Deuda se desactiva.

---

## EPIC: Alberca y Amenidades
Labels: `epic`, `mvp`, `high`
Milestone: `Sprint 3`
Descripcion:
- Reserva viernes/sabado.
- Costo base y deposito.
- Control de invitados y responsiva.

## STORY: Reserva base
Labels: `story`, `high`, `mvp`
Milestone: `Sprint 3`
AC:
- Solo viernes/sabado.
- Sin traslapes.
- Costo base MXN 5,000.

## STORY: Limite de invitados y extra
Labels: `story`, `high`, `mvp`
Milestone: `Sprint 3`
AC:
- Max 35 invitados.
- Invitado extra suma MXN 2,500.

## STORY: Responsiva obligatoria
Labels: `story`, `high`, `mvp`
Milestone: `Sprint 3`
AC:
- No se confirma reserva sin aceptar responsiva.

---

## EPIC: Incidencias y Operacion
Labels: `epic`, `mvp`, `high`
Milestone: `Sprint 4`
Descripcion:
- Reporte de incidencias.
- SLA de 15 minutos para guardia.
- Evidencia de atencion.

## STORY: Crear incidencia
Labels: `story`, `high`, `mvp`
Milestone: `Sprint 4`
AC:
- Residente/inquilino reporta tipo, descripcion y ubicacion.

## STORY: SLA y acuse
Labels: `story`, `high`, `mvp`
Milestone: `Sprint 4`
AC:
- Guardia debe acusar recibo en <= 15 minutos.
- Se mide cumplimiento por mes.

## STORY: Evidencia de cierre
Labels: `story`, `high`, `mvp`
Milestone: `Sprint 4`
AC:
- No se puede cerrar incidencia sin nota o foto.

---

## EPIC: Transparencia y Reportes
Labels: `epic`, `mvp`, `medium`
Milestone: `Sprint 5`
Descripcion:
- Resumen financiero mensual.
- Exportables operativos.

## STORY: Resumen mensual
Labels: `story`, `high`, `mvp`
Milestone: `Sprint 5`
AC:
- Ingresos/egresos por categoria visibles a residentes.
- Inquilino sin acceso.

## STORY: Exportables
Labels: `story`, `medium`, `mvp`
Milestone: `Sprint 5`
AC:
- Export CSV/PDF de accesos, incidencias, reservas y finanzas.

---

## TASK: Piloto controlado
Labels: `task`, `high`, `mvp`
Milestone: `Sprint 6`
AC:
- 10-20 unidades piloto activas.
- Retroalimentacion capturada y priorizada.
