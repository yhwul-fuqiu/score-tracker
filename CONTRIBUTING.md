# 协作指南

> 写给两位成员：一位熟悉 Git 流程，一位刚接触 GitHub。这份指南让两人用同一套节奏工作。

## 核心规则（只有三条）

1. **main 分支受保护**：任何人不能直接 push，必须走 Pull Request（PR）并经另一位审查后合并
2. **一个任务一个分支**：分支名用 `feat/xxx`（新功能）或 `fix/xxx`（修 bug），从 main 拉出
3. **改动前先建 Issue**：每个任务先在 Issues 里立一张卡，说明要做什么、为什么，做完关掉它

## 日常开发循环

```text
① 在 Issues 里领任务 / 建任务
② git checkout main && git pull        # 从最新 main 出发
③ git checkout -b feat/xxx             # 建功能分支
④ 写代码，提交（提交信息见下方规范）
⑤ git push -u origin feat/xxx          # 推到远端
⑥ 在 GitHub 上开 Pull Request，请对方审查
⑦ 对方点 Approve + Merge，删掉功能分支
⑧ 回到 ①
```

## 提交信息规范

沿用现有风格（conventional commits + 中文描述）：

```text
feat: 组合分排名与趋势、百分比视图
fix: 手机端图表溢出
chore: 版本号更新为 v3.1
docs: 补充协作指南
refactor: 合并 v3–v26 版本文件
```

## 冲突处理

两人改了同一处时，后合并的人需要解决冲突：

```text
git checkout main && git pull
git merge feat/xxx          # 或在 GitHub 上点 "Update branch"
# 打开冲突文件，保留双方都需要的部分，删除 <<<< ==== >>>> 标记
git add . && git commit
```

拿不准时不要硬合，直接在 PR 里留言讨论。

## 任务管理

- **Issues**：所有待办。模板分 `功能` / `修复` / `讨论` 三类，打上 Phase 标签（`P0` 基建 / `P1` 分析引擎 / `P2` 数据自动化 / `P3` AI 教练 / `P4` 增长）
- **Projects（看板）**：待办 → 进行中 → 待审查 → 已完成，每周同步一次
- **里程碑**：按 ROADMAP 的 Phase 设置截止时间

## 部署

- 前端托管在 Vercel，`main` 分支合并即自动部署
- 数据层为 Supabase（Edge Functions + 数据库迁移），迁移 SQL 放在 `supabase/migrations/`，命名 `YYYYMMDD_描述.sql`，**只增不改**——已应用的迁移文件不可修改
- 生产环境密钥只存在于 Supabase / Vercel 的环境变量中，任何密钥不入库

## 线上验证清单（合并前自查）

- [ ] 手机端（375px 宽）主流程可用：登录 → 记录考试 → 查看图表
- [ ] 桌面端无布局错乱
- [ ] 无 console 报错
- [ ] 涉及数据的改动，新增/编辑/删除三条路径都试过
