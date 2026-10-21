import { readFile, writeFile } from 'node:fs/promises'
import { gzipSync, brotliCompressSync } from 'node:zlib'
import { minify } from 'terser'
const source = await readFile(new URL('../widget/consent.js', import.meta.url), 'utf8')
const result = await minify(source, { compress: true, mangle: true, format: { comments: false } })
if (!result.code) throw new Error('Empty widget output')
await writeFile(new URL('../public/consent.js', import.meta.url), result.code + '\n')
console.log(`Widget: ${Buffer.byteLength(result.code)} bytes; gzip ${gzipSync(result.code).length}; Brotli ${brotliCompressSync(result.code).length}. Configuration/network headers excluded.`)
