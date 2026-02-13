# Privada Reforma - Documento Base MVP (v1)

Fecha: 10 de febrero de 2026
Alcance: 1 condominio (~100 departamentos)
Objetivo: reemplazar Residentia con una experiencia mas clara y control operativo mas estricto.

## 1. Objetivo del producto
Construir una app web para administracion residencial que cubra control de acceso, amenidades, incidencias, mantenimiento y transparencia financiera.

## 2. Roles
- Admin
- Residente
- Inquilino (creado por residente verificado)
- Guardia
- Mantenimiento
- Miembro de mesa directiva (presidente, tesoreria/contabilidad, etc.)

Nota: un usuario puede tener multiples roles (ej. residente + mesa directiva).

## 3. Modulos MVP
1) Autenticacion, aprobaciones y gestion de usuarios
2) QR de visitas
3) Modo Deuda (restricciones automaticas)
4) Reserva de alberca (viernes/sabado)
5) Reportes de incidencias
6) Notificaciones y avisos de administracion
7) Bitacora de mantenimiento
8) Resumen financiero mensual
9) Exportables (CSV/PDF)

## 4. Reglas criticas de negocio
### 4.1 Modo Deuda
- El residente deudor entra en Modo Deuda.
- Ve monto pendiente y restricciones activas.
- No puede crear nuevos QR.
- Se bloquean QR activos/futuros asociados al deudor.
- No puede reservar alberca.
- Operacion en acceso: guardia no abre pluma/porton al deudor; ingreso peatonal manual.
- Si no paga despues de 2 semanas, aparece en lista de deudores visibles para residentes.

### 4.2 Reserva de alberca
- Costo base: MXN 5,000.
- Deposito reembolsable incluido: MXN 2,500.
- Invitados maximos: 35.
- Invitado extra: MXN 2,500.
- Reglas detalladas del area: pendientes de anexar por el comite.

### 4.3 Incidencias
- Tipos iniciales: ruido excesivo, mascotas/suciedad, incumplimiento de reglamento.
- Guardia debe acusar recibo en <= 15 minutos.
- Guardia debe documentar accion realizada (nota y/o foto).

## 5. Control de acceso por QR
- QR de un solo uso.
- QR por ventana de tiempo (semana/mes/anio).
- Para QR de larga duracion, residente sube foto del invitado.
- Guardia valida coincidencia visual foto-persona.
- Si no hay internet en caseta: validacion manual con identificacion + bitacora fisica.

## 6. Restricciones por tipo de usuario
### 6.1 Residente
- Puede generar QR y reservar amenidades.
- Puede crear inquilinos vinculados a su unidad.

### 6.2 Inquilino
- Puede generar QR y reservar amenidades.
- No puede ver ni gestionar cuotas/deuda.
- No puede ver modulo de transparencia financiera.

## 7. Transparencia financiera (MVP)
- Vista mensual resumida para residentes.
- Ingresos por cuotas y egresos por categoria (seguridad, mantenimiento, servicios, otros).
- Exportable mensual para asambleas y rendicion de cuentas.

## 8. Integraciones y fases
### 8.1 Fase 1 (MVP)
- Notificaciones in-app.
- Correo opcional.

### 8.2 Fase 2
- Integracion con WhatsApp Business para alertas y recordatorios salientes.
- Caso especial sugerido: pases de repartidor (Uber Eats/Amazon) con QR de corta vigencia y un solo uso.

## 9. Arquitectura sugerida
- Frontend: React + TypeScript
- Backend: Node.js (NestJS)
- Base de datos: PostgreSQL
- Archivos/fotos: almacenamiento tipo S3
- Seguridad: JWT + refresh tokens + matriz de permisos por rol

## 10. Riesgos y consideraciones legales (Mexico)
- Publicar lista de deudores puede implicar riesgo de privacidad/datos personales.
- Recomendado: hacerlo configurable y validar con aviso de privacidad y asesoria legal local.
- Pendiente: Aviso de Privacidad, Terminos y condiciones, Politica de datos.

## 11. KPIs iniciales sugeridos para piloto
- % de residentes activos semanalmente.
- Tiempo promedio de atencion en caseta.
- % de incidencias atendidas dentro de SLA (15 min).
- % de cobranza mensual recuperada.
- Satisfaccion de residentes (encuesta corta mensual).

## 12. Proximos pasos
1) Validar este documento con residentes/mesa directiva.
2) Congelar alcance de MVP.
3) Definir backlog tecnico (epics, historias y criterios de aceptacion).
4) Diseñar prototipo UX/UI y prueba con usuarios reales.
5) Construir piloto web y operar 4-6 semanas.
