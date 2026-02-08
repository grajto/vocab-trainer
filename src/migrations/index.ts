import * as migration_20260208_143100_initial from './20260208_143100_initial';
import * as migration_20260208_204800_add_users_role from './20260208_204800_add_users_role';

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
];
