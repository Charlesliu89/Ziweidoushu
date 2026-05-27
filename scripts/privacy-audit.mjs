import { readdir, readFile } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'

const root = process.cwd()

const ignoredDirectoryNames = new Set([
  '.git',
  '.idea',
  '.npm-cache',
  '.tools',
  '.vscode',
  'cases',
  'charts',
  'dist',
  'exports',
  'inputs',
  'node_modules',
  'output',
  'private',
  'readings',
  'records',
  'secrets',
  'uploads',
])

const requiredIgnoreRules = [
  'output/',
  'exports/',
  'private/',
  'secrets/',
  'inputs/',
  'charts/',
  'cases/',
  'records/',
  'readings/',
  'uploads/',
  '.env',
  '.env.*',
  '*.chart.json',
  '*-chart.json',
  '*.input.json',
  '*-input.json',
  '*.birth.json',
  '*-birth.json',
  '*.profile.json',
  '*-profile.json',
  '*.reading.json',
  '*-reading.json',
  '*.case.json',
  '*-case.json',
  '*.csv',
  '*.tsv',
  '*.xlsx',
  '*.xls',
  '*.docx',
  '*.pdf',
  '*.pem',
  '*.key',
  '*.p12',
  '*.pfx',
]

const allowedJsonFiles = new Set(['package.json', 'package-lock.json', 'tsconfig.json'])
const privateDataExtensions = new Set(['.csv', '.docx', '.json', '.pdf', '.tsv', '.xls', '.xlsx'])

const contentRules = [
  {
    label: 'concrete Chinese birthplace in a public CLI command',
    pattern: /--location\s+[\u3400-\u9fff]/,
  },
  {
    label: 'concrete longitude in a public CLI command',
    pattern: /--longitude\s+\d+(?:\.\d+)?/,
  },
  {
    label: 'personal chart output filename',
    pattern: new RegExp(
      [
        `${['wenmo', 'sample'].join('-')}-\\d{4}`,
        ['birth', 'chart'].join('-'),
        ['personal', 'chart'].join('-'),
        ['private', 'chart'].join('-'),
      ].join('|'),
      'i',
    ),
  },
  {
    label: 'private key',
    pattern: /BEGIN (RSA |OPENSSH |EC |DSA )?PRIVATE KEY/,
  },
  {
    label: 'GitHub token',
    pattern: /\b(?:ghp|gho|github_pat)_[A-Za-z0-9_]{20,}\b/,
  },
  {
    label: 'OpenAI API key',
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/,
  },
  {
    label: 'Chinese mainland phone number',
    pattern: /\b1[3-9]\d{9}\b/,
  },
  {
    label: 'Chinese resident identity number',
    pattern: /\b\d{17}[\dXx]\b/,
  },
  {
    label: 'email address',
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  },
]

const failures = []

function normalizePath(path) {
  return path.split('\\').join('/')
}

async function assertRequiredIgnoreRules() {
  const gitignore = await readFile(join(root, '.gitignore'), 'utf8')
  for (const rule of requiredIgnoreRules) {
    if (!gitignore.includes(rule)) {
      failures.push(`.gitignore is missing required private-data rule: ${rule}`)
    }
  }
}

async function scanFile(filePath) {
  const relativePath = normalizePath(relative(root, filePath))
  const extension = extname(filePath).toLowerCase()

  if (privateDataExtensions.has(extension) && !allowedJsonFiles.has(relativePath)) {
    failures.push(`private data file type must stay ignored, not public: ${relativePath}`)
    return
  }

  const textExtensions = new Set(['.js', '.json', '.md', '.mjs', '.ts', '.txt', '.yaml', '.yml'])
  if (!textExtensions.has(extension)) return

  const content = await readFile(filePath, 'utf8')
  for (const rule of contentRules) {
    if (rule.pattern.test(content)) {
      failures.push(`${rule.label} found in public file: ${relativePath}`)
    }
  }
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(directory, entry.name)

    if (entry.isDirectory()) {
      if (!ignoredDirectoryNames.has(entry.name)) {
        await walk(fullPath)
      }
      continue
    }

    if (entry.isFile()) {
      await scanFile(fullPath)
    }
  }
}

await assertRequiredIgnoreRules()
await walk(root)

if (failures.length > 0) {
  console.error('Privacy audit failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('privacy audit passed')
