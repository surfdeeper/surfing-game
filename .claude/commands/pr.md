# Create Pull Request

Create a pull request for the current branch using GitHub MCP.

## Usage

`/pr [title]`

## Arguments

$ARGUMENTS - Optional PR title. If omitted, infer from branch name.

## Instructions

1. Get the current branch: `git branch --show-current`
2. If no title provided, generate one from branch name:
   - `feature/shoaling-physics` → "feat: shoaling physics"
   - `feature/fix-wave-timing` → "fix: wave timing"
3. Gather context for PR body:
   - Run `git log main..HEAD --oneline` to see commits
   - Summarize the changes
4. Create PR using GitHub MCP:

```
mcp__github__create_pull_request(
  owner: "joshribakoff",
  repo: "surfing-game",
  title: "<title>",
  head: "<current-branch>",
  base: "main",
  body: "## Summary\n<bullet points>\n\n## Test Plan\n<how to verify>\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)"
)
```

5. Report the PR URL

## Notes

- Always targets `main` branch
- PR body follows project template with Summary and Test Plan sections
- Check PR status later with: `mcp__github__pull_request_read(method="get_status", ...)`
