import fs from 'node:fs';
import path from 'node:path';
import { loadManifest, validateManifest, loadSchema } from './manifest.js';
import { isDir, isFile, REPO_ROOT, sha256Text } from './util.js';

const BASE_ID = 'B0';

/** presets 根：默认随包 presets/；可用 HARNESS_KIT_PRESETS_DIR 覆盖（测试/自定义 preset）。 */
export function presetsRoot() {
  return process.env.HARNESS_KIT_PRESETS_DIR
    ? path.resolve(process.env.HARNESS_KIT_PRESETS_DIR)
    : path.join(REPO_ROOT, 'presets');
}

export function presetDirOf(id) {
  return path.join(presetsRoot(), id);
}

export function presetExists(id) {
  return isDir(presetDirOf(id));
}

/** 载入并校验一个 preset（manifest），返回 { id, dir, manifest } */
export function loadPreset(id) {
  const dir = presetDirOf(id);
  if (!isDir(dir)) throw new Error(`preset 不存在: ${id}（在 ${presetsRoot()}）`);
  const m = loadManifest(dir);
  const errs = validateManifest(m, loadSchema());
  if (errs.length) throw new Error(`manifest 校验失败 [${id}]:\n  ${errs.join('\n  ')}`);
  return { id, dir, manifest: m };
}

/** 解析生效 preset 集：无角色 → [B0]；有角色 → [B0 依赖 + 角色]。返回 [{id,dir,manifest}] 与合并结果 */
export function resolvePresets({ role }) {
  const list = [];
  const seen = new Set();
  const add = (id) => {
    if (seen.has(id)) return;
    seen.add(id);
    const p = loadPreset(id);
    // 深度优先先放依赖
    for (const dep of p.manifest.depends_on || []) add(dep);
    list.push(p);
  };
  if (role && role.toLowerCase() !== 'base' && role !== BASE_ID) add(role);
  else add(BASE_ID);
  return list;
}

/**
 * 合并各 preset 模块为写计划。同 dest 冲突：后出现的（role）覆盖先出现的（base）（scope role>base）。
 * 每项：{ module, sourceAbs, scope }
 */
export function planModules(presetList) {
  const byDest = new Map();
  const order = [];
  for (const p of presetList) {
    for (const mod of p.manifest.modules || []) {
      const sourceAbs = path.join(p.dir, mod.path);
      if (!isFile(sourceAbs)) throw new Error(`preset ${p.id}: 源文件缺失 ${mod.path}`);
      const entry = { module: { ...mod, _preset: p.id }, sourceAbs, scope: mod.scope || 'base' };
      if (byDest.has(mod.dest)) {
        // 覆盖 base 项（保留原有 order 位置，指向新 entry）
        const idx = byDest.get(mod.dest);
        order[idx] = entry;
      } else {
        byDest.set(mod.dest, order.length);
        order.push(entry);
      }
    }
  }
  return order;
}

/** 树 sha：对合并模块源文件（排序后 path+content）取 sha256，作 lock.preset.sha（A8 当前包 sha）。 */
export function treeSha(plan) {
  const parts = [...plan]
    .sort((a, b) => (a.module.dest < b.module.dest ? -1 : a.module.dest > b.module.dest ? 1 : 0))
    .map((e) => {
      const content = fs.readFileSync(e.sourceAbs, 'utf8');
      return `${e.module._preset}:${e.module.dest}\0${content}`;
    });
  return sha256Text(parts.join('\x1e'));
}
