# AGENTS.md — harness-kit

## Project context
This repository builds reversible, role-based AI-agent workspaces. It manages generated configuration and tracks drift; `README.md` and `package.json` describe the current CLI.

## Local development
- Runtime: Node.js >=20 (per `package.json`).
- Run `npm run build` for syntax checks and `npm test` for tests.
- CLI entry point: `bin/harness-kit.js`. Inspect `--help` and source before assuming exact flags.
- Preserve dry-run/preview paths, managed-file tracking, drift detection, and rollback behavior. Do not overwrite user-modified or unmanaged files silently.
- Treat generated hooks, agent instructions, scripts, and third-party templates as potential supply-chain risks. Never embed secrets.
- Keep mirrored assets attributed to their upstream repositories; preserve Apache-2.0 and associated notices.

## Shared skills and governance
Use selected, reviewed skills from `xingtu1996/xingtu-skills` only through an explicit supported installation/discovery path. A separate repository's `AGENTS.md` does not automatically apply here. Do not expose private Vault policy contents.

## Delivery
Work on an isolated branch, review proposed file writes, run applicable checks, and record verified outcomes in a Draft PR.

## Codex 本地仓库工作流程

- 标准工程目录为行途工作区的 `github/harness-kit/`。开始任务先在此处核对 Git 根目录、工作区状态、`origin`、分支/上游和同目标 PR；默认在此本地工作树操作，不另建 `/tmp` Clone。
- 按“本地修改 → 适用检查 → 隔离分支 commit → push → 核验本地、远端分支和 PR head SHA”交付；仅在 SHA 一致、PR 文件清单包含改动且工作区干净时报告已同步。
- 已有同目标 PR 时优先续用其分支并核查 base/head 和 changed files，避免重复开 PR；不得自动合并。
- 标准 Clone 不可用或远端异常时保留现场并说明证据；临时 Clone 仅作为说明原因后的例外，并确保改动回到标准工程目录。
