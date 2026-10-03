# EIPD

`DPIA_CURRENT_STATUS=IN_PROGRESS`. No se fija el riesgo residual. La firma sigue siendo de [RESPONSABLE_LEGAL].

## Hechos ya implementados

- Edad de producto 18 en el alta. No es un mínimo del RGPD.
- Privacidad y términos versionados. El acuse de privacidad no es un consentimiento.
- Consentimiento de salud explícito, separado y por grupos: perfil y personalización, fotos, bienestar.
- La casilla no viene marcada. Sin aviso activo no se exige.
- La puerta de salud está en el servidor.
- Retirar cesa el uso y la recogida nueva al momento y encola la limpieza.
- La limpieza es asíncrona, con reintentos, generación y corte temporal para que un trabajo antiguo no borre datos de un consentimiento posterior.
- Mientras el trabajo está pendiente, en curso o fallido no se puede volver a conceder esa finalidad.
- Fotos privadas, URL firmadas y eliminación de EXIF en las fotos nuevas.
- Registro de supresión sin datos de salud. No sobrevive a restaurar una copia anterior.
- Sin analítica de terceros y sin marketing.
- Los registros de la limpieza no guardan valores de salud ni rutas.

## Sigue abierto

- Riesgo residual de copias de seguridad. `BACKUP_RESURRECTION_FULL_PROTECTION=PLANNED_PHASE_4`.
- Riesgo residual de MFA. No hay un segundo factor.
- Riesgo residual del borrado de cuenta. Hoy solo hay solicitud. PHASE 3.
- Riesgo residual de retención. 3 años y 90 días son propuesta interna, no la rotación técnica actual.

No se cierra la evaluación con estos puntos abiertos.
