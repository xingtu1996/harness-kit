import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runCli, tmpDir, rmTmp } from './helpers.js';

function readLock(ws) {
  return JSON.parse(fs.readFileSync(path.join(ws, '.harness-kit', 'lock'), 'utf8'));
}

test('convert：dry-run 列 presale→code-delivery 新增/变更/移出受管清单（不落盘）', () => {
  const ws = tmpDir();
  try {
    runCli(['init', '--role', 'presale', '--json'], { cwd: ws });
    const c = JSON.parse(runCli(['convert', '--role', 'code-delivery', '--json'], { cwd: ws }).stdout);
    assert.equal(c.op, 'convert');
    assert.equal(c.ok, true);
    assert.equal(c.status, 'needs-apply');
    assert.equal(c.from.id, 'presale');
    assert.equal(c.to.id, 'code-delivery');
    assert.ok(c.added.some((x) => x.path.endsWith('coding-gate.md')), '应列出新增 coding-gate');
    assert.ok(c.changed.some((x) => x.path === '.claude/CLAUDE.md'), '应列出锚点变更（presale→code-delivery）');
    assert.ok(c.removed.some((x) => x.path.includes('no-spec-no-code')), '应把旧角色专属件列 remove-candidate');
    // dry-run 不落盘
    assert.equal(fs.existsSync(path.join(ws, '.claude', 'rules', 'coding-gate.md')), false, 'dry-run 不得写盘');
  } finally {
    rmTmp(ws);
  }
});

test('convert --apply：切到 code-delivery + lock.presetId 变化 + doctor 通过；旧件盘上保留不移出受管', () => {
  const ws = tmpDir();
  try {
    runCli(['init', '--role', 'presale', '--json'], { cwd: ws });
    const a = JSON.parse(runCli(['convert', '--role', 'code-delivery', '--apply', '--json'], { cwd: ws }).stdout);
    assert.equal(a.ok, true);
    assert.equal(a.status, 'applied');
    assert.equal(a.to.id, 'code-delivery');
    assert.ok(a.applied.some((x) => x.path.endsWith('coding-gate.md')), 'coding-gate 应被写盘');

    const lock = readLock(ws);
    assert.equal(lock.preset.id, 'code-delivery', 'lock.preset.id 应刷新');
    assert.equal(lock.preset.sha, a.to.sha);

    // 新角色门禁件在；旧角色件盘上保留但不再受管
    assert.equal(fs.existsSync(path.join(ws, '.claude', 'rules', 'coding-gate.md')), true);
    assert.equal(fs.existsSync(path.join(ws, '.claude', 'rules', 'no-spec-no-code.md')), true, '旧角色件不得被删盘');
    assert.ok(!lock.files.some((f) => f.path.includes('no-spec-no-code')), '旧角色件应从 lock 移除受管标记');

    // doctor 通过：旧件不在 lock → 不再报漂移/missing
    const d = JSON.parse(runCli(['doctor', '--json'], { cwd: ws }).stdout);
    assert.equal(d.ok, true);
    assert.equal(d.preset.id, 'code-delivery');
    assert.equal(d.managed.missing, 0);
    assert.equal(d.managed.drift, 0);
  } finally {
    rmTmp(ws);
  }
});

test('convert：手改漂移（锚点被手改）→ 原子阻断，不写盘不改 lock', () => {
  const ws = tmpDir();
  try {
    runCli(['init', '--role', 'presale', '--json'], { cwd: ws });
    const anchor = path.join(ws, '.claude', 'CLAUDE.md');
    fs.appendFileSync(anchor, '\n# 手改测试\n');

    const c = JSON.parse(runCli(['convert', '--role', 'code-delivery', '--apply', '--json'], { cwd: ws }).stdout);
    assert.equal(c.ok, true);
    assert.equal(c.status, 'blocked');
    assert.ok(c.blocked.some((b) => b.path === '.claude/CLAUDE.md' && b.reason === 'drift'), '漂移锚点应被阻断');
    assert.equal(readLock(ws).preset.id, 'presale', '阻断时 lock.preset.id 不得变');
    assert.equal(fs.existsSync(path.join(ws, '.claude', 'rules', 'coding-gate.md')), false, '阻断时不得写新门禁件');
    assert.ok(fs.readFileSync(anchor, 'utf8').includes('# 手改测试'), '手改内容不得被覆盖');
  } finally {
    rmTmp(ws);
  }
});

test('convert：无 lock → no-lock，需先 init', () => {
  const dir = tmpDir();
  try {
    const c = JSON.parse(runCli(['convert', '--role', 'code-delivery', '--json'], { cwd: dir }).stdout);
    assert.equal(c.ok, false);
    assert.equal(c.error, 'no-lock');
  } finally {
    rmTmp(dir);
  }
});

test('convert：同 id → same-role，提示走 upgrade', () => {
  const ws = tmpDir();
  try {
    runCli(['init', '--role', 'presale', '--json'], { cwd: ws });
    const c = JSON.parse(runCli(['convert', '--role', 'presale', '--json'], { cwd: ws }).stdout);
    assert.equal(c.ok, false);
    assert.equal(c.error, 'same-role');
    assert.match(c.message, /upgrade/);
  } finally {
    rmTmp(ws);
  }
});

test('convert：缺 --role → missing-role', () => {
  const ws = tmpDir();
  try {
    runCli(['init', '--json'], { cwd: ws });
    const c = JSON.parse(runCli(['convert', '--json'], { cwd: ws }).stdout);
    assert.equal(c.ok, false);
    assert.equal(c.error, 'missing-role');
  } finally {
    rmTmp(ws);
  }
});
