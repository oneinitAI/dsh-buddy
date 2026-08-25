// dsh-buddy 技能完整性测试：frontmatter 规范、画像核心条款、渐进披露引用、评测集结构。
// 这些断言来自 agentskills.io 规范与 ThunderForge 主仓 skills.test.mjs 的同源要求。
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, access } from 'node:fs/promises'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const SKILL_DIR = join(ROOT, 'skills', 'dsh-buddy')

/** 与 src/index.js 同款的 frontmatter 拆分（含 name）。 */
function splitFrontmatter(rawText) {
  const text = rawText.replaceAll('\r\n', '\n')
  if (!text.startsWith('---\n')) return {}
  const end = text.indexOf('\n---', 4)
  if (end < 0) return {}
  const meta = text.slice(4, end)
  const body = text.slice(end + 4).replace(/^\n+/, '')
  const name = /^name:\s*(.+)$/m.exec(meta)?.[1]?.trim()
  const description = /^description:\s*(.+)$/m.exec(meta)?.[1]?.trim()
  const version = /^\s*version:\s*"?([^"\n]+)"?\s*$/m.exec(meta)?.[1]?.trim()
  return { name, description, version, body }
}

test('frontmatter：name 合法、description 符合正统规范、版本号在位', async () => {
  const raw = await readFile(join(SKILL_DIR, 'SKILL.md'), 'utf8')
  const { name, description, version, body } = splitFrontmatter(raw)
  assert.equal(name, 'dsh-buddy', 'name 必须是 dsh-buddy')
  assert.match(name ?? '', /^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'name 必须 kebab-case')
  assert.ok(description?.startsWith('Use when'), 'description 应以 imperative "Use when" 开头')
  assert.ok(description.includes('Not for'), '应写清 Not for 边界防误触发')
  assert.ok(description.length <= 1024, 'description 不超过 1024 字符')
  assert.ok(version && /^\d+\.\d+\.\d+$/.test(version), `metadata.version 应是 semver，实际 ${version}`)
  assert.ok(body.length > 0 && body.length < 10000, '正文应有实质内容且控制在渐进式披露篇幅内')
})

test('画像核心条款：主文件保留决策必需关键词', async () => {
  const raw = await readFile(join(SKILL_DIR, 'SKILL.md'), 'utf8')
  const { body } = splitFrontmatter(raw)
  for (const keyword of ['画像', '分域', '每轮', '实时', '高估', '装唐', '以行为为准', 'who is JSON']) {
    assert.ok(body.includes(keyword), `主文件应包含「${keyword}」`)
  }
  assert.ok(!body.includes('| 术语 |'), '不得出现预设术语对照表（无预设话术是核心设计）')
})

test('渐进式披露：patterns.md 存在且被主文件引用，导出条款在位', async () => {
  const patternsPath = join(SKILL_DIR, 'references', 'patterns.md')
  await access(patternsPath)
  const raw = await readFile(join(SKILL_DIR, 'SKILL.md'), 'utf8')
  assert.ok(raw.includes('references/patterns.md'), '主文件应引用 patterns.md（按需加载）')
  const patterns = await readFile(patternsPath, 'utf8')
  for (const section of ['降档手法', '升档手法', '装唐检测完整规程']) {
    assert.ok(patterns.includes(section), `patterns.md 应包含「${section}」`)
  }
  // 用户可控性：画像可查可纠不落盘；持久化必须显式 opt-in
  assert.ok(raw.includes('导出') && raw.includes('不主动持久化'), '画像摘要导出条款应在位')
  assert.ok(raw.includes('buddy-profile.yaml') && raw.includes('沉默 ≠ 同意'), '持久化 opt-in 条款应在位（默认关闭）')
})

test('src/index.js 注册逻辑与 SKILL.md name 一致且带 resourceBase', async () => {
  const entry = await readFile(join(ROOT, 'src', 'index.js'), 'utf8')
  const skillRaw = await readFile(join(SKILL_DIR, 'SKILL.md'), 'utf8')
  const { name } = splitFrontmatter(skillRaw)
  // 注册名来自 frontmatter 解析（修2 后动态），且有不合法 name 的拒绝路径
  assert.ok(entry.includes('skillName') && entry.includes('SKILL_NAME_RE'), '入口应解析 frontmatter name 并校验')
  assert.ok(entry.includes(`'${name}'`) || entry.includes(`"${name}"`), '插件自身 name 应与技能名一致')
  assert.ok(entry.includes('resourceBase'), '必须声明 resourceBase（references/patterns.md 的按需加载依赖它）')
  assert.ok(entry.includes('/^description:') || entry.includes('description:'), '入口应解析 frontmatter description')
})

test('评测集：train/validation 双集齐备、正负例达标、方法论在位', async () => {
  const evals = JSON.parse(await readFile(join(SKILL_DIR, 'evals', 'trigger-queries.json'), 'utf8'))
  assert.ok(Array.isArray(evals.train_queries) && evals.train_queries.length >= 10)
  assert.ok(Array.isArray(evals.validation_queries) && evals.validation_queries.length >= 6)
  const all = [...evals.train_queries, ...evals.validation_queries]
  const positives = all.filter((q) => q.should_trigger)
  const negatives = all.filter((q) => !q.should_trigger)
  assert.ok(positives.length >= 8 && negatives.length >= 6)
  // buddy 核心行为必须有正例覆盖
  const positiveText = positives.map((q) => q.query).join('\n')
  assert.ok(/装唐|小白/.test(positiveText), '言行冲突（装唐）场景应有正例')
  assert.ok(/别把我当|纠正/.test(positiveText), '用户纠正画像场景应有正例')
  assert.ok(typeof evals.methodology === 'string' && evals.methodology.length > 40, 'methodology 应记录评测方法')
})
