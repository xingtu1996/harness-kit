# Security Policy / 安全报告

`harness-kit` generates and modifies AI-agent workspace configuration, scripts, hooks and instructions. These assets may influence command execution, filesystem writes and access to local credentials.

## Private reporting

Do not post vulnerabilities, exploit payloads, credentials or private workspace contents in public issues. Prefer GitHub's private vulnerability reporting feature when enabled; otherwise use a pre-established private maintainer contact channel.

## Areas of concern

- Unintended overwrites or deletion of unmanaged files.
- Unsafe generated hooks, commands or agent instructions.
- Prompt injection or malicious content introduced through templates or mirrored assets.
- Exposure of credentials, tokens, private project paths or personal information.
- Unexpected network access or dependency changes.

Please provide a minimal, sanitized reproduction and affected version or commit. There is no promised response SLA.
