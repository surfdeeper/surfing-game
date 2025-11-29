# Worktree Management

Create or manage git worktrees for concurrent feature development.

## Usage

- `/worktree create <name>` - Create new worktree for feature/<name>
- `/worktree list` - Show all worktrees
- `/worktree remove <name>` - Remove worktree (keeps branch)

## Arguments

$ARGUMENTS - The subcommand and optional name (e.g., "create shoaling" or "list")

## Instructions

Parse the arguments to determine the action:

### create <name>
1. Run: `git worktree add ../surfing-game-wt-<name> -b feature/<name>`
2. Report the path to the new worktree
3. Remind user to run `npm install` in the worktree if needed

### list
1. Run: `git worktree list`
2. Display the results

### remove <name>
1. Run: `git worktree remove ../surfing-game-wt-<name>`
2. Confirm removal
3. Note: This keeps the branch - use `git branch -d feature/<name>` to delete the branch too

## Conventions

- Worktrees are siblings to main repo: `../surfing-game-wt-<name>`
- Branch naming: `feature/<name>`
- Delete worktree after PR is merged
- Each worktree needs its own `node_modules` (run `npm install`)
