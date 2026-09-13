# Dependency audit

**Date:** 2026-09-13  
**Command:** `npm audit`

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Moderate | 16 |
| Low | 0 |

## Notable moderate findings

| Package | Issue | Notes |
|---------|-------|-------|
| `decode-uri-component` (via `query-string` / `expo-router`) | DoS on malformed percent-encoding | Transitive Expo Router; wait for upstream Expo patch |
| `uuid` (via `xcode` / `@expo/config-plugins`) | Buffer bounds in uncommon API paths | Build-time Expo toolchain; not runtime mobile path |
| Expo config plugin chain | Inherited from uuid/xcode | Do not force major Expo upgrades mid-release without regression testing |

## Decisions

- **No blind major upgrades** of Expo SDK 57 packages for moderate build-toolchain advisories.
- Re-run `npm audit` before each store submission.
- Prefer `npm ci` with lockfile in CI.
- Review `postinstall` scripts when adding packages.

## Lockfile

- `package-lock.json` is committed and required for reproducible installs.
