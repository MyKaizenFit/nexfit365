# Registro de actividades

Responsable: [RESPONSABLE_LEGAL]. Alojamiento verificado: Contabo, Alemania. Correo: Gmail `@gmail.com`. Región de esa cuenta: [SMTP_REGION]. DPA: [HOSTING_DPA].

| Actividad | Datos | Base | Estado |
| --- | --- | --- | --- |
| Cuenta y acceso | email, contraseña, nombre | 6.1.b | IMPLEMENTED |
| Verificación de edad | fecha de nacimiento | 6.1.b. 18 es `PRODUCT_DECISION` | IMPLEMENTED en el alta. Cuentas ya existentes sin fecha no se bloquean por esta regla |
| Aviso de cumpleaños | fecha de nacimiento, preferencia | 6.1.f. `OPTIONAL_SERVICE_NOTIFICATION` | `DEFAULT_OFF`. Opt-in. No es marketing ni consentimiento de salud |
| Acuse de privacidad y aceptación de términos | versión y momento | Transparencia y 6.1.b. El acuse no es consentimiento | IMPLEMENTED si hay documento publicado |
| Registro legal mínimo | eventos append-only | 6.1.f. 17.3.e no es la base | IMPLEMENTED |
| Perfil de salud | sexo, medidas, alergias, condiciones, lesiones, historial de peso | 9.2.a `health_profile` | Puerta y limpieza en la base en uso. Sin aviso activo no se exige |
| Nutrición personalizada | registros, exclusiones, plan propio, calorías derivadas | 9.2.a `nutrition` | El catálogo, las recetas y las plantillas no se borran |
| Adaptación sanitaria del entreno | texto de lesión usado en recomendaciones | 9.2.a `workouts` | No hay un programa separable. El entreno básico se conserva |
| Fotos de progreso | foto, miniatura, nota, peso de la fila, medidas | 9.2.a `progress_photos` | Ficheros por el borrado seguro ya existente |
| Bienestar | ánimo, registro diario, evaluación de descanso | 9.2.a `wellness` | IMPLEMENTED en la misma limpieza |
| Soporte y operación | avisos de cuenta, solicitud de eliminación | 6.1.b | La solicitud no borra la cuenta |
| Comunicaciones operativas | correo transaccional y push si se activa | 6.1.b | Push apagado hasta que la persona lo activa |
| Seguridad | cookies de sesión, registros técnicos | 6.1.f | Los 90 días de registros siguen siendo propuesta interna |
| Evidencia legal | eventos de versión | 6.1.f | 3 años sigue siendo propuesta interna |
| Almacenamiento del navegador | cookies, localStorage, sessionStorage, caché, push | 6.1.b o preferencia | Inventario en la política de cookies. Sin analítica |
| Marketing | ninguno | no se trata | OFF |

Copias ya creadas de datos de salud: `PLANNED_PHASE_4`.
