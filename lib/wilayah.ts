export type WilayahOption = {
  code: string
  name: string
}

type WilayahResponse = {
  data: WilayahOption[]
}

const WILAYAH_BASE_URL = '/api/wilayah'

const normalizeName = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/^kota administrasi\s+/i, '')
    .replace(/^kota\s+/i, '')
    .replace(/^kabupaten\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const fetchWilayah = async (path: string): Promise<WilayahOption[]> => {
  const response = await fetch(`${WILAYAH_BASE_URL}${path}`)

  if (!response.ok) {
    throw new Error(`WILAYAH_API_ERROR_${response.status}`)
  }

  const json = (await response.json()) as WilayahResponse
  return json.data || []
}

export const wilayahService = {
  async getProvinces(): Promise<WilayahOption[]> {
    return fetchWilayah('/provinces')
  },

  async getRegencies(provinceCode: string): Promise<WilayahOption[]> {
    return fetchWilayah(`/regencies/${provinceCode}`)
  },

  async getDistricts(regencyCode: string): Promise<WilayahOption[]> {
    return fetchWilayah(`/districts/${regencyCode}`)
  },

  async getVillages(districtCode: string): Promise<WilayahOption[]> {
    return fetchWilayah(`/villages/${districtCode}`)
  },
}

export const getDisplayRegionName = (name: string): string => {
  return name
    .replace(/^Kota Administrasi\s+/i, '')
    .replace(/^Kota\s+/i, '')
    .replace(/^Kabupaten\s+/i, '')
    .trim()
}

export const findRegionByName = (
  options: WilayahOption[],
  targetName: string
): WilayahOption | undefined => {
  const normalizedTarget = normalizeName(targetName)
  return options.find((option) => normalizeName(option.name) === normalizedTarget)
}
