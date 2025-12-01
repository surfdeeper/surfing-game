# Create Feature Branch

Create a feature branch using GitHub MCP.

## Usage

`/branch <name>`

## Arguments

$ARGUMENTS - The branch name (without "feature/" prefix)

## Instructions

1. Parse the branch name from arguments
2. Use GitHub MCP to create the branch:

```
mcp__github__create_branch(
  owner: "surfdeeper",
  repo: "surfing-game",
  branch: "feature/<name>",
  from_branch: "master"
)
```

3. Check out the branch locally: `git fetch && git checkout feature/<name>`
4. Report success with the branch name

## Notes

- Branch is created on GitHub first, then checked out locally
- Use `/worktree create <name>` instead if you want a separate working directory
- The branch will be based on the latest `master`
