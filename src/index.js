// dsh-buddy 插件入口：把随包技能注册进 ctx.skills。
// 模式与 dsh-plugin-guide 的入口一致（frontmatter 拆分 + effect 注册 + 目录 resourceBase）。
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'dsh-buddy'
export const inject = ['skills']

const skillRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'skills', 'dsh-buddy')

function splitFrontmatter(rawText) {
  const text = rawText.replaceAll('\r\n', '\n')
  if (!text.startsWith('---\n')) return { description: undefined, body: text }
  const end = text.indexOf('\n---', 4)
  if (end < 0) return { description: undefined, body: text }
  const meta = text.slice(4, end)
  const body = text.slice(end + 4).replace(/^\n+/, '')
  const description = /^description:\s*(.+)$/m.exec(meta)?.[1]?.trim()
  return { description, body }
}

export function apply(ctx) {
  const { description, body } = splitFrontmatter(readFileSync(join(skillRoot, 'SKILL.md'), 'utf8'))
  ctx.effect(() =>
    ctx.skills.register({
      name: 'dsh-buddy',
      source: 'bundled',
      description: description ?? '用户画像自适应表达：实时构建用户熟练度/偏好画像并匹配回答深度',
      content: body,
      resourceBase: { kind: 'directory', path: skillRoot },
    }),
  )
}
