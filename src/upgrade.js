import path from 'node:path';
import { readLock, writeLock, lockAbs } from './lock.js';
import { resolvePresets, planModules, treeSha } from './preset.js';
import { isHighSensitivity } from './detect.js';
import { renderContent, renderFile, renderVars } from './render.js';
import { validateDest, isFile, sha256File, sha256Text } from './util.js';
import { snapshotBeforeWrite } from './snapshot.js';

/**
 * upgrade = 纯 lock 驱动升级（M3 骨架，A3）：参照 = lock 记的 preset.id/presetSha。
 * lock.presetSha ≠ 当前 bundled preset sha → 列本 preset 相对旧 sha 的 新增/变更 清单；
 * `--apply` 才渲染写盘（写前快照）并刷新 lock。无 lock → 需先 init。
 * convert（跨角色/跨阶段转换）未实现：`--stage` 只打印占位指引（见 spec FR-4/01）。
 * 手改漂移 / 目标路径冲突：永不覆盖，列 blocked 由人处置（与 patch v0.1 口径一致）。
 */
export async function upgrade(opts) {
  const targetDir = path.resolve(opts.cwd || process.cwd());
  const lock = readLock(targetDir);
  if (!lock || lock._corrupt) {
    return {
      op: 'upgrade',
      ok: false,
      error: lock?._corrupt ? 'lock-corrupt' : 'no-lock',
      message: '目标目录无有效 .harness-kit/lock —— 先跑 `kit init` 生成受管基座，upgrade 才能纯 lock 驱动。',
    };
  }

  // --stage：v0.1 占位（convert 未实现）
  if (opts.stage) {
    return {
      op: 'upgrade',
      ok: true,
      status: 'stage-placeholder',
      stage: opts.stage,
      convertImplemented: false,
      guidance: [`跨阶段转换（${opts.stage}）规划中 —— convert 未实现，见 spec FR-4/01。`],
    };
  }

  const role = lock.preset.id === 'B0' ? null : lock.preset.id;
  let currentSha = null;
  let plan = [];
  let presetErr = null;
  try {
    plan = planModules(resolvePresets({ role }));
    currentSha = treeSha(plan);
  } catch (e) {
    presetErr = e.message;
  }

  if (presetErr) {
    return {
      op: 'upgrade',
      ok: false,
      error: 'preset-unresolvable',
      message: `无法解析当前 bundled preset（${role || 'B0'}）: ${presetErr}`,
    };
  }

  const needsUpgrade = currentSha !== lock.preset.sha;
  const vars = renderVars({
    workspace: path.basename(targetDir),
    role: role || '待定',
    platform: lock.platform || 'claude',
  });

  const lockByPath = new Map((lock.files || []).map((f) => [f.path, f]));
  const byDest = new Map(plan.map((e) => [e.module.dest, e]));

  // 相对 lock 冻结 sha 的新增/变更清单
  const changes = [];
  for (const e of plan) {
    const dest = e.module.dest;
    const newHash = sha256Text(renderContent(e, vars));
    const old = lockByPath.get(dest);
    if (!old) changes.push({ path: dest, state: 'new', oldHash: null, newHash, entry: e });
    else if (old.hash !== newHash) changes.push({ path: dest, state: 'changed', oldHash: old.hash, newHash, entry: e });
  }
  const orphans = (lock.files || []).filter((f) => !byDest.has(f.path)).map((f) => f.path);

  if (!needsUpgrade) {
    return {
      op: 'upgrade',
      ok: true,
      status: 'up-to-date',
      targetDir,
      preset: { id: lock.preset.id, lockSha: lock.preset.sha, currentSha, needsUpgrade },
      changes: [],
      orphans,
      summary: { managed: (lock.files || []).length, changed: 0, added: 0, orphan: orphans.length },
      lockPath: lockAbs(targetDir),
    };
  }

  const willApply = opts.apply === true && !opts.dryRun;
  const trust = !!opts.trust;
  const base = {
    op: 'upgrade',
    ok: true,
    status: willApply ? 'applied' : 'needs-apply',
    targetDir,
    preset: { id: lock.preset.id, lockSha: lock.preset.sha, currentSha, needsUpgrade },
    changes: changes.map((c) => ({
      path: c.path,
      state: c.state,
      oldHash: c.oldHash,
      newHash: c.newHash,
      scope: c.entry.module.scope,
      sensitivity: c.entry.module.sensitivity || 'normal',
      weight: c.entry.module.weight || 'resident',
    })),
    orphans,
    summary: {
      managed: (lock.files || []).length,
      changed: changes.filter((c) => c.state === 'changed').length,
      added: changes.filter((c) => c.state === 'new').length,
      orphan: orphans.length,
    },
    applied: [],
    skipped: [],
    blocked: [],
    guidance: [],
    lockPath: lockAbs(targetDir),
  };

  if (!willApply) {
    base.guidance.push(`本 preset 有 ${changes.length} 个文件相对旧 sha 变更 → ` + '`--apply` 渲染写盘并刷新 lock（写前快照可回滚）。');
    return base;
  }

  // --apply：逐变更判定可写性 → 写前快照 → 渲染写盘 → 刷新 lock
  const committed = new Set();
  for (const c of changes) {
    const abs = path.join(targetDir, c.path);
    const diskHash = isFile(abs) ? sha256File(abs) : null;
    if (isHighSensitivity(c.entry.module.sensitivity) && !trust) {
      base.skipped.push({ path: c.path, sensitivity: c.entry.module.sensitivity });
      continue;
    }
    if (c.state === 'changed' && diskHash !== null && diskHash !== c.oldHash) {
      // 手改漂移：不覆盖，人先处置（v0.1 口径与 patch 一致）
      base.blocked.push({ path: c.path, reason: 'drift', diskHash, oldHash: c.oldHash });
      continue;
    }
    if (c.state === 'new' && diskHash !== null && diskHash !== c.newHash) {
      base.blocked.push({ path: c.path, reason: 'conflict', diskHash, newHash: c.newHash });
      continue;
    }
    const v = validateDest(c.entry.module.dest, targetDir);
    if (!v.ok) {
      base.blocked.push({ path: c.path, reason: 'dest', message: v.reason });
      continue;
    }
    committed.add(c.path);
  }
  if (committed.size) {
    const dests = changes.filter((c) => committed.has(c.path)).map((c) => c.path);
    snapshotBeforeWrite(targetDir, dests, { purge: opts.purge });
    const meta = (c) => ({
      scope: c.entry.module.scope,
      sensitivity: c.entry.module.sensitivity || 'normal',
      weight: c.entry.module.weight || 'resident',
      platform: c.entry.module.platform || 'full',
    });
    for (const c of changes) {
      if (!committed.has(c.path)) continue;
      const { changed } = renderFile(c.entry, vars, targetDir, c.path);
      if (changed) {
        const m = meta(c);
        base.applied.push({ path: c.path, hash: c.newHash, scope: m.scope, sensitivity: m.sensitivity, weight: m.weight });
      }
      // changed=false → 磁盘已等于新渲染（幂等），同样收编 lock 条目
    }
    // 刷新 lock：committed 条目更新为新 hash；未 committed（blocked/skipped）与 orphan 保留原样
    const merged = [];
    for (const f of lock.files) {
      if (committed.has(f.path)) {
        const c = changes.find((x) => x.path === f.path);
        const m = meta(c);
        merged.push({ path: f.path, hash: c.newHash, scope: m.scope, sensitivity: m.sensitivity, weight: m.weight, platform: f.platform || m.platform });
      } else {
        merged.push(f);
      }
    }
    for (const c of changes) {
      if (committed.has(c.path) && !lockByPath.has(c.path)) {
        const m = meta(c);
        merged.push({ path: c.path, hash: c.newHash, scope: m.scope, sensitivity: m.sensitivity, weight: m.weight, platform: m.platform });
      }
    }
    merged.sort((a, b) => (a.path < b.path ? -1 : 1));
    writeLock(targetDir, { ...lock, preset: { ...lock.preset, sha: currentSha }, files: merged });
    base.status = 'applied';
    base.guidance.push(`已应用 ${base.applied.length} 个文件并刷新 lock 至 sha ${currentSha.slice(0, 12)}…`);
  } else {
    base.status = 'needs-apply';
  }
  if (base.skipped.length) base.guidance.push(`高敏变更需 --trust 人审后才应用：` + base.skipped.map((s) => s.path).join(', '));
  if (base.blocked.length) {
    base.guidance.push(
      `阻断 ${base.blocked.length} 个（手改漂移/路径冲突不覆盖，先处置再重跑）：` + base.blocked.map((b) => `${b.path}(${b.reason})`).join(', '),
    );
  }
  return base;
}
