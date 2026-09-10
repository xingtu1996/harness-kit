import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runCli, tmpDir, rmTmp } from './helpers.js';

test('patch 纯 lock 驱动：报 missing/drift，--apply 补缺但不覆盖手改', () => {
  const dir = tmpDir();
  try {
    runCli(['init', '--json'], { cwd: dir });
    const anchor = path.join(dir, '.claude', 'CLAUDE.md');
    const tpl = path.join(dir, '.claude', 'templates', '理念-第一性原理.md');

    // 制造 missing + drift
    fs.rmSync(tpl);
    fs.appendFileSync(anchor, '\n# 本地手改测试\n');

    const p = JSON.parse(runCli(['patch', '--json'], { cwd: dir }).stdout);
    assert.equal(p.op, 'patch');
    assert.equal(p.ok, true);
    assert.ok(p.summary.missing >= 1, '应报缺失');
    assert.ok(p.summary.drift >= 1, '应报漂移');
    assert.ok(p.files.some((f) => f.path.endsWith('理念-第一性原理.md') && f.state === 'missing'));
    assert.ok(p.files.some((f) => f.path === '.claude/CLAUDE.md' && f.state === 'drift'));

    // dry-run 不落盘
    const before = fs.existsSync(tpl);
    assert.equal(before, false);

    // --apply 补缺（missing 恢复），漂移保留手改不覆盖
    const a = JSON.parse(runCli(['patch', '--apply', '--json'], { cwd: dir }).stdout);
    assert.ok(a.applied.some((x) => x.path.endsWith('理念-第一性原理.md')), '缺失模板应被补');
    assert.equal(fs.existsSync(tpl), true);
    const anchorText = fs.readFileSync(anchor, 'utf8');
    assert.ok(anchorText.includes('# 本地手改测试'), '手改内容不得被覆盖（v0.1 尊重手改）');

    // 漂移仍在（未覆盖手改 → 仍报 drift）
    const p2 = JSON.parse(runCli(['patch', '--json'], { cwd: dir }).stdout);
    assert.equal(p2.summary.drift, 1, '漂移应仍为 1');
    assert.equal(p2.summary.missing, 0);
  } finally {
    rmTmp(dir);
  }
});

test('patch：无 lock 目录报 no-lock，拒绝空跑', () => {
  const dir = tmpDir();
  try {
    const p = JSON.parse(runCli(['patch', '--json'], { cwd: dir }).stdout);
    assert.equal(p.ok, false);
    assert.equal(p.error, 'no-lock');
  } finally {
    rmTmp(dir);
  }
});
