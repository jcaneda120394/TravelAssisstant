# Phase 1 Manual Test Checklist

## Launch

- [ ] `npm install` succeeds
- [ ] `npx expo start` launches without Metro errors
- [ ] App loads past splash screen
- [ ] Fonts render (Plus Jakarta Sans)

## Navigation

- [ ] Bottom tabs show: Home, Explore, Trips, Map, AI, Profile
- [ ] Each tab opens its screen
- [ ] No crash when switching tabs quickly

## Home

- [ ] Greeting shows Good morning/afternoon/evening
- [ ] TravelAssistant brand appears in hero
- [ ] Quick actions navigate to other tabs
- [ ] Mock provider badge visible

## AI

- [ ] Welcome message visible
- [ ] Mode chips selectable
- [ ] Sending a message returns mock assistant reply
- [ ] Loading skeleton appears while pending

## Profile / theme

- [ ] Theme buttons: system / light / dark
- [ ] Switching theme updates UI colors
- [ ] Supabase status shows “Not configured” until env is set

## Resilience

- [ ] Airplane mode shows offline banner (when detectable)
- [ ] App remains usable offline for static screens

## Quality gates

- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
