import path from 'node:path';
import { readLock, writeLock, lockAbs } from './lock.js';
import { resolvePresets, planModules, treeSha } from './preset.js';
import { isHighSensitivity } from './detect.js';
import { renderContent, renderFile, renderVars } from './render.js';
import { validateDest, isFile, sha256File, sha256Text } from './util.js';
import { snapshotBeforeWrite } from './snapshot.js';

const ROLE_LABELS = { B0: 'role-中性基座', presale: '售前/FDE', 'code-delivery': '开发交付/IT', content: '内容运营' };

/**
 * convert = 跨角色/跨阶段 preset 转换（最小可用，不重构 upgrade）。
 * 语义：在已有受管 workspace 上把角色 preset 从当前切到目标（如 presale → code-delivery），
 * 走「纯 lock + diff + 快照」语义但跨 preset id。
 * 保守规则：
 *  - 旧角色专属文件（目标 plan 不再覆盖的）→ 从 lock 移除"受管"标记但盘上保留，不自动删盘（防数据丢失）。
 *  - 手改漂移 / 路径冲突 / 高敏未授权 → 角色切换需原子完成：任一阻断即整体不动（status=blocked），由人先处置。
 *  - 与 upgrade 同口径：永不覆盖手改。
 */
export async function convert(opts) {
  const targetDir = path.resolve(opts.cwd || process.cwd());
  const lock = readLock(targetDir);
  if (!lock || lock._corrupt) {
    return {
      op: 'convert',
      ok: false,
      error: lock?._corrupt ? 'lock-corrupt' : 'no-lock',
      message: '目标目录无有效 .harness-kit/lock —— 先跑 `kit init` 生成受管基座，convert 才能纯 lock 驱动。',
    };
  }

  const fromId = lock.preset.id;
  const rawTo = opts.role;
  if (!rawTo) {
    return {
      op: 'convert',
      ok: false,
      error: 'missing-role',
      message: 'convert 需 `--role <目标角色>`（presale | code-delivery | content）—— 例：kit convert --role code-delivery',
    };
  }
  const toId = rawTo === 'base' || rawTo === 'B0' ? 'B0' : rawTo;
  if (toId === fromId) {
    return {
      op: 'convert',
      ok: false,
      error: 'same-role',
      message: `当前已是 ${fromId} —— 同 preset 的版本升级请走 upgrade；convert 用于跨角色切换。`,
    };
  }

  let plan = [];
  let toSha = null;
  let presetErr = null;
  try {
    plan = planModules(resolvePresets({ role: toId === 'B0' ? null : toId }));
    toSha = treeSha(plan);
  } catch (e) {
    presetErr = e.message;
  }
  if (presetErr) {
    return {
      op: 'convert',
      ok: false,
      error: 'preset-unresolvable',
      message: `无法解析目标 preset（${toId}）: ${presetErr}`,
    };
  }
  const targetList = resolvePresets({ role: toId === 'B0' ? null : toId });
  const finalWeight = targetList[targetList.length - 1]?.manifest?.weight || 'M';

  const vars = renderVars({
    workspace: path.basename(targetDir),
    role: toId === 'B0' ? '待定' : toId,
    platform: lock.platform || 'claude',
  });

  const lockByPath = new Map((lock.files || []).map((f) => [f.path, f]));
  const targetByDest = new Map(plan.map((e) => [e.module.dest, e]));

  const added = [];
  const changed = [];
  const kept = [];
  const removed = [];
  for (const e of plan) {
    const dest = e.module.dest;
    const newHash = sha256Text(renderContent(e, vars));
    const old = lockByPath.get(dest);
    const rec = {
      path: dest,
      oldHash: old?.hash ?? null,
      newHash,
      scope: e.module.scope,
      sensitivity: e.module.sensitivity || 'normal',
      weight: e.module.weight || 'resident',
      platform: e.module.platform || 'full',
    };
    if (!old) added.push(rec);
    else if (old.hash !== newHash) changed.push(rec);
    else kept.push({ ...rec, hash: old.hash });
  }
  for (const f of lock.files || []) {
    if (!targetByDest.has(f.path)) removed.push({ path: f.path, hash: f.hash, scope: f.scope, sensitivity: f.sensitivity || 'normal' });
  }

  const toWrite = [...added, ...changed];
  const willApply = opts.apply === true && !opts.dryRun;
  const trust = !!opts.trust;
  const base = {
    op: 'convert',
    ok: true,
    status: willApply ? 'applied' : 'needs-apply',
    targetDir,
    from: { id: fromId, sha: lock.preset.sha, label: ROLE_LABELS[fromId] || fromId },
    to: { id: toId, sha: toSha, weight: finalWeight, label: ROLE_LABELS[toId] || toId },
    summary: { added: added.length, changed: changed.length, kept: kept.length, removed: removed.length },
    added,
    changed,
    kept,
    removed,
    applied: [],
    skipped: [],
    blocked: [],
    guidance: [],
    lockPath: lockAbs(targetDir),
  };

  // 移出受管提示（保守：不自动删盘）
  if (removed.length) {
    base.guidance.push(
      `旧角色专属文件移出受管但盘上保留（kit 不自动删盘，确认无用可手动移除）：` + removed.map((r) => r.path).join(', '),
    );
  }

  if (!willApply) {
    base.status = 'needs-apply';
    base.guidance.push(`从 ${fromId} 切到 ${toId}：新增 ${added.length} / 变更 ${changed.length} → ` + '`--apply` 渲染写盘并刷新 lock（写前快照可回滚）。');
    base.guidance.push(crossStageNote(fromId, toId));
    return base;
  }

  // --apply：原子 gate —— 任一 blocked/skipped 即整体不动（避免"锚点还旧、lock 已换角色"的半切态）
  const committed = new Set();
  const blocked = [];
  const skipped = [];
  for (const c of toWrite) {
    const abs = path.join(targetDir, c.path);
    const diskHash = isFile(abs) ? sha256File(abs) : null;
    if (isHighSensitivity(c.sensitivity) && !trust) {
      skipped.push({ path: c.path, sensitivity: c.sensitivity });
      continue;
    }
    const old = lockByPath.get(c.path);
    if (old && diskHash !== null && diskHash !== old.hash) {
      blocked.push({ path: c.path, reason: 'drift', diskHash, oldHash: old.hash });
      continue;
    }
    if (!old && diskHash !== null && diskHash !== c.newHash) {
      blocked.push({ path: c.path, reason: 'conflict', diskHash, newHash: c.newHash });
      continue;
    }
    const v = validateDest(c.path, targetDir);
    if (!v.ok) {
      blocked.push({ path: c.path, reason: 'dest', message: v.reason });
      continue;
    }
    committed.add(c.path);
  }

  if (blocked.length || skipped.length) {
    base.status = 'blocked';
    base.skipped = skipped;
    base.blocked = blocked;
    base.guidance = [];
    if (blocked.length) base.guidance.push(`阻断 ${blocked.length} 个（手改漂移/路径冲突不覆盖）：` + blocked.map((b) => `${b.path}(${b.reason})`).join(', '));
    if (skipped.length) base.guidance.push(`高敏需 --trust 人审：` + skipped.map((s) => s.path).join(', '));
    base.guidance.push('角色切换需原子完成：先处置阻断/授权高敏再重跑 convert（盘上未被改动）。');
    base.guidance.push(crossStageNote(fromId, toId));
    return base;
  }

  // 全通过 → 快照 + 渲染写盘 + 刷新 lock（preset.id/preset.sha/weight 换目标，旧角色专属文件移出受管）
  const byPath = new Map(toWrite.map((c) => [c.path, c]));
  const writeDests = [...committed];
  snapshotBeforeWrite(targetDir, writeDests, { purge: opts.purge });
  for (const c of toWrite) {
    if (!committed.has(c.path)) continue;
    const entry = targetByDest.get(c.path);
    const { changed: didWrite } = renderFile(entry, vars, targetDir, c.path);
    if (didWrite) {
      base.applied.push({
        path: c.path,
        hash: c.newHash,
        scope: entry.module.scope,
        sensitivity: entry.module.sensitivity || 'normal',
        weight: entry.module.weight || 'resident',
      });
    }
  }

  const merged = [];
  for (const f of lock.files) {
    const c = byPath.get(f.path);
    if (c && committed.has(f.path)) {
      merged.push({ path: f.path, hash: c.newHash, scope: c.scope, sensitivity: c.sensitivity, weight: c.weight, platform: f.platform || c.platform });
    } else if (targetByDest.has(f.path)) {
      merged.push(f); // kept（unchanged）原样保留
    }
    // 旧角色专属文件：drop（不再受管，盘上保留）
  }
  for (const c of added) {
    if (committed.has(c.path) && !lockByPath.has(c.path)) {
      merged.push({ path: c.path, hash: c.newHash, scope: c.scope, sensitivity: c.sensitivity, weight: c.weight, platform: c.platform });
    }
  }
  merged.sort((a, b) => (a.path < b.path ? -1 : 1));
  writeLock(targetDir, { ...lock, preset: { id: toId, sha: toSha, weight: finalWeight }, files: merged });

  base.status = 'applied';
  base.guidance.push(`已从 ${fromId} 切到 ${toId}，lock.preset.id → ${toId}（sha ${toSha.slice(0, 12)}…）。`);
  if (removed.length) {
    base.guidance.push(`不再受管（盘上保留，可手动移除）：` + removed.map((r) => r.path).join(', '));
  }
  base.guidance.push(crossStageNote(fromId, toId));
  return base;
}

function crossStageNote(fromId, toId) {
  const toLabel = ROLE_LABELS[toId] || toId;
  if (fromId === 'presale' && toId === 'code-delivery') {
    return `跨阶段理念：售前 preset 交接协议要求 spec 完整并带 ready-for-agent 标签才移交编码阶段（见 .claude/CLAUDE.md 交接协议）；convert 已把工作台规约切到 ${toLabel}，既有 spec/产物由你保留归档，kit 不自动删盘。`;
  }
  return `工作台规约已切到 ${toLabel}（${toId}）。盘上旧角色产物由你保留归档，kit 不自动删盘。`;
}
