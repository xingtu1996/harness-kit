import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runCli, tmpDir, rmTmp } from './helpers.js';

/** 构建临时 preset 根：含 normal 与 hook(高敏) 模块的探测 preset */
function makeProbePreset() {
  const root = tmpDir();
  const probeDir = path.join(root, 'probe');
  fs.mkdirSync(probeDir, { recursive: true });
  fs.writeFileSync(
    path.join(probeDir, 'manifest.json'),
    JSON.stringify(
      {
        schemaVersion: '0',
        id: 'probe',
        name: 'sensitivity probe',
        weight: 'M',
        modules: [
          { id: 'probe.note', path: 'note.md', scope: 'base', sensitivity: 'normal', dest: 'note.md' },
          { id: 'probe.hook', path: 'hook.js', scope: 'base', sensitivity: 'hook', dest: '.claude/hooks/test-hook.js' },
        ],
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(path.join(probeDir, 'note.md'), '***REMOVED*** note\nnormal content\n');
  fs.writeFileSync(path.join(probeDir, 'hook.js'), '***REMOVED***!/usr/bin/env node\nconsole.log("hook")\n');
  return root;
}

test('dest 越界（.. / 绝对路径）被拒，不外泄到受管根之外（A7）', () => {
  const dir = tmpDir();
  const presets = tmpDir();
  const evilDir = path.join(presets, 'evil');
  fs.mkdirSync(evilDir, { recursive: true });
  fs.writeFileSync(
    path.join(evilDir, 'manifest.json'),
    JSON.stringify({
      schemaVersion: '0',
      id: 'evil',
      name: 'evil',
      modules: [
        { id: 'evil.escape', path: 'x.md', scope: 'base', sensitivity: 'normal', dest: '../escape.md' },
      ],
    }),
  );
  fs.writeFileSync(path.join(evilDir, 'x.md'), '***REMOVED*** x\n');
  try {
    const r = runCli(['init', '--role', 'evil', '--json'], { cwd: dir, env: { HARNESS_KIT_PRESETS_DIR: presets } });
    assert.notEqual(r.code, 0, 'dest 越界应报错退出');
    assert.equal(fs.existsSync(path.join(dir, '..', 'escape.md')), false, '不得写到受管根外');
  } finally {
    rmTmp(dir);
    rmTmp(presets);
  }
});

test('高敏(hook)模块：未 --trust 不进写；--trust 放行（A5）', () => {
  const dir = tmpDir();
  const presets = makeProbePreset();
  const env = { HARNESS_KIT_PRESETS_DIR: presets };
  try {
    // 1) 无 --trust → hook 不进写，normal 进写
    const r1 = JSON.parse(runCli(['init', '--role', 'probe', '--json'], { cwd: dir, env }).stdout);
    assert.ok(fs.existsSync(path.join(dir, 'note.md')), 'normal 应写入');
    assert.equal(fs.existsSync(path.join(dir, '.claude', 'hooks', 'test-hook.js')), false, 'hook 不得写入');
    assert.ok(r1.skippedSensitive.some((s) => s.path === '.claude/hooks/test-hook.js'), '应报高敏跳过');
    let lock = JSON.parse(fs.readFileSync(path.join(dir, '.harness-kit', 'lock'), 'utf8'));
    assert.ok(!lock.files.some((f) => f.path.includes('hooks')), 'lock 不含未写 hook');

    // 2) 加 --trust → hook 写入，lock 更新
    const r2 = JSON.parse(runCli(['init', '--role', 'probe', '--trust', '--json'], { cwd: dir, env }).stdout);
    assert.equal(fs.existsSync(path.join(dir, '.claude', 'hooks', 'test-hook.js')), true, '--trust 后 hook 写入');
    assert.equal(r2.skippedSensitive.length, 0);
    lock = JSON.parse(fs.readFileSync(path.join(dir, '.harness-kit', 'lock'), 'utf8'));
    assert.ok(lock.files.some((f) => f.path === '.claude/hooks/test-hook.js'), 'lock 应含 hook');
  } finally {
    rmTmp(dir);
    rmTmp(presets);
  }
});
