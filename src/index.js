// dsh-buddy 插件入口：把随包技能注册进 ctx.skills，并提供画像持久化的读写工具。
// 模式与 dsh-plugin-guide 的入口一致（frontmatter 拆分 + effect 注册 + 目录 resourceBase）。
import { readFileSync } from 'node:fs'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'dsh-buddy'
export const inject = ['skills', 'tools']

const skillRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'skills', 'dsh-buddy')
const PROFILE_PATH = join(homedir(), '.dsh', 'buddy-profile.json')

const SKILL_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function splitFrontmatter(rawText) {
  const text = rawText.replaceAll('\r\n', '\n')
  if (!text.startsWith('---\n')) return { name: undefined, description: undefined, body: text }
  const end = text.indexOf('\n---', 4)
  if (end < 0) return { name: undefined, description: undefined, body: text }
  const meta = text.slice(4, end)
  const body = text.slice(end + 4).replace(/^\n+/, '')
  const name = /^name:\s*(.+)$/m.exec(meta)?.[1]?.trim()
  const description = /^description:\s*(.+)$/m.exec(meta)?.[1]?.trim()
  return { name, description, body }
}

export function apply(ctx) {
  const { name: skillName, description, body } = splitFrontmatter(readFileSync(join(skillRoot, 'SKILL.md'), 'utf8'))
  // 与主仓 ThunderForge skills/index.js 同款校验：name 缺失或不合法时拒绝注册并警告，
  // 而不是静默用错误名字挂进 skill 目录（改名/复用时防错位）
  if (!skillName || !SKILL_NAME_RE.test(skillName)) {
    ctx?.logger?.(name)?.warn?.(`SKILL.md 的 name "${skillName}" 不合法，dsh-buddy 技能未注册`)
    return
  }
  ctx.effect(() =>
    ctx.skills.register({
      name: skillName,
      source: 'bundled',
      description: description ?? '用户画像自适应表达：实时构建用户熟练度/偏好画像并匹配回答深度',
      content: body,
      resourceBase: { kind: 'directory', path: skillRoot },
    }),
  )

  // P0-4 方案A：画像持久化真功能。序列化用 JSON（stdlib 原生，天然防注入）。
  // 写入永远由模型在用户「明确同意」后调用；读取供跨会话沿用前的确认展示。
  ctx.tools.register({
    name: 'buddy_profile_get',
    description: '读取已保存的 dsh-buddy 用户画像快照。用于会话启动确认沿用、或用户要求查看历史画像。无已存画像时返回 ok:false。',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value) => [{
        type: 'text',
        text: value.ok ? `已保存画像：\n${value.profile}` : '没有已保存的画像快照。',
      }],
    },
    async execute() {
      try {
        return { ok: true, profile: await readFile(PROFILE_PATH, 'utf8'), path: PROFILE_PATH }
      } catch (err) {
        if (err.code === 'ENOENT') return { ok: false, profile: null, path: PROFILE_PATH }
        return { ok: false, error: err.code ?? err.message, path: PROFILE_PATH }
      }
    },
  })

  ctx.tools.register({
    name: 'buddy_profile_set',
    description: '保存 dsh-buddy 用户画像快照（JSON 文本）。调用前必须先向用户完整展示要保存的内容并获其同意——沉默不是同意。用户要求删除时删除文件而非清空。',
    parameters: {
      type: 'object',
      properties: {
        profile: { type: 'string', description: '画像快照 JSON 文本（四维结构：熟练度/领域差/偏好/状态）' },
      },
      required: ['profile'],
      additionalProperties: false,
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value) => [{
        type: 'text',
        text: value.ok ? `画像已保存到 ${value.path}` : `保存失败：${value.error}`,
      }],
    },
    async execute(args) {
      // 防呆：必须是可解析的 JSON 对象（防止自由文本写坏快照格式）
      let parsed
      try {
        parsed = JSON.parse(args.profile)
        if (!parsed || typeof parsed !== 'object') throw new Error('not an object')
      } catch {
        return { ok: false, error: 'INVALID_JSON', hint: 'profile 必须是 JSON 对象文本' }
      }
      const body = `${JSON.stringify({ ...parsed, updatedAt: new Date().toISOString() }, null, 2)}\n`
      try {
        await mkdir(dirname(PROFILE_PATH), { recursive: true })
        await writeFile(PROFILE_PATH, body, 'utf8')
        return { ok: true, path: PROFILE_PATH, bytes: Buffer.byteLength(body) }
      } catch (err) {
        return { ok: false, error: err.code ?? err.message }
      }
    },
  })
}
