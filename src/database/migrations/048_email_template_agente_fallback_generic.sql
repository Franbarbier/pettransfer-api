-- Migration 048: genericiza T03 (el único template de tipo_cliente = "agente") para
-- que también sirva de fallback cuando no hay fila exacta para "agente" en otras
-- combinaciones de operación/cobertura (ej. IMPO+agente, o "ambas"+agente — ninguna
-- tiene template propio). El texto deja de mencionar "export door-to-airport" para
-- no comprometerse a un tipo de servicio específico; sirve para cualquier operación.
-- El servicio de resolución (emailTemplates.ts) usa T03 como fallback por código
-- cuando el match exacto por contexto no encuentra nada y tipo_cliente = "agente".

UPDATE email_templates SET body = $$Hello {{client_name}},

Thank you for reaching out to us. We are pleased to assist you.

Please find attached our quote. Let us know if you require any further details or assistance.

Regards,$$
WHERE code = 'T03';
