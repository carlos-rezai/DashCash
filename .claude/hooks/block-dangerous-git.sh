#!/bin/bash
# PreToolUse hook: blocks destructive git commands. Exit 2 = block.

INPUT=$(cat)

# jq is not installed on this machine; parse with node. Fail closed if parsing fails.
PARSED=$(printf '%s' "$INPUT" | node -e '
let s = "";
process.stdin.on("data", (d) => (s += d)).on("end", () => {
  const j = JSON.parse(s);
  process.stdout.write((j.cwd || "") + "\n" + ((j.tool_input && j.tool_input.command) || ""));
});
') || { echo "BLOCKED: git guardrail hook could not parse tool input." >&2; exit 2; }

CWD=$(printf '%s' "$PARSED" | head -n 1)
COMMAND=$(printf '%s' "$PARSED" | tail -n +2)

block() {
  echo "BLOCKED: '$COMMAND' matches dangerous pattern '$1'. The user has prevented you from doing this." >&2
  exit 2
}

DANGEROUS_PATTERNS=(
  "git reset --hard"
  "git clean -fd"
  "git clean -f"
  "git branch -D"
  "git checkout \."
  "git restore \."
  "push --force"
  "push -f( |$)"
  "--no-verify"
  "gh pr merge"
  "reset --hard"
  "git stash (drop|clear)"
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if printf '%s' "$COMMAND" | grep -qE -e "$pattern"; then
    block "$pattern"
  fi
done

# git tag: allow listing only (`git tag`, `git tag -l ...`, `git tag --list ...`).
if printf '%s' "$COMMAND" | grep -qE "git tag( |$)" &&
  ! printf '%s' "$COMMAND" | grep -qE "git tag *($|[;&|]|-l( |$)|--list( |$))"; then
  block "git tag"
fi

# git push: only from a feature or refactor branch, never to main.
if printf '%s' "$COMMAND" | grep -qE "git push"; then
  BRANCH=$(git -C "${CWD:-.}" branch --show-current 2>/dev/null)
  case "$BRANCH" in
    feat/*|refactor/*) ;;
    *) block "git push from '$BRANCH'" ;;
  esac
  if printf '%s' "$COMMAND" | grep -qE "(:| )main( |$)"; then
    block "git push to main"
  fi
fi

# CLAUDE.md: never commit to main.
if printf '%s' "$COMMAND" | grep -qE "git commit"; then
  BRANCH=$(git -C "${CWD:-.}" branch --show-current 2>/dev/null)
  if [ "$BRANCH" = "main" ]; then
    block "git commit on main"
  fi
fi

exit 0
