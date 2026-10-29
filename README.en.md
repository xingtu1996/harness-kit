# harness-kit — Role-based Agent Harness Workspace Generator

**harness-kit** helps create and maintain a controlled, reversible workspace for AI agents. It focuses on constraints, knowledge routing, mechanical checks and repeatable workflows rather than relying on model behavior alone.

The [Chinese README](README.md) is the primary detailed reference. This English guide provides a compact entry point.

## Core concepts

- **Role presets:** start with a common baseline and tailor the workspace for different responsibilities.
- **Managed configuration:** track generated files and detect drift instead of silently overwriting user changes.
- **Reviewable operations:** inspect proposed changes before applying them; preserve a rollback path.
- **Machine-readable diagnostics:** JSON output supports scripted or agent-assisted checks.

## Command overview

The project README documents these commands: `init`, `patch`, `upgrade`, `doctor`, `size`, `show managed`, `convert`, and `agent-prompt`. Some operations require role or other arguments; consult the CLI help and the [main README](README.md) before running them.

## Requirements and safety

The main README specifies Node.js 20 or later. Review proposed filesystem modifications before execution, especially in existing workspaces. Never commit credentials or internal company data to a generated workspace.

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

## License

[Apache License 2.0](LICENSE). The independent repositories linked from the main README remain authoritative for their own assets and may have different license terms.
