// Destinations Bearion can ship to, matching the zones seeded in
// db/migrations/shipping-engine-and-promotions.sql. Anything not listed here
// still prices through the "rest of world" fallback zone if an admin adds it.

export type Country = {
  code: string
  name: string
  /** Local name shown to Indonesian visitors where it differs. */
  name_id?: string
}

export const COUNTRIES: Country[] = [
  { code: 'ID', name: 'Indonesia' },

  // Southeast Asia
  { code: 'SG', name: 'Singapore', name_id: 'Singapura' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'PH', name: 'Philippines', name_id: 'Filipina' },
  { code: 'BN', name: 'Brunei Darussalam' },
  { code: 'KH', name: 'Cambodia', name_id: 'Kamboja' },
  { code: 'LA', name: 'Laos' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'TL', name: 'Timor-Leste' },

  // East, South Asia & Middle East
  { code: 'JP', name: 'Japan', name_id: 'Jepang' },
  { code: 'KR', name: 'South Korea', name_id: 'Korea Selatan' },
  { code: 'CN', name: 'China', name_id: 'Tiongkok' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'MO', name: 'Macau' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'IN', name: 'India' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'AE', name: 'United Arab Emirates', name_id: 'Uni Emirat Arab' },
  { code: 'SA', name: 'Saudi Arabia', name_id: 'Arab Saudi' },
  { code: 'QA', name: 'Qatar' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'OM', name: 'Oman' },

  // Oceania
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand', name_id: 'Selandia Baru' },
  { code: 'PG', name: 'Papua New Guinea', name_id: 'Papua Nugini' },
  { code: 'FJ', name: 'Fiji' },

  // Europe
  { code: 'GB', name: 'United Kingdom', name_id: 'Inggris' },
  { code: 'IE', name: 'Ireland', name_id: 'Irlandia' },
  { code: 'DE', name: 'Germany', name_id: 'Jerman' },
  { code: 'FR', name: 'France', name_id: 'Prancis' },
  { code: 'NL', name: 'Netherlands', name_id: 'Belanda' },
  { code: 'BE', name: 'Belgium', name_id: 'Belgia' },
  { code: 'LU', name: 'Luxembourg', name_id: 'Luksemburg' },
  { code: 'IT', name: 'Italy', name_id: 'Italia' },
  { code: 'ES', name: 'Spain', name_id: 'Spanyol' },
  { code: 'PT', name: 'Portugal' },
  { code: 'AT', name: 'Austria' },
  { code: 'CH', name: 'Switzerland', name_id: 'Swiss' },
  { code: 'SE', name: 'Sweden', name_id: 'Swedia' },
  { code: 'NO', name: 'Norway', name_id: 'Norwegia' },
  { code: 'DK', name: 'Denmark', name_id: 'Denmark' },
  { code: 'FI', name: 'Finland', name_id: 'Finlandia' },
  { code: 'PL', name: 'Poland', name_id: 'Polandia' },
  { code: 'CZ', name: 'Czechia', name_id: 'Ceko' },
  { code: 'HU', name: 'Hungary', name_id: 'Hongaria' },
  { code: 'GR', name: 'Greece', name_id: 'Yunani' },
  { code: 'RO', name: 'Romania', name_id: 'Rumania' },

  // Americas
  { code: 'US', name: 'United States', name_id: 'Amerika Serikat' },
  { code: 'CA', name: 'Canada', name_id: 'Kanada' },
  { code: 'MX', name: 'Mexico', name_id: 'Meksiko' },
  { code: 'BR', name: 'Brazil', name_id: 'Brasil' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia', name_id: 'Kolombia' },
  { code: 'PE', name: 'Peru' },
]

/**
 * Countries with no national postcode system. Demanding one here would reject a
 * perfectly deliverable address, which is why the column is nullable.
 */
const NO_POSTCODE = new Set(['HK', 'MO', 'AE', 'QA', 'PA', 'FJ', 'TL'])

export const requiresPostalCode = (countryCode: string) =>
  !NO_POSTCODE.has((countryCode || '').toUpperCase())

export const countryName = (code: string, language: 'en' | 'id'): string => {
  const country = COUNTRIES.find((entry) => entry.code === (code || '').toUpperCase())
  if (!country) return code

  return language === 'id' && country.name_id ? country.name_id : country.name
}

export const isIndonesia = (code: string) => (code || 'ID').toUpperCase() === 'ID'
