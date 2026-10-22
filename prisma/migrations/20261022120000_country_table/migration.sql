-- Liste fermée des pays (décision 2026-10-22) : proposée en liste déroulante par le front
-- (GET /api/countries). User, JobOffer et Project référencent le code à 2 lettres.
CREATE TYPE "CountryRegion" AS ENUM ('AFRICA', 'DIASPORA');

CREATE TABLE "Country" (
    "code" TEXT NOT NULL,
    "alpha3" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" "CountryRegion" NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("code")
);

CREATE UNIQUE INDEX "Country_alpha3_key" ON "Country"("alpha3");
CREATE INDEX "Country_region_name_idx" ON "Country"("region", "name");

-- Généré depuis apps/api/src/common/countries.ts (54 pays africains puis la diaspora).
INSERT INTO "Country" ("code", "alpha3", "name", "region") VALUES
  ('DZ', 'DZA', 'Algérie', 'AFRICA'),
  ('AO', 'AGO', 'Angola', 'AFRICA'),
  ('BJ', 'BEN', 'Bénin', 'AFRICA'),
  ('BW', 'BWA', 'Botswana', 'AFRICA'),
  ('BF', 'BFA', 'Burkina Faso', 'AFRICA'),
  ('BI', 'BDI', 'Burundi', 'AFRICA'),
  ('CV', 'CPV', 'Cap-Vert', 'AFRICA'),
  ('CM', 'CMR', 'Cameroun', 'AFRICA'),
  ('CF', 'CAF', 'République centrafricaine', 'AFRICA'),
  ('TD', 'TCD', 'Tchad', 'AFRICA'),
  ('KM', 'COM', 'Comores', 'AFRICA'),
  ('CG', 'COG', 'Congo', 'AFRICA'),
  ('CD', 'COD', 'République démocratique du Congo', 'AFRICA'),
  ('CI', 'CIV', 'Côte d''Ivoire', 'AFRICA'),
  ('DJ', 'DJI', 'Djibouti', 'AFRICA'),
  ('EG', 'EGY', 'Égypte', 'AFRICA'),
  ('GQ', 'GNQ', 'Guinée équatoriale', 'AFRICA'),
  ('ER', 'ERI', 'Érythrée', 'AFRICA'),
  ('SZ', 'SWZ', 'Eswatini', 'AFRICA'),
  ('ET', 'ETH', 'Éthiopie', 'AFRICA'),
  ('GA', 'GAB', 'Gabon', 'AFRICA'),
  ('GM', 'GMB', 'Gambie', 'AFRICA'),
  ('GH', 'GHA', 'Ghana', 'AFRICA'),
  ('GN', 'GIN', 'Guinée', 'AFRICA'),
  ('GW', 'GNB', 'Guinée-Bissau', 'AFRICA'),
  ('KE', 'KEN', 'Kenya', 'AFRICA'),
  ('LS', 'LSO', 'Lesotho', 'AFRICA'),
  ('LR', 'LBR', 'Liberia', 'AFRICA'),
  ('LY', 'LBY', 'Libye', 'AFRICA'),
  ('MG', 'MDG', 'Madagascar', 'AFRICA'),
  ('MW', 'MWI', 'Malawi', 'AFRICA'),
  ('ML', 'MLI', 'Mali', 'AFRICA'),
  ('MR', 'MRT', 'Mauritanie', 'AFRICA'),
  ('MU', 'MUS', 'Maurice', 'AFRICA'),
  ('MA', 'MAR', 'Maroc', 'AFRICA'),
  ('MZ', 'MOZ', 'Mozambique', 'AFRICA'),
  ('NA', 'NAM', 'Namibie', 'AFRICA'),
  ('NE', 'NER', 'Niger', 'AFRICA'),
  ('NG', 'NGA', 'Nigeria', 'AFRICA'),
  ('RW', 'RWA', 'Rwanda', 'AFRICA'),
  ('ST', 'STP', 'Sao Tomé-et-Principe', 'AFRICA'),
  ('SN', 'SEN', 'Sénégal', 'AFRICA'),
  ('SC', 'SYC', 'Seychelles', 'AFRICA'),
  ('SL', 'SLE', 'Sierra Leone', 'AFRICA'),
  ('SO', 'SOM', 'Somalie', 'AFRICA'),
  ('ZA', 'ZAF', 'Afrique du Sud', 'AFRICA'),
  ('SS', 'SSD', 'Soudan du Sud', 'AFRICA'),
  ('SD', 'SDN', 'Soudan', 'AFRICA'),
  ('TZ', 'TZA', 'Tanzanie', 'AFRICA'),
  ('TG', 'TGO', 'Togo', 'AFRICA'),
  ('TN', 'TUN', 'Tunisie', 'AFRICA'),
  ('UG', 'UGA', 'Ouganda', 'AFRICA'),
  ('ZM', 'ZMB', 'Zambie', 'AFRICA'),
  ('ZW', 'ZWE', 'Zimbabwe', 'AFRICA'),
  ('FR', 'FRA', 'France', 'DIASPORA'),
  ('BE', 'BEL', 'Belgique', 'DIASPORA'),
  ('CH', 'CHE', 'Suisse', 'DIASPORA'),
  ('LU', 'LUX', 'Luxembourg', 'DIASPORA'),
  ('DE', 'DEU', 'Allemagne', 'DIASPORA'),
  ('IT', 'ITA', 'Italie', 'DIASPORA'),
  ('ES', 'ESP', 'Espagne', 'DIASPORA'),
  ('PT', 'PRT', 'Portugal', 'DIASPORA'),
  ('NL', 'NLD', 'Pays-Bas', 'DIASPORA'),
  ('GB', 'GBR', 'Royaume-Uni', 'DIASPORA'),
  ('US', 'USA', 'États-Unis', 'DIASPORA'),
  ('CA', 'CAN', 'Canada', 'DIASPORA'),
  ('BR', 'BRA', 'Brésil', 'DIASPORA'),
  ('AE', 'ARE', 'Émirats arabes unis', 'DIASPORA'),
  ('QA', 'QAT', 'Qatar', 'DIASPORA');

-- Un pays de profil hors liste est vidé (champ facultatif) ; offres et projets doivent déjà
-- utiliser un code de la liste, que l'API valide depuis le 2026-10-16.
UPDATE "User" SET "country" = NULL WHERE "country" IS NOT NULL AND "country" NOT IN (SELECT "code" FROM "Country");

ALTER TABLE "User" ADD CONSTRAINT "User_country_fkey" FOREIGN KEY ("country") REFERENCES "Country"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_country_fkey" FOREIGN KEY ("country") REFERENCES "Country"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JobOffer" ADD CONSTRAINT "JobOffer_country_fkey" FOREIGN KEY ("country") REFERENCES "Country"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
