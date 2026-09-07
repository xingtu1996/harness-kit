import path from 'node:path';
import { readLock, measureLockedFiles, classifyFiles } from './lock.js';
import { resolvePresets, planModules, treeSha } from './preset.js';
import { measureSize } from './size.js';

/**
 * doctor --json（§〇 支柱3 / A3 配套）：受管 / 漂移 / 体积三值，agent 可跑 `kit doctor --json` 自主分析建议。
 * 只读，不改盘。缺 lock 也返回结构化结果（供 agent 判断“未受管”）。
 */
export function doctor(opts) {
  const targetDir = path.resolve(opts.cwd || process.cwd());
  const lock = readLock(targetDir);
  if (!lock || lock._corrupt) {
    return {
      op: 'doctor',
      ok: false,
      error: lock?._corrupt ? 'lock-corrupt' : 'no-lock',
      targetDir,
      message: '目标目录无 .harness-kit/lock：该工作区尚未被 harness-kit 受管。先跑 `kit init` 生成受管基座。',
    };
  }

  const measured = measureLockedFiles(targetDir, lock);
  const cls = classifyFiles(lock, measured);
  const size = measureSize(targetDir, lock);

  let curSha = null;
  let presetErr = null;
  try {
    const role = lock.preset.id === 'B0' ? null : lock.preset.id;
    curSha = treeSha(planModules(resolvePresets({ role })));
  } catch (e) {
    presetErr = e.message;
  }
  const needsUpgrade = presetErr ? true : curSha !== lock.preset.sha;

  const suggestions = [];
  if (needsUpgrade) suggestions.push('preset 有更新（lock.sha ≠ 当前包 sha）→ 走 upgrade（M3+），勿手工混写。');
  if (cls.missing.length) suggestions.push(`缺失 ${cls.missing.length} 文件 → kit patch --apply 补缺。`);
  if (cls.drift.length) suggestions.push(`漂移 ${cls.drift.length} 文件（手改）→ kit v0.1 尊重不覆盖；内容升级走 upgrade。`);
  if (size.pass === false) {
    suggestions.push(`体积超标：CLAUDE.md ${size.claudeMd.lines} 行(≤300) / 产物 ${size.productsKb}KB(≤${size.budgetKb}KB) → 减负。`);
  } else {
    suggestions.push('体积达标。');
  }

  return {
    op: 'doctor',
    ok: true,
    targetDir,
    managed: {
      total: lock.files.length,
      ok: cls.ok.length,
      missing: cls.missing.length,
      drift: cls.drift.length,
    },
    size,
    preset: { id: lock.preset.id, lockSha: lock.preset.sha, currentSha: curSha, needsUpgrade, presetError: presetErr },
    suggestions,
  };
}
