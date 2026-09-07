import fs from 'node:fs';
import path from 'node:path';
import { readLock, writeLock, measureLockedFiles, classifyFiles, lockAbs } from './lock.js';
import { resolvePresets, planModules, treeSha } from './preset.js';
import { isHighSensitivity } from './detect.js';
import { renderFile, renderVars } from './render.js';
import { validateDest, isFile, sha256Text } from './util.js';
import { snapshotBeforeWrite } from './snapshot.js';

/**
 * patch = 纯 lock 驱动（A8）：参照 = init 冻结于 lock 的受管路径 + 内容 sha。
 * 绝不 consult 目标工作区“已装 preset”。lock.presetSha ≠ 当前包 sha → 指引 upgrade，拒绝新写。
 * v0.1 行为：补缺失文件 + 报告漂移；漂移（手改）永不覆盖，处置指引走 M3+ upgrade（A3）。
 */
export async function patch(opts) {
  const targetDir = path.resolve(opts.cwd || process.cwd());
  const lock = readLock(targetDir);
  if (!lock || lock._corrupt) {
    return {
      op: 'patch',
      ok: false,
      error: lock?._corrupt ? 'lock-corrupt' : 'no-lock',
      message: '目标目录无有效 .harness-kit/lock —— 先跑 `kit init` 生成受管基座，patch 才能纯 lock 驱动。',
    };
  }

  const role = lock.preset.id === 'B0' ? null : lock.preset.id;
  let currentSha = null;
  let presetList = [];
  let plan = [];
  let presetErr = null;
  try {
    presetList = resolvePresets({ role });
    plan = planModules(presetList);
    currentSha = treeSha(plan);
  } catch (e) {
    presetErr = e.message;
  }

  const needsUpgrade = presetErr ? true : currentSha !== lock.preset.sha;
  const vars = renderVars({
    workspace: path.basename(targetDir),
    role: role || '待定',
    platform: lock.platform || 'claude',
  });
  const planByDest = new Map(plan.map((e) => [e.module.dest, e]));

  let measured = measureLockedFiles(targetDir, lock);
  let cls = classifyFiles(lock, measured);
  const trust = !!opts.trust;
  const willApply = opts.apply === true && !opts.dryRun;

  const applied = [];
  const skipped = [];
  const guidance = [];

  // 补缺：仅当 sha 一致（否则新写会混入新版本内容 → 拒绝，走 upgrade）
  if (cls.missing.length) {
    if (needsUpgrade) {
      guidance.push('lock.presetSha ≠ 当前包 preset sha：preset 有更新，请走 upgrade；v0.1 拒绝混写新版本内容。');
    } else if (willApply) {
      const dests = cls.missing.map((m) => m.path);
      const snap = snapshotBeforeWrite(targetDir, dests, { purge: opts.purge });
      const missingEntries = cls.missing.map((m) => ({ ...m, entry: planByDest.get(m.path) }));
      for (const m of missingEntries) {
        if (!m.entry) {
          guidance.push(`缺失文件 ${m.path} 在当前 preset 中无对应模块，跳过（如需请升级）。`);
          continue;
        }
        if (isHighSensitivity(m.entry.module.sensitivity) && !trust) {
          skipped.push({ path: m.path, sensitivity: m.entry.module.sensitivity });
          continue;
        }
        const v = validateDest(m.entry.module.dest, targetDir);
        if (!v.ok) {
          guidance.push(`${m.path} dest 越界已拦截: ${v.reason}`);
          continue;
        }
        const { changed } = renderFile(m.entry, vars, targetDir, m.entry.module.dest);
        if (changed) {
          const abs = path.join(targetDir, m.path);
          applied.push({
            path: m.path,
            hash: sha256Text(fs.readFileSync(abs, 'utf8')),
            scope: m.entry.module.scope,
            sensitivity: m.entry.module.sensitivity || 'normal',
            weight: m.entry.module.weight || 'resident',
          });
        }
      }
      if (applied.length) {
        // 更新 lock：合并 restored 条目
        const merged = [...lock.files];
        for (const a of applied) {
          const i = merged.findIndex((f) => f.path === a.path);
          const rec = { path: a.path, hash: a.hash, scope: a.scope, sensitivity: a.sensitivity, weight: a.weight };
          if (i >= 0) merged[i] = rec;
          else merged.push(rec);
        }
        const newLock = { ...lock, files: merged };
        writeLock(targetDir, newLock);
        measured = measureLockedFiles(targetDir, newLock);
        cls = classifyFiles(newLock, measured);
      }
    } else {
      guidance.push(`缺失 ${cls.missing.length} 个受管文件：` + cls.missing.map((m) => m.path).join(', ') + ' → `--apply` 补缺。');
    }
  }

  if (cls.drift.length) {
    guidance.push(
      `漂移 ${cls.drift.length} 个受管文件（手改，kit v0.1 尊重不覆盖）：` +
        cls.drift.map((d) => d.path).join(', ') +
        ' → 保留手改；内容升级走 M3+ upgrade（快照+人 gate）。',
    );
  }
  if (skipped.length) {
    guidance.push(`高敏缺失需 --trust 人审后才补：` + skipped.map((s) => s.path).join(', '));
  }

  return {
    op: 'patch',
    ok: true,
    targetDir,
    preset: {
      lockSha: lock.preset.sha,
      currentSha,
      id: lock.preset.id,
      needsUpgrade,
      presetError: presetErr,
    },
    summary: { ok: cls.ok.length, missing: cls.missing.length, drift: cls.drift.length },
    files: [
      ...cls.ok.map((f) => ({ path: f.path, state: 'ok' })),
      ...cls.missing.map((f) => ({ path: f.path, state: 'missing' })),
      ...cls.drift.map((f) => ({ path: f.path, state: 'drift' })),
    ].sort((a, b) => (a.path < b.path ? -1 : 1)),
    applied,
    skipped,
    guidance,
    lockPath: lockAbs(targetDir),
  };
}
