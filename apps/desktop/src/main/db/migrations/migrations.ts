import type { DatabaseSync } from 'node:sqlite';

// One numbered schema change of the Database. Once merged, a Migration is
// never edited, only followed by another (design log Q33).
export type Migration = {
  version: number;
  name: string;
  up: (db: DatabaseSync) => void;
};
