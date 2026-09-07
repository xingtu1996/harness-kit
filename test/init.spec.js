import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runCli, tmpDir, rmTmp } from './helpers.js';

test('空目录 init 无 --role → B0 基座 + lock；--json 可解析；二次 init 幂等', () => {
  const dir = tmpDir();
  try {
    const r1 = runCli(['init', '--json'], { cwd: dir });
    assert.equal(r1.code, 0, r1.stderr);
    const out = JSON.parse(r1.stdout);

    assert.equal(out.op, 'init');
    assert.equal(out.preset.id, 'B0');
    assert.equal(out.platform.platform, 'claude');
    assert.ok(out.written.some((w) => w.path === '.claude/CLAUDE.md'));
    assert.ok(out.written.some((w) => w.path === 'AGENTS.md'));
    assert.ok(out.written.some((w) => w.path.endsWith('理念-第一性原理.md')));

    // 落盘校验
    for (const w of out.written) {
      assert.ok(fs.existsSync(path.join(dir, w.path)), `缺失: ${w.path}`);
    }
    const lock = JSON.parse(fs.readFileSync(path.join(dir, '.harness-kit', 'lock'), 'utf8'));
    assert.equal(lock.preset.id, 'B0');
    assert.equal(lock.files.length, out.written.length);
    assert.ok(lock.preset.sha);
    // CLAUDE.md 模板变量已替换（无 {{ }} 残留）
    const claude = fs.readFileSync(path.join(dir, '.claude', 'CLAUDE.md'), 'utf8');
    assert.ok(!claude.includes('{{role}}'), '模板变量应已替换');

    // 非 TTY 不交互（stdout 无提示输入行、无挂起）—— r1 已正常返回即证

    // 二次 init → 幂等
    const r2 = runCli(['init', '--json'], { cwd: dir });
    const out2 = JSON.parse(r2.stdout);
    assert.equal(r2.code, 0);
    assert.equal(out2.changed, false);
    const lock2 = JSON.parse(fs.readFileSync(path.join(dir, '.harness-kit', 'lock'), 'utf8'));
    assert.equal(lock2.createdAt, lock.createdAt, 'lock 内容不应变化（幂等）');

    // patch --json：初始无缺失无漂移
    const p = JSON.parse(runCli(['patch', '--json'], { cwd: dir }).stdout);
    assert.equal(p.summary.ok, lock.files.length);
    assert.equal(p.summary.missing, 0);
    assert.equal(p.summary.drift, 0);
  } finally {
    rmTmp(dir);
  }
});

test('doctor / size --json 输出三值可解析', () => {
  const dir = tmpDir();
  try {
    runCli(['init'], { cwd: dir });
    const d = JSON.parse(runCli(['doctor', '--json'], { cwd: dir }).stdout);
    assert.equal(d.op, 'doctor');
    assert.equal(d.ok, true);
    assert.equal(d.managed.total, d.managed.ok);
    assert.ok('claudeMd' in d.size && 'residentRules' in d.size && 'productsKb' in d.size);

    const s = JSON.parse(runCli(['size', '--json'], { cwd: dir }).stdout);
    assert.equal(s.op, 'size');
    assert.equal(typeof s.claudeMd.lines, 'number');
    assert.equal(typeof s.productsKb, 'number');
    assert.equal(s.pass, true);
  } finally {
    rmTmp(dir);
  }
});

test('manifest.schema.v0.json 与内置 preset manifest 校验通过', async () => {
  const { loadSchema, loadManifest, validateManifest } = await import('../src/manifest.js');
  const schema = loadSchema();
  for (const id of ['B0', 'presale']) {
    const { presetDirOf } = await import('../src/preset.js');
    const m = loadManifest(presetDirOf(id));
    const errs = validateManifest(m, schema);
    assert.deepEqual(errs, [], `${id} manifest 应零错误，实际: ${errs.join('; ')}`);
  }
});
