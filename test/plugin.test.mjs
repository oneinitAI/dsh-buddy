// P0-4 持久化方案A：buddy_profile_get/set 工具的真机契约与读写闭环。
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply, name as pluginName } from '../src/index.js'

function mockCtx() {
  const skills = []
  const tools = []
  apply({
    skills: { register: (s) => skills.push(s) },
    tools: { register: (t) => tools.push(t) },
    effect: (fn) => (typeof fn === 'function' ? fn() : undefined),
    logger: () => ({ info() {}, warn() {} }),
  })
  return { skills, tools }
}

test('注册技能 + 两个画像持久化工具，且工具符合 raw 真机契约', () => {
  const { skills, tools } = mockCtx()
  assert.equal(pluginName, 'dsh-buddy')
  assert.equal(skills.length, 1)
  assert.deepEqual(tools.map((t) => t.name).sort(), ['buddy_profile_get', 'buddy_profile_set'])
  for (const def of tools) {
    // 真机契约（test/tool-contract 同源规则的最小子集）
    assert.equal(typeof def.name, 'string')
    assert.ok(def.output && typeof def.output.render === 'function', `${def.name}: raw 注册必须带 output.render`)
    assert.equal(def.parameters.type, 'object')
    assert.equal(typeof def.parameters.additionalProperties, 'boolean')
    assert.equal(typeof def.execute, 'function')
  }
})

test('get 无文件时返回 ok:false（不抛错）', async () => {
  const { tools } = mockCtx()
  const get = tools.find((t) => t.name === 'buddy_profile_get')
  const out = await get.execute({})
  assert.equal(out.ok, false)
  assert.equal(out.profile, null)
})

test('set 落盘 → get 取回闭环；非 JSON 拒绝', async () => {
  // 用真实 ~/.dsh 路径会污染用户环境——set 写死 PROFILE_PATH，这里只验证行为后清理
  const { tools } = mockCtx()
  const set = tools.find((t) => t.name === 'buddy_profile_set')
  const get = tools.find((t) => t.name === 'buddy_profile_get')

  const bad = await set.execute({ profile: 'not-json{{' })
  assert.equal(bad.ok, false)
  assert.equal(bad.error, 'INVALID_JSON')

  const profile = JSON.stringify({ 熟练度: '跨域新手', 领域差: { dsh: '一年级' }, 偏好: '要结论', 状态: '顺畅' })
  const saved = await set.execute({ profile })
  assert.equal(saved.ok, true, saved.error)
  try {
    const onDisk = JSON.parse(await readFile(saved.path, 'utf8'))
    assert.equal(onDisk.熟练度, '跨域新手')
    assert.ok(onDisk.updatedAt, '落盘应带 updatedAt 时间戳')

    const got = await get.execute({})
    assert.equal(got.ok, true)
    assert.equal(JSON.parse(got.profile).领域差.dsh, '一年级')
  } finally {
    await rm(saved.path, { force: true })
  }
})
