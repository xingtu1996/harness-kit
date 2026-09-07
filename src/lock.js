import fs from 'node:fs';
import path from 'node:path';
import { readJson, ensureDir, isFile, sha256File } from './util.js';

export const HARNESS_DIR = '.harness-kit';
export const LOCK_FILE = 'lock';
export const SNAPSHOT_DIR = 'snapshots';

/**
 * lock = 生命周期 ground truth（A7/A8）。
 * 受管文件记内容 hash；受管区 = init 当次实际写路径集。
 * patch/doctor 以磁盘实测为准，lock 为参照/记忆，非真相源。
 */
export function lockAbs(targetDir) {
  return path.join(targetDir, HARNESS_DIR, LOCK_FILE);
}

export function readLock(targetDir) {
  const p = lockAbs(targetDir);
  if (!isFile(p)) return null;
  try {
    return readJson(p);
  } catch {
    return { _corrupt: true };
  }
}

export function writeLock(targetDir, lock) {
  ensureDir(path.dirname(lockAbs(targetDir)));
  const p = lockAbs(targetDir);
  const text = JSON.stringify(lock, null, 2) + '\n';
  fs.writeFileSync(p, text, 'utf8');
  return text;
}

/** 以磁盘为准：读受管文件现况 { path, exists, hash } */
export function measureLockedFiles(targetDir, lock) {
  const out = [];
  for (const f of lock.files || []) {
    const abs = path.join(targetDir, f.path);
    if (!isFile(abs)) {
      out.push({ path: f.path, exists: false, hash: null });
    } else {
      out.push({ path: f.path, exists: true, hash: sha256File(abs) });
    }
  }
  return out;
}

export function classifyFiles(lock, measured) {
  const byPath = new Map((measured || []).map((m) => [m.path, m]));
  const ok = [];
  const missing = [];
  const drift = [];
  for (const f of lock?.files || []) {
    const m = byPath.get(f.path);
    if (!m || !m.exists) missing.push({ path: f.path, hash: f.hash });
    else if (m.hash !== f.hash) drift.push({ path: f.path, lockHash: f.hash, diskHash: m.hash });
    else ok.push({ path: f.path, hash: f.hash });
  }
  return { ok, missing, drift };
}
