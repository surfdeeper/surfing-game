---
description: Show roadmap status and active plans
---

# Project Roadmap Context

## Current Roadmap Status
@ plans/ROADMAP.md

## Active Plans by Category
! find plans -name "*.md" -type f | grep -v archive | grep -v README | head -30

## Recently Modified Plans
! ls -lt plans/**/*.md 2>/dev/null | head -10

Review the roadmap and identify:
1. What is currently in progress
2. What's blocked and why
3. Recommended next steps
