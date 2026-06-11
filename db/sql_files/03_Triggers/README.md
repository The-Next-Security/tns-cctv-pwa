# Triggers

No se crean triggers en el esquema inicial. Las transiciones contractuales se
ejecutan mediante `stpr_register_event_state` para mantener la actualización y
el timeline dentro de una única transacción explícita.
