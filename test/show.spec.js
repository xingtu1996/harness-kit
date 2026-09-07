import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runCli, tmpDir, rmTmp } from './helpers.js';

test('show managed：init 后列出受管文件（全 ok）', () => {
  const dir = tmpDir();
  try {
    runCli(['init', '--json'], { cwd: dir });
    const r = JSON.parse(runCli(['show', 'managed', '--json'], { cwd: dir }).stdout);
    assert.equal(r.op, 'show');
    assert.equal(r.sub, 'managed');
    assert.equal(r.ok, true);
    assert.equal(r.managed.total, r.managed.ok);
    assert.equal(r.managed.missing, 0);
    assert.equal(r.managed.drift, 0);
    assert.ok(r.files.some((f) => f.path === '.claude/CLAUDE.md' && f.state === 'ok'));
    assert.ok(r.files.some((f) => f.path === 'AGENTS.md' && f.state === 'ok'));
    assert.equal(r.files.length, r.managed.total, 'files 列表应逐条对应受管文件');
  } finally {
    rmTmp(dir);
  }
});

test('show managed：删一受管文件 → missing', () => {
  const dir = tmpDir();
  try {
    runCli(['init', '--json'], { cwd: dir });
    const tpl = path.join(dir, '.claude', 'templates', '理念-第一性原理.md');
    fs.rmSync(tpl);
    const r = JSON.parse(runCli(['show', 'managed', '--json'], { cwd: dir }).stdout);
    assert.equal(r.ok, true);
    assert.ok(r.managed.missing >= 1, '应报 missing');
    assert.ok(r.managed.ok < r.managed.total);
    assert.ok(
      r.files.some((f) => f.path.endsWith('理念-第一性原理.md') && f.state === 'missing'),
      '被删文件应列 missing',
    );
  } finally {
    rmTmp(dir);
  }
});

test('show managed：无 lock → no-lock', () => {
  const dir = tmpDir();
  try {
    const r = JSON.parse(runCli(['show', 'managed', '--json'], { cwd: dir }).stdout);
    assert.equal(r.op, 'show');
    assert.equal(r.ok, false);
    assert.equal(r.error, 'no-lock');
  } finally {
    rmTmp(dir);
  }
});

test('show 未知子命令 → 报错', () => {
  const dir = tmpDir();
  try {
    const r = runCli(['show', 'bogus'], { cwd: dir });
    assert.notEqual(r.code, 0);
    assert.match(r.stdout, /仅支持 managed/);
  } finally {
    rmTmp(dir);
  }
});
