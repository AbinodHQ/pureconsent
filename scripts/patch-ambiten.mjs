import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

// Ambiten 1.3.0 hardcodes directConnection, which rejects Atlas SRV URIs
// and prevents replica-set discovery. Keep this pinned patch until upstream fixes it.
const require = createRequire(import.meta.url)
const root = path.dirname(require.resolve('@ambiten/core/package.json'))
const metadata = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
if (metadata.version !== '1.3.0') throw new Error('Review Atlas compatibility before upgrading Ambiten.')
for (const [file, before, after] of [
  ['dist/esm/lib-core/ambitenClient.js', 'directConnection: true', 'directConnection: false'],
  ['dist/cjs/index.cjs', 'directConnection:!0', 'directConnection:!1']
]) {
  const target = path.join(root, file)
  const source = await readFile(target, 'utf8')
  if (source.includes(after) && !source.includes(before)) continue
  if (source.split(before).length !== 2) throw new Error(`Unexpected Ambiten source: ${file}`)
  await writeFile(target, source.replace(before, after))
}
console.log('Ambiten Atlas replica-set compatibility patch applied.')
