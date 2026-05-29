import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path'
import { buildZiweiJson, type BirthInfo, type Gender } from './index.js'

interface CliArgs {
  birthInfo: BirthInfo
  targetDate?: string
  targetHour?: number
  targetMinute?: number
  outPath: string
}

const localOutputDirectories = new Set(['output', 'exports', 'private'])
const valuedOptionNames = new Set([
  '--year',
  '--month',
  '--day',
  '--hour',
  '--minute',
  '--gender',
  '--fix-leap',
  '--location',
  '--longitude',
  '--target-date',
  '--target-hour',
  '--target-minute',
  '--out',
])

function validateRawArgs(args: string[]): void {
  const seen = new Set<string>()

  for (let index = 0; index < args.length; index += 2) {
    const name = args[index]

    if (!name.startsWith('--')) {
      throw new Error(`unexpected argument: ${name}`)
    }

    if (!valuedOptionNames.has(name)) {
      throw new Error(`unknown option: ${name}`)
    }

    if (seen.has(name)) {
      throw new Error(`duplicate option: ${name}`)
    }
    seen.add(name)

    const value = args[index + 1]
    if (value === undefined || value.trim().length === 0 || value.startsWith('--')) {
      throw new Error(`${name} must include a value`)
    }
  }
}

function readOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name)
  if (index < 0) return undefined
  return args[index + 1]
}

function readNumber(args: string[], name: string): number {
  const raw = readOption(args, name)
  const value = Number(raw)
  if (!raw || raw.trim().length === 0 || !Number.isFinite(value)) {
    throw new Error(`${name} is required and must be a number`)
  }
  return value
}

function readOptionalText(args: string[], name: string): string | undefined {
  const raw = readOption(args, name)
  if ((raw === undefined || raw.trim().length === 0) && args.includes(name)) {
    throw new Error(`${name} must include a value`)
  }
  return raw
}

function readOptionalNumber(args: string[], name: string): number | undefined {
  const raw = readOption(args, name)
  if (raw === undefined) {
    if (args.includes(name)) {
      throw new Error(`${name} must include a value`)
    }
    return undefined
  }

  const value = Number(raw)
  if (raw.trim().length === 0 || !Number.isFinite(value)) {
    throw new Error(`${name} must be a number`)
  }
  return value
}

function readOptionalBoolean(args: string[], name: string): boolean | undefined {
  const raw = readOption(args, name)
  if (raw === undefined) {
    if (args.includes(name)) {
      throw new Error(`${name} must include a value`)
    }
    return undefined
  }

  const value = raw.trim().toLowerCase()
  if (value === 'true') return true
  if (value === 'false') return false
  throw new Error(`${name} must be true or false`)
}

function normalizeGender(value: string | undefined): Gender {
  if (value === 'male' || value === '男') return 'male'
  if (value === 'female' || value === '女') return 'female'
  throw new Error('--gender is required: male/female or 男/女')
}

function resolveLocalOutputPath(path: string): string {
  const root = process.cwd()
  const outputPath = resolve(root, path)
  const relativePath = relative(root, outputPath)

  if (relativePath === '' || relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new Error('--out must stay inside the project directory')
  }

  const [directoryName] = relativePath.split(/[\\/]/)
  if (!directoryName || !localOutputDirectories.has(directoryName)) {
    const allowed = [...localOutputDirectories].map((item) => `${item}/`).join(', ')
    throw new Error(`--out must be inside one of these local generated directories: ${allowed}`)
  }

  if (extname(outputPath).toLowerCase() !== '.json') {
    throw new Error('--out must use a .json filename')
  }

  return outputPath
}

function parseArgs(args: string[]): CliArgs {
  if (args.includes('--help') || args.includes('-h')) {
    printUsage()
    process.exit(0)
  }

  validateRawArgs(args)

  return {
    birthInfo: {
      year: readNumber(args, '--year'),
      month: readNumber(args, '--month'),
      day: readNumber(args, '--day'),
      hour: readNumber(args, '--hour'),
      minute: readOptionalNumber(args, '--minute') ?? 0,
      gender: normalizeGender(readOption(args, '--gender')),
      fixLeap: readOptionalBoolean(args, '--fix-leap'),
      location: readOptionalText(args, '--location'),
      longitude: readOptionalNumber(args, '--longitude'),
    },
    targetDate: readOptionalText(args, '--target-date'),
    targetHour: readOptionalNumber(args, '--target-hour'),
    targetMinute: readOptionalNumber(args, '--target-minute'),
    outPath: readOptionalText(args, '--out') ?? 'output/ziwei-chart.json',
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
  --fix-leap      Optional leap-month correction switch, true/false, default true
  --location      Optional birthplace text, stored in JSON only
  --longitude     Optional longitude, stored in JSON only
  --target-date   Optional date for decadal/yearly/monthly/daily/hourly scopes
  --target-hour   Optional target hour for hourly scope, 0-23, requires --target-date
  --target-minute Optional target minute for hourly scope, 0-59, requires --target-hour
  --out           JSON output path, default output/ziwei-chart.json`)
}

async function main() {
  const cliArgs = parseArgs(process.argv.slice(2))
  const document = buildZiweiJson(cliArgs.birthInfo, {
    targetDate: cliArgs.targetDate,
    targetHour: cliArgs.targetHour,
    targetMinute: cliArgs.targetMinute,
  })
  const outputPath = resolveLocalOutputPath(cliArgs.outPath)

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8')
  console.log(`saved ${outputPath}`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
