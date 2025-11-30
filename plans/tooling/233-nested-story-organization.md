# 233 - Nested Story Organization

**Status**: In Progress
**Category**: tooling
**Depends On**: 232 (Unified Filmstrip Component)

## Implementation Status

| Phase | Status | Notes |
|-------|--------|-------|
| 1. Vite/TS Aliases | ✅ Done | `@src`, `@stories` in both vite configs |
| 2a. Tree Building | ✅ Done | `navigationTree`, `allLeaves` in App.tsx |
| 2b. Sidebar Rendering | ✅ Done | `TreeNavigation` component with expand/collapse |
| 3. SingleSnapshot | ✅ Done | Component created |
| 4. Split MDX | 🔄 Partial | Bathymetry done, 7 layers remain |
| 5. Unified Navigation | ❌ Not started | Remove mode duplication |

## Next Steps

1. **Split remaining layers** (Phase 4): Energy Field, Shoaling, etc.
2. **Simplify App.tsx** (Phase 5): Remove `mode` state and merge presentation/normal into one

## Problem

The current story structure mixes multiple sub-stories (individual visualizations) within single sections. For example, "1.1 Depth Profiles" contains three separate visualizations (Linear Slope, Steep Shore, Flat Bottom) rendered as a horizontal strip, but users can't:

1. Navigate directly to a specific sub-story (e.g., `1.1.2 Steep Shore`)
2. See sub-stories in the sidebar navigation
3. Deep-link to a specific visualization

## Current Structure

```
01-bathymetry.mdx
├── <section id="depth-profiles">
│   └── ## 1.1 Depth Profiles
│       └── <BathymetryStrip snapshots={[Linear, Steep, Flat]} />  ← All 3 in one strip
│       └── ### 1.1.1 Linear Slope (text only)
│       └── ### 1.1.2 Steep Shore (text only)
│       └── ### 1.1.3 Flat Bottom (text only)
```

**Issues:**
- Visualizations are grouped together, not under their descriptions
- h3 headings aren't navigable in sidebar
- No individual visualization anchors

## Proposed Structure

### File-based Organization

Each story is a standalone MDX file. Folder structure defines hierarchy and numbering:

```
stories/
├── 01-bathymetry/
│   ├── 01-depth-profiles/
│   │   ├── 01-linear-slope.mdx
│   │   ├── 02-steep-shore.mdx
│   │   └── 03-flat-bottom.mdx
│   └── 02-bottom-features/
│       ├── 01-sandbar.mdx
│       ├── 02-reef.mdx
│       └── 03-channel.mdx
├── 02-energy-field/
│   └── ...
```

### Individual Story File

Each leaf MDX file is self-contained:

```mdx
// stories/01-bathymetry/01-depth-profiles/01-linear-slope.mdx
import { SingleSnapshot } from '@stories/components/SingleSnapshot';
import { PROGRESSION_LINEAR_SLOPE } from '@src/render/bathymetryProgressions';

# Linear Slope

<SingleSnapshot snapshot={PROGRESSION_LINEAR_SLOPE} />

Constant gradient - simple, predictable wave behavior.
```

**Key points:**
- No manual numbering in headings - derived from file path
- No intro/branch files - folders are just containers
- Vite/TS aliases (`@stories`, `@src`) avoid relative path hell

### Sidebar Navigation

JS reads directory structure and builds tree:

```
1. Bathymetry
   ├── 1.1 Depth Profiles
   │   ├── 1.1.1 Linear Slope
   │   ├── 1.1.2 Steep Shore
   │   └── 1.1.3 Flat Bottom
   └── 1.2 Bottom Features
       ├── 1.2.1 Sandbar
       ├── 1.2.2 Reef
       └── 1.2.3 Channel
```

Folders without MDX files (just subfolders) become non-clickable branch nodes.

### URL Structure

Deep-link directly to any story:
- `?story=01-bathymetry/01-depth-profiles/01-linear-slope`

## Implementation Steps

### Phase 1: Setup Vite/TS Aliases
1. Configure `@stories` alias pointing to `stories/`
2. Configure `@src` alias pointing to `src/`
3. Update tsconfig.json for IDE support

### Phase 2: Directory-based Navigation in App.tsx

#### 2a. Tree Building (DONE)
1. Use Vite's `import.meta.glob` to discover all MDX files recursively
2. Parse file paths to build hierarchical tree (extract numbers from `01-`, `02-` prefixes)
3. Tree node structure:
   ```typescript
   interface TreeNode {
     id: string;        // Full path: "01-bathymetry/01-depth-profiles/01-linear-slope"
     slug: string;      // Segment: "01-linear-slope"
     label: string;     // Display: "Linear Slope"
     number: string;    // Hierarchical: "1.1.1"
     path: string;      // MDX file path (empty for branch nodes)
     children: TreeNode[];
     isLeaf: boolean;   // Has MDX file AND no children
   }
   ```

#### 2b. Sidebar Rendering (TODO - Current Bug)

**Problem**: Current sidebar uses flat `pageEntries` list, not the tree structure.

**Solution**: Create `TreeNavigation` component that recursively renders the tree:

```tsx
function TreeNavigation({
  nodes,
  depth = 0,
  expandedNodes,
  onToggleExpand,
  currentPage,
  onSelectPage
}: TreeNavigationProps) {
  return (
    <ul style={{ paddingLeft: depth > 0 ? 16 : 0 }}>
      {nodes.map(node => (
        <li key={node.id}>
          {/* Render node */}
          {node.isLeaf ? (
            // Leaf: clickable, loads MDX
            <button onClick={() => onSelectPage(node.id)}>
              {node.number}. {node.label}
            </button>
          ) : (
            // Branch: clickable to expand/collapse, shows first leaf
            <button onClick={() => {
              onToggleExpand(node.id);
              // Also navigate to first leaf in this branch
              const firstLeaf = getFirstLeaf(node);
              if (firstLeaf) onSelectPage(firstLeaf.id);
            }}>
              {expandedNodes.has(node.id) ? '▼' : '▶'} {node.number}. {node.label}
            </button>
          )}

          {/* Render children if expanded */}
          {node.children.length > 0 && expandedNodes.has(node.id) && (
            <TreeNavigation
              nodes={node.children}
              depth={depth + 1}
              {...otherProps}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
```

**Key behaviors**:
1. **Branch click**: Expands section AND loads first leaf content
2. **Leaf click**: Loads that specific MDX content
3. **Auto-expand**: When navigating to a leaf, expand all ancestors
4. **Highlight**: Current leaf is highlighted, its ancestors show "active child" state

#### 2c. State Management

```typescript
// In App.tsx
const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
const [currentPage, setCurrentPage] = useState<string>(getInitialPage());

// Auto-expand ancestors when navigating
useEffect(() => {
  const ancestors = getAncestors(navigationTree, currentPage);
  setExpandedNodes(prev => {
    const next = new Set(prev);
    ancestors.forEach(id => next.add(id));
    return next;
  });
}, [currentPage]);
```

#### 2d. Remove Legacy Section Logic

The old code extracted `<section id="...">` from rendered MDX DOM. This is no longer needed because:
- Each MDX file is a single story (no internal sections)
- Navigation is based on file tree, not DOM sections
- Remove: `sections`, `currentSectionId`, `extractSections` effect, section-related navigation

### Phase 3: Create `SingleSnapshot` Component
1. Create component that renders one visualization (not a strip)
2. Use production renderer (from Plan 232)
3. Simple props: snapshot data, optional caption

### Phase 4: Split MDX Files
1. Create folder structure: `01-bathymetry/01-depth-profiles/01-linear-slope.mdx`
2. Each file has: title (no number), SingleSnapshot, prose
3. Delete old monolithic MDX files
4. Remove text-only sections like "Wave Speed Formula"
5. Repeat for all 8 layers

### Phase 5: Unified Navigation (Simplification)

**Key insight**: "Presentation mode" vs "normal mode" is a false dichotomy. There's just ONE viewer with:
- A sidebar (can be toggled)
- Prev/Next buttons (always available)
- Keyboard shortcuts (always work)

**Simplification**:
1. Remove the `mode` state and dual rendering paths
2. Single UI with:
   - Collapsible sidebar (toggle with button or `S` key)
   - Content area showing current leaf's MDX
   - Header with breadcrumbs + prev/next navigation
   - Footer with keyboard hints
3. User chooses their workflow:
   - Click sidebar to jump around = "browsing"
   - Use arrow keys to step through = "presenting"
   - Both work simultaneously

**Benefits**:
- ~50% less code in App.tsx
- No code duplication between modes
- More flexible UX - user isn't locked into a "mode"
- Simpler mental model

**Implementation**:
```tsx
// Single unified layout
<div>
  {sidebarOpen && <Sidebar tree={navigationTree} ... />}
  <main>
    <Header breadcrumbs={getBreadcrumbs(currentPage)} onPrev onNext />
    <Content><CurrentPageComponent /></Content>
    <Footer keyboardHints />
  </main>
</div>
```

## Open Questions

1. **Collapse behavior**: Should subsections be collapsed by default in sidebar?
2. ~~**Presentation mode**: Should subsections be individual slides, or scroll within parent section?~~ → **Decided**: Only leaves are slides
3. ~~**Strip vs Individual**: Keep comparative strip view, or fully switch to individual cards?~~ → **Decided**: Individual visualizations under each subsection. Strips are removed.
4. ~~**Auto-numbering**: JS-based auto-numbering vs manual in headings?~~ → **Decided**: Numbers come from file/folder paths. Split MDX into individual files organized in numbered folders. JS derives numbering from directory structure.
5. ~~**Leaf detection**: How to distinguish leaf nodes from branch nodes?~~ → **Decided**: Option B - childless nodes are automatically leaves. Pure tree semantics, no attributes needed. Text-only sections like "Wave Speed Formula" should be removed (belongs in unit tests or as intro text for relevant sections).

## Acceptance Criteria

- [x] Vite aliases `@stories` and `@src` configured and working
- [x] Sidebar renders hierarchical tree from `navigationTree` (not flat list)
- [x] Branch nodes expand/collapse on click
- [x] Clicking branch also loads first leaf in that branch
- [x] Deep-links work: `?page=01-bathymetry/01-depth-profiles/01-linear-slope`
- [x] Each story is a standalone MDX file with SingleSnapshot + prose
- [x] Auto-expand ancestors when navigating to leaf
- [ ] Prev/Next navigation works across subtree boundaries
- [ ] Header shows breadcrumb trail for current page
- [ ] Single unified UI (no separate presentation/normal modes)
- [ ] Sidebar can be toggled (collapsed for "presentation" feel)
- [ ] Visual regression tests updated for new layout

## Risks & Mitigations

- **Breaking change for visual tests**: Baseline screenshots will change if layout changes → Run visual tests, update baselines
- **Sidebar crowding**: Too many items may clutter sidebar → Add collapse/expand or show only on hover
