import path from 'node:path';
import { readLock, measureLockedFiles, classifyFiles, lockAbs } from './lock.js';

/**
 * `show managed`（A3 配套）：只读列出受管文件 + 每文件状态 ok/missing/drift（对比磁盘 hash）。
 * 复用 doctor 的 managed 计算（measureLockedFiles + classifyFiles），不复制逻辑。
 * 无副作用，不改盘；无 lock 返回结构化 no-lock。
 */
export function showManaged(opts) {
  const targetDir = path.resolve(opts.cwd || process.cwd());
  const lock = readLock(targetDir);
  if (!lock || lock._corrupt) {
    return {
      op: 'show',
      sub: 'managed',
      ok: false,
      error: lock?._corrupt ? 'lock-corrupt' : 'no-lock',
      targetDir,
      message: '目标目录无 .harness-kit/lock：该工作区尚未被 harness-kit 受管。先跑 `kit init` 生成受管基座。',
    };
  }

  const measured = measureLockedFiles(targetDir, lock);
  const cls = classifyFiles(lock, measured);
  const files = [
    ...cls.ok.map((f) => ({ path: f.path, state: 'ok', hash: f.hash })),
    ...cls.missing.map((f) => ({ path: f.path, state: 'missing', hash: f.hash })),
    ...cls.drift.map((f) => ({ path: f.path, state: 'drift', lockHash: f.lockHash, diskHash: f.diskHash })),
  ].sort((a, b) => (a.path < b.path ? -1 : 1));

  return {
    op: 'show',
    sub: 'managed',
    ok: true,
    targetDir,
    preset: { id: lock.preset.id, sha: lock.preset.sha, weight: lock.preset.weight || null },
    managed: {
      total: lock.files.length,
      ok: cls.ok.length,
      missing: cls.missing.length,
      drift: cls.drift.length,
    },
    files,
    lockPath: lockAbs(targetDir),
  };
}
