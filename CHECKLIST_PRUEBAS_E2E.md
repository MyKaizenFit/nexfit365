# Checklist de pruebas necesarias

## Objetivo
Validar de forma completa la aplicación tras el rebuild y antes de dar por cerrado el bloque funcional actual.

> Nota: la parte de pagos reales queda fuera de esta ronda. Solo se comprueba que los estados de prueba o suscripción no rompan la experiencia.

---

## 0. Preparación

- [x] El backend responde correctamente.
- [x] El frontend carga sin errores.
- [x] Existen credenciales de prueba para usuario, admin y entrenador.
- [x] La base de datos tiene datos mínimos para probar progreso, coaching y notificaciones.
- [x] No aparecen errores críticos en logs al arrancar.

---

## 1. Acceso y autenticación

- [x] Registro de un usuario nuevo.
- [x] Inicio de sesión con usuario válido.
- [x] Bloqueo o error controlado con credenciales inválidas.
- [x] Cierre de sesión correcto.
- [x] La sesión se mantiene tras recargar página.
- [x] Cada rol ve solo las pantallas que le corresponden.

---

## 2. Dashboard principal del usuario

- [x] El dashboard carga completo.
- [x] Se muestran métricas, tarjetas y accesos rápidos.
- [x] Los enlaces del dashboard navegan correctamente.
- [x] No hay errores visuales ni datos rotos.
- [x] La experiencia funciona también tras volver atrás o refrescar.

---

## 3. Entrenamientos

- [x] El usuario puede ver su plan de entrenamiento.
- [x] Se puede abrir el detalle de una rutina o día.
- [x] Se pueden marcar ejercicios o bloques como completados.
- [x] Se guardan los registros del entrenamiento.
- [x] El progreso se actualiza después de completar actividad.
- [x] Al volver a entrar, la información persiste correctamente.

---

## 4. Nutrición y recetas

- [ ] Se visualizan planes o recomendaciones nutricionales.
- [ ] Las recetas cargan con información completa.
- [ ] Las imágenes de receta aparecen cuando corresponde.
- [ ] Búsqueda y filtros funcionan bien, si están disponibles.
- [ ] No hay recetas rotas ni contenidos vacíos inesperados.

---

## 5. Progreso del usuario

- [ ] Se registran métricas de progreso sin errores.
- [ ] Los gráficos o resúmenes cargan correctamente.
- [ ] Los cambios se reflejan en el dashboard.
- [ ] El histórico mantiene coherencia de fechas y valores.
- [ ] La exportación o vista de reportes funciona, si aplica.

---

## 6. Coaching 1:1 y captación

- [ ] Los CTA de coaching aparecen en las pantallas previstas.
- [ ] Se puede enviar una solicitud de coaching por email.
- [ ] Se puede enviar una solicitud por teléfono o WhatsApp.
- [ ] La validación exige datos de contacto cuando corresponde.
- [ ] La solicitud queda registrada correctamente.
- [ ] Se guarda el origen de la solicitud según la pantalla.
- [ ] El equipo interno recibe la notificación o lead correspondiente.

---

## 7. Prueba gratuita y estado de suscripción

- [ ] Un usuario puede iniciar la prueba gratuita una vez.
- [ ] No puede iniciar una segunda prueba si ya la consumió.
- [ ] El estado premium o trial se refleja correctamente en la interfaz.
- [ ] Al expirar la prueba, el usuario vuelve al estado básico.
- [ ] No aparece ningún intento de cobro real en esta fase.

---

## 8. Notificaciones del usuario

- [ ] La bandeja o listado de notificaciones carga.
- [ ] Se pueden marcar como leídas.
- [ ] Se pueden volver a marcar como no leídas, si aplica.
- [ ] El contador de no leídas es correcto.
- [ ] Los clics o acciones quedan registrados correctamente.

---

## 9. Panel de administración

- [ ] Solo el admin puede entrar al panel.
- [ ] El listado de usuarios carga y filtra correctamente.
- [ ] El panel de coaching muestra leads y estado de seguimiento.
- [ ] Se puede actualizar el estado de una solicitud.
- [ ] Las estadísticas principales cargan sin errores.
- [ ] Las exportaciones o descargas administrativas funcionan.

---

## 10. Automatizaciones y reporting

- [ ] El resumen de automatizaciones muestra audiencias reales.
- [ ] La reactivación segmenta solo usuarios inactivos.
- [ ] Las campañas de reseña y progreso se pueden lanzar manualmente.
- [ ] El reporte semanal se genera correctamente.
- [ ] Las ejecuciones quedan registradas con fecha y resultado.
- [ ] No se envían notificaciones a audiencias incorrectas.

---

## 11. Permisos y seguridad funcional

- [ ] Un usuario no autenticado no accede a rutas privadas.
- [ ] Un miembro no puede ver información de otros usuarios.
- [ ] Un entrenador solo ve los miembros permitidos.
- [ ] Los formularios inválidos muestran errores controlados.
- [ ] No se exponen datos sensibles en vistas públicas.

---

## 12. UX y responsive

- [ ] La aplicación se ve bien en escritorio.
- [ ] La aplicación se ve bien en móvil.
- [ ] Menús, botones y formularios son utilizables.
- [ ] No hay bloques cortados, solapados o invisibles.
- [ ] Los estados vacíos, loading y error están bien resueltos.

---

## 13. Revisión técnica tras rebuild

- [ ] Backend en estado saludable.
- [ ] Frontend responde con normalidad.
- [ ] Base de datos y Redis están saludables.
- [ ] El worker está levantado.
- [ ] No hay errores críticos en consola o logs al navegar por los flujos clave.

---

## 14. Cierre de validación

- [ ] Todas las pruebas críticas están en verde.
- [ ] Los fallos menores quedan anotados para corrección.
- [ ] No queda ningún bloqueo funcional grave en el alcance actual.
- [ ] La app queda lista para la siguiente fase de revisión.

---

## Registro rápido de incidencias

### Incidencia 1
- Estado: [ ] Pendiente  [ ] Resuelta
- Área afectada:
- Pasos para reproducir:
- Resultado esperado:
- Resultado actual:

### Incidencia 2
- Estado: [ ] Pendiente  [ ] Resuelta
- Área afectada:
- Pasos para reproducir:
- Resultado esperado:
- Resultado actual:

### Incidencia 3
- Estado: [ ] Pendiente  [ ] Resuelta
- Área afectada:
- Pasos para reproducir:
- Resultado esperado:
- Resultado actual:
