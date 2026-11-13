import { spawnSync } from 'node:child_process';
import { readExecutionProfile } from './execution-profile.mjs';
const managed = readExecutionProfile() === 'managed-linux';
if (!managed && !process.env.npm_execpath) throw new Error('Run through the configured package manager.');
const result = spawnSync(managed ? 'bash' : process.execPath, managed ? ['scripts/install-pnpm.sh'] : [process.env.npm_execpath, 'install', '--frozen-lockfile', '--prefer-offline'], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
