# Conservación

Estado: política interna propuesta, no un plazo legal copiado de un artículo.

- Cuenta activa: mientras la relación siga.
- Registros legales mínimos: se conservan para acreditar la versión mostrada. Base propuesta 6.1.f. El 17.3.e solo opera como excepción a la supresión si hacen falta para una reclamación.
- Datos de salud tras la retirada: el uso nuevo se detiene al momento y el borrado de esa finalidad en la base en uso está implementado. `LIVE_DB_HEALTH_CLEANUP=IMPLEMENTED`. El objetivo interno de 24 horas no es el mes del artículo 12.3. La tarea se encola al confirmar la retirada.
- Copias de seguridad: siguen su ciclo. Limpiar la base en uso no borra copias ya creadas. `BACKUP_RESURRECTION_FULL_PROTECTION=PLANNED_PHASE_4`. Hay un registro de supresión sin datos de salud. PHASE 4 tiene que conservarlo fuera de las copias restaurables. Las copias antiguas no se han limpiado.
- Solicitudes de derechos: el plazo de respuesta sigue siendo el del artículo 12.3.
- `LEGAL_EVENT_EVIDENCE=3 years` y `SECURITY_LOGS=90 days` siguen siendo `INTERNAL_POLICY_PROPOSAL`. No son un plazo legal ni la rotación técnica actual.
- Token de acceso: 120 minutos. Refresco: 7 días. Avisos creados por administración: caducidad de 14 o 30 días según el tipo, cuando esa pantalla la fija. Los registros de Docker rotan por tamaño (10 MB, 3 ficheros), no a los 90 días.
- Copias locales de PostgreSQL: el contenedor de backup conserva 7 días, 4 semanas y 6 meses. El script diario conserva 7 días, los domingos durante 4 semanas y el día 1 de cada mes sin ese tope. No incluyen ficheros de fotos. No están cifradas. No salen del servidor. No hay un ensayo de restauración completo documentado. `SUPPRESSION_LEDGER_SURVIVES_OLD_RESTORE=NO`.
