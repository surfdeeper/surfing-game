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
2. **IMPORTANT**: Install dependencies and hooks in the new worktree:
   ```bash
   cd ../surfing-game-wt-<name> && npm install
   ```
   This installs node_modules AND sets up husky pre-commit hooks.
3. Verify the build passes: `npm run build`
4. Report the path to the new worktree

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
- **Always run `npm install`** after creating a worktree (installs deps + husky hooks)
- **Always run `npm run build`** to verify the branch builds before making changes
- Delete worktree after PR is merged
