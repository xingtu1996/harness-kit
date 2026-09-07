import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCli } from './helpers.js';

test('agent-prompt 生成可复制提示（FR-15）', () => {
  const r = runCli(['agent-prompt', '--role', 'presale']);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /harness-kit init --role presale/);
  assert.match(r.stdout, /零遥测/);
});

test('agent-prompt --role content 标签正确', () => {
  const r = runCli(['agent-prompt', '--role', 'content']);
  assert.match(r.stdout, /内容运营/);
});

test('agent-prompt 无 role 给占位提示', () => {
  const r = runCli(['agent-prompt']);
  assert.match(r.stdout, /\{presale \| code-delivery \| content\}/);
});

test('agent-prompt --json 可解析', () => {
  const r = runCli(['agent-prompt', '--role', 'code-delivery', '--json']);
  const o = JSON.parse(r.stdout);
  assert.equal(o.op, 'agent-prompt');
  assert.ok(o.prompt.includes('开发交付'));
});
