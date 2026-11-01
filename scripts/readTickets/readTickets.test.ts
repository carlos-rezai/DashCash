import { describe, expect, it } from 'vitest';
import { hasTicket, listTickets, readTicketStatus } from './readTickets.ts';

const FOLDER = 'docs/features/01-sample';
const tracked = [
  `${FOLDER}/prd.md`,
  `${FOLDER}/01-first-slice.md`,
  `${FOLDER}/02-second-slice.md`,
  `${FOLDER}/04-sketch.txt`,
  `${FOLDER}/refactor-plan.md`,
  `${FOLDER}/sub/03-nested.md`,
  'docs/features/01-sample-extra/05-other.md',
  'docs/features/02-other/03-third-slice.md',
];

describe('listTickets', () => {
  it('lists the numbered markdown files directly inside the folder', () => {
    expect(listTickets(FOLDER, tracked)).toEqual([
      `${FOLDER}/01-first-slice.md`,
      `${FOLDER}/02-second-slice.md`,
    ]);
  });

  it('lists nothing for a folder without Tickets', () => {
    expect(listTickets('docs/features/09-none', tracked)).toEqual([]);
  });
});

describe('hasTicket', () => {
  it.each(['01', '02'])('finds Ticket %s', (number) => {
    expect(hasTicket(FOLDER, number, tracked)).toBe(true);
  });

  it.each([
    ['a number no Ticket has', '06'],
    ['a file that is no Ticket', '04'],
    ['a Ticket nested deeper', '03'],
    ['a Ticket of another folder', '05'],
  ])('does not find %s', (_case, number) => {
    expect(hasTicket(FOLDER, number, tracked)).toBe(false);
  });
});

describe('readTicketStatus', () => {
  it.each(['done', 'open', 'in-progress'])('reads status: %s', (status) => {
    const content = ['---', `status: ${status}`, '---', '# Title', ''].join(
      '\n',
    );
    expect(readTicketStatus(content)).toBe(status);
  });

  it('reads the status word before the template comment', () => {
    expect(
      readTicketStatus(
        '---\nstatus: done   # open | in-progress | done\n---\n# Title\n',
      ),
    ).toBe('done');
  });

  it('reads nothing from a file without front matter', () => {
    expect(readTicketStatus('# Title\n\nstatus: done\n')).toBeUndefined();
  });

  it('ignores a status line outside the front matter', () => {
    expect(
      readTicketStatus('---\ntitle: x\n---\nstatus: done\n'),
    ).toBeUndefined();
  });
});
