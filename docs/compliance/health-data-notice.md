# Aviso de datos de salud

Estado del consentimiento separado: `IMPLEMENTED`.

`LIVE_DB_HEALTH_CLEANUP=IMPLEMENTED`. `BACKUP_RESURRECTION_FULL_PROTECTION=PLANNED_PHASE_4`.

El consentimiento es explícito, separado del alta, no viene marcado y se puede retirar. La cuenta puede existir sin otorgarlo. La fecha de nacimiento para comprobar la edad no depende de este consentimiento. El aviso de cumpleaños tampoco.

No hay un aviso de salud real publicado. Sin un `health_notice` activo, publicado y con `requires_acceptance`, el enforcement no se activa y el uso actual no cambia. Cuando ese aviso exista, quien no haya consentido queda en pendiente: puede entrar, ver documentos, gestionar el consentimiento, exportar y solicitar el borrado de la cuenta, y no puede crear ni usar datos nuevos de las finalidades no consentidas.

Grupos, todos apagados por defecto:

- Perfil de salud y personalización: `health_profile`, `nutrition` y la parte de `workouts` que adapta el entrenamiento a una lesión o condición. Un solo acto afirmativo crea los tres eventos en una transacción.
- Fotos de progreso: `progress_photos`.
- Bienestar: `wellness`.

La retirada registra `consent_withdrawn` y crea el `HealthDataDeletionJob` de esa finalidad en la misma transacción. La tarea se encola al confirmar. El trabajo guarda identificador, finalidad, generación, estado, intentos y marcas de tiempo. No guarda valores de salud, nombres ni rutas. Mientras el trabajo está pendiente, en curso o fallido, no se puede volver a conceder esa finalidad (`409`, `health_cleanup_pending`). Una tarea antigua solo borra filas anteriores a su retirada. La fecha de nacimiento no se borra. El entrenamiento básico tampoco. El catálogo, las recetas y las plantillas de administración no se borran por retirar nutrición.

Queda fuera de esta puerta: días de entrenamiento, lugar, equipo, series, duración e historial básico de entrenos. También el catálogo genérico que no personaliza con datos de salud.

El personal interno no puede escribir campos de salud ni un override de calorías de otra persona si esa persona no ha consentido. No hay un override para forzar el consentimiento.

`HEALTH_WITHDRAWAL_CLEANUP_TARGET=24h` sigue siendo un objetivo operativo interno, no un plazo legal. El artículo 12.3 regula el plazo de respuesta a los derechos, no la conservación. La tarea no espera 24 horas. El comando `health_cleanup_jobs --overdue` cuenta trabajos pendientes o fallidos más viejos que ese objetivo. Limpiar la base en uso no limpia copias ya hechas. `PrivacySuppressionRecord` marca usuario, finalidad y generación, sin datos de salud. No basta si se restaura una copia anterior. PHASE 4 tiene que guardar ese registro fuera de las copias restaurables y volver a aplicarlo. Las copias antiguas no se han limpiado.
