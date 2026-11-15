import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createFakeElectron } from '../test-support/fakeElectron/fakeElectron.ts';
import { showStartupError } from './showStartupError.ts';

const FOLDER = resolve('/invented', 'dashcash-data');
const CAUSE = 'An invented cause.';

describe('showStartupError', () => {
  it('shows the box "DashCash couldn\'t start" with the cause, a blank line and the Data folder', () => {
    const fake = createFakeElectron();

    showStartupError(fake.electron.dialog, fake.app, CAUSE, FOLDER);

    expect(fake.errorBoxes).toEqual([
      expect.objectContaining({
        title: "DashCash couldn't start",
        content: `${CAUSE}\n\nData folder: ${FOLDER}`,
      }) as unknown,
    ]);
  });

  it('quits the app once, after the box', () => {
    const fake = createFakeElectron();

    showStartupError(fake.electron.dialog, fake.app, CAUSE, FOLDER);

    expect(fake.errorBoxes.map((box) => box.quitsBefore)).toEqual([0]);
    expect(fake.quitCount()).toBe(1);
  });
});
