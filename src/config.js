import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readJson, isFile, ensureDir } from './util.js';
import { HARNESS_DIR } from './lock.js';

/**
 * 分层配置读取骨架（FR-16，M3+ 占位完整开关留给后续）：
 * 内置默认 < 用户 `~/.harness-kit/config.json` < 项目 `.harness-kit/config.json` < CLI 显式参数。
 * 本模块只做「读取 + 合并」，不改任何写行为；CLI 参数覆盖沿用现有逻辑（参数最高）。
 * v0.1 只把合并结果注入 doctor 输出供 agent 参考；defaultRole/budget/features 的完整语义后续版本启用。
 */

export const CONFIG_DEFAULTS = Object.freeze({
  defaultRole: null, // null = role-中性 B0（与 init 无 --role 行为一致）；可选 presale|code-delivery|content
  defaultPlatform: 'claude',
  budget: 'M',
  features: {}, // 开关骨架，如 { reflow: true }（reflow 件未实现，仅 doctor 占位提示）
});

/** init 写进项目的默认 config 骨架（含注释键，loadConfig 合并时忽略 `_` 开头键）。
 * 骨架值刻意惰性：defaultRole=null / features={} → 不覆盖用户级全局默认（null 与空对象在 merge 中不生效）。 */
export const CONFIG_SKELETON = {
  _comment:
    'harness-kit 项目分层配置（FR-16）。可用字段：defaultRole(presale|code-delivery|content|null=未设→回退用户级) / defaultPlatform / budget / features。用户级全局配置在 ~/.harness-kit/config.json；本文件覆盖用户级；CLI --role/--platform 参数最高。注释键（_ 开头）会被忽略。',
  defaultRole: null,
  defaultPlatform: 'claude',
  budget: 'M',
  features: {},
};

export const CONFIG_SKELETON_TEXT = JSON.stringify(CONFIG_SKELETON, null, 2) + '\n';

function isObj(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** 深度合并：b 覆盖 a；`_` 开头键（注释）忽略；null 视为"未设 → 回退低层"，不抹掉低层非 null 值。 */
function deepMerge(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b || {})) {
    if (k.startsWith('_') || v === null) continue;
    if (isObj(v) && isObj(out[k])) out[k] = deepMerge(out[k], v);
    else out[k] = v;
  }
  return out;
}

/** 读单层 config 文件；缺失返回 null，JSON 解析错误返回 { parseError }（容错不抛）。 */
function readConfigLayer(abs) {
  if (!isFile(abs)) return null;
  try {
    return { value: readJson(abs) };
  } catch {
    return { parseError: abs };
  }
}

/**
 * 合并四级配置，返回 { config, present, parseErrors, paths }。
 * @param {string} cwd 目标工作区（读其 `.harness-kit/config.json`）
 */
export function loadConfig(cwd) {
  const targetDir = path.resolve(cwd || process.cwd());
  const userPath = path.join(os.homedir(), '.harness-kit', 'config.json');
  const projectPath = path.join(targetDir, HARNESS_DIR, 'config.json');

  const userLayer = readConfigLayer(userPath);
  const projectLayer = readConfigLayer(projectPath);

  let config = { ...CONFIG_DEFAULTS };
  if (userLayer?.value) config = deepMerge(config, userLayer.value);
  if (projectLayer?.value) config = deepMerge(config, projectLayer.value);

  return {
    config,
    present: { user: !!userLayer, project: !!projectLayer },
    parseErrors: [userLayer?.parseError, projectLayer?.parseError].filter(Boolean),
    paths: { user: userPath, project: projectPath },
  };
}

/** init 配套：若 `.harness-kit/` 已存在且无 config.json → 写默认骨架（幂等）。 */
export function ensureDefaultConfig(targetDir) {
  const dir = path.join(targetDir, HARNESS_DIR);
  const p = path.join(dir, 'config.json');
  if (isFile(p)) return false;
  ensureDir(dir);
  fs.writeFileSync(p, CONFIG_SKELETON_TEXT, 'utf8');
  return true;
}
