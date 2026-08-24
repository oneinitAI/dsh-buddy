// dsh-buddy 插件入口：把随包技能注册进 ctx.skills。
// 模式与 dsh-plugin-guide 的入口一致（frontmatter 拆分 + effect 注册 + 目录 resourceBase）。
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'dsh-buddy'
export const inject = ['skills']

const skillRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'skills', 'dsh-buddy')

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
}
