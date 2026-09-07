import fs from 'node:fs';
import path from 'node:path';
import { detectPlatform, detectRole, isHighSensitivity } from './detect.js';
import { resolvePresets, planModules, treeSha, presetsRoot } from './preset.js';
import { renderContent, renderVars } from './render.js';
import { validateDest, ensureDir, sha256Text, isFile } from './util.js';
import { writeLock, readLock, lockAbs } from './lock.js';
import { snapshotBeforeWrite } from './snapshot.js';
import { measureSize } from './size.js';

/**
 * init = 唯一默认可写 op（A1）；写前快照 + 落 lock（A7）+ 高敏 --trust 门（A5）。
 * 无 --role → role-中性 B0 基座。--dry-run 预览不落盘；--trust 放行高敏模块。
 */
export async function init(opts) {
  const targetDir = path.resolve(opts.cwd || process.cwd());
  ensureDir(targetDir);

  const roleDetect = detectRole({ roleOpt: opts.role, cwd: targetDir });
  const role = roleDetect.role;
  const platDetect = opts.platform
    ? { platform: opts.platform, signal: 'flag' }
    : detectPlatform({ cwd: targetDir });

  const presetList = resolvePresets({ role });
  const plan = planModules(presetList);
  const rolePreset = presetList[presetList.length - 1];
  const presetId = role || rolePreset.manifest.id;

  // dest 白名单校验（A7）
  const destErrors = [];
  for (const e of plan) {
    const v = validateDest(e.module.dest, targetDir);
    if (!v.ok) destErrors.push(`${e.module.id}: ${v.reason}`);
  }
  if (destErrors.length) {
    throw new Error(`dest 越界，已拦截（A7）:\n  ${destErrors.join('\n  ')}`);
  }

  const willWrite = opts.apply !== false && !opts.dryRun; // init 默认可写；--dry-run 预览
  const trust = !!opts.trust;
  const writable = plan.filter((e) => !isHighSensitivity(e.module.sensitivity) || trust);
  const skippedSensitive = plan.filter((e) => isHighSensitivity(e.module.sensitivity) && !trust);

  const vars = renderVars({
    workspace: path.basename(targetDir),
    role: role || '待定',
    platform: platDetect.platform,
  });
  const sha = treeSha(plan);
  const weight = rolePreset?.manifest?.weight || 'S';
  const existing = readLock(targetDir);

  if (!willWrite) {
    return {
      op: 'init',
      dryRun: true,
      targetDir,
      platform: platDetect,
      role: roleDetect,
      preset: { id: presetId, sha, weight },
      planned: plan.map((e) => ({
        dest: e.module.dest,
        scope: e.module.scope,
        sensitivity: e.module.sensitivity,
        platform: e.module.platform,
      })),
      skippedSensitive: skippedSensitive.map((e) => ({ path: e.module.dest, sensitivity: e.module.sensitivity })),
      changed: false,
      lockWritten: false,
    };
  }

  // 先渲染比对：只对实际变更文件做写前快照 + 落盘（幂等：内容一致则零写入零快照）
  const pending = writable.map((e) => {
    const content = renderContent(e, vars);
    const destAbs = path.join(targetDir, e.module.dest);
    const destChanged = !(isFile(destAbs) && fs.readFileSync(destAbs, 'utf8') === content);
    return { e, content, destAbs, changed: destChanged };
  });
  const snap = snapshotBeforeWrite(
    targetDir,
    pending.filter((p) => p.changed).map((p) => p.e.module.dest),
    { purge: opts.purge },
  );
  const written = [];
  for (const p of pending) {
    if (p.changed) {
      ensureDir(path.dirname(p.destAbs));
      fs.writeFileSync(p.destAbs, p.content, 'utf8');
    }
    written.push({
      path: p.e.module.dest,
      hash: sha256Text(p.content),
      changed: p.changed,
      scope: p.e.module.scope,
      sensitivity: p.e.module.sensitivity || 'normal',
      weight: p.e.module.weight || 'resident',
      platform: p.e.module.platform || 'full',
    });
  }

  // 落 lock（内容 hash，A7）；幂等：内容一致则不改写
  const now = existing?.createdAt || new Date().toISOString();
  const lock = {
    schemaVersion: 0,
    preset: { id: presetId, sha, weight },
    platform: platDetect.platform,
    createdAt: now,
    kitVersion: '0.1.0',
    presetsRoot: presetsRoot(),
    files: written,
  };
  const prevText = isFile(lockAbs(targetDir)) ? fs.readFileSync(lockAbs(targetDir), 'utf8') : null;
  const lockChanged = !prevText;
  if (lockChanged) {
    writeLock(targetDir, lock);
  } else {
    const text = JSON.stringify(lock, null, 2) + '\n';
    if (text !== prevText) {
      fs.writeFileSync(lockAbs(targetDir), text, 'utf8');
    }
  }

  // .harness-kit/ 自动进目标 .gitignore（A10）
  appendGitignore(targetDir);

  const anyChanged = written.some((w) => w.changed) || lockChanged || snap.files.length > 0;
  return {
    op: 'init',
    dryRun: false,
    changed: anyChanged,
    targetDir,
    platform: platDetect,
    role: roleDetect,
    preset: { id: presetId, sha, weight },
    written,
    skippedSensitive: skippedSensitive.map((e) => ({ path: e.module.dest, sensitivity: e.module.sensitivity })),
    size: measureSize(targetDir, lock),
    lockWritten: true,
    snapshotFiles: snap.files,
    lockPath: lockAbs(targetDir),
  };
}

function appendGitignore(targetDir) {
  const p = path.join(targetDir, '.gitignore');
  const LINE = '.harness-kit/';
  if (!isFile(p)) {
    fs.writeFileSync(p, '***REMOVED*** harness-kit（A10 自豁免）\n' + LINE + '\n', 'utf8');
    return;
  }
  const cur = fs.readFileSync(p, 'utf8');
  if (!cur.split('\n').some((l) => l.trim() === LINE)) {
    fs.writeFileSync(p, cur.replace(/\n?$/, '\n') + LINE + '\n', 'utf8');
  }
}
