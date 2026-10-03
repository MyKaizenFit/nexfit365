# Política de privacidad

Estado: `CLIENT_INPUT_REQUIRED` para publicarla. El código puede mostrarla solo cuando exista un `LegalDocument` activo sin marcadores. Hoy no hay documento de producción.

## Responsable

[RESPONSABLE_LEGAL], NIF [NIF_CIF], domicilio [DOMICILIO], contacto [EMAIL_PRIVACIDAD]. Datos registrales: [DATOS_REGISTRALES].

## Qué datos se tratan

Cuenta: email, contraseña, nombre y fecha de nacimiento. La fecha de nacimiento tiene dos usos distintos:

- verificación de edad, obligatoria para el alta, porque el producto es para personas de 18 años o más;
- aviso de cumpleaños, uso secundario opcional, desactivado hasta que la persona lo active en preferencias, sin finalidad comercial.

No se afirma que la fecha sirva solo para la edad.

## Bases

- Cuenta y términos: ejecución del contrato, artículo 6.1.b.
- Acuse de la política: transparencia, no un consentimiento global.
- Registros legales mínimos: interés legítimo 6.1.f, para poder acreditar qué versión se mostró. El artículo 17.3.e no es una base. Solo documenta que la supresión no procede cuando la conservación sea necesaria para reclamaciones.
- Aviso de cumpleaños: interés legítimo 6.1.f, con oposición fácil. `IMPLEMENTED` como opt-in apagado por defecto. Pendiente la evaluación formal de interés legítimo.
- Datos de salud: consentimiento explícito 9.2.a. El mecanismo está implementado y no se pide mientras no haya un aviso publicado. Retirar una finalidad borra en la base en uso los datos que solo dependían de ella. No limpia copias de seguridad ya creadas.

## Derechos

Acceso y rectificación del perfil: `IMPLEMENTED`. Exportación: `PARTIAL` (perfil, entrenos, comidas, peso, medidas y avisos; no todo el producto). Solicitud de eliminación de cuenta: `IMPLEMENTED` como solicitud; el borrado de la cuenta es `PLANNED` (PHASE 3). Retirada del consentimiento de salud: `IMPLEMENTED` cuando hay aviso publicado; el uso cesa al momento y el borrado se encola. Oposición al cumpleaños: `IMPLEMENTED` con el interruptor, apagado por defecto. Limitación: `PLANNED`. El plazo de respuesta es el del artículo 12.3. Ese plazo no es un periodo de conservación.

La exportación y la solicitud de eliminación siguen disponibles aunque haya un documento pendiente.

## Encargados

Alojamiento: Contabo, Alemania. Contrato: [HOSTING_DPA]. Correo: Gmail (`smtp.gmail.com`, buzón `@gmail.com`, no Workspace de dominio propio), región [SMTP_REGION]. Cloudflare hace de proxy. Postgres, Redis y Nginx están en el mismo servidor.

No hay analítica ni publicidad de terceros en el runtime actual.
