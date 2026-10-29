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
