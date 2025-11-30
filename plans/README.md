# Plans Directory

Design documents and implementation plans organized by category.

## Folder Structure

| Folder | Purpose |
|--------|---------|
| `model/` | Wave physics, simulation, timing, bathymetry |
| `visuals/` | Rendering, gradients, foam, visual effects |
| `gameplay/` | Surfer mechanics, controls, multiplayer, scoring |
| `tooling/` | Debug panel, developer tools |
| `ai/` | AI surfer ideas, heuristics, and feedback loops |
| `testing/` | Test strategy and expansion plans |
| `bugfixes/` | Specific bug investigation and fixes |
| `reference/` | Research docs, physics references (never archive) |
| `archive/` | Superseded or obsolete plans |

## Root Files

- `00-principles.md` - Foundational concepts (never archive)

## Code Quality Tools

Automated analysis available via npm scripts:

```bash
npm run check:dead-code      # Find unused files/exports/deps (Knip)
npm run check:duplicates     # Find copy-paste code (jscpd)
```

See **Plan 250** for details on the code quality agents.

## Numbering Convention

- Plans are numbered in increments of 10 (10, 20, 30...) to allow inserting related plans
- Use the next available number for new plans (e.g., after 120, use 121, 122, or 130)
- Numbers are preserved when moving to subfolders

## Creating New Plans

1. Choose the appropriate subfolder by category
1. Use the next logical number
1. Include clear sections: Problem, Proposed Solution, Implementation Steps
1. Mark dependencies on other plans if any

## Archiving

Move plans to `archive/` when:
- Fully superseded by a newer plan
- No longer relevant to current architecture

Do NOT archive:
- `00-principles.md` - foundational reference
- `reference/` files - ongoing reference material
- Plans that are only partially complete
