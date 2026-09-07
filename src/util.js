import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

export function sha256Text(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

export function sha256File(abs) {
  return sha256Text(fs.readFileSync(abs, 'utf8'));
}

export function pathExists(p) {
  try {
    fs.lstatSync(p);
    return true;
  } catch {
    return false;
  }
}

export function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

export function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

export function readJson(abs) {
  return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

export function writeFileIfChanged(abs, content) {
  if (isFile(abs) && fs.readFileSync(abs, 'utf8') === content) {
    return false; // 未变更
  }
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf8');
  return true;
}

export function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

/**
 * 相对路径白名单校验（A7）：
 * 仅相对；禁绝对路径、禁盘符、禁空、禁 `..` 越界；落点不得逃逸受管根。
 * symlink 逃逸检查：dest 任一路段若已是 symlink，其真实落点须仍在受管根内。
 * @param {string} rel 目标相对路径（posix 或 native 均可）
 * @param {string} managedRootAbs 受管根绝对路径
 */
export function validateDest(rel, managedRootAbs) {
  if (!rel || typeof rel !== 'string') return { ok: false, reason: 'dest 为空' };
  const norm = path.normalize(rel);
  if (path.isAbsolute(norm)) return { ok: false, reason: `dest 为绝对路径: ${rel}` };
  // 盘符/UNC（windows）
  if (/^[a-zA-Z]:[\\/]/.test(norm) || /^\\\\/.test(norm)) {
    return { ok: false, reason: `dest 含盘符/UNC: ${rel}` };
  }
  const parts = norm.split(path.sep);
  if (parts.includes('..')) return { ok: false, reason: `dest 含 .. 越界: ${rel}` };
  if (parts.includes('') || parts.length === 0 || parts[0] === '.') {
    if (norm === '.' || norm === '') return { ok: false, reason: `dest 为空: ${rel}` };
  }
  const rootReal = fs.realpathSync(managedRootAbs);
  // symlink 逃逸：自根向 dest 逐层探测已有文件，若命中 symlink 且 realpath 在受管根外 → 拒绝
  let cur = managedRootAbs;
  for (let i = 0; i < parts.length - 1; i++) {
    cur = path.join(cur, parts[i]);
    if (!pathExists(cur)) break;
    const st = fs.lstatSync(cur);
    if (st.isSymbolicLink()) {
      const real = fs.realpathSync(cur);
      const relReal = path.relative(rootReal, real);
      if (relReal.startsWith('..') || path.isAbsolute(relReal)) {
        return { ok: false, reason: `dest 途经 symlink 逃逸受管根: ${cur} -> ${real}` };
      }
    }
  }
  return { ok: true, rel: parts.join('/'), reason: null };
}

/** 逐层向上收集 existing ancestor symlinks（供白名单例外提示，v0.1 仅检查拒绝） */
export function isPathInside(childAbs, rootAbs) {
  const rel = path.relative(rootAbs, childAbs);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}
