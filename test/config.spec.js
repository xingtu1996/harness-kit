import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runCli, tmpDir, rmTmp } from './helpers.js';

function doctorJson(cwd, env) {
  return JSON.parse(runCli(['doctor', '--json'], { cwd, env }).stdout);
}

test('doctor --json 含合并 config 字段（init 后项目 config 骨架存在）', () => {
  const ws = tmpDir();
  const home = tmpDir();
  try {
    runCli(['init', '--json'], { cwd: ws, env: { HOME: home } });
    const d = doctorJson(ws, { HOME: home });
    assert.equal(d.ok, true);
    assert.ok(d.config && typeof d.config === 'object', 'doctor 应含 config 字段');
    assert.equal(d.config.defaultPlatform, 'claude');
    assert.equal(d.config.defaultRole, null);
    assert.equal(d.config.budget, 'M');
    assert.deepEqual(d.config.features, {}, '骨架 features 为空 → 不覆盖用户级全局默认');
    assert.equal(d.configSources.project, true, 'init 应写 .harness-kit/config.json');
  } finally {
    rmTmp(ws);
    rmTmp(home);
  }
});

test('项目 config.json 覆盖 defaultRole/features 在 doctor 生效（含 reflow 占位建议）', () => {
  const ws = tmpDir();
  const home = tmpDir();
  try {
    runCli(['init', '--json'], { cwd: ws, env: { HOME: home } });
    fs.writeFileSync(
      path.join(ws, '.harness-kit', 'config.json'),
      JSON.stringify({ defaultRole: 'content', features: { reflow: true } }, null, 2) + '\n',
    );
    const d = doctorJson(ws, { HOME: home });
    assert.equal(d.config.defaultRole, 'content', '项目 config 应覆盖内置/用户级');
    assert.equal(d.config.features.reflow, true);
    const tips = (d.suggestions || []).join(' ');
    assert.match(tips, /reflow/, 'features.reflow=true 应触发占位建议');
  } finally {
    rmTmp(ws);
    rmTmp(home);
  }
});

test('项目 config 覆盖用户级 config（四级合并优先级）', () => {
  const ws = tmpDir();
  const home = tmpDir();
  try {
    fs.mkdirSync(path.join(home, '.harness-kit'), { recursive: true });
    fs.writeFileSync(path.join(home, '.harness-kit', 'config.json'), JSON.stringify({ defaultRole: 'presale' }, null, 2) + '\n');
    runCli(['init', '--json'], { cwd: ws, env: { HOME: home } }); // init 写项目骨架 defaultRole=null（惰性，不覆盖用户级）
    // 项目骨架 defaultRole=null → 回退用户级 presale
    let d = doctorJson(ws, { HOME: home });
    assert.equal(d.config.defaultRole, 'presale', '项目骨架 null 应回退用户级 presale');
    // 项目显式改 content → 覆盖用户级 presale
    fs.writeFileSync(path.join(ws, '.harness-kit', 'config.json'), JSON.stringify({ defaultRole: 'content' }, null, 2) + '\n');
    d = doctorJson(ws, { HOME: home });
    assert.equal(d.config.defaultRole, 'content', '项目 content 覆盖用户级 presale');
  } finally {
    rmTmp(ws);
    rmTmp(home);
  }
});

test('无 config（删项目文件 + 无用户级）→ 内置默认', () => {
  const ws = tmpDir();
  const home = tmpDir();
  try {
    runCli(['init', '--json'], { cwd: ws, env: { HOME: home } });
    fs.rmSync(path.join(ws, '.harness-kit', 'config.json'));
    const d = doctorJson(ws, { HOME: home });
    assert.equal(d.config.defaultRole, null, '内置默认 defaultRole 为 null');
    assert.equal(d.config.defaultPlatform, 'claude');
    assert.equal(d.configSources.project, false);
    assert.equal(d.configSources.user, false);
  } finally {
    rmTmp(ws);
    rmTmp(home);
  }
});
