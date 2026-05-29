import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, unlinkSync } from 'node:fs'
import { createRequire } from 'node:module'
import {
  ZIWEI_JSON_SCHEMA_VERSION,
  buildZiweiJson,
  getStemSihuaLabels,
  summarizeWenmoHoroscope,
} from '../dist/index.js'

const localRequire = createRequire(import.meta.url)
const iztroPackageVersion = localRequire('iztro/package.json').version

const chart = buildZiweiJson(
  {
    year: 2000,
    month: 1,
    day: 1,
    hour: 0,
    minute: 0,
    gender: 'male',
  },
  { targetDate: '2026-01-01' },
)

const expectations = new Map([
  ['福德宫', [{ star: '左辅', labels: ['↑科'] }]],
  [
    '官禄宫',
    [
      { star: '太阴', labels: ['↓权'] },
      { star: '文曲', labels: ['生年忌'] },
    ],
  ],
  ['交友宫', [{ star: '贪狼', labels: ['生年权', '↓权'] }]],
  [
    '财帛宫',
    [
      { star: '天同', labels: ['↑禄'] },
      { star: '天梁', labels: ['生年科', '↓禄'] },
    ],
  ],
  ['子女宫', [{ star: '武曲', labels: ['生年禄'] }]],
  ['夫妻宫', [{ star: '太阳', labels: ['↓忌'] }]],
  ['命宫', [{ star: '天机', labels: ['↓权'] }]],
])

const smokeCases = [
  {
    label: 'female modern noon',
    birthInfo: { year: 1990, month: 6, day: 15, hour: 12, minute: 30, gender: 'female' },
    targetDate: '2026-06-15',
  },
  {
    label: 'leap day late zi',
    birthInfo: { year: 2024, month: 2, day: 29, hour: 23, minute: 30, gender: 'male' },
    targetDate: '2026-02-28',
  },
  {
    label: 'early zi female',
    birthInfo: { year: 1984, month: 2, day: 2, hour: 0, minute: 0, gender: 'female' },
    targetDate: '2025-12-31',
  },
]

const expectedPalaceTitles = [
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
]
const expectedPalaceTitleSet = new Set(expectedPalaceTitles)
const fakePalaceNames = [...expectedPalaceTitles]
const fakeMutagens = ['禄', '权', '科', '忌']
const fakeScopeMutagenStars = ['廉贞', '破军', '武曲', '太阳']
const heavenlyStems = new Set(['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'])
const earthlyBranches = new Set(['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'])
const starTypes = new Set(['major', 'soft', 'tough', 'adjective', 'flower', 'helper', 'lucun', 'tianma'])
const starScopes = new Set(['origin', 'decadal', 'yearly', 'monthly', 'daily', 'hourly'])
const starBrightnesses = new Set(['庙', '旺', '得', '利', '平', '陷', '不'])
const starMutagens = new Set(fakeMutagens)
const wenmoMarkKinds = new Set(['birth', 'self', 'incoming'])

let failures = 0

function expectThrows(label, action) {
  try {
    action()
    failures += 1
    console.error(`expected ${label} to throw`)
  } catch (error) {
    if (!(error instanceof Error)) {
      failures += 1
      console.error(`expected ${label} to throw an Error`)
    }
  }
}

function expectCliFailure(label, args, expectedMessage) {
  const result = spawnSync(process.execPath, ['dist/cli.js', ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
  })

  if (result.status === 0) {
    failures += 1
    console.error(`expected CLI ${label} to fail`)
    return
  }

  if (expectedMessage && !result.stderr.includes(expectedMessage)) {
    failures += 1
    console.error(`CLI ${label} failed with unexpected stderr: ${result.stderr.trim()}`)
  }
}

function expectCliSuccess(label, args, outPath, expected = {}) {
  try {
    const result = spawnSync(process.execPath, ['dist/cli.js', ...args, '--out', outPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
    })

    if (result.status !== 0) {
      failures += 1
      console.error(`expected CLI ${label} to succeed: ${result.stderr.trim()}`)
      return
    }

    const content = readFileSync(outPath, 'utf8')
    const document = JSON.parse(content)
    validateCommonChart(`CLI ${label}`, document)

    if (document.horoscope?.targetDate !== '2026-01-01') {
      failures += 1
      console.error(`CLI ${label}: unexpected targetDate ${document.horoscope?.targetDate}`)
    }

    if ('fixLeap' in expected && document.input.fixLeap !== expected.fixLeap) {
      failures += 1
      console.error(`CLI ${label}: expected fixLeap ${expected.fixLeap}, got ${document.input.fixLeap}`)
    }

    if ('targetHour' in expected && document.horoscope?.targetHour !== expected.targetHour) {
      failures += 1
      console.error(`CLI ${label}: expected targetHour ${expected.targetHour}, got ${document.horoscope?.targetHour}`)
    }

    if ('targetMinute' in expected && document.horoscope?.targetMinute !== expected.targetMinute) {
      failures += 1
      console.error(`CLI ${label}: expected targetMinute ${expected.targetMinute}, got ${document.horoscope?.targetMinute}`)
    }

    if ('targetTimeIndex' in expected && document.horoscope?.targetTimeIndex !== expected.targetTimeIndex) {
      failures += 1
      console.error(
        `CLI ${label}: expected targetTimeIndex ${expected.targetTimeIndex}, `
        + `got ${document.horoscope?.targetTimeIndex}`,
      )
    }
  } finally {
    if (existsSync(outPath)) {
      unlinkSync(outPath)
    }
  }
}

function makeFakeScope(overrides = {}) {
  return {
    index: 0,
    name: 'scope',
    heavenlyStem: '甲',
    earthlyBranch: '子',
    palaceNames: fakePalaceNames,
    mutagen: fakeScopeMutagenStars,
    ...overrides,
  }
}

function makeFakeSummaryChart(overrides = {}) {
  const scope = (name) => makeFakeScope({ name, ...overrides[name] })
  return {
    palaces: fakePalaceNames.map((name, index) => ({
      index,
      name,
      majorStars: index < fakeScopeMutagenStars.length
        ? [{ name: fakeScopeMutagenStars[index] }]
        : [],
      minorStars: [],
    })),
    horoscope() {
      return {
        decadal: scope('decadal'),
        yearly: scope('yearly'),
        monthly: scope('monthly'),
        daily: scope('daily'),
        hourly: scope('hourly'),
      }
    },
  }
}

function hasUndefinedValue(value) {
  if (value === undefined) return true
  if (Array.isArray(value)) return value.some((item) => hasUndefinedValue(item))
  if (value && typeof value === 'object') {
    return Object.values(value).some((item) => hasUndefinedValue(item))
  }
  return false
}

function hasExpectedPalaceTitleSet(titles) {
  return (
    Array.isArray(titles)
    && titles.length === 12
    && new Set(titles).size === 12
    && titles.every((title) => expectedPalaceTitleSet.has(title))
  )
}

function validateOptionalEnum(label, context, field, value, allowed) {
  if (value === undefined) return
  if (typeof value !== 'string' || !allowed.has(value)) {
    failures += 1
    console.error(`${label}: ${context} has invalid ${field} ${value}`)
  }
}

function validateStarJson(label, context, star) {
  if (!star || typeof star !== 'object' || Array.isArray(star)) {
    failures += 1
    console.error(`${label}: ${context} is not a star object`)
    return
  }

  if (typeof star.name !== 'string' || star.name.length === 0) {
    failures += 1
    console.error(`${label}: ${context} has missing star name`)
  }

  validateOptionalEnum(label, context, 'star type', star.type, starTypes)
  validateOptionalEnum(label, context, 'star scope', star.scope, starScopes)
  validateOptionalEnum(label, context, 'brightness', star.brightness, starBrightnesses)
  validateOptionalEnum(label, context, 'mutagen', star.mutagen, starMutagens)

  if (star.mutagen && star.mutagenLabel !== `化${star.mutagen}`) {
    failures += 1
    console.error(`${label}: ${context} has invalid mutagenLabel`)
  }

  if (!star.mutagen && star.mutagenLabel !== undefined) {
    failures += 1
    console.error(`${label}: ${context} has mutagenLabel without mutagen`)
  }

  if (!Array.isArray(star.marks)) {
    failures += 1
    console.error(`${label}: ${context} should include a marks array`)
    return
  }

  for (const mark of star.marks) {
    if (
      !mark
      || typeof mark !== 'object'
      || !wenmoMarkKinds.has(mark.kind)
      || !starMutagens.has(mark.sihua)
      || typeof mark.label !== 'string'
      || mark.label.length === 0
    ) {
      failures += 1
      console.error(`${label}: ${context} has incomplete Wenmo mark`)
    }
  }
}

function validateMutagenStars(label, context, mutagenStars) {
  if (!Array.isArray(mutagenStars) || mutagenStars.length !== 4) {
    failures += 1
    console.error(`${label}: ${context} should include 4 mutagenStars`)
    return
  }

  mutagenStars.forEach((item, index) => {
    if (
      !item
      || typeof item !== 'object'
      || item.sihua !== fakeMutagens[index]
      || typeof item.starName !== 'string'
      || item.starName.length === 0
    ) {
      failures += 1
      console.error(`${label}: ${context}[${index}] has invalid mutagen star data`)
      return
    }
  })
}

function collectKnownStarNamesFromDocument(item) {
  const starNames = new Set()
  for (const palace of item.palaces ?? []) {
    for (const star of [
      ...(palace.majorStars ?? []),
      ...(palace.minorStars ?? []),
      ...(palace.adjectiveStars ?? []),
    ]) {
      if (typeof star.name === 'string' && star.name.length > 0) {
        starNames.add(star.name)
      }
    }
  }
  return starNames
}

function validateKnownMutagenStars(label, context, mutagenStars, knownStarNames) {
  for (const item of mutagenStars ?? []) {
    if (typeof item?.starName === 'string' && !knownStarNames.has(item.starName)) {
      failures += 1
      console.error(`${label}: ${context} references unknown star ${item.starName}`)
    }
  }
}

function expectedTimeIndex(hour) {
  if (hour === 23) return 12
  if (hour === 0) return 0
  return Math.floor((hour + 1) / 2)
}

function validateCommonChart(label, item) {
  const knownStarNames = collectKnownStarNamesFromDocument(item)

  if (item.schemaVersion !== ZIWEI_JSON_SCHEMA_VERSION) {
    failures += 1
    console.error(`${label}: unexpected schemaVersion ${item.schemaVersion}`)
  }

  if (Number.isNaN(Date.parse(item.generatedAt))) {
    failures += 1
    console.error(`${label}: generatedAt is not an ISO date`)
  }

  if (
    item.engine?.package !== 'iztro'
    || item.engine?.version !== iztroPackageVersion
    || item.engine?.config?.algorithm !== 'zhongzhou'
  ) {
    failures += 1
    console.error(`${label}: unexpected engine metadata`)
  }

  if (item.palaces.length !== 12) {
    failures += 1
    console.error(`${label}: expected 12 palaces, got ${item.palaces.length}`)
  }

  const indexes = new Set(item.palaces.map((palace) => palace.index))
  for (let index = 0; index < 12; index += 1) {
    if (!indexes.has(index)) {
      failures += 1
      console.error(`${label}: missing palace index ${index}`)
    }
  }

  if (!hasExpectedPalaceTitleSet(item.palaces.map((palace) => palace.displayName))) {
    failures += 1
    console.error(`${label}: palaces should contain the 12 unique Wenmo palace names`)
  }

  if (JSON.stringify(item).includes('"undefined"')) {
    failures += 1
    console.error(`${label}: chart contains stringified undefined`)
  }

  if (hasUndefinedValue(item)) {
    failures += 1
    console.error(`${label}: chart object contains undefined values`)
  }

  if (!item.input.shichen) {
    failures += 1
    console.error(`${label}: missing input shichen`)
  }

  if (item.input.calendar !== 'solar') {
    failures += 1
    console.error(`${label}: input calendar should explicitly be solar`)
  }

  if (
    !Number.isInteger(item.input.timeIndex)
    || item.input.timeIndex < 0
    || item.input.timeIndex > 12
  ) {
    failures += 1
    console.error(`${label}: input should record the effective birth time index`)
  }

  if (
    item.input.locationUsedForCalculation !== false
    || item.input.longitudeUsedForCalculation !== false
  ) {
    failures += 1
    console.error(`${label}: location and longitude should be marked as stored-only inputs`)
  }

  if (item.input.fixLeap !== true && item.input.fixLeap !== false) {
    failures += 1
    console.error(`${label}: input.fixLeap should record the effective boolean value`)
  }

  if (item.natal.birthYearSihua.length !== 4) {
    failures += 1
    console.error(`${label}: expected 4 birth year sihua labels`)
  }

  const rawLunarDate = item.natal.rawDates?.lunarDate
  const rawChineseDate = item.natal.rawDates?.chineseDate
  if (
    !Number.isInteger(rawLunarDate?.lunarYear)
    || !Number.isInteger(rawLunarDate?.lunarMonth)
    || !Number.isInteger(rawLunarDate?.lunarDay)
    || typeof rawLunarDate?.isLeap !== 'boolean'
  ) {
    failures += 1
    console.error(`${label}: raw lunar date should be structurally validated`)
  }

  for (const field of ['yearly', 'monthly', 'daily', 'hourly']) {
    const pair = rawChineseDate?.[field]
    if (
      !Array.isArray(pair)
      || pair.length !== 2
      || !heavenlyStems.has(pair[0])
      || !earthlyBranches.has(pair[1])
    ) {
      failures += 1
      console.error(`${label}: raw chinese date ${field} should be a valid gan-zhi pair`)
    }
  }

  if (
    Array.isArray(rawChineseDate?.yearly)
    && JSON.stringify(item.natal.birthYearSihua) !== JSON.stringify(getStemSihuaLabels(rawChineseDate.yearly[0]))
  ) {
    failures += 1
    console.error(`${label}: birth year sihua should be derived from raw yearly heavenly stem`)
  }

  if (item.horoscope) {
    if (
      typeof item.horoscope.targetHour !== 'number'
      || typeof item.horoscope.targetMinute !== 'number'
      || typeof item.horoscope.targetTimeIndex !== 'number'
      || !item.horoscope.targetShichen
    ) {
      failures += 1
      console.error(`${label}: horoscope should record the effective target time`)
    }
  }

  for (const palace of item.palaces) {
    if (typeof palace.isBodyPalace !== 'boolean' || typeof palace.isOriginalPalace !== 'boolean') {
      failures += 1
      console.error(`${label}: ${palace.displayName} is missing boolean palace flags`)
    }

    for (const shensha of ['changsheng12', 'boshi12', 'jiangqian12', 'suiqian12']) {
      if (typeof palace.shensha?.[shensha] !== 'string' || palace.shensha[shensha].length === 0) {
        failures += 1
        console.error(`${label}: ${palace.displayName} is missing shensha.${shensha}`)
      }
    }

    if (!heavenlyStems.has(palace.heavenlyStem) || !earthlyBranches.has(palace.earthlyBranch)) {
      failures += 1
      console.error(`${label}: ${palace.displayName} should have a valid palace gan-zhi`)
    }

    if (
      !heavenlyStems.has(palace.decadal.heavenlyStem)
      || !earthlyBranches.has(palace.decadal.earthlyBranch)
    ) {
      failures += 1
      console.error(`${label}: ${palace.displayName} should have a valid decadal gan-zhi`)
    }

    for (const star of [...palace.majorStars, ...palace.minorStars, ...palace.adjectiveStars]) {
      validateStarJson(label, `${palace.displayName} ${star.name}`, star)
    }

    if (palace.wenmo.outgoing.length !== 4) {
      failures += 1
      console.error(`${label}: ${palace.displayName} should have 4 outgoing sihua records`)
    }

    for (const outgoing of palace.wenmo.outgoing) {
      if (!outgoing.starName || !outgoing.targetPalace) {
        failures += 1
        console.error(`${label}: ${palace.displayName} has incomplete outgoing sihua`)
      }

      if (!expectedPalaceTitleSet.has(outgoing.targetPalace)) {
        failures += 1
        console.error(`${label}: ${palace.displayName} has invalid outgoing target palace`)
      }
    }

    if (
      !Array.isArray(palace.ages)
      || palace.ages.length !== 10
      || palace.ages.some((age, index) => (
        !Number.isInteger(age)
        || age < 1
        || (index > 0 && age !== palace.ages[index - 1] + 12)
      ))
    ) {
      failures += 1
      console.error(`${label}: ${palace.displayName} has invalid small-limit ages`)
    }

    if (
      !Array.isArray(palace.decadal.range)
      || palace.decadal.range[1] !== palace.decadal.range[0] + 9
      || palace.decadal.startYear !== item.input.year + palace.decadal.range[0] - 1
      || palace.decadal.endYear !== item.input.year + palace.decadal.range[1] - 1
    ) {
      failures += 1
      console.error(`${label}: ${palace.displayName} has invalid decadal range years`)
    }
  }

  for (const scope of ['decadal', 'yearly', 'monthly', 'daily', 'hourly']) {
    const starsByPalace = item.horoscope?.[scope]?.starsByPalace
    if (starsByPalace?.length !== 12) {
      failures += 1
      console.error(`${label}: horoscope.${scope} should include stars for 12 palaces`)
      continue
    }

    starsByPalace.forEach((stars, palaceIndex) => {
      if (!Array.isArray(stars)) {
        failures += 1
        console.error(`${label}: horoscope.${scope}.starsByPalace[${palaceIndex}] should be an array`)
        return
      }

      stars.forEach((star, starIndex) => {
        validateStarJson(label, `horoscope.${scope}.starsByPalace[${palaceIndex}][${starIndex}]`, star)
      })
    })
  }

  for (const scope of ['decadal', 'age', 'yearly', 'monthly', 'daily', 'hourly']) {
    if (item.horoscope?.[scope] && Object.hasOwn(item.horoscope[scope], 'mutagens')) {
      failures += 1
      console.error(`${label}: horoscope.${scope} should use mutagenStars, not legacy mutagens`)
    }

    if (item.horoscope?.[scope]?.palaceNames?.length !== 12) {
      failures += 1
      console.error(`${label}: horoscope.${scope} should include 12 palace names`)
    }

    if (item.horoscope && !hasExpectedPalaceTitleSet(item.horoscope[scope].palaceNames)) {
      failures += 1
      console.error(`${label}: horoscope.${scope} should contain the 12 unique Wenmo palace names`)
    }

    if (item.horoscope) {
      validateMutagenStars(
        label,
        `horoscope.${scope}.mutagenStars`,
        item.horoscope[scope].mutagenStars,
      )
      validateKnownMutagenStars(
        label,
        `horoscope.${scope}.mutagenStars`,
        item.horoscope[scope].mutagenStars,
        knownStarNames,
      )
    }

    if (
      item.horoscope
      && (
        !heavenlyStems.has(item.horoscope[scope].heavenlyStem)
        || !earthlyBranches.has(item.horoscope[scope].earthlyBranch)
      )
    ) {
      failures += 1
      console.error(`${label}: horoscope.${scope} should have a valid gan-zhi`)
    }
  }

  for (const scope of ['decadal', 'yearly', 'monthly', 'daily', 'hourly']) {
    if (
      item.horoscope?.wenmoSummary?.[scope]
      && Object.hasOwn(item.horoscope.wenmoSummary[scope], 'mutagens')
    ) {
      failures += 1
      console.error(`${label}: wenmoSummary.${scope} should use mutagenStars, not legacy mutagens`)
    }

    if (item.horoscope?.wenmoSummary?.[scope]?.palaceNames?.length !== 12) {
      failures += 1
      console.error(`${label}: wenmoSummary.${scope} should include 12 palace names`)
    }

    if (item.horoscope && !hasExpectedPalaceTitleSet(item.horoscope.wenmoSummary[scope].palaceNames)) {
      failures += 1
      console.error(`${label}: wenmoSummary.${scope} should contain the 12 unique Wenmo palace names`)
    }

    if (
      item.horoscope
      && (
        !heavenlyStems.has(item.horoscope.wenmoSummary[scope].heavenlyStem)
        || !earthlyBranches.has(item.horoscope.wenmoSummary[scope].earthlyBranch)
      )
    ) {
      failures += 1
      console.error(`${label}: wenmoSummary.${scope} should have a valid gan-zhi`)
    }

    if (item.horoscope) {
      validateMutagenStars(
        label,
        `wenmoSummary.${scope}.mutagenStars`,
        item.horoscope.wenmoSummary[scope].mutagenStars,
      )
      validateKnownMutagenStars(
        label,
        `wenmoSummary.${scope}.mutagenStars`,
        item.horoscope.wenmoSummary[scope].mutagenStars,
        knownStarNames,
      )
    }
  }
}

validateCommonChart('demo', chart)

const ignoredSampleDirectory = 'output'
if (existsSync(ignoredSampleDirectory)) {
  for (const fileName of readdirSync(ignoredSampleDirectory)) {
    if (!fileName.startsWith('wenmo-sample-') || !fileName.endsWith('.json')) continue
    const samplePath = `${ignoredSampleDirectory}/${fileName}`
    validateCommonChart(
      `ignored output sample ${fileName}`,
      JSON.parse(readFileSync(samplePath, 'utf8')),
    )
  }
}

if (chart.palaces.length !== 12) {
  failures += 1
  console.error(`expected 12 palaces, got ${chart.palaces.length}`)
}

const palaceIndexes = new Set(chart.palaces.map((palace) => palace.index))
for (let index = 0; index < 12; index += 1) {
  if (!palaceIndexes.has(index)) {
    failures += 1
    console.error(`missing palace index ${index}`)
  }
}

if (JSON.stringify(chart).includes('"undefined"')) {
  failures += 1
  console.error('chart contains stringified undefined')
}

if (chart.natal.birthYearSihua.length !== 4) {
  failures += 1
  console.error(`expected 4 birth year sihua labels, got ${chart.natal.birthYearSihua.length}`)
}

for (const palace of chart.palaces) {
  if (!palace.name || !palace.displayName || !palace.heavenlyStem || !palace.earthlyBranch) {
    failures += 1
    console.error(`palace ${palace.index} is missing required identity fields`)
  }

  if (palace.wenmo.outgoing.length !== 4) {
    failures += 1
    console.error(`${palace.displayName} should have 4 outgoing sihua records`)
  }

  if (
    !Array.isArray(palace.decadal.range)
    || palace.decadal.range.length !== 2
    || palace.decadal.range[1] !== palace.decadal.range[0] + 9
    || typeof palace.decadal.startYear !== 'number'
    || typeof palace.decadal.endYear !== 'number'
    || !palace.decadal.heavenlyStem
    || !palace.decadal.earthlyBranch
  ) {
    failures += 1
    console.error(`${palace.displayName} has incomplete decadal data`)
  }

  for (const outgoing of palace.wenmo.outgoing) {
    if (!outgoing.starName || !outgoing.targetPalace) {
      failures += 1
      console.error(`${palace.displayName} has incomplete outgoing sihua`)
    }
  }
}

for (const palace of chart.palaces) {
  const expected = expectations.get(palace.displayName)
  if (!expected) continue

  const labelsByStar = new Map(
    [...palace.majorStars, ...palace.minorStars].map((star) => [
      star.name,
      star.marks.map((mark) => mark.label),
    ]),
  )

  for (const item of expected) {
    const labels = labelsByStar.get(item.star) ?? []
    const missing = item.labels.filter((label) => !labels.includes(label))
    console.log(`${palace.displayName} ${item.star}: ${labels.join(' ')}`)

    if (missing.length > 0) {
      failures += missing.length
      console.error(`missing ${palace.displayName} ${item.star}: ${missing.join(', ')}`)
    }
  }
}

const originalPalace = chart.palaces.find((palace) => palace.displayName === '交友宫')
if (!originalPalace?.isOriginalPalace) {
  failures += 1
  console.error('missing 交友宫 来因')
} else {
  console.log('交友宫: 来因')
}

if (chart.horoscope?.monthly.name !== '流月') {
  failures += 1
  console.error('missing 流月 scope')
} else {
  console.log(`流月: ${chart.horoscope.monthly.heavenlyStem}${chart.horoscope.monthly.earthlyBranch}`)
}

for (const scope of ['decadal', 'age', 'yearly', 'monthly', 'daily', 'hourly']) {
  if (!chart.horoscope?.[scope]?.name) {
    failures += 1
    console.error(`missing horoscope.${scope}`)
  }

  if (chart.horoscope?.[scope]?.mutagenStars.length !== 4) {
    failures += 1
    console.error(`horoscope.${scope} should have 4 mutagenStars`)
  }
}

for (const scope of ['decadal', 'yearly', 'monthly', 'daily', 'hourly']) {
  if (chart.horoscope?.[scope]?.starsByPalace?.length !== 12) {
    failures += 1
    console.error(`horoscope.${scope} should include stars for 12 palaces`)
  }
}

for (const scope of ['decadal', 'yearly', 'monthly', 'daily', 'hourly']) {
  if (!chart.horoscope?.wenmoSummary?.[scope]?.name) {
    failures += 1
    console.error(`missing wenmoSummary.${scope}`)
  }
}

if (getStemSihuaLabels('甲').length !== 4) {
  failures += 1
  console.error('甲 stem should produce 4 sihua labels')
}

expectThrows('invalid birth date', () => buildZiweiJson({
  year: 2000,
  month: 2,
  day: 31,
  hour: 0,
  minute: 0,
  gender: 'male',
}))

expectThrows('invalid target date', () => buildZiweiJson(
  {
    year: 2000,
    month: 1,
    day: 1,
    hour: 0,
    minute: 0,
    gender: 'male',
  },
  { targetDate: '2026-02-30' },
))

expectThrows('blank target date', () => buildZiweiJson(
  {
    year: 2000,
    month: 1,
    day: 1,
    hour: 0,
    minute: 0,
    gender: 'male',
  },
  { targetDate: '' },
))

expectThrows('invalid runtime target date type', () => buildZiweiJson(
  {
    year: 2000,
    month: 1,
    day: 1,
    hour: 0,
    minute: 0,
    gender: 'male',
  },
  { targetDate: null },
))

expectThrows('null runtime options', () => buildZiweiJson(
  {
    year: 2000,
    month: 1,
    day: 1,
    hour: 0,
    minute: 0,
    gender: 'male',
  },
  null,
))

expectThrows('non-plain runtime options', () => buildZiweiJson(
  {
    year: 2000,
    month: 1,
    day: 1,
    hour: 0,
    minute: 0,
    gender: 'male',
  },
  new Date('2026-01-01T00:00:00.000Z'),
))

expectThrows('unknown runtime options field', () => buildZiweiJson(
  {
    year: 2000,
    month: 1,
    day: 1,
    hour: 0,
    minute: 0,
    gender: 'male',
  },
  { targetDate: '2026-01-01', extra: true },
))

expectThrows('target hour without date', () => buildZiweiJson(
  {
    year: 2000,
    month: 1,
    day: 1,
    hour: 0,
    minute: 0,
    gender: 'male',
  },
  { targetHour: 1 },
))

expectThrows('target minute without target hour', () => buildZiweiJson(
  {
    year: 2000,
    month: 1,
    day: 1,
    hour: 0,
    minute: 0,
    gender: 'male',
  },
  { targetDate: '2026-01-01', targetMinute: 30 },
))

expectThrows('invalid target hour', () => buildZiweiJson(
  {
    year: 2000,
    month: 1,
    day: 1,
    hour: 0,
    minute: 0,
    gender: 'male',
  },
  { targetDate: '2026-01-01', targetHour: 24 },
))

expectThrows('invalid target minute', () => buildZiweiJson(
  {
    year: 2000,
    month: 1,
    day: 1,
    hour: 0,
    minute: 0,
    gender: 'male',
  },
  { targetDate: '2026-01-01', targetHour: 0, targetMinute: 60 },
))

const dateObjectChart = buildZiweiJson(
  {
    year: 2000,
    month: 1,
    day: 1,
    hour: 0,
    minute: 0,
    gender: 'male',
  },
  { targetDate: new Date('2026-01-01T13:45:00.000Z') },
)
if (dateObjectChart.horoscope?.targetDate !== '2026-01-01') {
  failures += 1
  console.error(`Date targetDate should normalize to YYYY-MM-DD, got ${dateObjectChart.horoscope?.targetDate}`)
}

const targetTimeChart = buildZiweiJson(
  {
    year: 2000,
    month: 1,
    day: 1,
    hour: 0,
    minute: 0,
    gender: 'male',
  },
  { targetDate: '2026-01-01', targetHour: 23, targetMinute: 30 },
)
if (
  targetTimeChart.horoscope?.targetHour !== 23
  || targetTimeChart.horoscope?.targetMinute !== 30
  || targetTimeChart.horoscope?.targetShichen !== '子时'
  || targetTimeChart.horoscope?.targetTimeIndex !== 12
) {
  failures += 1
  console.error('target time should be recorded with its effective time index and shichen')
}

const lateZiBirthChart = buildZiweiJson({
  year: 2000,
  month: 1,
  day: 1,
  hour: 23,
  minute: 30,
  gender: 'male',
})
if (lateZiBirthChart.input.shichen !== '子时' || lateZiBirthChart.input.timeIndex !== 12) {
  failures += 1
  console.error('late zi birth time should record 子时 and timeIndex 12')
}

const locationChart = buildZiweiJson({
  year: 2000,
  month: 1,
  day: 1,
  hour: 0,
  minute: 0,
  gender: 'male',
  location: ' sample ',
})
if (locationChart.input.location !== 'sample') {
  failures += 1
  console.error(`location should be trimmed in JSON input, got ${locationChart.input.location}`)
}
if (
  locationChart.input.locationUsedForCalculation !== false
  || locationChart.input.longitudeUsedForCalculation !== false
) {
  failures += 1
  console.error('location and longitude should be explicitly marked as not used for calculation')
}

const explicitFixLeapChart = buildZiweiJson({
  year: 2000,
  month: 1,
  day: 1,
  hour: 0,
  minute: 0,
  gender: 'male',
  fixLeap: false,
})
if (explicitFixLeapChart.input.fixLeap !== false) {
  failures += 1
  console.error(`explicit fixLeap should be preserved, got ${explicitFixLeapChart.input.fixLeap}`)
}

expectThrows('fractional hour', () => buildZiweiJson({
  year: 2000,
  month: 1,
  day: 1,
  hour: 0.5,
  minute: 0,
  gender: 'male',
}))

expectThrows('invalid longitude', () => buildZiweiJson({
  year: 2000,
  month: 1,
  day: 1,
  hour: 0,
  minute: 0,
  gender: 'male',
  longitude: 181,
}))

expectThrows('blank runtime location', () => buildZiweiJson({
  year: 2000,
  month: 1,
  day: 1,
  hour: 0,
  minute: 0,
  gender: 'male',
  location: '',
}))

expectThrows('invalid runtime fixLeap', () => buildZiweiJson({
  year: 2000,
  month: 1,
  day: 1,
  hour: 0,
  minute: 0,
  gender: 'male',
  fixLeap: 'true',
}))

expectThrows('null runtime minute', () => buildZiweiJson({
  year: 2000,
  month: 1,
  day: 1,
  hour: 0,
  minute: null,
  gender: 'male',
}))

expectThrows('unknown runtime birth field', () => buildZiweiJson({
  year: 2000,
  month: 1,
  day: 1,
  hour: 0,
  minute: 0,
  gender: 'male',
  name: 'sample',
}))

expectThrows('non-plain runtime birth info', () => buildZiweiJson(new Date('2000-01-01T00:00:00.000Z')))

expectThrows('unknown sihua stem', () => getStemSihuaLabels(''))
expectThrows('malformed horoscope palace names', () => summarizeWenmoHoroscope(
  makeFakeSummaryChart({ yearly: { palaceNames: ['only-one-palace'] } }),
  '2026-01-01',
))
expectThrows('duplicate horoscope palace names', () => summarizeWenmoHoroscope(
  makeFakeSummaryChart({ yearly: { palaceNames: Array.from({ length: 12 }, () => '命宫') } }),
  '2026-01-01',
))
expectThrows('malformed horoscope mutagen stars', () => summarizeWenmoHoroscope(
  makeFakeSummaryChart({ yearly: { mutagen: ['廉贞'] } }),
  '2026-01-01',
))
expectThrows('blank horoscope mutagen star', () => summarizeWenmoHoroscope(
  makeFakeSummaryChart({ yearly: { mutagen: ['廉贞', '破军', '武曲', ''] } }),
  '2026-01-01',
))
expectThrows('unknown horoscope mutagen star', () => summarizeWenmoHoroscope(
  makeFakeSummaryChart({ yearly: { mutagen: ['廉贞', '破军', '武曲', '不存在'] } }),
  '2026-01-01',
))
expectThrows('malformed horoscope index', () => summarizeWenmoHoroscope(
  makeFakeSummaryChart({ yearly: { index: 12 } }),
  '2026-01-01',
))
expectThrows('malformed horoscope heavenly stem', () => summarizeWenmoHoroscope(
  makeFakeSummaryChart({ yearly: { heavenlyStem: 'bad' } }),
  '2026-01-01',
))
expectThrows('malformed horoscope earthly branch', () => summarizeWenmoHoroscope(
  makeFakeSummaryChart({ yearly: { earthlyBranch: 'bad' } }),
  '2026-01-01',
))

for (const item of smokeCases) {
  validateCommonChart(
    item.label,
    buildZiweiJson(item.birthInfo, { targetDate: item.targetDate }),
  )
}

for (const gender of ['male', 'female']) {
  for (let hour = 0; hour < 24; hour += 1) {
    const minute = hour === 23 ? 30 : 0
    const item = buildZiweiJson(
      { year: 1992, month: 3, day: 9, hour, minute, gender },
      { targetDate: '2026-03-09', targetHour: hour, targetMinute: minute },
    )
    const label = `hour matrix ${gender} ${hour}:${String(minute).padStart(2, '0')}`

    validateCommonChart(label, item)

    if (
      item.input.timeIndex !== expectedTimeIndex(hour)
      || item.horoscope?.targetTimeIndex !== expectedTimeIndex(hour)
    ) {
      failures += 1
      console.error(`${label}: unexpected time index`)
    }
  }
}

expectCliFailure('unknown option', ['--year', '2000', '--bad', '1'], 'unknown option: --bad')
expectCliFailure('duplicate option', ['--year', '2000', '--year', '2001'], 'duplicate option: --year')
expectCliFailure('missing option value', ['--year', '--month', '1'], '--year must include a value')
expectCliFailure('blank option value', ['--year', ''], '--year must include a value')
expectCliFailure('blank optional value', ['--year', '2000', '--location', ''], '--location must include a value')
expectCliFailure(
  'invalid fix leap option',
  [
    '--year', '2000',
    '--month', '1',
    '--day', '1',
    '--hour', '0',
    '--gender', 'male',
    '--fix-leap', 'maybe',
  ],
  '--fix-leap must be true or false',
)
expectCliFailure(
  'target hour without target date',
  [
    '--year', '2000',
    '--month', '1',
    '--day', '1',
    '--hour', '0',
    '--gender', 'male',
    '--target-hour', '1',
  ],
  'targetHour requires targetDate',
)
expectCliFailure(
  'invalid target hour',
  [
    '--year', '2000',
    '--month', '1',
    '--day', '1',
    '--hour', '0',
    '--gender', 'male',
    '--target-date', '2026-01-01',
    '--target-hour', '24',
  ],
  'targetHour must be an integer between 0 and 23',
)
expectCliFailure(
  'unsafe output path',
  [
    '--year', '2000',
    '--month', '1',
    '--day', '1',
    '--hour', '0',
    '--gender', 'male',
    '--out', '../chart.json',
  ],
  '--out must stay inside the project directory',
)

expectCliSuccess(
  'valid output',
  [
    '--year', '2000',
    '--month', '1',
    '--day', '1',
    '--hour', '0',
    '--minute', '0',
    '--gender', 'male',
    '--fix-leap', 'false',
    '--target-date', '2026-01-01',
    '--target-hour', '23',
    '--target-minute', '30',
  ],
  `output/validate-demo-${randomUUID()}.json`,
  { fixLeap: false, targetHour: 23, targetMinute: 30, targetTimeIndex: 12 },
)

if (failures > 0) {
  process.exit(1)
}

console.log('demo chart validation passed')
