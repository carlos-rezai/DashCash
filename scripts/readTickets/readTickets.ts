const TICKET_FILE = /^\d{2}-[^/]+\.md$/;
const STATUS_LINE = /^status:[ \t]*([^\s#]*)/m;
const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---/;

// Every tracked Ticket file directly inside a Feature folder.
export function listTickets(
  folderPath: string,
  trackedPaths: readonly string[],
): string[] {
  return trackedPaths.filter(
    (path) =>
      path.startsWith(`${folderPath}/`) &&
      TICKET_FILE.test(path.slice(folderPath.length + 1)),
  );
}

// Whether a Feature folder holds a Ticket with this number.
export function hasTicket(
  folderPath: string,
  number: string,
  trackedPaths: readonly string[],
): boolean {
  return listTickets(folderPath, trackedPaths).some((path) =>
    path.slice(folderPath.length + 1).startsWith(`${number}-`),
  );
}

// The raw word of the `status:` line in a Ticket's front matter, if any.
export function readTicketStatus(content: string): string | undefined {
  const frontMatter = FRONT_MATTER.exec(content)?.[1] ?? '';
  return STATUS_LINE.exec(frontMatter)?.[1];
}
