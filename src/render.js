import fs from 'node:fs';
import path from 'node:path';
import { writeFileIfChanged } from './util.js';

/**
 * 渲染三原语（05 §八：copy / template-sub / diff）。
 */

/** 模板替换：{{ name }} → vars[name]。未命中变量保留原样并计入 unresolved。 */
export function templateSub(text, vars, unresolved = null) {
  return text.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (raw, name) => {
    if (name in vars) return String(vars[name]);
    if (unresolved) unresolved.push(name);
    return raw;
  });
}

/** 计算写内容的模板变量（CLAUDE.md 锚点常用）。 */
export function renderVars({ workspace, role, platform }) {
  return {
    role: role || '待定',
    workspace: workspace || 'workspace',
    platform: platform || 'claude',
    kitVersion: '0.1.0',
  };
}

/** 计算渲染后的内容（模板先替换）。 */
export function renderContent(entry, vars) {
  let content = fs.readFileSync(entry.sourceAbs, 'utf8');
  if (entry.module.template) content = templateSub(content, vars);
  return content;
}

/** 复制/渲染一个模块源文件到目标（模板则先替换）。返回 {changed} */
export function renderFile(entry, vars, targetDir, destRel) {
  const content = renderContent(entry, vars);
  const destAbs = path.join(targetDir, destRel);
  const changed = writeFileIfChanged(destAbs, content);
  return { changed, destAbs, content };
}

/** 行级 diff（朴素前后缀裁剪，报告增删行数；非真实 LCS）。 */
export function diffLines(a, b) {
  const A = (a || '').split('\n');
  const B = (b || '').split('\n');
  if (A.length === B.length && A.every((l, i) => l === B[i])) {
    return { equal: true, added: [], removed: [] };
  }
  let s = 0;
  while (s < A.length && s < B.length && A[s] === B[s]) s++;
  let e = 0;
  while (e < A.length - s && e < B.length - s && A[A.length - 1 - e] === B[B.length - 1 - e]) e++;
  const removed = A.slice(s, A.length - e);
  const added = B.slice(s, B.length - e);
  return { equal: false, added, removed };
}
