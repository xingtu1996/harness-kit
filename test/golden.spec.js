import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { runCli, tmpDir, rmTmp, ROOT } from './helpers.js';

/**
 * golden 快照测试（回归基线）：init 到 tmpDir → 受管产物树（相对路径 → sha256）与
 * test/fixtures/golden.<id>.json 比对。模板/渲染行为变更导致产物漂移即失败。
 * 再生：UPDATE_GOLDEN=1 npm test（首跑生成 fixture；二次一致幂等）。
 *
 * 确定性处理：workspace 名固定为 'ws'（模板 {{workspace}} 渲染稳定）；排除 .harness-kit/
 * （lock.createdAt / snapshots 易变）；平台探测为空目录 → 固定 claude。
 */
const PRESETS = [
  { id: 'B0', args: ['init', '--json'] },
  { id: 'presale', args: ['init', '--role', 'presale', '--json'] },
  { id: 'code-delivery', args: ['init', '--role', 'code-delivery', '--json'] },
  { id: 'content', args: ['init', '--role', 'content', '--json'] },
];

const FIXTURE_DIR = path.join(ROOT, 'test', 'fixtures');
const UPDATE = process.env.UPDATE_GOLDEN === '1';

function sha256Text(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** 目标目录产物树：相对路径（排除 .harness-kit/）→ sha256；路径归一化为 posix。 */
function collectTree(dir) {
  const tree = {};
  const walk = (cur, rel) => {
    for (const e of fs.readdirSync(cur, { withFileTypes: true })) {
      const abs = path.join(cur, e.name);
      const relp = rel ? path.join(rel, e.name) : e.name;
      const relPosix = relp.split(path.sep).join('/');
      if (e.isDirectory()) {
        if (e.name === '.harness-kit') continue;
        walk(abs, relp);
      } else if (e.isFile()) {
        tree[relPosix] = sha256Text(fs.readFileSync(abs, 'utf8'));
      }
    }
  };
  walk(dir, '');
  return Object.fromEntries(Object.entries(tree).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

for (const { id, args } of PRESETS) {
  test(`golden 产物基线：${id}`, () => {
    const root = tmpDir();
    try {
      const ws = path.join(root, 'ws'); // 固定 workspace 名 → 模板渲染确定性
      fs.mkdirSync(ws);
      const r = JSON.parse(runCli(args, { cwd: ws }).stdout);
      assert.equal(r.op, 'init');
      assert.equal(r.preset.id, id);
      assert.equal(r.written.length > 0, true);

      const tree = collectTree(ws);
      const fp = path.join(FIXTURE_DIR, `golden.${id}.json`);
      if (UPDATE) {
        fs.mkdirSync(FIXTURE_DIR, { recursive: true });
        fs.writeFileSync(fp, JSON.stringify({ id, workspace: 'ws', entries: tree }, null, 2) + '\n');
        return; // 再生即过
      }
      if (!fs.existsSync(fp)) {
        assert.fail(`fixture 缺失: ${fp} → 首跑 UPDATE_GOLDEN=1 npm test 生成`);
      }
      const want = JSON.parse(fs.readFileSync(fp, 'utf8')).entries;
      assert.deepEqual(tree, want, `${id} 产物基线漂移：模板/渲染行为变更，审后 UPDATE_GOLDEN=1 再生`);
    } finally {
      rmTmp(root);
    }
  });
}
