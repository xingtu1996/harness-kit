import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runCli, tmpDir, rmTmp, ROOT } from './helpers.js';

/** 临时 presets 副本（含 B0） + 固定名工作区 'ws'（模板渲染确定性） */
function makeWsWithPresets() {
  const root = tmpDir();
  const presets = path.join(root, 'presets');
  const ws = path.join(root, 'ws');
  fs.mkdirSync(path.join(presets), { recursive: true });
  fs.mkdirSync(ws);
  fs.cpSync(path.join(ROOT, 'presets', 'B0'), path.join(presets, 'B0'), { recursive: true });
  return { root, presets, ws, env: { HARNESS_KIT_PRESETS_DIR: presets } };
}

test('upgrade：无 lock → no-lock，报需先 init', () => {
  const dir = tmpDir();
  try {
    const u = JSON.parse(runCli(['upgrade', '--json'], { cwd: dir }).stdout);
    assert.equal(u.op, 'upgrade');
    assert.equal(u.ok, false);
    assert.equal(u.error, 'no-lock');
  } finally {
    rmTmp(dir);
  }
});

test('upgrade：lock.presetSha 与当前 bundled sha 相同 → 已最新', () => {
  const root = tmpDir();
  const ws = path.join(root, 'ws');
  fs.mkdirSync(ws);
  try {
    runCli(['init', '--json'], { cwd: ws });
    const u = JSON.parse(runCli(['upgrade', '--json'], { cwd: ws }).stdout);
    assert.equal(u.ok, true);
    assert.equal(u.status, 'up-to-date');
    assert.equal(u.preset.needsUpgrade, false);
    assert.equal(u.changes.length, 0);
  } finally {
    rmTmp(root);
  }
});

test('upgrade：lock sha ≠ 当前 preset sha → 列新增/变更 + needs-apply（dry-run 不落盘）', () => {
  const { root, presets, ws, env } = makeWsWithPresets();
  try {
    runCli(['init', '--json'], { cwd: ws, env });
    // 篡改 B0 源文件 → bundled preset sha 变化（模拟新版 preset 发布）
    const anchorSrc = path.join(presets, 'B0', 'CLAUDE.md');
    fs.appendFileSync(anchorSrc, '\n***REMOVED*** v2 upgrade 测试行\n');

    const u = JSON.parse(runCli(['upgrade', '--json'], { cwd: ws, env }).stdout);
    assert.equal(u.op, 'upgrade');
    assert.equal(u.ok, true);
    assert.equal(u.preset.needsUpgrade, true);
    assert.equal(u.status, 'needs-apply');
    const c = u.changes.find((x) => x.path === '.claude/CLAUDE.md');
    assert.ok(c, '应列出 .claude/CLAUDE.md 变更');
    assert.equal(c.state, 'changed');
    assert.notEqual(c.oldHash, c.newHash);
    // dry-run 不落盘：磁盘 .claude/CLAUDE.md 仍为旧内容
    const disk = fs.readFileSync(path.join(ws, '.claude', 'CLAUDE.md'), 'utf8');
    assert.ok(!disk.includes('v2 upgrade 测试行'), 'dry-run 不得写盘');
  } finally {
    rmTmp(root);
  }
});

test('upgrade --apply：渲染写盘 + 刷新 lock 至最新 sha；二次 upgrade 报已最新', () => {
  const { root, presets, ws, env } = makeWsWithPresets();
  try {
    runCli(['init', '--json'], { cwd: ws, env });
    fs.appendFileSync(path.join(presets, 'B0', 'CLAUDE.md'), '\n***REMOVED*** v2 upgrade 测试行\n');

    const a = JSON.parse(runCli(['upgrade', '--apply', '--json'], { cwd: ws, env }).stdout);
    assert.equal(a.ok, true);
    assert.equal(a.status, 'applied');
    assert.ok(a.applied.some((x) => x.path === '.claude/CLAUDE.md'), '应应用锚点变更');
    const disk = fs.readFileSync(path.join(ws, '.claude', 'CLAUDE.md'), 'utf8');
    assert.ok(disk.includes('v2 upgrade 测试行'), '--apply 应写盘新内容');

    const lock = JSON.parse(fs.readFileSync(path.join(ws, '.harness-kit', 'lock'), 'utf8'));
    assert.equal(lock.preset.sha, a.preset.currentSha, 'lock.preset.sha 应刷新为当前 sha');

    const u2 = JSON.parse(runCli(['upgrade', '--json'], { cwd: ws, env }).stdout);
    assert.equal(u2.status, 'up-to-date', '二次 upgrade 应报已最新（幂等）');
  } finally {
    rmTmp(root);
  }
});

test('upgrade --stage：v0.1 打印跨阶段转换占位（convert 未实现）', () => {
  const root = tmpDir();
  const ws = path.join(root, 'ws');
  fs.mkdirSync(ws);
  try {
    runCli(['init', '--json'], { cwd: ws });
    const u = JSON.parse(runCli(['upgrade', '--stage', 'presale→coding', '--json'], { cwd: ws }).stdout);
    assert.equal(u.op, 'upgrade');
    assert.equal(u.status, 'stage-placeholder');
    assert.equal(u.convertImplemented, false);
    assert.equal(u.stage, 'presale→coding');
    assert.match((u.guidance || []).join(' '), /FR-4\/01/);
  } finally {
    rmTmp(root);
  }
});
