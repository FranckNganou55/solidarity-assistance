-- Désactive les comptes fictifs du jeu de démonstration sans supprimer les cotisations historiques.
UPDATE members SET active = FALSE
WHERE phone IN ('690000002', '690000003', '677000101', '677000102', '677000103', '677000104', '677000105', '677000106', '677000107', '677000108');
