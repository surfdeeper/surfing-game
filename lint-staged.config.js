export default {
  '*.{ts,tsx}': ['prettier --write', 'eslint --fix'],
  '*.{js,jsx}': ['prettier --write', 'eslint --fix'],
  '*.{json,css}': ['prettier --write'],
};
