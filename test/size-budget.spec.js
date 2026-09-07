import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { runCli, tmpDir, rmTmp } from './helpers.js';

test('size 三值符合口径；B0/presale 产物 ≤ 档位预算（NF-1 预算 M~10KB；CLAUDE.md<300 行）', () => {
  for (const role of [undefined, 'presale']) {
    const dir = tmpDir();
    try {
      const args = role ? ['init', '--role', role, '--json'] : ['init', '--json'];
      const r = JSON.parse(runCli(args, { cwd: dir }).stdout);
      assert.equal(r.preset.id, role || 'B0');

      const s = JSON.parse(runCli(['size', '--json'], { cwd: dir }).stdout);
      assert.equal(s.ok, true);
      assert.equal(s.preset.id, role || 'B0');
      assert.equal(typeof s.claudeMd.bytes, 'number');
      assert.ok(s.claudeMd.lines <= 300, `CLAUDE.md ${s.claudeMd.lines} 行 > 300`);
      assert.ok(s.productsBytes <= 10 * 1024, `产物 ${s.productsBytes}B > 10KB`);
      assert.equal(s.pass, true, 'size -g 应 PASS');

      // doctor 体积值与 size 一致
      const d = JSON.parse(runCli(['doctor', '--json'], { cwd: dir }).stdout);
      assert.equal(d.size.productsKb, s.productsKb);
    } finally {
      rmTmp(dir);
    }
  }
});

test('init --role presale 产物含 No-Spec-No-Code 门禁件（A9）', () => {
  const dir = tmpDir();
  try {
    const r = JSON.parse(runCli(['init', '--role', 'presale', '--json'], { cwd: dir }).stdout);
    assert.ok(r.written.some((w) => w.path === '.claude/rules/no-spec-no-code.md'));
    const gate = fs.readFileSync(path.join(dir, '.claude', 'rules', 'no-spec-no-code.md'), 'utf8');
    assert.ok(gate.includes('No-Spec-No-Code'));
    const anchor = fs.readFileSync(path.join(dir, '.claude', 'CLAUDE.md'), 'utf8');
    assert.ok(anchor.includes('Presale'), '角色锚点应为 presale 版本');
  } finally {
    rmTmp(dir);
  }
});
