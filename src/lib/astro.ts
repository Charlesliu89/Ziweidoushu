import { astro } from 'iztro'

astro.config({
  yearDivide: 'normal',
  horoscopeDivide: 'normal',
  ageDivide: 'normal',
  dayDivide: 'forward',
  algorithm: 'zhongzhou',
})

export type Gender = 'male' | 'female'
export type FunctionalAstrolabe = ReturnType<typeof astro.bySolar>

export interface BirthInfo {
  year: number
  month: number
  day: number
  hour: number
  minute?: number
  gender: Gender
  fixLeap?: boolean
  location?: string
  longitude?: number
}

const birthInfoKeys = new Set([
  'year',
  'month',
  'day',
  'hour',
  'minute',
  'gender',
  'fixLeap',
  'location',
  'longitude',
])

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function assertPlainBirthInfo(value: BirthInfo): void {
  if (!isPlainRecord(value)) {
    throw new RangeError('birth info must be an object')
  }

  for (const key of Object.keys(value)) {
    if (!birthInfoKeys.has(key)) {
      throw new RangeError(`unsupported birth info field: ${key}`)
    }
  }
}

function assertIntegerInRange(value: number, name: string, min: number, max: number): void {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(`${name} must be an integer between ${min} and ${max}`)
  }
}

function normalizedMinute(value: number | undefined): number {
  return value === undefined ? 0 : value
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

function formatSolarDate(year: number, month: number, day: number): string {
  const paddedYear = String(year).padStart(4, '0')
  const paddedMonth = String(month).padStart(2, '0')
  const paddedDay = String(day).padStart(2, '0')
  return `${paddedYear}-${paddedMonth}-${paddedDay}`
}

export function validateBirthInfo(info: BirthInfo): void {
  assertPlainBirthInfo(info)

  assertIntegerInRange(info.year, 'year', 1, 9999)
  assertIntegerInRange(info.month, 'month', 1, 12)
  assertIntegerInRange(info.day, 'day', 1, 31)

  if (!isValidSolarDate(info.year, info.month, info.day)) {
    throw new RangeError('birth date must be a valid solar calendar date')
  }

  hourToTimeIndex(info.hour, normalizedMinute(info.minute))

  if (info.gender !== 'male' && info.gender !== 'female') {
    throw new RangeError('gender must be male or female')
  }

  if (info.fixLeap !== undefined && typeof info.fixLeap !== 'boolean') {
    throw new RangeError('fixLeap must be a boolean when provided')
  }

  if (
    info.location !== undefined
    && (typeof info.location !== 'string' || info.location.trim().length === 0)
  ) {
    throw new RangeError('location must be a non-empty string when provided')
  }

  if (
    info.longitude !== undefined
    && (!Number.isFinite(info.longitude) || info.longitude < -180 || info.longitude > 180)
  ) {
    throw new RangeError('longitude must be between -180 and 180')
  }
}

export function hourToTimeIndex(hour: number, minute = 0): number {
  assertIntegerInRange(hour, 'hour', 0, 23)
  assertIntegerInRange(minute, 'minute', 0, 59)

  if (hour === 23) return 12
  if (hour === 0) return 0
  return Math.floor((hour + 1) / 2)
}

export function generateChart(info: BirthInfo): FunctionalAstrolabe {
  validateBirthInfo(info)

  const { year, month, day, hour, gender, fixLeap = true } = info
  const minute = normalizedMinute(info.minute)
  const dateStr = formatSolarDate(year, month, day)
  const timeIndex = hourToTimeIndex(hour, minute)
  const genderName = gender === 'male' ? '男' : '女'

  return astro.bySolar(dateStr, timeIndex, genderName, fixLeap, 'zh-CN')
}

const SHICHEN_NAMES = [
  '子',
  '丑',
  '寅',
  '卯',
  '辰',
  '巳',
  '午',
  '未',
  '申',
  '酉',
  '戌',
  '亥',
] as const

export function hourToShichen(hour: number, minute = 0): string {
  const index = hourToTimeIndex(hour, minute)
  const normalizedIndex = index === 12 ? 0 : index
  return `${SHICHEN_NAMES[normalizedIndex]}时`
}
