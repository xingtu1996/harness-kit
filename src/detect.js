import path from 'node:path';
import { isFile, isDir } from './util.js';

/**
 * init 决策表（A1 / 05 §五）。
 * 角色：无 --role 且无强信号 → role-中性 B0 基座，不静默选角色。
 *       角色化 = `init --role X` / `patch --role X`。
 * 平台：v0.1 只承诺 claude（full）+ AGENTS 直写实证；先看 target 目录 → env → 默认 claude 并打印判定。
 */
export const SENSITIVITY_HIGH = ['hook', 'script', 'settings', 'permissions', 'mcp'];
export const isHighSensitivity = (s) => SENSITIVITY_HIGH.includes(s);

export function detectPlatform({ cwd }) {
  // 1) target 目录已有锚点优先（勿用 home dir 探“装过”）
  if (isDir(path.join(cwd, '.claude'))) return { platform: 'claude', signal: 'target 含 .claude/' };
  if (isDir(path.join(cwd, '.cursor'))) return { platform: 'claude', signal: 'target 含 .cursor/（cursor 走 AGENTS 降级）' };
  if (isFile(path.join(cwd, 'AGENTS.md'))) return { platform: 'claude', signal: 'target 含 AGENTS.md' };
  // 2) env
  if (process.env.CLAUDE_CODE) return { platform: 'claude', signal: 'env CLAUDE_CODE' };
  if (process.env.CODEX_API_KEY || process.env.CODEX_API) {
    return { platform: 'claude', signal: 'env CODEX_API → codex 走 AGENTS.md 实证（v0.1 渲染 claude 全集）' };
  }
  // 3) 默认 claude + stdout 打印判定
  return { platform: 'claude', signal: 'default（无信号 → claude）' };
}

export function detectRole({ roleOpt, cwd }) {
  if (roleOpt) return { role: roleOpt, base: null, source: 'flag' };
  // 目录锚点关键词只收敛不静默选 → v0.1 无强角色启发，落 role-中性 B0
  return { role: null, base: 'B0', source: 'none', reason: '无 --role → role-中性 B0 基座（A1）' };
}
