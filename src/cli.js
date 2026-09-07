import { readFileSync } from 'node:fs';
import path from 'node:path';
import { init } from './init.js';
import { patch } from './patch.js';
import { doctor } from './doctor.js';
import { inspectSize } from './size.js';
import { REPO_ROOT } from './util.js';

const VERSION = JSON.parse(readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')).version;

export const HELP = `harness-kit v${VERSION} —— 可回滚的角色化 Agent Harness 工作区生成器（init/patch/doctor）

用法: harness-kit <op> [options]

操作:
  init    生成受管 harness 骨架。默认可写；无 --role → role-中性 B0 基座（A1）。
  patch   纯 lock 驱动：补缺失 + 报告漂移。默认 dry-run；--apply 才补缺（A8/A3）。
  doctor  现状体检：受管/漂移/体积三值，只读（--json 供 agent 分析）。
  size    size 三值：锚点 CLAUDE.md / 常驻 rules / 产物 KB + 档位预算通过性。
  help, version

选项:
  --json           结构化 JSON 输出（全命令可解析）
  --cwd <dir>      目标工作区目录（默认 process.cwd()）
  --role <id>      preset 角色：B0 / presale / code-delivery / content（init/patch）
  --platform <id>  claude（默认自动探测）
  --dry-run        预览，不落盘
  --apply          落盘写（patch 补缺需此标志；init 默认可写）
  --trust          高敏模块（hook/script/settings/permissions/mcp）人审放行（A5）
  --purge          清空 .harness-kit/snapshots 快照
  --allow-extension 预留：第三方 marketplace opt-in（A6，v0.1 未启用）

示例:
  harness-kit init --json
  harness-kit init --role presale --json
  harness-kit patch --json
  harness-kit patch --apply --json
  harness-kit doctor --json
  harness-kit size --json
`;

export function parseArgs(argv) {
  const opts = { json: false, apply: null, dryRun: false, trust: false, purge: false };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') opts.json = true;
    else if (a === '--apply') opts.apply = true;
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--trust') opts.trust = true;
    else if (a === '--purge') opts.purge = true;
    else if (a === '--help' || a === '-h') opts.help = true;
    else if (a === '--version' || a === '-v') opts.version = true;
    else if (a === '--cwd') opts.cwd = argv[++i];
    else if (a === '--role') opts.role = argv[++i];
    else if (a === '--platform') opts.platform = argv[++i];
    else if (a === '--allow-extension') opts.allowExtension = true;
    else if (a.startsWith('-')) throw new Error(`未知选项: ${a}`);
    else positional.push(a);
  }
  opts.op = positional[0] || null;
  return opts;
}

function humanInit(r) {
  const lines = [];
  if (r.dryRun) lines.push(`[dry-run] init 预览: preset=${r.preset.id} platform=${r.platform.platform}（未写盘）`);
  else lines.push(`init: preset=${r.preset.id} · platform=${r.platform.platform} · changed=${r.changed}`);
  for (const w of r.written || []) lines.push(`  ✓ ${w.path}${w.changed ? '' : ' (unchanged)'}`);
  for (const s of r.skippedSensitive || []) lines.push(`  ⚠ 高敏跳过 ${s.path} (${s.sensitivity}) → 需 --trust 人审`);
  if (r.lockWritten) lines.push(`  lock: ${r.lockPath} (sha ${(r.preset.sha || '').slice(0, 12)}…)`);
  if (r.size) lines.push(`  size: CLAUDE.md ${r.size.claudeMd.lines} 行 · 产物 ${r.size.productsKb}KB ≤ ${r.size.budgetKb}KB ${r.size.pass ? 'PASS' : 'FAIL'}`);
  return lines.join('\n');
}

function humanPatch(r) {
  if (r.ok === false) return `[patch] ${r.message}`;
  const lines = [`patch: lock@${(r.preset.lockSha || '').slice(0, 12)}… · ok=${r.summary.ok} missing=${r.summary.missing} drift=${r.summary.drift}`];
  if (r.preset.needsUpgrade) lines.push('  ⚠ preset 有更新（sha 不一致）→ 请走 upgrade，v0.1 拒绝新写。');
  for (const f of r.files || []) {
    lines.push(`  ${f.state === 'ok' ? '·' : f.state === 'missing' ? '✗' : '~'} ${f.path} (${f.state})`);
  }
  for (const a of r.applied || []) lines.push(`  + applied ${a.path}`);
  for (const s of r.skipped || []) lines.push(`  ⚠ 高敏跳过补缺 ${s.path} → --trust`);
  for (const g of r.guidance || []) lines.push(`  指引: ${g}`);
  return lines.join('\n');
}

function humanDoctor(r) {
  if (r.ok === false) return `[doctor] ${r.message}`;
  return [
    `doctor: managed=${r.managed.ok}/${r.managed.total} missing=${r.managed.missing} drift=${r.managed.drift}`,
    `  CLAUDE.md: ${r.size.claudeMd.bytes}B / ${r.size.claudeMd.lines} 行`,
    `  常驻 rules: ${r.size.residentRules.count} 个 / ${r.size.residentRules.bytes}B`,
    `  产物: ${r.size.productsKb}KB ≤ ${r.size.budgetKb}KB ${r.size.pass ? 'PASS' : 'FAIL'}`,
    ...(r.suggestions || []).map((s) => `  建议: ${s}`),
  ].join('\n');
}

function humanSize(r) {
  if (r.ok === false) return `[size] ${r.message}`;
  return [
    `size: preset=${r.preset.id} (${r.preset.weight})`,
    `  CLAUDE.md: ${r.claudeMd.bytes}B / ${r.claudeMd.lines} 行`,
    `  常驻 rules: ${r.residentRules.bytes}B`,
    `  产物: ${r.productsBytes}B / ${r.productsKb}KB ≤ ${r.budgetKb}KB ${r.pass ? 'PASS' : 'FAIL'}`,
  ].join('\n');
}

/** 返回 { result, exitCode }。CLI 入口由 bin 调用并负责退出。 */
export async function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    process.stderr.write(e.message + '\n');
    return { result: { op: null, ok: false, error: 'bad-usage', message: e.message }, exitCode: 2 };
  }

  const json = opts.json;
  const out = (r, code = 0) => {
    const text = json ? JSON.stringify(r, null, 2) : renderHuman(r, opts);
    process.stdout.write(text + '\n');
    return { result: r, exitCode: code };
  };
  if (opts.help) return out({ help: HELP }, 0);
  if (opts.version) return out({ version: VERSION }, 0);

  try {
    switch (opts.op) {
      case 'init': {
        const r = await init({ cwd: opts.cwd, role: opts.role, platform: opts.platform, apply: opts.apply === true ? true : !opts.dryRun, dryRun: !!opts.dryRun, trust: opts.trust, purge: opts.purge });
        return out(r);
      }
      case 'patch': {
        const r = await patch({ cwd: opts.cwd, apply: opts.apply === true && !opts.dryRun, dryRun: !!opts.dryRun, trust: opts.trust, purge: opts.purge });
        return out(r, r.ok === false ? 1 : 0);
      }
      case 'doctor': {
        const r = doctor({ cwd: opts.cwd });
        return out(r, 0);
      }
      case 'size': {
        const r = inspectSize(path.resolve(opts.cwd || process.cwd()));
        return out(r, 0);
      }
      default:
        return out({ op: null, ok: false, error: 'unknown-op', message: `未知操作: ${opts.op || '(空)'}` }, 2);
    }
  } catch (e) {
    return out({ op: opts.op, ok: false, error: 'exception', message: e.message }, 1);
  }
}

function renderHuman(r, opts) {
  switch (r.op) {
    case 'init': return humanInit(r);
    case 'patch': return humanPatch(r);
    case 'doctor': return humanDoctor(r);
    case 'size': return humanSize(r);
    case null: return r.message || r.error;
    default:
      if (r.help) return r.help;
      if (r.version) return `harness-kit v${r.version}`;
      return JSON.stringify(r, null, 2);
  }
}
