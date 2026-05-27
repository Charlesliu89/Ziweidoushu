import type { FunctionalAstrolabe } from './astro.js'

export type Sihua = '禄' | '权' | '科' | '忌'
export type WenmoTransformKind = 'birth' | 'self' | 'incoming'

export interface WenmoStarMark {
  kind: WenmoTransformKind
  sihua: Sihua
  label: string
  sourcePalace?: string
}

export interface WenmoOutgoingTransform {
  sihua: Sihua
  starName: string
  targetPalace?: string
}

export interface WenmoPalaceDecoration {
  palaceIndex: number
  displayName: string
  isOriginalPalace: boolean
  starMarks: Record<string, WenmoStarMark[]>
  outgoing: WenmoOutgoingTransform[]
}

export interface WenmoScopeSummary {
  index: number
  name: string
  heavenlyStem: string
  earthlyBranch: string
  palaceName: string
  palaceNames: string[]
  mutagens: string[]
}

export interface WenmoHoroscopeSummary {
  decadal: WenmoScopeSummary
  yearly: WenmoScopeSummary
  monthly: WenmoScopeSummary
}

interface StarLike {
  name: unknown
  mutagen?: unknown
}

interface PalaceLike {
  index: number
  name: unknown
  isOriginalPalace: boolean
  heavenlyStem: unknown
  majorStars: StarLike[]
  minorStars: StarLike[]
}

interface HoroscopeScopeLike {
  index: number
  name: unknown
  heavenlyStem: unknown
  earthlyBranch: unknown
  palaceNames: unknown[]
  mutagen: unknown[]
}

const SIHUA_ORDER: Sihua[] = ['禄', '权', '科', '忌']

const SIHUA_BY_STEM: Record<string, Record<Sihua, string>> = {
  甲: { 禄: '廉贞', 权: '破军', 科: '武曲', 忌: '太阳' },
  乙: { 禄: '天机', 权: '天梁', 科: '紫微', 忌: '太阴' },
  丙: { 禄: '天同', 权: '天机', 科: '文昌', 忌: '廉贞' },
  丁: { 禄: '太阴', 权: '天同', 科: '天机', 忌: '巨门' },
  戊: { 禄: '贪狼', 权: '太阴', 科: '右弼', 忌: '天机' },
  己: { 禄: '武曲', 权: '贪狼', 科: '天梁', 忌: '文曲' },
  庚: { 禄: '太阳', 权: '武曲', 科: '太阴', 忌: '天同' },
  辛: { 禄: '巨门', 权: '太阳', 科: '文曲', 忌: '文昌' },
  壬: { 禄: '天梁', 权: '紫微', 科: '左辅', 忌: '武曲' },
  癸: { 禄: '破军', 权: '巨门', 科: '太阴', 忌: '贪狼' },
}

export function asSihua(value: unknown): Sihua | undefined {
  if (value === '禄' || value === '权' || value === '科' || value === '忌') {
    return value
  }

  if (typeof value === 'string') {
    const last = value.at(-1)
    if (last === '禄' || last === '权' || last === '科' || last === '忌') {
      return last
    }
  }

  return undefined
}

function allFunctionalStars(palace: PalaceLike): StarLike[] {
  return [...palace.majorStars, ...palace.minorStars]
}

function hasStar(palace: PalaceLike, starName: string): boolean {
  return allFunctionalStars(palace).some((star) => String(star.name) === starName)
}

function oppositePalace(chart: FunctionalAstrolabe, palace: PalaceLike): PalaceLike | undefined {
  return chart.palaces[(palace.index + 6) % 12] as PalaceLike | undefined
}

function pushStarMark(
  starMarks: Record<string, WenmoStarMark[]>,
  starName: string,
  mark: WenmoStarMark,
) {
  if (!starMarks[starName]) starMarks[starName] = []
  starMarks[starName].push(mark)
}

export function toFullSihuaName(value: unknown): string | undefined {
  const sihua = asSihua(value)
  return sihua ? `化${sihua}` : undefined
}

export function getSihuaByStem(stem: string): Record<Sihua, string> | undefined {
  return SIHUA_BY_STEM[stem]
}

export function getWenmoPalaceTitle(palaceName: string): string {
  const normalized = palaceName === '仆役' ? '交友' : palaceName
  return normalized.endsWith('宫') ? normalized : `${normalized}宫`
}

export function getWenmoPalaceShortName(palaceName: string): string {
  return palaceName === '仆役' ? '交友' : palaceName
}

export function getStemSihuaLabels(stem: string): string[] {
  const table = getSihuaByStem(stem)
  if (!table) return []
  return SIHUA_ORDER.map((sihua) => `${table[sihua]}化${sihua}`)
}

export function buildWenmoPalaceDecorations(chart: FunctionalAstrolabe): WenmoPalaceDecoration[] {
  return chart.palaces.map((rawPalace) => {
    const palace = rawPalace as PalaceLike
    const ownSihua = getSihuaByStem(String(palace.heavenlyStem))
    const opposite = oppositePalace(chart, palace)
    const oppositeSihua = opposite ? getSihuaByStem(String(opposite.heavenlyStem)) : undefined
    const starMarks: Record<string, WenmoStarMark[]> = {}

    for (const star of allFunctionalStars(palace)) {
      const starName = String(star.name)
      const birthSihua = asSihua(star.mutagen)
      if (birthSihua) {
        pushStarMark(starMarks, starName, {
          kind: 'birth',
          sihua: birthSihua,
          label: `生年${birthSihua}`,
        })
      }

      if (ownSihua) {
        for (const sihua of SIHUA_ORDER) {
          if (ownSihua[sihua] === starName) {
            pushStarMark(starMarks, starName, {
              kind: 'self',
              sihua,
              label: `↓${sihua}`,
              sourcePalace: getWenmoPalaceTitle(String(palace.name)),
            })
          }
        }
      }

      if (opposite && oppositeSihua) {
        for (const sihua of SIHUA_ORDER) {
          if (oppositeSihua[sihua] === starName) {
            pushStarMark(starMarks, starName, {
              kind: 'incoming',
              sihua,
              label: `↑${sihua}`,
              sourcePalace: getWenmoPalaceTitle(String(opposite.name)),
            })
          }
        }
      }
    }

    const outgoing: WenmoOutgoingTransform[] = ownSihua
      ? SIHUA_ORDER.map((sihua) => {
          const starName = ownSihua[sihua]
          const target = (chart.palaces as PalaceLike[]).find((candidate) => hasStar(candidate, starName))
          return {
            sihua,
            starName,
            targetPalace: target ? getWenmoPalaceTitle(String(target.name)) : undefined,
          }
        })
      : []

    return {
      palaceIndex: palace.index,
      displayName: getWenmoPalaceTitle(String(palace.name)),
      isOriginalPalace: palace.isOriginalPalace,
      starMarks,
      outgoing,
    }
  })
}

export function summarizeWenmoHoroscope(chart: FunctionalAstrolabe, date: Date | string): WenmoHoroscopeSummary {
  const horoscope = chart.horoscope(date)

  const summarize = (scope: HoroscopeScopeLike): WenmoScopeSummary => ({
    index: scope.index,
    name: String(scope.name),
    heavenlyStem: String(scope.heavenlyStem),
    earthlyBranch: String(scope.earthlyBranch),
    palaceName: getWenmoPalaceTitle(String(scope.palaceNames[0] ?? '')),
    palaceNames: scope.palaceNames.map((name) => getWenmoPalaceTitle(String(name))),
    mutagens: scope.mutagen.map((item) => String(item)),
  })

  return {
    decadal: summarize(horoscope.decadal as HoroscopeScopeLike),
    yearly: summarize(horoscope.yearly as HoroscopeScopeLike),
    monthly: summarize(horoscope.monthly as HoroscopeScopeLike),
  }
}
