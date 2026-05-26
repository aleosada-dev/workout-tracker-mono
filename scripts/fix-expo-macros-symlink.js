#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const hoisted = path.join(repoRoot, 'node_modules', '@expo', 'expo-modules-macros-plugin');
const nestedDir = path.join(repoRoot, 'node_modules', 'expo-modules-core', 'node_modules', '@expo');
const nestedLink = path.join(nestedDir, 'expo-modules-macros-plugin');

if (!fs.existsSync(hoisted)) {
  process.exit(0);
}

const tool = path.join(nestedLink, 'apple', 'ExpoModulesMacros-tool');
if (fs.existsSync(tool)) {
  process.exit(0);
}

fs.mkdirSync(nestedDir, { recursive: true });
try {
  fs.rmSync(nestedLink, { recursive: true, force: true });
} catch {}
fs.symlinkSync(path.relative(nestedDir, hoisted), nestedLink, 'dir');
console.log('Linked @expo/expo-modules-macros-plugin into expo-modules-core (monorepo macro fix)');
