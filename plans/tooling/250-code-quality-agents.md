# 250 - Code Quality Agents

**Status**: ✅ Complete
**Category**: tooling
**Completed**: 2024-11-29
**Related**: 161 (dead code cleanup), 170 (test/production parity)

## Summary

Added two specialized agents and npm scripts for automated code quality analysis:

1. **dead-code-analysis** - Finds unused files, exports, and dependencies using Knip
2. **duplicate-code-analysis** - Finds copy-paste code and test/production drift using jscpd

## What Was Implemented

### Agents Created

| Agent | Location | Purpose |
|-------|----------|---------|
| `dead-code-analysis` | `.claude/agents/dead-code-analysis.md` | Find unused code with Knip + custom patterns |
| `duplicate-code-analysis` | `.claude/agents/duplicate-code-analysis.md` | Find duplicates with jscpd + test/prod drift |

### npm Scripts Added

```bash
npm run check:dead-code          # Quick Knip scan
npm run check:dead-code:json     # JSON output for parsing
npm run check:duplicates         # Quick jscpd scan
npm run check:duplicates:report  # HTML report in ./jscpd-report
```

### Tools Used

| Tool | Purpose | Documentation |
|------|---------|---------------|
| [Knip](https://knip.dev/) | Dead code, unused exports/deps | Comprehensive JS/TS analysis |
| [jscpd](https://github.com/kucherenko/jscpd) | Copy-paste detection | 150+ language support |

## Key Features

### Dead Code Analysis Agent

- Uses Knip for comprehensive unused code detection
- Finds unused files, exports, dependencies, devDependencies
- Identifies missing/unlisted dependencies
- Custom patterns for detecting test-only helpers
- Risk-based categorization (safe/verify/investigate)

### Duplicate Code Analysis Agent

- Uses jscpd for syntactic clone detection
- Custom analysis for semantic duplicates
- **Test/production drift detection** - Critical pattern where tested code differs from production
- Reports with risk levels and recommendations

## Usage Examples

```bash
# Find all dead code
npx knip

# Find unused dependencies only
npx knip --include dependencies,devDependencies

# Find duplicate code with HTML report
npx jscpd src/ --reporters html,console --output ./jscpd-report

# Run agents via Claude
# Use Task tool with subagent_type="dead-code-analysis" or "duplicate-code-analysis"
```

## Relationship to Existing Plans

### Plan 161 (Dead Code Cleanup)

Plan 161 was a one-time manual cleanup. The new dead-code-analysis agent provides:
- **Automated detection** - No manual inventory needed
- **Ongoing monitoring** - Can be run any time
- **CI integration** - `npx knip --threshold 0` fails on any dead code

### Plan 170 (Test/Production Parity)

Plan 170 addressed specific test/prod drift issues. The duplicate-code-analysis agent:
- **Detects drift automatically** - Finds helpers used only in tests
- **Compares implementations** - Identifies when test and prod code diverge
- **Prevents regression** - Can catch new drift before it merges

## CI Integration (Optional Future)

Add to CI pipeline:

```yaml
# In GitHub Actions or similar
- name: Check dead code
  run: npx knip --no-progress

- name: Check duplicates
  run: npx jscpd src/ --threshold 5
```

## Files Changed

- `.claude/agents/dead-code-analysis.md` (created)
- `.claude/agents/duplicate-code-analysis.md` (created)
- `package.json` (4 new scripts)
- `CLAUDE.md` (documented new commands)

## Next Steps

1. Run initial scan to establish baseline: `npm run check:dead-code`
2. Address any critical findings
3. Consider adding to CI for ongoing enforcement
