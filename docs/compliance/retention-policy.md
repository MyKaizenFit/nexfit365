# Conservación

Estado: política interna propuesta, no un plazo legal copiado de un artículo.

- Cuenta activa: mientras la relación siga.
- Registros legales mínimos: se conservan para acreditar la versión mostrada. Base propuesta 6.1.f. El 17.3.e solo opera como excepción a la supresión si hacen falta para una reclamación.
- Datos de salud tras la retirada: el uso nuevo se detiene al momento y el borrado de esa finalidad en la base en uso está implementado. `LIVE_DB_HEALTH_CLEANUP=IMPLEMENTED`. El objetivo interno de 24 horas no es el mes del artículo 12.3. La tarea se encola al confirmar la retirada.
- Copias de seguridad: siguen su ciclo. Limpiar la base en uso no borra copias ya creadas. `BACKUP_RESURRECTION_FULL_PROTECTION=PLANNED_PHASE_4`. Hay un registro de supresión sin datos de salud. PHASE 4 tiene que conservarlo fuera de las copias restaurables. Las copias antiguas no se han limpiado.
- Solicitudes de derechos: el plazo de respuesta sigue siendo el del artículo 12.3.
