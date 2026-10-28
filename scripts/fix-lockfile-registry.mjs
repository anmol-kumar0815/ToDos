// Points package-lock.json at the public npm registry.
//
// Installing through an internal mirror records the mirror's hostname in every `resolved`
// URL, which breaks installs on machines that can't reach it (Vercel, CI). Package paths are
// identical on the public registry, and the `integrity` hashes are unchanged, so npm still
// verifies every tarball.
//
// Usage: node scripts/fix-lockfile-registry.mjs   (or: npm run lockfile:public)
import { readFileSync, writeFileSync } from 'node:fs'

const PUBLIC = 'https://registry.npmjs.org/'
const MIRRORS = [
  /^https:\/\/artifacts\.apple\.com\/artifactory\/api\/npm\/[^/]+\//,
  /^https:\/\/npm\.apple\.com\//,
]

const file = 'package-lock.json'
const lock = JSON.parse(readFileSync(file, 'utf8'))
let changed = 0

for (const pkg of Object.values(lock.packages ?? {})) {
  if (typeof pkg.resolved !== 'string') continue
  const mirror = MIRRORS.find((re) => re.test(pkg.resolved))
  if (!mirror) continue
  pkg.resolved = pkg.resolved.replace(mirror, PUBLIC)
  changed++
}

writeFileSync(file, JSON.stringify(lock, null, 2) + '\n')
console.log(`Rewrote ${changed} resolved URL(s) to ${PUBLIC}`)
