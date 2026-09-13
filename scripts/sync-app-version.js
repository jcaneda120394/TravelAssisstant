#!/usr/bin/env node
/**
 * Keeps app.json expo.version in sync with package.json after npm version bumps.
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const pkgPath = path.join(root, 'package.json');
const appJsonPath = path.join(root, 'app.json');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

if (!pkg.version) {
  console.error('[sync-app-version] package.json has no version');
  process.exit(1);
}

appJson.expo = appJson.expo ?? {};
appJson.expo.version = pkg.version;
fs.writeFileSync(appJsonPath, `${JSON.stringify(appJson, null, 2)}\n`, 'utf8');
console.log(`[sync-app-version] app.json version → ${pkg.version}`);
