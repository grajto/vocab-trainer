import * as migration_20260208_143100_initial from './20260208_143100_initial';

export const migrations = [
  {
    up: migration_20260208_143100_initial.up,
    down: migration_20260208_143100_initial.down,
    name: '20260208_143100_initial'
  },
];
