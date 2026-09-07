import fs from 'node:fs';
import path from 'node:path';
import { HARNESS_DIR, SNAPSHOT_DIR } from './lock.js';
import { ensureDir, isFile, pathExists } from './util.js';

const KEEP = 5;

/** 写前快照：把将写入且已存在的目标文件复制进 .harness-kit/snapshots/<ts>/（A10）。N 版轮换 + --purge。 */
export function snapshotBeforeWrite(targetDir, destRels, opts = {}) {
  const snapRoot = path.join(targetDir, HARNESS_DIR, SNAPSHOT_DIR);
  if (opts.purge) {
    fs.rmSync(snapRoot, { recursive: true, force: true });
    return { purged: true, files: [] };
  }
  if (!destRels || destRels.length === 0) return { purged: false, files: [] };
  // 先收集实际存在的待备份文件，无则不动（避免空快照目录）
  const existing = destRels.filter((rel) => isFile(path.join(targetDir, rel)));
  if (existing.length === 0) return { purged: false, files: [] };

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(snapRoot, ts);
  ensureDir(dir);
  const files = [];
  for (const rel of existing) {
    const abs = path.join(targetDir, rel);
    const destAbs = path.join(dir, rel);
    ensureDir(path.dirname(destAbs));
    fs.copyFileSync(abs, destAbs);
    files.push(rel);
  }
  // 轮换：保留最新 KEEP 版
  const versions = [];
  if (pathExists(snapRoot)) {
    for (const e of fs.readdirSync(snapRoot)) {
      const p = path.join(snapRoot, e);
      if (fs.statSync(p).isDirectory() && e !== ts) versions.push({ e, t: fs.statSync(p).mtimeMs });
    }
    versions.sort((a, b) => b.t - a.t);
    for (const v of versions.slice(KEEP - 1)) fs.rmSync(path.join(snapRoot, v.e), { recursive: true, force: true });
  }
  return { purged: false, snapshotDir: dir, files };
}
