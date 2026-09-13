# TravelAssistant — New User Guide

Traveler-facing visual guide built from **real app screenshots**.

| File | Description |
|------|-------------|
| [TravelAssistant-New-User-Guide.pdf](./TravelAssistant-New-User-Guide.pdf) | Polished PDF guide |
| [TravelAssistant-New-User-Guide.md](./TravelAssistant-New-User-Guide.md) | Source markdown |
| [SCREENSHOT-CHECKLIST.md](./SCREENSHOT-CHECKLIST.md) | Capture status |
| [screenshots/](./screenshots/) | Raw captures |
| [screenshots/annotated/](./screenshots/annotated/) | Numbered callouts |
| [capture-screenshots.mjs](./capture-screenshots.mjs) | Playwright capture script |

## Recapture

With Expo web running on port 8081:

```bash
node docs/user-guide/capture-screenshots.mjs
npx md-to-pdf docs/user-guide/TravelAssistant-New-User-Guide.md --config-file docs/user-guide/md-to-pdf.config.js
```

Print layout is controlled by `guide-print.css` (one screen section per page; screenshots scaled to fit with text).
