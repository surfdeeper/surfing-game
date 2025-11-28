---
description: Identify duplicate code and refactoring opportunities, discuss options before changes
argument-hint: [area, file, or pattern]
---

# Refactoring Analysis

I'll analyze the codebase for duplicate code and refactoring opportunities, then discuss findings with you before any changes.

## Scan Target
$ARGUMENTS

If no target specified, I'll scan `src/` broadly.

## Analysis Process

### Step 1: Dead Helper Check (FIRST)
Before looking for duplicates, I'll check for the most dangerous pattern:
**Tested helpers that production doesn't use.**

```bash
# Find exports that aren't imported by production code
grep -l "export function" src/render/*.js | while read f; do
  funcs=$(grep -o "export function [a-zA-Z]*" "$f" | cut -d' ' -f3)
  for func in $funcs; do
    if ! grep -rq "$func" src/main.jsx; then
      echo "⚠️  $f: $func - exported but main.jsx doesn't use it"
    fi
  done
done
```

This catches: helper tested in isolation, but production uses inline copy.

### Step 2: Discovery
I'll search for:
- Similar function signatures and bodies
- Repeated logic patterns (loops, conditionals, transformations)
- Copy-paste code blocks
- Parallel module structures
- Repeated constants or magic numbers

### Step 3: Report Findings
For each opportunity found, I'll report:
- **Location**: File paths and line numbers
- **Pattern**: What type of duplication
- **Similarity**: How alike the code is
- **Impact**: How many places affected

### Step 4: Discussion
**I will NOT proceed with changes without your input.**

For each significant finding, I'll ask:
- Is this intentional duplication (performance, clarity)?
- What abstraction name makes sense?
- Where should shared code live?
- Should we create a plan document first?

### Step 5: Options
For each opportunity, I'll propose options like:
- A) Extract to shared utility function
- B) Create a parameterized version
- C) Keep separate (document why)
- D) Other approach you suggest

## Search Patterns I'll Use

```bash
# Similar function names
grep -r "function.*Name" src/

# Repeated operations
grep -rn "Math.max.*Math.min" src/
grep -rn "forEach.*=>" src/

# Module structure patterns
find src/ -name "*.js" | head -20
```

## Output Format

```
## Refactoring Opportunities Found

### 1. [Pattern Name]
**Files**:
- src/file1.js:42
- src/file2.js:87
- src/file3.js:15

**Current Code** (example):
[snippet]

**Similarity**: 90% identical logic
**Occurrences**: 3

**Options**:
A) Extract to `src/utils/[name].js`
B) Parameterize existing function
C) Keep as-is (explain why)

**Your preference?**
```

## After Your Decision

Once you choose an approach:
1. I'll implement incrementally (one change at a time)
2. Run `npm run lint` after each change
3. Run `npm test` to verify no regressions
4. Create plan doc if changes are significant

## Notes
- I won't introduce new patterns without your approval
- Performance-critical code stays untouched unless you confirm
- Each extraction will be discussed before implementation
