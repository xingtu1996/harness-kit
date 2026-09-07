import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
export const BIN = path.join(ROOT, 'bin', 'harness-kit.js');

export function runCli(args, { cwd, env } = {}) {
  const r = spawnSync(process.execPath, [BIN, ...args], {
    cwd: cwd || os.tmpdir(),
    env: { ...process.env, ...(env || {}) },
    encoding: 'utf8',
  });
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

export function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'hk-test-'));
}

export function rmTmp(p) {
  fs.rmSync(p, { recursive: true, force: true });
}
