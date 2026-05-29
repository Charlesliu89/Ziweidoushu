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
  targetPalace: string
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
  mutagenStars: WenmoMutagenStar[]
}

export interface WenmoHoroscopeSummary {
  decadal: WenmoScopeSummary
  yearly: WenmoScopeSummary
  monthly: WenmoScopeSummary
  daily: WenmoScopeSummary
  hourly: WenmoScopeSummary
}

export interface WenmoMutagenStar {
  sihua: Sihua
  starName: string
}

interface StarLike {
  name: unknown
  mutagen?: unknown
}

interface PalaceLike {
  index: unknown
  name: unknown
  isOriginalPalace: unknown
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

const EARTHLY_BRANCHES = new Set(['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'])
const WENMO_PALACE_TITLES = new Set([
  '命宫',
  '兄弟宫',
  '夫妻宫',
  '子女宫',
  '财帛宫',
  '疾厄宫',
  '迁移宫',
  '交友宫',
  '官禄宫',
  '田宅宫',
  '福德宫',
  '父母宫',
])

function requiredText(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} is missing from iztro result`)
  }
  return value
}

function requiredHeavenlyStem(value: unknown, label: string): string {
  const stem = requiredText(value, label)
  requireSihuaByStem(stem)
  return stem
}

function requiredEarthlyBranch(value: unknown, label: string): string {
  const branch = requiredText(value, label)
  if (!EARTHLY_BRANCHES.has(branch)) {
    throw new Error(`${label} must be a valid earthly branch`)
  }
  return branch
}

function requiredBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${label} is missing from iztro result`)
  }
  return value
}

function requiredPalaceIndex(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 11) {
    throw new Error(`${label} must be an integer between 0 and 11`)
  }
  return value
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

function requireSihuaByStem(stem: string): Record<Sihua, string> {
  const table = getSihuaByStem(stem)
  if (!table) {
    throw new Error(`unsupported heavenly stem from iztro result: ${stem}`)
  }
  return table
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
  return [
    ...requiredArray(palace.majorStars, 'palace.majorStars'),
    ...requiredArray(palace.minorStars, 'palace.minorStars'),
  ]
}

function collectKnownStarNames(chart: FunctionalAstrolabe): Set<string> {
  const starNames = new Set<string>()

  for (const palace of requiredArray(chart.palaces as PalaceLike[] | undefined, 'chart.palaces')) {
    for (const star of allFunctionalStars(palace)) {
      starNames.add(requiredText(star.name, 'star.name'))
    }
  }

  return starNames
}

function hasStar(palace: PalaceLike, starName: string): boolean {
  return allFunctionalStars(palace).some((star) => requiredText(star.name, 'star.name') === starName)
}

function findStarPalace(chart: FunctionalAstrolabe, starName: string): PalaceLike {
  const target = (chart.palaces as PalaceLike[]).find((candidate) => hasStar(candidate, starName))
  if (!target) {
    throw new Error(`sihua target star is missing from palaces: ${starName}`)
  }
  return target
}

function oppositePalace(chart: FunctionalAstrolabe, palace: PalaceLike): PalaceLike | undefined {
  const index = requiredPalaceIndex(palace.index, 'palace.index')
  return chart.palaces[(index + 6) % 12] as PalaceLike | undefined
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

export function validateWenmoPalaceTitle(palaceName: string, label = 'palace.name'): string {
  const title = getWenmoPalaceTitle(palaceName)
  if (!WENMO_PALACE_TITLES.has(title)) {
    throw new Error(`${label} must be one of the 12 Wenmo palace names`)
  }
  return title
}

export function assertWenmoPalaceTitleSet(titles: string[], label: string): void {
  if (titles.length !== 12) {
    throw new Error(`${label} must contain 12 palace names`)
  }

  for (const title of titles) {
    if (!WENMO_PALACE_TITLES.has(title)) {
      throw new Error(`${label} contains unsupported palace name: ${title}`)
    }
  }

  if (new Set(titles).size !== 12) {
    throw new Error(`${label} must contain 12 unique palace names`)
  }
}

export function getWenmoPalaceShortName(palaceName: string): string {
  return palaceName === '仆役' ? '交友' : palaceName
}

export function getStemSihuaLabels(stem: string): string[] {
  const table = requireSihuaByStem(stem)
  return SIHUA_ORDER.map((sihua) => `${table[sihua]}化${sihua}`)
}

export function buildWenmoPalaceDecorations(chart: FunctionalAstrolabe): WenmoPalaceDecoration[] {
  if (!Array.isArray(chart.palaces) || chart.palaces.length !== 12) {
    throw new Error('iztro result must contain 12 palaces')
  }

  const decorations = chart.palaces.map((rawPalace) => {
    const palace = rawPalace as PalaceLike
    const palaceIndex = requiredPalaceIndex(palace.index, 'palace.index')
    const palaceName = requiredText(palace.name, 'palace.name')
    const palaceTitle = validateWenmoPalaceTitle(palaceName, `palace.${palaceName}.name`)
    const ownSihua = requireSihuaByStem(requiredHeavenlyStem(
      palace.heavenlyStem,
      `palace.${palaceName}.heavenlyStem`,
    ))
    const opposite = oppositePalace(chart, palace)
    if (!opposite) {
      throw new Error(`opposite palace is missing for palace index ${palaceIndex}`)
    }

    const oppositeName = requiredText(opposite.name, 'oppositePalace.name')
    const oppositeTitle = validateWenmoPalaceTitle(oppositeName, `palace.${oppositeName}.name`)
    const oppositeSihua = requireSihuaByStem(
      requiredHeavenlyStem(opposite.heavenlyStem, `palace.${oppositeName}.heavenlyStem`),
    )
    const starMarks: Record<string, WenmoStarMark[]> = {}

    for (const star of allFunctionalStars(palace)) {
      const starName = requiredText(star.name, 'star.name')
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
              sourcePalace: palaceTitle,
            })
          }
        }
      }

      for (const sihua of SIHUA_ORDER) {
        if (oppositeSihua[sihua] === starName) {
          pushStarMark(starMarks, starName, {
            kind: 'incoming',
            sihua,
            label: `↑${sihua}`,
            sourcePalace: oppositeTitle,
          })
        }
      }
    }

    const outgoing: WenmoOutgoingTransform[] = ownSihua
      ? SIHUA_ORDER.map((sihua) => {
          const starName = ownSihua[sihua]
          const target = findStarPalace(chart, starName)
          return {
            sihua,
            starName,
            targetPalace: validateWenmoPalaceTitle(requiredText(target.name, 'targetPalace.name'), 'targetPalace.name'),
          }
        })
      : []

    return {
      palaceIndex,
      displayName: palaceTitle,
      isOriginalPalace: requiredBoolean(palace.isOriginalPalace, `palace.${palaceName}.isOriginalPalace`),
      starMarks,
      outgoing,
    }
  })

  assertWenmoPalaceTitleSet(decorations.map((item) => item.displayName), 'palaces')
  return decorations
}

export function summarizeWenmoHoroscope(
  chart: FunctionalAstrolabe,
  date: Date | string,
  timeIndex?: number,
): WenmoHoroscopeSummary {
  const horoscope = chart.horoscope(date, timeIndex)
  const knownStarNames = collectKnownStarNames(chart)

  const summarize = (scope: HoroscopeScopeLike): WenmoScopeSummary => {
    const name = requiredText(scope.name, 'horoscope.scope.name')
    const palaceNames = requiredArrayLength(scope.palaceNames, `horoscope.${name}.palaceNames`, 12)
    const mutagenStars = requiredArrayLength(scope.mutagen, `horoscope.${name}.mutagen`, 4).map((item, index) => {
      const starName = requiredText(item, `horoscope.${name}.mutagen[${index}]`)
      if (!knownStarNames.has(starName)) {
        throw new Error(`horoscope.${name}.mutagen[${index}] references an unknown star: ${starName}`)
      }

      return {
        sihua: SIHUA_ORDER[index],
        starName,
      }
    })

    const normalizedPalaceNames = palaceNames.map((item) => (
      validateWenmoPalaceTitle(requiredText(item, `horoscope.${name}.palaceNames`), `horoscope.${name}.palaceNames`)
    ))
    assertWenmoPalaceTitleSet(normalizedPalaceNames, `horoscope.${name}.palaceNames`)

    return {
      index: requiredPalaceIndex(scope.index, `horoscope.${name}.index`),
      name,
      heavenlyStem: requiredHeavenlyStem(scope.heavenlyStem, `horoscope.${name}.heavenlyStem`),
      earthlyBranch: requiredEarthlyBranch(scope.earthlyBranch, `horoscope.${name}.earthlyBranch`),
      palaceName: normalizedPalaceNames[0],
      palaceNames: normalizedPalaceNames,
      mutagenStars,
    }
  }

  return {
    decadal: summarize(horoscope.decadal as HoroscopeScopeLike),
    yearly: summarize(horoscope.yearly as HoroscopeScopeLike),
    monthly: summarize(horoscope.monthly as HoroscopeScopeLike),
    daily: summarize(horoscope.daily as HoroscopeScopeLike),
    hourly: summarize(horoscope.hourly as HoroscopeScopeLike),
  }
}
