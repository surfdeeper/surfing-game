#!/bin/bash
JS_FILES=$(find src -name "*.js" -o -name "*.jsx" 2>/dev/null)
if [ -n "$JS_FILES" ]; then
  echo "Error: JavaScript files found in src/. Please convert to TypeScript:"
  echo "$JS_FILES"
  exit 1
fi
echo "✓ No JavaScript files in src/"
