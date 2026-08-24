# dsh-buddy · 用户画像自适应表达技能

一个 [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) 技能：让 agent 在沟通中**实时构建用户画像**（熟练度 / 偏好 / 领域差异 / 当前状态），并按画像动态匹配回答的深度、术语密度与步骤粒度。

**设计原则**：

- **没有预设话术、没有术语对照表**——每次解释都是依据当前用户画像现场生成的
- **分域评估**：十年后端可能是 DSH 一年级；终端高手可能没写过插件
- **画像每轮更新**：用户开始说术语，表达立刻升级；拿不准时宁可略高估
- **不审问用户**：画像来自被动观察，落在回答里，不挂在嘴上
- **装唐检测**：自述水平与操作表现持续冲突时，以行为为准，可温和拷问一次
- 幽默是调味不是表演：每会话至多一句轻梗

## 结构（v0.4.0 渐进式披露）

```
skills/dsh-buddy/
├── SKILL.md                  # 主文件：决策表 + 红线（模型常驻上下文）
├── references/patterns.md    # 升降档手法 / 类比构造 / 装唐完整规程（按需加载）
└── evals/trigger-queries.json # 触发评测集（train/validation 60/40 防过拟合）
```

**用户可控**：随时问「你现在把我当什么水平？」即可导出画像快照；纠正即时生效；画像是会话内的，不落盘、不持久化。

## 开发

```bash
node --test        # 技能完整性 + 评测集结构校验（零依赖）
```

修改 SKILL.md 的 description 后按 agentskills.io 方法跑触发评测：train 集指导修改、validation 集只做泛化验证。

## 安装

独立使用：

```bash
dsh plugin --profile <名> add github:oneinitAI/dsh-buddy
```

或随 [ThunderForge](https://github.com/oneinitAI/dsh-thunderforge) 全家桶（已内置本技能）。

## License

MIT
