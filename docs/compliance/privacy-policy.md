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
- Datos de salud: consentimiento explícito 9.2.a. El mecanismo está implementado y no se pide mientras no haya un aviso publicado. La retirada no borra todavía los datos ya guardados.

## Derechos

Acceso, rectificación, supresión, limitación, oposición, portabilidad y retirada del consentimiento cuando sea la base. El plazo de respuesta es el del artículo 12.3. Ese plazo no es un periodo de conservación.

La exportación y la solicitud de eliminación siguen disponibles aunque haya un documento pendiente.

## Encargados

Alojamiento: [HOSTING_PROVIDER], país [HOSTING_COUNTRY], contrato [HOSTING_DPA]. Correo: [SMTP_ACCOUNT_TYPE], región [SMTP_REGION]. Postgres, Redis y Nginx son tecnologías del responsable, no encargados por sí mismos.

No hay analítica ni publicidad de terceros en el runtime actual.
