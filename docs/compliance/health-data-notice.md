# Aviso de datos de salud

Estado del consentimiento separado: `PLANNED`.

Cuando se implemente:

- será un consentimiento explícito, separado del alta;
- la casilla no vendrá marcada;
- se podrá retirar;
- la cuenta podrá existir sin otorgarlo;
- sin él no se recogerán ni usarán datos cuya única base sea ese consentimiento.

La fecha de nacimiento para comprobar la edad no depende de este consentimiento. El aviso de cumpleaños tampoco.

Al retirar el consentimiento, el comportamiento previsto es:

1. registrar al momento `consent_withdrawn`;
2. detener al momento la recogida nueva;
3. detener al momento el uso funcional;
4. bloquear cálculos y planes nuevos basados en esos datos;
5. encolar el borrado de lo que solo se sustentaba en ese consentimiento;
6. conservar lo que tenga otra base válida;
7. las copias de seguridad siguen su ciclo y no deben reactivar datos ya suprimidos.

`HEALTH_WITHDRAWAL_CLEANUP_TARGET=24h` es un objetivo operativo interno, no un plazo legal. El artículo 12.3 regula el plazo de respuesta a los derechos, no la conservación. El borrado asíncrono y la lápida de restauración todavía no están construidos.
