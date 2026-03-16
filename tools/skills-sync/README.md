# Skills Sync Snapshot

本目录用于同步当前这台机器上的 skills 到另一台电脑。

## 目录说明

- `agents/`：对应 `~/.agents/skills/`
- `codex/`：对应 `~/.codex/skills/`
- `MANIFEST.md`：当前快照中的 skill 清单
- `sync-to-local.sh`：将本目录快照同步回本机默认 skill 目录

## 使用方式

在另一台电脑拉取仓库后执行：

```bash
cd /path/to/crab-miniapp/tools/skills-sync
bash sync-to-local.sh
```

执行后会把本目录下的 skill 快照复制到：

- `~/.agents/skills/`
- `~/.codex/skills/`

说明：

1. 默认是追加/覆盖同名 skill，不会删除目标目录里其他未纳入快照的 skill。
2. 本目录是一次仓库快照，后续若本机 skill 有更新，建议重新同步并再次提交。
3. 若另一台电脑使用的 Codex 或 Agent 版本不同，系统内置 skill 仍可能存在差异，以实际环境为准。
