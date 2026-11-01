const TICKET_FILE = /^\d{2}-[^/]+\.md$/;

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
