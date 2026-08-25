// 输出质量评测（P0-3）：把真实对话失败模式钉死为规格断言，防回退。
// 断言三层：① fixture 结构完整 ② assistant 期望文本自身不含禁词（规格不诱导表演）
// ③ SKILL.md 含 meta 红线且禁词清单与红线一致。
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const SKILL_DIR = join(ROOT, 'skills', 'dsh-buddy')

test('output-quality：fixture 结构完整且期望文本不含 meta 禁词', async () => {
  const evals = JSON.parse(await readFile(join(SKILL_DIR, 'evals', 'output-quality.json'), 'utf8'))
  assert.ok(Array.isArray(evals.output_quality) && evals.output_quality.length >= 3)
  for (const scene of evals.output_quality) {
    assert.ok(scene.name, '场景缺 name')
    assert.ok(Array.isArray(scene.turns) && scene.turns.length >= 1)
    assert.ok(scene.turns[0].role === 'user', '对话从用户开始')
    assert.ok(Array.isArray(scene.must_not_contain) && scene.must_not_contain.length >= 2)
    // 规格本身不得把 meta 表演写进期望
    const assistantText = scene.turns.filter((t) => t.role === 'assistant').map((t) => t.text).join('\n')
    for (const banned of scene.must_not_contain) {
      assert.ok(!assistantText.includes(banned), `场景「${scene.name}」的 assistant 期望文本含禁词「${banned}」——规格在诱导表演`)
    }
  }
})

test('output-quality：SKILL.md 含 meta 红线条款', async () => {
  const raw = await readFile(join(SKILL_DIR, 'SKILL.md'), 'utf8')
  assert.ok(raw.includes('禁止 meta 自述'), '红线条款应在位')
  assert.ok(raw.includes('不体现在'), '红线应表达"调整只体现在内容里"')
})
