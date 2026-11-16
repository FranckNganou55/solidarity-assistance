-- =====================================================================
--  Verification de la perception de l'argent par le tresorier
--  Le tresorier controle la cotisation du membre dans l'assistance puis
--  confirme avoir recu l'argent avant de valider.
-- =====================================================================
ALTER TABLE contributions
    ADD COLUMN payment_received      BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN receipt_reference     VARCHAR(80),
    ADD COLUMN payment_received_at   TIMESTAMPTZ,
    ADD COLUMN payment_received_by   BIGINT;

-- Les cotisations deja validees avant cette evolution sont considerees comme encaissees
UPDATE contributions
   SET payment_received    = TRUE,
       payment_received_at = validated_at,
       payment_received_by = validated_by
 WHERE status = 'VALIDATED';
