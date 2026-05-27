import { buildZiweiJson } from '../dist/index.js'

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

let failures = 0

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

if (failures > 0) {
  process.exit(1)
}

console.log('demo chart validation passed')
