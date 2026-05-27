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
  isLeapMonth?: boolean
  fixLeap?: boolean
  location?: string
  longitude?: number
}

export function hourToTimeIndex(hour: number, minute = 0): number {
  const normalizedHour = Math.trunc(hour)
  const normalizedMinute = Math.trunc(minute)

  if (normalizedHour < 0 || normalizedHour > 23) {
    throw new RangeError('hour must be between 0 and 23')
  }

  if (normalizedMinute < 0 || normalizedMinute > 59) {
    throw new RangeError('minute must be between 0 and 59')
  }

  if (normalizedHour === 23) return 12
  if (normalizedHour === 0) return 0
  return Math.floor((normalizedHour + 1) / 2)
}

export function generateChart(info: BirthInfo): FunctionalAstrolabe {
  const { year, month, day, hour, minute = 0, gender, fixLeap = true } = info
  const dateStr = `${year}-${month}-${day}`
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
