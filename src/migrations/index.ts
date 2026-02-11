import * as migration_20260208_143100_initial from './20260208_143100_initial.ts';
import * as migration_20260208_204800_add_users_role from './20260208_204800_add_users_role.ts';
import * as migration_20260208_211500_add_users_username from './20260208_211500_add_users_username.ts';
import * as migration_20260209_090000_add_folders from './20260209_090000_add_folders.ts';
import * as migration_20260209_100000_add_features from './20260209_100000_add_features.ts';
import * as migration_20260210_090000_add_user_settings from './20260210_090000_add_user_settings.ts';
import * as migration_20260210_120000_add_session_modes from './20260210_120000_add_session_modes.ts';
import * as migration_20260211_120000_add_stats_tables from './20260211_120000_add_stats_tables.ts';
import * as migration_20260211_130000_patch_sessions_columns from './20260211_130000_patch_sessions_columns.ts';

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
  {
    up: migration_20260210_090000_add_user_settings.up,
    down: migration_20260210_090000_add_user_settings.down,
    name: '20260210_090000_add_user_settings'
  },
  {
    up: migration_20260210_120000_add_session_modes.up,
    down: migration_20260210_120000_add_session_modes.down,
    name: '20260210_120000_add_session_modes'
  },
  {
    up: migration_20260211_120000_add_stats_tables.up,
    down: migration_20260211_120000_add_stats_tables.down,
    name: '20260211_120000_add_stats_tables'
  },
  {
    up: migration_20260211_130000_patch_sessions_columns.up,
    down: migration_20260211_130000_patch_sessions_columns.down,
    name: '20260211_130000_patch_sessions_columns'
  },
];
