***REMOVED***!/usr/bin/env node
// harness-kit 薄入口（core/bin 分离：逻辑全在 src/，此文件仅转调并退出）。
import { main } from '../src/cli.js';

const { exitCode } = await main(process.argv.slice(2));
process.exit(exitCode ?? 0);
