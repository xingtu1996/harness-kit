import fs from 'node:fs';
import path from 'node:path';
import { readLock } from './lock.js';
import { isFile } from './util.js';

/**
 * size 三值口径（05 §一 / 07 §六 / validator NF-1）：
 * - claudeMd 锚点字节/行数（预算 <300 行）
 * - 常驻 rules 字节（weight=resident 且落 rules/ 的受管文件）
 * - 产物磁盘总量 KB（受管文件集合；预算档：S<2KB/M~10KB/L~30KB/XL~60KB）
 * .harness-kit/（lock+快照）自豁免体积审计（A10）。
 */
/** size 命令入口：读 lock → 三值 + 档位预算通过性。 */
export function inspectSize(targetDir, lock = readLock(targetDir)) {
  if (!lock || lock._corrupt) {
    return { op: 'size', ok: false, error: 'no-lock', message: '无 lock，无法测量受管体积。先 kit init。' };
  }
  const s = measureSize(targetDir, lock);
  return {
    op: 'size',
    ok: true,
    targetDir,
    preset: { id: lock.preset.id, weight: lock.preset.weight || 'M' },
    claudeMd: s.claudeMd,
    residentRules: s.residentRules,
    productsKb: s.productsKb,
    productsBytes: s.productsBytes,
    budgetKb: s.budgetKb,
    pass: s.pass,
  };
}

export function anchorCandidates(lock) {
  return (lock?.files || [])
    .map((f) => f.path)
    .filter((p) => /(^|\/)CLAUDE\.md$/.test(p) || p === 'CLAUDE.md' || p === '.claude/CLAUDE.md');
}

export function measureSize(targetDir, lock) {
  const files = lock?.files || [];
  let productsBytes = 0;
  let claudeMdBytes = 0;
  let claudeMdLines = 0;
  let residentRulesBytes = 0;
  let residentRulesCount = 0;
  let counted = 0;

  for (const f of files) {
    const abs = path.join(targetDir, f.path);
    if (!isFile(abs)) continue;
    const st = fs.statSync(abs);
    productsBytes += st.size;
    counted += 1;
    if (/(^|\/)CLAUDE\.md$/.test(f.path)) {
      claudeMdBytes = st.size;
      claudeMdLines = fs.readFileSync(abs, 'utf8').split('\n').length;
    }
    const isRule = /(^|\/)rules\//.test(f.path);
    const isResident = (f.weight || 'resident') !== 'on-demand';
    if (isRule && isResident) {
      residentRulesBytes += st.size;
      residentRulesCount += 1;
    }
  }

  const budget = { S: 2 * 1024, M: 10 * 1024, L: 30 * 1024, XL: 60 * 1024 };
  const weight = lock?.preset?.weight || 'M';
  const kbBudget = (budget[weight] ?? budget.M) / 1024;
  const productsKb = +(productsBytes / 1024).toFixed(2);
  return {
    managedCount: counted,
    claudeMd: { bytes: claudeMdBytes, lines: claudeMdLines },
    residentRules: { count: residentRulesCount, bytes: residentRulesBytes },
    productsKb,
    productsBytes,
    budgetKb: kbBudget,
    pass: productsBytes <= (budget[weight] ?? budget.M) && claudeMdLines <= 300,
  };
}
