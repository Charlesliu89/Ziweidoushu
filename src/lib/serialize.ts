import {
  generateChart,
  hourToShichen,
  hourToTimeIndex,
  type BirthInfo,
  type FunctionalAstrolabe,
} from './astro.js'
import { createRequire } from 'node:module'
import {
  assertWenmoPalaceTitleSet,
  buildWenmoPalaceDecorations,
  getStemSihuaLabels,
  summarizeWenmoHoroscope,
  toFullSihuaName,
  validateWenmoPalaceTitle,
  type Sihua,
  type WenmoPalaceDecoration,
  type WenmoStarMark,
} from './wenmo-rules.js'

const localRequire = createRequire(import.meta.url)
const iztroPackageJson = localRequire('iztro/package.json') as { version?: unknown }
const heavenlyStems = new Set(['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'])
const earthlyBranches = new Set(['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'])
const starTypes = new Set<StarTypeJson>(['major', 'soft', 'tough', 'adjective', 'flower', 'helper', 'lucun', 'tianma'])
const starScopes = new Set<StarScopeJson>(['origin', 'decadal', 'yearly', 'monthly', 'daily', 'hourly'])
const starBrightnesses = new Set<StarBrightnessJson>(['庙', '旺', '得', '利', '平', '陷', '不'])
const starMutagens = new Set<Sihua>(['禄', '权', '科', '忌'])
const sihuaOrder: readonly Sihua[] = ['禄', '权', '科', '忌']

interface StarRecord {
  name: unknown
  type?: unknown
  scope?: unknown
  brightness?: unknown
  mutagen?: unknown
}

interface DecadalRecord {
  range: unknown
  heavenlyStem: unknown
  earthlyBranch: unknown
}

interface PalaceRecord {
  index: unknown
  name: unknown
  isBodyPalace: unknown
  isOriginalPalace: unknown
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

interface RawLunarDateRecord {
  lunarYear: unknown
  lunarMonth: unknown
  lunarDay: unknown
  isLeap: unknown
}

interface RawChineseDateRecord {
  yearly: unknown[]
  monthly: unknown[]
  daily: unknown[]
  hourly: unknown[]
}

interface RawDatesRecord {
  lunarDate: RawLunarDateRecord
  chineseDate: RawChineseDateRecord
}

export interface ZiweiJsonOptions {
  targetDate?: string | Date
  targetHour?: number
  targetMinute?: number
}

export const ZIWEI_JSON_SCHEMA_VERSION = 'wenmo-ziwei-json/v2'

const ziweiJsonOptionKeys = new Set(['targetDate', 'targetHour', 'targetMinute'])

export interface ZiweiJsonDocument {
  schemaVersion: typeof ZIWEI_JSON_SCHEMA_VERSION
  generatedAt: string
  engine: {
    name: string
    package: string
    version: string
    ruleProfile: string
    config: Record<string, string>
  }
  input: BirthInfo & {
    calendar: 'solar'
    shichen: string
    timeIndex: number
    locationUsedForCalculation: false
    longitudeUsedForCalculation: false
  }
  natal: {
    gender: string
    solarDate: string
    lunarDate: string
    chineseDate: string
    rawDates: RawDatesJson
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

export interface RawDatesJson {
  lunarDate: {
    lunarYear: number
    lunarMonth: number
    lunarDay: number
    isLeap: boolean
  }
  chineseDate: {
    yearly: [string, string]
    monthly: [string, string]
    daily: [string, string]
    hourly: [string, string]
  }
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
    changsheng12: string
    boshi12: string
    jiangqian12: string
    suiqian12: string
  }
  decadal: {
    range: [number, number]
    startYear: number
    endYear: number
    heavenlyStem: string
    earthlyBranch: string
  }
  ages: number[]
  wenmo: {
    marks: Record<string, WenmoStarMark[]>
    outgoing: WenmoPalaceDecoration['outgoing']
  }
}

export type StarTypeJson = 'major' | 'soft' | 'tough' | 'adjective' | 'flower' | 'helper' | 'lucun' | 'tianma'
export type StarScopeJson = 'origin' | 'decadal' | 'yearly' | 'monthly' | 'daily' | 'hourly'
export type StarBrightnessJson = '庙' | '旺' | '得' | '利' | '平' | '陷' | '不'

export interface StarJson {
  name: string
  type?: StarTypeJson
  scope?: StarScopeJson
  brightness?: StarBrightnessJson
  mutagen?: Sihua
  mutagenLabel?: string
  marks: WenmoStarMark[]
}

export interface HoroscopeJson {
  targetDate: string
  targetHour: number
  targetMinute: number
  targetShichen: string
  targetTimeIndex: number
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

export interface MutagenStarJson {
  sihua: Sihua
  starName: string
}

export interface HoroscopeScopeJson {
  index: number
  nominalAge?: number
  name: string
  heavenlyStem: string
  earthlyBranch: string
  palaceName: string
  palaceNames: string[]
  mutagenStars: MutagenStarJson[]
  starsByPalace?: StarJson[][]
}

function stringValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  return value.length > 0 ? value : undefined
}

function requiredString(value: unknown, label: string): string {
  const text = stringValue(value)
  if (!text) {
    throw new Error(`${label} is missing from iztro result`)
  }
  return text
}

function requiredHeavenlyStem(value: unknown, label: string): string {
  const text = requiredString(value, label)
  if (!heavenlyStems.has(text)) {
    throw new Error(`${label} must be a valid heavenly stem`)
  }
  return text
}

function requiredEarthlyBranch(value: unknown, label: string): string {
  const text = requiredString(value, label)
  if (!earthlyBranches.has(text)) {
    throw new Error(`${label} must be a valid earthly branch`)
  }
  return text
}

function optionalEnumString<T extends string>(
  value: unknown,
  label: string,
  allowed: ReadonlySet<T>,
): T | undefined {
  if (value === undefined || value === '') return undefined
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string when present`)
  }
  const text = value
  if (!allowed.has(text as T)) {
    throw new Error(`${label} is unsupported by the configured iztro zh-CN schema: ${text}`)
  }
  return text as T
}

function requiredArray<T>(value: T[] | undefined, label: string): T[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} is missing from iztro result`)
  }
  return value
}

function requiredArrayLength<T>(value: T[] | undefined, label: string, length: number): T[] {
  const items = requiredArray(value, label)
  if (items.length !== length) {
    throw new Error(`${label} must contain ${length} items`)
  }
  return items
}

function requiredPlainRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isPlainRecord(value)) {
    throw new Error(`${label} is missing from iztro result`)
  }
  return value
}

function requiredBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${label} is missing from iztro result`)
  }
  return value
}

function requiredInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`${label} must be an integer`)
  }
  return value
}

function optionalIntegerInRange(
  value: unknown,
  label: string,
  min: number,
  max: number,
): number | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(`${label} must be an integer between ${min} and ${max}`)
  }
  return value
}

function optionalInteger(value: unknown, label: string): number | undefined {
  if (value === undefined) return undefined
  return requiredInteger(value, label)
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function requiredIntegerInRange(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${label} must be an integer between ${min} and ${max}`)
  }
  return value
}

function requiredPalaceIndex(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 11) {
    throw new Error(`${label} must be an integer between 0 and 11`)
  }
  return value
}

function assertPlainOptions(value: ZiweiJsonOptions): void {
  if (!isPlainRecord(value)) {
    throw new RangeError('options must be an object')
  }

  for (const key of Object.keys(value)) {
    if (!ziweiJsonOptionKeys.has(key)) {
      throw new RangeError(`unsupported options field: ${key}`)
    }
  }

  if (value.targetDate === undefined && value.targetHour !== undefined) {
    throw new RangeError('targetHour requires targetDate')
  }

  if (value.targetDate === undefined && value.targetMinute !== undefined) {
    throw new RangeError('targetMinute requires targetDate')
  }

  if (value.targetHour === undefined && value.targetMinute !== undefined) {
    throw new RangeError('targetMinute requires targetHour')
  }
}

function assertPalaceIndexes(palaces: PalaceRecord[]): void {
  const indexes = new Set<number>()

  for (const palace of palaces) {
    const index = requiredPalaceIndex(palace.index, 'palace.index')
    if (indexes.has(index)) {
      throw new Error(`duplicate palace index from iztro result: ${index}`)
    }
    indexes.add(index)
  }

  if (indexes.size !== 12) {
    throw new Error('iztro result must contain palace indexes 0 through 11')
  }
}

function serializeStar(star: StarRecord, marks: WenmoStarMark[] = []): StarJson {
  const mutagen = optionalEnumString(star.mutagen, 'star.mutagen', starMutagens)
  const mutagenLabel = mutagen ? toFullSihuaName(mutagen) : undefined

  return {
    name: requiredString(star.name, 'star.name'),
    type: optionalEnumString(star.type, 'star.type', starTypes),
    scope: optionalEnumString(star.scope, 'star.scope', starScopes),
    brightness: optionalEnumString(star.brightness, 'star.brightness', starBrightnesses),
    mutagen,
    mutagenLabel,
    marks,
  }
}

function serializeStars(stars: StarRecord[], decoration?: WenmoPalaceDecoration): StarJson[] {
  return stars.map((star) => {
    const starName = requiredString(star.name, 'star.name')
    return serializeStar(star, decoration?.starMarks[starName] ?? [])
  })
}

function collectKnownStarNames(palaces: PalaceRecord[]): Set<string> {
  const starNames = new Set<string>()

  for (const palace of palaces) {
    for (const group of [palace.majorStars, palace.minorStars, palace.adjectiveStars]) {
      for (const star of requiredArray(group, 'palace.stars')) {
        starNames.add(requiredString(star.name, 'star.name'))
      }
    }
  }

  return starNames
}

function numberRange(value: unknown): [number, number] | undefined {
  if (!Array.isArray(value) || value.length !== 2) return undefined
  const start = Number(value[0])
  const end = Number(value[1])
  if (
    !Number.isInteger(start)
    || !Number.isInteger(end)
    || start < 1
    || end < start
  ) {
    return undefined
  }

  return [start, end]
}

function requiredNumberRange(value: unknown, label: string): [number, number] {
  const range = numberRange(value)
  if (!range) {
    throw new Error(`${label} is missing from iztro result`)
  }
  if (range[1] !== range[0] + 9) {
    throw new Error(`${label} must span 10 nominal ages`)
  }
  return range
}

function requiredAges(value: unknown, label: string): number[] {
  const items = requiredArray(value as unknown[] | undefined, label)
  if (items.length !== 10) {
    throw new Error(`${label} must contain 10 small-limit ages`)
  }

  return items.map((item, index) => {
    if (typeof item !== 'number' || !Number.isInteger(item) || item < 1) {
      throw new Error(`${label}[${index}] must be a positive integer`)
    }

    if (index > 0 && item !== Number(items[index - 1]) + 12) {
      throw new Error(`${label} must increase by 12 years`)
    }

    return item
  })
}

function requiredGanZhiPair(value: unknown, label: string): [string, string] {
  const items = requiredArrayLength(value as unknown[] | undefined, label, 2)
  return [
    requiredHeavenlyStem(items[0], `${label}[0]`),
    requiredEarthlyBranch(items[1], `${label}[1]`),
  ]
}

function serializeRawDates(value: unknown): RawDatesJson {
  const rawDates = requiredPlainRecord(value, 'rawDates') as unknown as RawDatesRecord
  const lunarDate = requiredPlainRecord(rawDates.lunarDate, 'rawDates.lunarDate') as unknown as RawLunarDateRecord
  const chineseDate = requiredPlainRecord(
    rawDates.chineseDate,
    'rawDates.chineseDate',
  ) as unknown as RawChineseDateRecord

  return {
    lunarDate: {
      lunarYear: requiredIntegerInRange(rawDates.lunarDate.lunarYear, 'rawDates.lunarDate.lunarYear', 1, 9999),
      lunarMonth: requiredIntegerInRange(rawDates.lunarDate.lunarMonth, 'rawDates.lunarDate.lunarMonth', 1, 12),
      lunarDay: requiredIntegerInRange(rawDates.lunarDate.lunarDay, 'rawDates.lunarDate.lunarDay', 1, 30),
      isLeap: requiredBoolean(lunarDate.isLeap, 'rawDates.lunarDate.isLeap'),
    },
    chineseDate: {
      yearly: requiredGanZhiPair(chineseDate.yearly, 'rawDates.chineseDate.yearly'),
      monthly: requiredGanZhiPair(chineseDate.monthly, 'rawDates.chineseDate.monthly'),
      daily: requiredGanZhiPair(chineseDate.daily, 'rawDates.chineseDate.daily'),
      hourly: requiredGanZhiPair(chineseDate.hourly, 'rawDates.chineseDate.hourly'),
    },
  }
}

function pruneUndefinedProperties<T>(value: T, path = 'document'): T {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (value[index] === undefined) {
        throw new Error(`${path}[${index}] is undefined`)
      }
      value[index] = pruneUndefinedProperties(value[index], `${path}[${index}]`)
    }
    return value
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    for (const [key, item] of Object.entries(record)) {
      if (item === undefined) {
        delete record[key]
      } else {
        record[key] = pruneUndefinedProperties(item, `${path}.${key}`)
      }
    }
  }

  return value
}

function isValidSolarDate(year: number, month: number, day: number): boolean {
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  date.setUTCHours(0, 0, 0, 0)
  return (
    date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
  )
}

function normalizeDateString(value: string, label: string): string {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value)
  if (!match) {
    throw new RangeError(`${label} must use YYYY-MM-DD format`)
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (
    year < 1 || year > 9999
    || month < 1 || month > 12
    || day < 1 || day > 31
    || !isValidSolarDate(year, month, day)
  ) {
    throw new RangeError(`${label} must be a valid solar calendar date`)
  }

  return `${match[1]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function normalizeTargetDate(value: string | Date): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new RangeError('targetDate must be a valid Date')
    }
    return normalizeDateString(value.toISOString().slice(0, 10), 'targetDate')
  }

  if (typeof value !== 'string') {
    throw new RangeError('targetDate must be a YYYY-MM-DD string or a valid Date')
  }

  return normalizeDateString(value, 'targetDate')
}

function normalizeTargetTime(options: ZiweiJsonOptions): {
  hour: number
  minute: number
  shichen: string
  timeIndex: number
} {
  const hour = optionalIntegerInRange(options.targetHour, 'targetHour', 0, 23) ?? 0
  const minute = optionalIntegerInRange(options.targetMinute, 'targetMinute', 0, 59) ?? 0
  const timeIndex = hourToTimeIndex(hour, minute)

  return {
    hour,
    minute,
    shichen: hourToShichen(hour, minute),
    timeIndex,
  }
}

function serializePalace(
  palace: PalaceRecord,
  decoration: WenmoPalaceDecoration,
  birthYear: number,
): PalaceJson {
  const name = requiredString(palace.name, 'palace.name')
  const index = requiredPalaceIndex(palace.index, `palace.${name}.index`)
  const decadal = palace.decadal
  if (!decadal) {
    throw new Error(`palace.${name}.decadal is missing from iztro result`)
  }

  const decadalRange = requiredNumberRange(decadal.range, `palace.${name}.decadal.range`)

  return {
    index,
    name,
    displayName: decoration.displayName,
    heavenlyStem: requiredHeavenlyStem(palace.heavenlyStem, `palace.${name}.heavenlyStem`),
    earthlyBranch: requiredEarthlyBranch(palace.earthlyBranch, `palace.${name}.earthlyBranch`),
    isBodyPalace: requiredBoolean(palace.isBodyPalace, `palace.${name}.isBodyPalace`),
    isOriginalPalace: requiredBoolean(palace.isOriginalPalace, `palace.${name}.isOriginalPalace`),
    majorStars: serializeStars(requiredArray(palace.majorStars, `palace.${name}.majorStars`), decoration),
    minorStars: serializeStars(requiredArray(palace.minorStars, `palace.${name}.minorStars`), decoration),
    adjectiveStars: serializeStars(requiredArray(palace.adjectiveStars, `palace.${name}.adjectiveStars`)),
    shensha: {
      changsheng12: requiredString(palace.changsheng12, `palace.${name}.changsheng12`),
      boshi12: requiredString(palace.boshi12, `palace.${name}.boshi12`),
      jiangqian12: requiredString(palace.jiangqian12, `palace.${name}.jiangqian12`),
      suiqian12: requiredString(palace.suiqian12, `palace.${name}.suiqian12`),
    },
    decadal: {
      range: decadalRange,
      startYear: birthYear + decadalRange[0] - 1,
      endYear: birthYear + decadalRange[1] - 1,
      heavenlyStem: requiredHeavenlyStem(decadal.heavenlyStem, `palace.${name}.decadal.heavenlyStem`),
      earthlyBranch: requiredEarthlyBranch(decadal.earthlyBranch, `palace.${name}.decadal.earthlyBranch`),
    },
    ages: requiredAges(palace.ages, `palace.${name}.ages`),
    wenmo: {
      marks: decoration.starMarks,
      outgoing: decoration.outgoing,
    },
  }
}

function serializeStarsByPalace(stars: StarRecord[][] | undefined, label: string): StarJson[][] {
  const groups = requiredArrayLength(stars, label, 12)

  return groups.map((items, index) => (
    requiredArray(items, `horoscope.stars[${index}]`).map((star) => serializeStar(star))
  ))
}

function serializeMutagenStars(
  value: unknown[] | undefined,
  label: string,
  knownStarNames: ReadonlySet<string>,
): MutagenStarJson[] {
  const starNames = requiredArrayLength(value, label, 4)
  return starNames.map((item, index) => {
    const starName = requiredString(item, `${label}[${index}]`)
    if (!knownStarNames.has(starName)) {
      throw new Error(`${label}[${index}] references an unknown star: ${starName}`)
    }

    return {
      sihua: sihuaOrder[index],
      starName,
    }
  })
}

function serializeHoroscopeScope(
  scope: HoroscopeScopeRecord,
  knownStarNames: ReadonlySet<string>,
  requireStars = true,
): HoroscopeScopeJson {
  const name = requiredString(scope.name, 'horoscope.scope.name')
  const palaceNames = requiredArrayLength(scope.palaceNames, `horoscope.${name}.palaceNames`, 12)
  const mutagenStars = serializeMutagenStars(scope.mutagen, `horoscope.${name}.mutagen`, knownStarNames)
  const normalizedPalaceNames = palaceNames.map((item) => (
    validateWenmoPalaceTitle(requiredString(item, `horoscope.${name}.palaceNames`), `horoscope.${name}.palaceNames`)
  ))
  assertWenmoPalaceTitleSet(normalizedPalaceNames, `horoscope.${name}.palaceNames`)
  const starsByPalace = requireStars
    ? serializeStarsByPalace(scope.stars, `horoscope.${name}.stars`)
    : scope.stars
      ? serializeStarsByPalace(scope.stars, `horoscope.${name}.stars`)
      : undefined

  return {
    index: requiredPalaceIndex(scope.index, `horoscope.${name}.index`),
    nominalAge: optionalInteger(scope.nominalAge, `horoscope.${name}.nominalAge`),
    name,
    heavenlyStem: requiredHeavenlyStem(scope.heavenlyStem, `horoscope.${name}.heavenlyStem`),
    earthlyBranch: requiredEarthlyBranch(scope.earthlyBranch, `horoscope.${name}.earthlyBranch`),
    palaceName: normalizedPalaceNames[0],
    palaceNames: normalizedPalaceNames,
    mutagenStars,
    starsByPalace,
  }
}

function serializeHoroscope(
  chart: FunctionalAstrolabe,
  targetDate: string | Date,
  targetTime: ReturnType<typeof normalizeTargetTime>,
): HoroscopeJson {
  const normalizedTargetDate = normalizeTargetDate(targetDate)
  const horoscope = chart.horoscope(normalizedTargetDate, targetTime.timeIndex) as HoroscopeRecord
  const knownStarNames = collectKnownStarNames(chart.palaces as PalaceRecord[])

  return {
    targetDate: normalizedTargetDate,
    targetHour: targetTime.hour,
    targetMinute: targetTime.minute,
    targetShichen: targetTime.shichen,
    targetTimeIndex: targetTime.timeIndex,
    lunarDate: requiredString(horoscope.lunarDate, 'horoscope.lunarDate'),
    solarDate: requiredString(horoscope.solarDate, 'horoscope.solarDate'),
    wenmoSummary: summarizeWenmoHoroscope(chart, normalizedTargetDate, targetTime.timeIndex),
    decadal: serializeHoroscopeScope(horoscope.decadal, knownStarNames),
    age: serializeHoroscopeScope(horoscope.age, knownStarNames, false),
    yearly: serializeHoroscopeScope(horoscope.yearly, knownStarNames),
    monthly: serializeHoroscopeScope(horoscope.monthly, knownStarNames),
    daily: serializeHoroscopeScope(horoscope.daily, knownStarNames),
    hourly: serializeHoroscopeScope(horoscope.hourly, knownStarNames),
  }
}

export function buildZiweiJson(info: BirthInfo, options: ZiweiJsonOptions = {}): ZiweiJsonDocument {
  assertPlainOptions(options)

  const chart = generateChart(info)
  if (!Array.isArray(chart.palaces) || chart.palaces.length !== 12) {
    throw new Error('iztro result must contain 12 palaces')
  }

  const palaces = chart.palaces as PalaceRecord[]
  assertPalaceIndexes(palaces)
  const decorations = buildWenmoPalaceDecorations(chart)
  const decorationByIndex = new Map(decorations.map((item) => [item.palaceIndex, item]))
  const rawDates = serializeRawDates(chart.rawDates)
  const birthYearStem = rawDates.chineseDate.yearly[0]

  const document: ZiweiJsonDocument = {
    schemaVersion: ZIWEI_JSON_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    engine: {
      name: 'Wenmo Ziwei JSON',
      package: 'iztro',
      version: requiredString(iztroPackageJson.version, 'iztro package version'),
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
      calendar: 'solar',
      year: info.year,
      month: info.month,
      day: info.day,
      hour: info.hour,
      minute: info.minute ?? 0,
      gender: info.gender,
      fixLeap: info.fixLeap ?? true,
      location: info.location?.trim(),
      longitude: info.longitude,
      shichen: hourToShichen(info.hour, info.minute ?? 0),
      timeIndex: hourToTimeIndex(info.hour, info.minute ?? 0),
      locationUsedForCalculation: false,
      longitudeUsedForCalculation: false,
    },
    natal: {
      gender: requiredString(chart.gender, 'chart.gender'),
      solarDate: requiredString(chart.solarDate, 'chart.solarDate'),
      lunarDate: requiredString(chart.lunarDate, 'chart.lunarDate'),
      chineseDate: requiredString(chart.chineseDate, 'chart.chineseDate'),
      rawDates,
      time: requiredString(chart.time, 'chart.time'),
      timeRange: requiredString(chart.timeRange, 'chart.timeRange'),
      sign: requiredString(chart.sign, 'chart.sign'),
      zodiac: requiredString(chart.zodiac, 'chart.zodiac'),
      fiveElementsClass: requiredString(chart.fiveElementsClass, 'chart.fiveElementsClass'),
      bodyPalaceBranch: requiredEarthlyBranch(chart.earthlyBranchOfBodyPalace, 'chart.earthlyBranchOfBodyPalace'),
      soulPalaceBranch: requiredEarthlyBranch(chart.earthlyBranchOfSoulPalace, 'chart.earthlyBranchOfSoulPalace'),
      bodyMaster: requiredString(chart.body, 'chart.body'),
      soulMaster: requiredString(chart.soul, 'chart.soul'),
      birthYearSihua: getStemSihuaLabels(birthYearStem),
    },
    palaces: palaces.map((palace) => {
      const index = requiredPalaceIndex(palace.index, 'palace.index')
      const decoration = decorationByIndex.get(index)
      if (!decoration) {
        throw new Error(`missing Wenmo decoration for palace index ${index}`)
      }

      return serializePalace(palace, decoration, info.year)
    }),
    horoscope: options.targetDate !== undefined
      ? serializeHoroscope(chart, options.targetDate, normalizeTargetTime(options))
      : undefined,
  }

  return pruneUndefinedProperties(document)
}
