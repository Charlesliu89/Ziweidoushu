import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { buildZiweiJson, type BirthInfo, type Gender } from './index.js'

interface CliArgs {
  birthInfo: BirthInfo
  targetDate?: string
  outPath: string
}

function readOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name)
  if (index < 0) return undefined
  return args[index + 1]
}

function readNumber(args: string[], name: string): number {
  const raw = readOption(args, name)
  const value = Number(raw)
  if (!raw || !Number.isFinite(value)) {
    throw new Error(`${name} is required and must be a number`)
  }
  return value
}

function normalizeGender(value: string | undefined): Gender {
  if (value === 'male' || value === '男') return 'male'
  if (value === 'female' || value === '女') return 'female'
  throw new Error('--gender is required: male/female or 男/女')
}

function parseArgs(args: string[]): CliArgs {
  if (args.includes('--help') || args.includes('-h')) {
    printUsage()
    process.exit(0)
  }

  return {
    birthInfo: {
      year: readNumber(args, '--year'),
      month: readNumber(args, '--month'),
      day: readNumber(args, '--day'),
      hour: readNumber(args, '--hour'),
      minute: Number(readOption(args, '--minute') ?? 0),
      gender: normalizeGender(readOption(args, '--gender')),
      location: readOption(args, '--location'),
      longitude: readOption(args, '--longitude') ? Number(readOption(args, '--longitude')) : undefined,
    },
    targetDate: readOption(args, '--target-date'),
    outPath: readOption(args, '--out') ?? 'output/ziwei-chart.json',
  }
}

function printUsage() {
  console.log(`Usage:
  node dist/cli.js --year 2000 --month 1 --day 1 --hour 0 --minute 0 --gender male --out output/chart.json

Options:
  --year          Solar birth year
  --month         Solar birth month
  --day           Solar birth day
  --hour          Clock hour, 0-23
  --minute        Clock minute, 0-59
  --gender        male/female or 男/女
  --location      Optional birthplace text, stored in JSON only
  --longitude     Optional longitude, stored in JSON only
  --target-date   Optional date for decadal/yearly/monthly/daily/hourly scopes
  --out           JSON output path, default output/ziwei-chart.json`)
}

async function main() {
  const cliArgs = parseArgs(process.argv.slice(2))
  const document = buildZiweiJson(cliArgs.birthInfo, { targetDate: cliArgs.targetDate })
  const outputPath = resolve(cliArgs.outPath)

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8')
  console.log(`saved ${outputPath}`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
