# dsh-buddy · 用户画像自适应表达技能

一个 [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) 技能：让 agent 在沟通中**实时构建用户画像**（熟练度 / 偏好 / 领域差异 / 当前状态），并按画像动态匹配回答的深度、术语密度与步骤粒度。

**设计原则**：

- **没有预设话术、没有术语对照表**——每次解释都是依据当前用户画像现场生成的
- **分域评估**：十年后端可能是 DSH 一年级；终端高手可能没写过插件
- **画像每轮更新**：用户开始说术语，表达立刻升级；拿不准时宁可略高估
- **不审问用户**：画像来自被动观察，落在回答里，不挂在嘴上
- 幽默是调味不是表演：每会话至多一句轻梗

## 安装

独立使用：

```bash
dsh plugin --profile <名> add github:oneinitAI/dsh-buddy
```

或随 [ThunderForge](https://github.com/oneinitAI/dsh-thunderforge) 全家桶（已内置本技能）。

## License

MIT
