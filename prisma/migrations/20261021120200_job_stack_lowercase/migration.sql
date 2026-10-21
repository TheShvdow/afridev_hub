-- Les technologies des offres et des alertes sont désormais en minuscules,
-- pour que les filtres et les alertes les comparent sans tenir compte de la casse.
UPDATE "JobOffer" SET "stack" = ARRAY(
  SELECT DISTINCT lower(trim(item)) FROM unnest("stack") AS item WHERE trim(item) <> ''
);

UPDATE "JobAlert" SET "stack" = ARRAY(
  SELECT DISTINCT lower(trim(item)) FROM unnest("stack") AS item WHERE trim(item) <> ''
);
