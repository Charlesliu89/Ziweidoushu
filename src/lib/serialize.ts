import { generateChart, hourToShichen, type BirthInfo, type FunctionalAstrolabe } from './astro.js'
import {
  buildWenmoPalaceDecorations,
  getStemSihuaLabels,
  getWenmoPalaceTitle,
  summarizeWenmoHoroscope,
  toFullSihuaName,
  type WenmoPalaceDecoration,
  type WenmoStarMark,
} from './wenmo-rules.js'

interface StarRecord {
  name: unknown
  type?: unknown
  scope?: unknown
  brightness?: unknown
  mutagen?: unknown
}

interface DecadalRecord {
  range?: unknown
  heavenlyStem?: unknown
  earthlyBranch?: unknown
}

interface PalaceRecord {
  index: number
  name: unknown
  isBodyPalace: boolean
  isOriginalPalace: boolean
  heavenlyStem: unknown
  earthlyBranch: unknown
  majorStars: StarRecord[]
  minorStars: StarRecord[]
  adjectiveStars: StarRecord[]
  changsheng12?: unknown
  boshi12?: unknown
  jiangqian12?: unknown
  suiqian12?: unknown
  decadal?: DecadalRecord
  ages?: unknown
}

interface HoroscopeScopeRecord {
  index: number
  nominalAge?: number
  name: unknown
  heavenlyStem: unknown
  earthlyBranch: unknown
  palaceNames: unknown[]
  mutagen: unknown[]
  stars?: StarRecord[][]
}

interface HoroscopeRecord {
  lunarDate: unknown
  solarDate: unknown
  decadal: HoroscopeScopeRecord
  age: HoroscopeScopeRecord
  yearly: HoroscopeScopeRecord
  monthly: HoroscopeScopeRecord
  daily: HoroscopeScopeRecord
  hourly: HoroscopeScopeRecord
}

export interface ZiweiJsonOptions {
  targetDate?: string | Date
}

export interface ZiweiJsonDocument {
  schemaVersion: string
  generatedAt: string
  engine: {
    name: string
    package: string
    ruleProfile: string
    config: Record<string, string>
  }
  input: BirthInfo & {
    shichen: string
  }
  natal: {
    gender: string
    solarDate: string
    lunarDate: string
    chineseDate: string
    rawDates: unknown
    time: string
    timeRange: string
    sign: string
    zodiac: string
    fiveElementsClass: string
    bodyPalaceBranch: string
    soulPalaceBranch: string
    bodyMaster: string
    soulMaster: string
    birthYearSihua: string[]
  }
  palaces: PalaceJson[]
  horoscope?: HoroscopeJson
}

export interface PalaceJson {
  index: number
  name: string
  displayName: string
  heavenlyStem: string
  earthlyBranch: string
  isBodyPalace: boolean
  isOriginalPalace: boolean
  majorStars: StarJson[]
  minorStars: StarJson[]
  adjectiveStars: StarJson[]
  shensha: {
    changsheng12?: string
    boshi12?: string
    jiangqian12?: string
    suiqian12?: string
  }
  decadal?: {
    range?: unknown
    startYear?: number
    endYear?: number
    heavenlyStem?: string
    earthlyBranch?: string
  }
  ages?: unknown
  wenmo: {
    marks: Record<string, WenmoStarMark[]>
    outgoing: WenmoPalaceDecoration['outgoing']
  }
}

export interface StarJson {
  name: string
  type?: string
  scope?: string
  brightness?: string
  mutagen?: string
  mutagenLabel?: string
  marks: WenmoStarMark[]
}

export interface HoroscopeJson {
  targetDate: string
  lunarDate: string
  solarDate: string
  wenmoSummary: ReturnType<typeof summarizeWenmoHoroscope>
  decadal: HoroscopeScopeJson
  age: HoroscopeScopeJson
  yearly: HoroscopeScopeJson
  monthly: HoroscopeScopeJson
  daily: HoroscopeScopeJson
  hourly: HoroscopeScopeJson
}

export interface HoroscopeScopeJson {
  index: number
  nominalAge?: number
  name: string
  heavenlyStem: string
  earthlyBranch: string
  palaceName: string
  palaceNames: string[]
  mutagens: string[]
  starsByPalace?: StarJson[][]
}

function stringValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  return value.length > 0 ? value : undefined
}

function serializeStar(star: StarRecord, marks: WenmoStarMark[] = []): StarJson {
  const mutagen = stringValue(star.mutagen)
  return {
    name: String(star.name),
    type: stringValue(star.type),
    scope: stringValue(star.scope),
    brightness: stringValue(star.brightness),
    mutagen,
    mutagenLabel: mutagen ? toFullSihuaName(mutagen) : undefined,
    marks,
  }
}

function serializeStars(stars: StarRecord[], decoration?: WenmoPalaceDecoration): StarJson[] {
  return stars.map((star) => serializeStar(star, decoration?.starMarks[String(star.name)] ?? []))
}

function numberRange(value: unknown): [number, number] | undefined {
  if (!Array.isArray(value) || value.length < 2) return undefined
  const start = Number(value[0])
  const end = Number(value[1])
  return Number.isFinite(start) && Number.isFinite(end) ? [start, end] : undefined
}

function serializePalace(
  palace: PalaceRecord,
  decoration: WenmoPalaceDecoration | undefined,
  birthYear: number,
): PalaceJson {
  const decadalRange = numberRange(palace.decadal?.range)
  const name = String(palace.name)

  return {
    index: palace.index,
    name,
    displayName: decoration?.displayName ?? getWenmoPalaceTitle(name),
    heavenlyStem: String(palace.heavenlyStem),
    earthlyBranch: String(palace.earthlyBranch),
    isBodyPalace: palace.isBodyPalace,
    isOriginalPalace: palace.isOriginalPalace,
    majorStars: serializeStars(palace.majorStars, decoration),
    minorStars: serializeStars(palace.minorStars, decoration),
    adjectiveStars: serializeStars(palace.adjectiveStars),
    shensha: {
      changsheng12: stringValue(palace.changsheng12),
      boshi12: stringValue(palace.boshi12),
      jiangqian12: stringValue(palace.jiangqian12),
      suiqian12: stringValue(palace.suiqian12),
    },
    decadal: {
      range: palace.decadal?.range,
      startYear: decadalRange ? birthYear + decadalRange[0] - 1 : undefined,
      endYear: decadalRange ? birthYear + decadalRange[1] - 1 : undefined,
      heavenlyStem: stringValue(palace.decadal?.heavenlyStem),
      earthlyBranch: stringValue(palace.decadal?.earthlyBranch),
    },
    ages: palace.ages,
    wenmo: {
      marks: decoration?.starMarks ?? {},
      outgoing: decoration?.outgoing ?? [],
    },
  }
}

function serializeStarsByPalace(stars?: StarRecord[][]): StarJson[][] | undefined {
  return stars?.map((items) => items.map((star) => serializeStar(star)))
}

function serializeHoroscopeScope(scope: HoroscopeScopeRecord): HoroscopeScopeJson {
  return {
    index: scope.index,
    nominalAge: scope.nominalAge,
    name: String(scope.name),
    heavenlyStem: String(scope.heavenlyStem),
    earthlyBranch: String(scope.earthlyBranch),
    palaceName: getWenmoPalaceTitle(String(scope.palaceNames[0] ?? '')),
    palaceNames: scope.palaceNames.map((name) => getWenmoPalaceTitle(String(name))),
    mutagens: scope.mutagen.map((item) => String(item)),
    starsByPalace: serializeStarsByPalace(scope.stars),
  }
}

function serializeHoroscope(chart: FunctionalAstrolabe, targetDate: string | Date): HoroscopeJson {
  const horoscope = chart.horoscope(targetDate) as HoroscopeRecord
  const targetDateString = targetDate instanceof Date ? targetDate.toISOString() : targetDate

  return {
    targetDate: targetDateString,
    lunarDate: String(horoscope.lunarDate),
    solarDate: String(horoscope.solarDate),
    wenmoSummary: summarizeWenmoHoroscope(chart, targetDate),
    decadal: serializeHoroscopeScope(horoscope.decadal),
    age: serializeHoroscopeScope(horoscope.age),
    yearly: serializeHoroscopeScope(horoscope.yearly),
    monthly: serializeHoroscopeScope(horoscope.monthly),
    daily: serializeHoroscopeScope(horoscope.daily),
    hourly: serializeHoroscopeScope(horoscope.hourly),
  }
}

export function buildZiweiJson(info: BirthInfo, options: ZiweiJsonOptions = {}): ZiweiJsonDocument {
  const chart = generateChart(info)
  const decorations = buildWenmoPalaceDecorations(chart)
  const decorationByIndex = new Map(decorations.map((item) => [item.palaceIndex, item]))
  const birthYearStem = String(chart.rawDates.chineseDate.yearly[0])

  return {
    schemaVersion: 'wenmo-ziwei-json/v1',
    generatedAt: new Date().toISOString(),
    engine: {
      name: 'Wenmo Ziwei JSON',
      package: 'iztro',
      ruleProfile: 'zhongzhou + wenmo-compatible decorations',
      config: {
        yearDivide: 'normal',
        horoscopeDivide: 'normal',
        ageDivide: 'normal',
        dayDivide: 'forward',
        algorithm: 'zhongzhou',
      },
    },
    input: {
      ...info,
      minute: info.minute ?? 0,
      shichen: hourToShichen(info.hour, info.minute ?? 0),
    },
    natal: {
      gender: String(chart.gender),
      solarDate: String(chart.solarDate),
      lunarDate: String(chart.lunarDate),
      chineseDate: String(chart.chineseDate),
      rawDates: chart.rawDates,
      time: String(chart.time),
      timeRange: String(chart.timeRange),
      sign: String(chart.sign),
      zodiac: String(chart.zodiac),
      fiveElementsClass: String(chart.fiveElementsClass),
      bodyPalaceBranch: String(chart.earthlyBranchOfBodyPalace),
      soulPalaceBranch: String(chart.earthlyBranchOfSoulPalace),
      bodyMaster: String(chart.body),
      soulMaster: String(chart.soul),
      birthYearSihua: getStemSihuaLabels(birthYearStem),
    },
    palaces: (chart.palaces as PalaceRecord[]).map((palace) => (
      serializePalace(palace, decorationByIndex.get(palace.index), info.year)
    )),
    horoscope: options.targetDate ? serializeHoroscope(chart, options.targetDate) : undefined,
  }
}
