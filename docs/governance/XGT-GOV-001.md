# XGT-GOV-001 · Harness governance pilot

Status: Draft PR / validation pending.

## Scope
- Keep `AGENTS.md` scoped to harness-kit and its documented CLI.
- Verify `package.json` Node.js requirement and scripts before changing documentation.
- Preserve Apache-2.0, `NOTICE` and `THIRD_PARTY_NOTICES`.
- Treat managed-file tracking, preview/dry-run, drift detection and rollback as regression-sensitive behavior.
- Do not copy private Vault instructions into public templates.

## Acceptance evidence
- [ ] `npm run build` result recorded
- [ ] `npm test` result recorded
- [ ] CLI help checked against documentation
- [ ] License and notice references checked
- [ ] Sensitive-content scan completed
- [ ] PR reviewed and approved

No checks are claimed to have passed merely because this file exists.
