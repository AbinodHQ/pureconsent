import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
import german from '../lib/i18n/de.json'
import { translator } from '../lib/i18n/shared'

for (const route of ['impressum', 'privacy']) {
  test(route + ' has German coverage for every active legal and metadata string', () => {
    const text = fs.readFileSync('app/' + route + '/page.tsx', 'utf8')
    const source = ts.createSourceFile(route, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    let count = 0
    function visit(node: ts.Node) {
      if (ts.isCallExpression(node) && node.expression.getText(source) === 't' && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
        const original = node.arguments[0].text
        const key = original.replace(/\s+/g, ' ').trim()
        assert.ok((german as Record<string, string>)[key], 'Missing German: ' + key)
        assert.equal(translator('en')(original), original)
        const de = translator('de')(original)
        if (original.endsWith(' ')) assert.ok(de.endsWith(' '), 'Inline link spacing')
        count++
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
    assert.ok(count > 10)
    assert.ok(text.includes('generateMetadata'))
    if (route === 'privacy') assert.ok(text.includes("href='mailto:contact@abinod.com'>contact@abinod.com"))
  })
}
