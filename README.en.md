# harness-kit — Reversible Agent Workspace Generator

[简体中文](README.md) | English

harness-kit creates and maintains role-based Agent workspaces, with managed-file tracking, drift detection and rollback-oriented workflows. It is designed for explicit, reviewable changes rather than silent overwrites.

## Getting started

The primary [Chinese README](README.md) documents the supported CLI commands and presets. Inspect `package.json` and the CLI help output for current Node.js requirements and exact flags before running them.

Common workflows include workspace initialization, patching, upgrades, diagnostics and managed-file inspection. Always preview intended changes and preserve backups before applying configuration updates.

## Development

Consult `package.json` for the available scripts. Run applicable tests and syntax checks in a safe environment and report actual outcomes; documentation alone does not establish test success.

## Agent guidance and security

See [AGENTS.md](AGENTS.md) for project-specific agent rules and [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidance. Treat generated hooks, shell commands and external templates as supply-chain inputs. Do not expose credentials or modify unmanaged user files silently.

## License

[Apache-2.0](LICENSE). Retain applicable attribution and third-party notices.
