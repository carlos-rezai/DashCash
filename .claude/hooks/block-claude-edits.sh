#!/bin/bash
# PreToolUse hook: blocks Edit, Write and Bash changes under .claude/. Exit 2 = block.
# Changes to skills, agents, hooks and settings are made by the human by hand.

INPUT=$(cat)

# jq is not installed on this machine; parse and judge with node. Fail closed
# if parsing fails. Prints "ok", or the reason for blocking. The project root
# goes in on the first line of standard input: Git Bash would rewrite a POSIX
# path passed to node in the environment.
VERDICT=$(printf '%s\n%s' "$CLAUDE_PROJECT_DIR" "$INPUT" | node -e '
const posix = require("path").posix;

// Lower case, "/" separators, Git Bash "/d/..." as "d:/...", no "." or "..".
function normalise(p) {
  let s = p.replace(/\\/g, "/").toLowerCase();
  s = s.replace(/^\/([a-z])(\/|$)/, "$1:/");
  const drive = /^[a-z]:/.test(s) ? s.slice(0, 2) : "";
  return drive + posix.normalize(s.slice(drive.length)).replace(/\/$/, "");
}

function isAbsolute(p) {
  return /^([a-zA-Z]:)?[\\/]/.test(p);
}

function underClaude(filePath, cwd, root) {
  const base = normalise(root || cwd);
  const full = normalise(isAbsolute(filePath) ? filePath : cwd + "/" + filePath);
  const rel = full.startsWith(base + "/") ? full.slice(base.length + 1) : full;
  return rel === ".claude" || rel.startsWith(".claude/");
}

// A path under .claude/: ".claude" followed by a separator, a quote, a space,
// a shell operator or the end, and not part of a longer name such as
// "x.claude/".
const NAMES_CLAUDE = /(^|[^\w.-])\.claude([\\/\s"\x27;&|<>)]|$)/;
const READ_ONLY_GIT = /^\s*git\s+(status|diff|log|show|add)(\s[^\n]*)?$/;
const SHELL_OPERATOR = /[|;&<>`\n]|\$\(/;
// git diff, log and show write a file with --output, so it is never read-only.
const WRITES_OUTPUT = /--output/;

let s = "";
process.stdin.on("data", (d) => (s += d)).on("end", () => {
  const newline = s.indexOf("\n");
  const root = s.slice(0, newline);
  let j;
  try {
    j = JSON.parse(s.slice(newline + 1));
  } catch {
    process.exit(1);
  }
  const input = j.tool_input || {};
  const cwd = j.cwd || "";

  if (typeof input.file_path === "string" && underClaude(input.file_path, cwd, root)) {
    process.stdout.write(j.tool_name + " of " + input.file_path);
    return;
  }
  if (typeof input.command === "string" && NAMES_CLAUDE.test(input.command)) {
    const readOnly =
      READ_ONLY_GIT.test(input.command) &&
      !SHELL_OPERATOR.test(input.command) &&
      !WRITES_OUTPUT.test(input.command);
    if (!readOnly) {
      process.stdout.write("Bash command naming .claude/: " + input.command);
      return;
    }
  }
  process.stdout.write("ok");
});
') || { echo "BLOCKED: .claude guard hook could not parse tool input." >&2; exit 2; }

if [ "$VERDICT" != "ok" ]; then
  echo "BLOCKED: $VERDICT. Changes under .claude/ are made by the human by hand." >&2
  exit 2
fi

exit 0
