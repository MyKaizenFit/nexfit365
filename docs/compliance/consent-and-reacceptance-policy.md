# Acuse, aceptación y reaceptación

## Implementado

- Privacidad, cuando hay documento activo con `requires_acceptance`: evento `acknowledgement`, finalidad `account`. El texto de interfaz es «He leído la Política de Privacidad.» No es un consentimiento global.
- Términos, en el mismo caso: evento `acceptance`, finalidad `account`, origen `registration` en el alta.
- El alta crea la cuenta y los eventos en la misma transacción. Si el evento falla, la cuenta no queda creada. No se acepta `user_id` del cliente. El servidor elige el tipo de evento.
- Si no hay documento activo, el alta no exige acuse ni aceptación. Por eso producción puede seguir sin documentos publicados.
- Una versión con `requires_reacceptance` deja a la persona en pendiente sin borrar el evento anterior. El acceso ordinario se bloquea. Siguen disponibles documentos legales, exportación, solicitud de eliminación y cierre de sesión.
- El personal interno (`is_staff`) no entra en esa puerta, para no bloquear la operación.

## Planificado

- Consentimiento de salud `consent_granted`, explícito, no premarcado, retirable, independiente del alta.
- Marketing: apagado. No hay casilla ni eventos de marketing. El código de documento puede existir para más adelante.
- El correo masivo de administración todavía admite texto libre. El freno para que no se use como marketing automático queda pendiente, porque esa vista ya está en otro cambio abierto.
