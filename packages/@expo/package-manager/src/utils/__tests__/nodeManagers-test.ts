import { vol } from 'memfs';
import path from 'path';

import { BunPackageManager } from '../../node/BunPackageManager';
import { NpmPackageManager } from '../../node/NpmPackageManager';
import { PnpmPackageManager } from '../../node/PnpmPackageManager';
import { YarnPackageManager } from '../../node/YarnPackageManager';
import {
  createForProject,
  resolveCurrentPackageManager,
  resolvePackageManager,
} from '../nodeManagers';
import {
  BUN_LOCK_FILE,
  NPM_LOCK_FILE,
  PNPM_LOCK_FILE,
  PNPM_WORKSPACE_FILE,
  YARN_LOCK_FILE,
} from '../nodeWorkspaces';

jest.mock('fs');

/** Keep track of the original package manager used to execute the tests */
let originalPackageManager = process.env.npm_config_user_agent;
beforeAll(() => {
  originalPackageManager = process.env.npm_config_user_agent;
});
beforeEach(() => {
  delete process.env.npm_config_user_agent;
});
afterAll(() => {
  process.env.npm_config_user_agent = originalPackageManager;
});

describe(createForProject, () => {
  const projectRoot = '/foo';

  afterEach(() => vol.reset());

  it(`creates npm package manager from options`, () => {
    expect(createForProject(projectRoot, { npm: true })).toBeInstanceOf(NpmPackageManager);
  });

  it(`creates yarn package manager from options`, () => {
    expect(createForProject(projectRoot, { yarn: true })).toBeInstanceOf(YarnPackageManager);
  });

  it(`creates pnpm package manager from options`, () => {
    expect(createForProject(projectRoot, { pnpm: true })).toBeInstanceOf(PnpmPackageManager);
  });

  it(`creates bun package manager from options`, () => {
    expect(createForProject(projectRoot, { bun: true })).toBeInstanceOf(BunPackageManager);
  });

  it(`defaults to npm package manager`, () => {
    expect(createForProject(projectRoot)).toBeInstanceOf(NpmPackageManager);
  });

  it(`creates package manager from user agent`, () => {
    process.env.npm_config_user_agent = 'bun/1.0.13 npm/? node/v20.8.0 darwin arm64';
    vol.fromJSON(
      {
        'package.json': JSON.stringify({ name: 'project' }),
        // Test that the lock files are ignored when using the user agent
        [NPM_LOCK_FILE]: '',
        [PNPM_LOCK_FILE]: '',
        [YARN_LOCK_FILE]: '',
      },
      projectRoot
    );

    expect(createForProject(projectRoot)).toBeInstanceOf(BunPackageManager);
  });

  it(`creates npm package manager from project`, () => {
    vol.fromJSON(
      {
        'package.json': JSON.stringify({ name: 'project' }),
        [NPM_LOCK_FILE]: '',
      },
      projectRoot
    );

    expect(createForProject(projectRoot)).toBeInstanceOf(NpmPackageManager);
  });

  it(`creates yarn package manager from project`, () => {
    vol.fromJSON(
      {
        'package.json': JSON.stringify({ name: 'project' }),
        [YARN_LOCK_FILE]: '',
      },
      projectRoot
    );

    expect(createForProject(projectRoot)).toBeInstanceOf(YarnPackageManager);
  });

  it(`creates pnpm package manager from project`, () => {
    vol.fromJSON(
      {
        'package.json': JSON.stringify({ name: 'project' }),
        [PNPM_LOCK_FILE]: '',
      },
      projectRoot
    );

    expect(createForProject(projectRoot)).toBeInstanceOf(PnpmPackageManager);
  });

  it(`creates bun package manager from project`, () => {
    vol.fromJSON(
      {
        'package.json': JSON.stringify({ name: 'project' }),
        [BUN_LOCK_FILE]: '',
      },
      projectRoot
    );

    expect(createForProject(projectRoot)).toBeInstanceOf(BunPackageManager);
  });

  it(`creates bun package manager from project using "yarn.lock" and "bun.lockb"`, () => {
    vol.fromJSON(
      {
        'package.json': JSON.stringify({ name: 'project' }),
        [BUN_LOCK_FILE]: '',
        [YARN_LOCK_FILE]: '',
      },
      projectRoot
    );

    expect(createForProject(projectRoot)).toBeInstanceOf(BunPackageManager);
  });

  it(`defaults to npm package manager`, () => {
    vol.fromJSON(
      {
        'package.json': JSON.stringify({ name: 'project' }),
      },
      projectRoot
    );

    expect(createForProject(projectRoot)).toBeInstanceOf(NpmPackageManager);
  });
});

describe(resolvePackageManager, () => {
  const workspaceRoot = path.resolve('/monorepo/');
  const projectRoot = path.resolve('/monorepo/packages/test/');

  afterEach(() => vol.reset());

  it(`resolves npm from monorepo workspace`, () => {
    vol.fromJSON(
      {
        'packages/test/package.json': JSON.stringify({ name: 'project' }),
        'package.json': JSON.stringify({
          private: true,
          name: 'monorepo',
          workspaces: ['packages/*'],
        }),
        [NPM_LOCK_FILE]: '',
      },
      workspaceRoot
    );

    expect(resolvePackageManager(projectRoot)).toBe('npm');
    expect(resolvePackageManager(projectRoot, 'npm')).toBe('npm');
    expect(resolvePackageManager(projectRoot, 'pnpm')).toBeNull();
    expect(resolvePackageManager(projectRoot, 'yarn')).toBeNull();
    expect(resolvePackageManager(projectRoot, 'bun')).toBeNull();
  });

  it(`resolves pnpm from monorepo workspace`, () => {
    vol.fromJSON(
      {
        'packages/test/package.json': JSON.stringify({ name: 'project' }),
        'package.json': JSON.stringify({
          private: true,
          name: 'monorepo',
        }),
        [PNPM_LOCK_FILE]: '',
        [PNPM_WORKSPACE_FILE]: 'packages:\n  - packages/*',
      },
      workspaceRoot
    );

    expect(resolvePackageManager(projectRoot)).toBe('pnpm');
    expect(resolvePackageManager(projectRoot, 'pnpm')).toBe('pnpm');
    expect(resolvePackageManager(projectRoot, 'npm')).toBeNull();
    expect(resolvePackageManager(projectRoot, 'yarn')).toBeNull();
    expect(resolvePackageManager(projectRoot, 'bun')).toBeNull();
  });

  it(`resolves yarn from monorepo workspace`, () => {
    vol.fromJSON(
      {
        'packages/test/package.json': JSON.stringify({ name: 'project' }),
        'package.json': JSON.stringify({
          private: true,
          name: 'monorepo',
          workspaces: ['packages/*'],
        }),
        [YARN_LOCK_FILE]: '',
      },
      workspaceRoot
    );

    expect(resolvePackageManager(projectRoot)).toBe('yarn');
    expect(resolvePackageManager(projectRoot, 'yarn')).toBe('yarn');
    expect(resolvePackageManager(projectRoot, 'npm')).toBeNull();
    expect(resolvePackageManager(projectRoot, 'pnpm')).toBeNull();
    expect(resolvePackageManager(projectRoot, 'bun')).toBeNull();
  });

  it(`resolves bun from monorepo workspace`, () => {
    vol.fromJSON(
      {
        'packages/test/package.json': JSON.stringify({ name: 'project' }),
        'package.json': JSON.stringify({
          private: true,
          name: 'monorepo',
          workspaces: ['packages/*'],
        }),
        [BUN_LOCK_FILE]: '',
      },
      workspaceRoot
    );

    expect(resolvePackageManager(projectRoot)).toBe('bun');
    expect(resolvePackageManager(projectRoot, 'bun')).toBe('bun');
    expect(resolvePackageManager(projectRoot, 'npm')).toBeNull();
    expect(resolvePackageManager(projectRoot, 'pnpm')).toBeNull();
    expect(resolvePackageManager(projectRoot, 'yarn')).toBeNull();
  });

  it(`resolves bun from monorepo workspace using "yarn.lock" and "bun.lockb"`, () => {
    vol.fromJSON(
      {
        'packages/test/package.json': JSON.stringify({ name: 'project' }),
        'package.json': JSON.stringify({
          private: true,
          name: 'monorepo',
          workspaces: ['packages/*'],
        }),
        [BUN_LOCK_FILE]: '',
        [YARN_LOCK_FILE]: '',
      },
      workspaceRoot
    );

    expect(resolvePackageManager(projectRoot)).toBe('bun');
    expect(resolvePackageManager(projectRoot, 'bun')).toBe('bun');
    expect(resolvePackageManager(projectRoot, 'npm')).toBeNull();
    expect(resolvePackageManager(projectRoot, 'pnpm')).toBeNull();

    // Due to the `yarn.lock` file being present when running `bun install --yarn`,
    // yarn can be returned as package manager when prefering `yarn`.
    expect(resolvePackageManager(projectRoot, 'yarn')).toBe('yarn');
  });
});

describe(resolveCurrentPackageManager, () => {
  it(`returns null when user agent is not set`, () => {
    delete process.env.npm_config_user_agent;
    expect(resolveCurrentPackageManager()).toBeNull();
  });

  it(`resolves bun package manager from user agent`, () => {
    process.env.npm_config_user_agent = 'bun/1.0.13 npm/? node/v20.8.0 darwin arm64';
    expect(resolveCurrentPackageManager()).toBe('bun');
  });

  it(`resolved npm package manager from user agent`, () => {
    process.env.npm_config_user_agent = 'npm/10.2.3 node/v18.18.2 darwin arm64 workspaces/false';
    expect(resolveCurrentPackageManager()).toBe('npm');
  });

  it(`resolved pnpm package manager from user agent`, () => {
    process.env.npm_config_user_agent = 'pnpm/8.10.2 npm/? node/v18.18.2 darwin arm64';
    expect(resolveCurrentPackageManager()).toBe('pnpm');
  });

  it(`resolved yarn package manager from user agent`, () => {
    process.env.npm_config_user_agent = 'yarn/1.22.19 npm/? node/v18.18.2 darwin arm64';
    expect(resolveCurrentPackageManager()).toBe('yarn');
  });
});
