import { DatabaseSync } from 'node:sqlite';

// The `main/db` test harness for SQLite connections: while a watch runs, every
// DatabaseSync that is used (exec, prepare or close) is recorded, so a test
// can tell whether the connections a module opened are still open, without
// reaching into the module. The connections are real; nothing is faked.

const WATCHED = ['exec', 'prepare', 'close'] as const;

export type ConnectionWatch = {
  // Every connection used since the watch began, in order of first use.
  connections(): DatabaseSync[];
  // Puts DatabaseSync back as it was.
  stop(): void;
};

export function watchConnections(): ConnectionWatch {
  const seen = new Set<DatabaseSync>();
  const prototype: object = DatabaseSync.prototype;
  const originals = WATCHED.map((name) => {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
    if (descriptor === undefined) {
      throw new Error(`DatabaseSync has no method ${name}`);
    }
    return { name, descriptor };
  });

  for (const { name, descriptor } of originals) {
    const original = descriptor.value as (...args: unknown[]) => unknown;
    Object.defineProperty(prototype, name, {
      ...descriptor,
      value: function watched(this: DatabaseSync, ...args: unknown[]): unknown {
        seen.add(this);
        return Reflect.apply(original, this, args);
      },
    });
  }

  return {
    connections: () => [...seen],
    stop: () => {
      for (const { name, descriptor } of originals) {
        Object.defineProperty(prototype, name, descriptor);
      }
    },
  };
}
