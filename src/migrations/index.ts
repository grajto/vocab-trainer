import * as migration_20260208_143100_initial from './20260208_143100_initial.ts';
import * as migration_20260208_204800_add_users_role from './20260208_204800_add_users_role.ts';
import * as migration_20260208_211500_add_users_username from './20260208_211500_add_users_username.ts';
import * as migration_20260209_090000_add_folders from './20260209_090000_add_folders.ts';
import * as migration_20260209_100000_add_features from './20260209_100000_add_features.ts';

export const migrations = [
  {
    up: migration_20260208_143100_initial.up,
    down: migration_20260208_143100_initial.down,
    name: '20260208_143100_initial'
  },
  {
    up: migration_20260208_204800_add_users_role.up,
    down: migration_20260208_204800_add_users_role.down,
    name: '20260208_204800_add_users_role'
  },
  {
    up: migration_20260208_211500_add_users_username.up,
    down: migration_20260208_211500_add_users_username.down,
    name: '20260208_211500_add_users_username'
  },
  {
    up: migration_20260209_090000_add_folders.up,
    down: migration_20260209_090000_add_folders.down,
    name: '20260209_090000_add_folders'
  },
  {
    up: migration_20260209_100000_add_features.up,
    down: migration_20260209_100000_add_features.down,
    name: '20260209_100000_add_features'
  },
];
