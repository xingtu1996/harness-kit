import path from 'node:path';
import { readJson, isFile, REPO_ROOT } from './util.js';

const SCHEMA_PATH = path.join(REPO_ROOT, 'manifest.schema.v0.json');

/**
 * preset = 目录 + manifest（05 §八：唯一规约模型）。
 * manifest.yml 现以 YAML1.2 的 JSON 子集书写（JSON.parse 即可解析），
 * 零第三方依赖；待依赖放开后可换完整 YAML 解析器。
 */
export function loadSchema() {
  return readJson(SCHEMA_PATH);
}

export function manifestFileOf(presetDir) {
  for (const name of ['manifest.yml', 'manifest.yaml', 'manifest.json']) {
    const p = path.join(presetDir, name);
    if (isFile(p)) return p;
  }
  return null;
}

export function loadManifest(presetDir) {
  const mf = manifestFileOf(presetDir);
  if (!mf) throw new Error(`preset 缺少 manifest.yml: ${presetDir}`);
  return readJson(mf);
}

/**
 * 最小 JSON Schema 校验子集（零依赖替代 ajv，A4 后置）：
 * 支持 type/enum/required/properties/additionalProperties/items/minItems/const/description(忽略)/$ref(局部)。
 */
export function validateAgainstSchema(value, schema, at = '$') {
  const errs = [];
  walk(value, schema, at, errs);
  return errs;
}

let rootSchema = null;

function walk(value, schema, at, errs) {
  const s = schema.$ref ? (rootSchema.definitions || {})[schema.$ref.split('/').pop()] : schema;
  if (!s) {
    errs.push(`${at}: 无法解析 schema`);
    return;
  }
  if (s.type) {
    const t = s.type;
    const ok =
      t === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value)
      : t === 'array' ? Array.isArray(value)
      : t === 'string' ? typeof value === 'string'
      : t === 'integer' ? Number.isInteger(value)
      : t === 'number' ? typeof value === 'number'
      : t === 'boolean' ? typeof value === 'boolean'
      : t === 'null' ? value === null
      : false;
    if (!ok) {
      errs.push(`${at}: 期望 ${t}，实际 ${JSON.stringify(value)?.slice(0, 40)}`);
      return;
    }
  }
  if (s.const !== undefined && value !== s.const) {
    errs.push(`${at}: 期望 const ${JSON.stringify(s.const)}，实际 ${JSON.stringify(value)}`);
  }
  if (s.enum && !s.enum.includes(value)) {
    errs.push(`${at}: 期望 enum [${s.enum.join(', ')}]，实际 ${JSON.stringify(value)}`);
  }
  if (s.type === 'object' && value !== null && typeof value === 'object') {
    if (s.required) {
      for (const k of s.required) {
        if (!(k in value)) errs.push(`${at}.${k}: 缺少必填字段`);
      }
    }
    for (const [k, v] of Object.entries(value)) {
      const sub = s.properties?.[k];
      if (sub) walk(v, sub, `${at}.${k}`, errs);
      else if (s.additionalProperties === false) errs.push(`${at}.${k}: 非允许字段`);
    }
  }
  if (s.type === 'array' && Array.isArray(value)) {
    if (s.minItems !== undefined && value.length < s.minItems) {
      errs.push(`${at}: 最少 ${s.minItems} 项，实际 ${value.length}`);
    }
    if (s.items) {
      value.forEach((v, i) => walk(v, s.items, `${at}[${i}]`, errs));
    }
  }
}

export function validateManifest(m, schema = loadSchema()) {
  const errs = [];
  rootSchema = schema;
  try {
    validateAgainstSchema(m, schema, '$');
  } finally {
    rootSchema = null;
  }
  // dest 基础格式在运行期由 render 严格校验；此处仅挡明显异常
  for (const mod of m.modules || []) {
    if (typeof mod.dest !== 'string' || mod.dest.includes('..')) {
      errs.push(`module ${mod.id}: dest 非法（须相对路径，禁 ..）`);
    }
  }
  return errs;
}
