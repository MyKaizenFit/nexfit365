# Aviso de datos de salud

Estado del consentimiento separado: `IMPLEMENTED`.

`PHASE 1D-C CLEANUP=PLANNED_NOT_IMPLEMENTED`.

El consentimiento es explícito, separado del alta, no viene marcado y se puede retirar. La cuenta puede existir sin otorgarlo. La fecha de nacimiento para comprobar la edad no depende de este consentimiento. El aviso de cumpleaños tampoco.

No hay un aviso de salud real publicado. Sin un `health_notice` activo, publicado y con `requires_acceptance`, el enforcement no se activa y el uso actual no cambia. Cuando ese aviso exista, quien no haya consentido queda en pendiente: puede entrar, ver documentos, gestionar el consentimiento, exportar y solicitar el borrado de la cuenta, y no puede crear ni usar datos nuevos de las finalidades no consentidas.

Grupos, todos apagados por defecto:

- Perfil de salud y personalización: `health_profile`, `nutrition` y la parte de `workouts` que adapta el entrenamiento a una lesión o condición. Un solo acto afirmativo crea los tres eventos en una transacción.
- Fotos de progreso: `progress_photos`.
- Bienestar: `wellness`.

La retirada registra `consent_withdrawn` y, desde ese momento, el permiso deja de valer. No borra el historial. Crea un `HealthDataDeletionJob` en `pending` para que la fase siguiente localice a la persona y la finalidad. No guarda una copia de los datos de salud.

Queda fuera de esta puerta: días de entrenamiento, lugar, equipo, series, duración e historial básico de entrenos. También el catálogo genérico que no personaliza con datos de salud.

El personal interno no puede escribir campos de salud ni un override de calorías de otra persona si esa persona no ha consentido. No hay un override para forzar el consentimiento.

`HEALTH_WITHDRAWAL_CLEANUP_TARGET=24h` sigue siendo un objetivo operativo interno, no un plazo legal. El artículo 12.3 regula el plazo de respuesta a los derechos, no la conservación. El borrado y la lápida de restauración no están construidos.
