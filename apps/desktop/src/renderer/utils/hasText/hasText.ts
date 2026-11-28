// "An empty string is absent" (CLAUDE.md): the one spelling of that rule for
// an optional text prop. It narrows the type to string for what follows.
export function hasText(text: string | undefined): text is string {
  return text !== undefined && text !== '';
}
