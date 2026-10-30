# When to Mock

Mock at **system boundaries** only. Your own modules and internal
collaborators are tested through their public interface, never replaced.

## This project's boundaries, and the double for each

| Boundary                         | Double                                                                      |
| -------------------------------- | --------------------------------------------------------------------------- |
| SQLite                           | a real database in a temp file, opened through the `main/db` test harness   |
| CSV files and the data folder    | invented files from `fixtures/`, copied into a temp dir removed after the test |
| The IPC bridge in the renderer   | a fake implementation of the `packages/contract` channels                   |
| Electron APIs (dialogs, updater) | injected into the `main` module that uses them                              |
| Time                             | "today" passed as a parameter in `domain`; `vi.useFakeTimers` in the renderer |
| Randomness                       | `vi.spyOn(Math, 'random')`                                                  |

The `test-support/` folders hold the shared doubles and builders; list them
before writing a new one. A double that does not exist yet is created there
on first need, not inline in a test.

## Designing for Mockability

At system boundaries, design interfaces that are easy to mock:

**1. Use dependency injection**

Pass external dependencies in rather than creating them internally:

```typescript
// Easy to mock
function createUpdater(updater: AppUpdater, releaseChannel: string) {}

// Hard to mock
function createUpdater() {
  const updater = require('electron-updater').autoUpdater;
}
```

**2. Prefer SDK-style interfaces over generic fetchers**

Create specific functions for each external operation instead of
one generic function with conditional logic:

```typescript
// GOOD: Each function is independently mockable
const api = {
  listAccounts: () => invoke('accounts:list'),
  commitImport: (rows) => invoke('import:commit', rows),
  saveGoal: (accountId, goal) => invoke('accounts:save-goal', accountId, goal),
};

// BAD: Mocking requires conditional logic inside the mock
const api = {
  invoke: (channel, ...args) => invoke(channel, ...args),
};
```

The SDK approach means:

- Each mock returns one specific shape
- No conditional logic in test setup
- Easier to see which channels a test exercises
- Type safety per channel
