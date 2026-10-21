// Pays acceptés sur la plateforme (profil, offres, projets) : les 54 pays africains, puis
// les principaux pays de la diaspora. Clé : code ISO 3166-1 alpha-2, nom en français.
// Cette liste est la source de la table Country (migration et seed) et de la validation
// des DTO. Ajouter un pays : l'ajouter ici et dans COUNTRY_ALPHA3, puis relancer le seed.
export const COUNTRIES = {
  // ── Afrique (54) ─────────────────────────────────────────────────────────
  DZ: 'Algérie',
  AO: 'Angola',
  BJ: 'Bénin',
  BW: 'Botswana',
  BF: 'Burkina Faso',
  BI: 'Burundi',
  CV: 'Cap-Vert',
  CM: 'Cameroun',
  CF: 'République centrafricaine',
  TD: 'Tchad',
  KM: 'Comores',
  CG: 'Congo',
  CD: 'République démocratique du Congo',
  CI: "Côte d'Ivoire",
  DJ: 'Djibouti',
  EG: 'Égypte',
  GQ: 'Guinée équatoriale',
  ER: 'Érythrée',
  SZ: 'Eswatini',
  ET: 'Éthiopie',
  GA: 'Gabon',
  GM: 'Gambie',
  GH: 'Ghana',
  GN: 'Guinée',
  GW: 'Guinée-Bissau',
  KE: 'Kenya',
  LS: 'Lesotho',
  LR: 'Liberia',
  LY: 'Libye',
  MG: 'Madagascar',
  MW: 'Malawi',
  ML: 'Mali',
  MR: 'Mauritanie',
  MU: 'Maurice',
  MA: 'Maroc',
  MZ: 'Mozambique',
  NA: 'Namibie',
  NE: 'Niger',
  NG: 'Nigeria',
  RW: 'Rwanda',
  ST: 'Sao Tomé-et-Principe',
  SN: 'Sénégal',
  SC: 'Seychelles',
  SL: 'Sierra Leone',
  SO: 'Somalie',
  ZA: 'Afrique du Sud',
  SS: 'Soudan du Sud',
  SD: 'Soudan',
  TZ: 'Tanzanie',
  TG: 'Togo',
  TN: 'Tunisie',
  UG: 'Ouganda',
  ZM: 'Zambie',
  ZW: 'Zimbabwe',
  // ── Diaspora ─────────────────────────────────────────────────────────────
  FR: 'France',
  BE: 'Belgique',
  CH: 'Suisse',
  LU: 'Luxembourg',
  DE: 'Allemagne',
  IT: 'Italie',
  ES: 'Espagne',
  PT: 'Portugal',
  NL: 'Pays-Bas',
  GB: 'Royaume-Uni',
  US: 'États-Unis',
  CA: 'Canada',
  BR: 'Brésil',
  AE: 'Émirats arabes unis',
  QA: 'Qatar',
} as const;

export type CountryCode = keyof typeof COUNTRIES;

export const COUNTRY_CODES = Object.keys(COUNTRIES) as CountryCode[];

export function isCountryCode(value: string): value is CountryCode {
  return Object.prototype.hasOwnProperty.call(COUNTRIES, value);
}

// Nombre de pays africains en tête de COUNTRIES ; les suivants sont ceux de la diaspora.
export const AFRICAN_COUNTRY_COUNT = 54;

// Code ISO 3166-1 alpha-3 de chaque pays (affichage : SEN, CIV, NGA…).
export const COUNTRY_ALPHA3: Record<CountryCode, string> = {
  DZ: 'DZA', AO: 'AGO', BJ: 'BEN', BW: 'BWA', BF: 'BFA', BI: 'BDI', CV: 'CPV', CM: 'CMR', CF: 'CAF',
  TD: 'TCD', KM: 'COM', CG: 'COG', CD: 'COD', CI: 'CIV', DJ: 'DJI', EG: 'EGY', GQ: 'GNQ', ER: 'ERI',
  SZ: 'SWZ', ET: 'ETH', GA: 'GAB', GM: 'GMB', GH: 'GHA', GN: 'GIN', GW: 'GNB', KE: 'KEN', LS: 'LSO',
  LR: 'LBR', LY: 'LBY', MG: 'MDG', MW: 'MWI', ML: 'MLI', MR: 'MRT', MU: 'MUS', MA: 'MAR', MZ: 'MOZ',
  NA: 'NAM', NE: 'NER', NG: 'NGA', RW: 'RWA', ST: 'STP', SN: 'SEN', SC: 'SYC', SL: 'SLE', SO: 'SOM',
  ZA: 'ZAF', SS: 'SSD', SD: 'SDN', TZ: 'TZA', TG: 'TGO', TN: 'TUN', UG: 'UGA', ZM: 'ZMB', ZW: 'ZWE',
  FR: 'FRA', BE: 'BEL', CH: 'CHE', LU: 'LUX', DE: 'DEU', IT: 'ITA', ES: 'ESP', PT: 'PRT', NL: 'NLD',
  GB: 'GBR', US: 'USA', CA: 'CAN', BR: 'BRA', AE: 'ARE', QA: 'QAT',
};

export type CountryRegionCode = 'AFRICA' | 'DIASPORA';

export interface CountryRecord {
  code:   CountryCode;
  alpha3: string;
  name:   string;
  region: CountryRegionCode;
}

// Lignes de la table Country, dans l'ordre de COUNTRIES.
export const COUNTRY_RECORDS: CountryRecord[] = COUNTRY_CODES.map((code, index) => ({
  code,
  alpha3: COUNTRY_ALPHA3[code],
  name:   COUNTRIES[code],
  region: index < AFRICAN_COUNTRY_COUNT ? 'AFRICA' : 'DIASPORA',
}));

// Code à 2 lettres en majuscules (`sn` → `SN`) ; toute autre valeur est laissée telle quelle
// pour que la validation la refuse. Pour les @Transform des DTO.
export const toCountryCode = (value: unknown) =>
  typeof value === 'string' && /^[a-z]{2}$/i.test(value.trim()) ? value.trim().toUpperCase() : value;
