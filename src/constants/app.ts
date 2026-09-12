export const APP_NAME = 'TravelAssistant';
export const APP_TAGLINE = 'Your intelligent global travel companion';

export const QUICK_ACTIONS = [
  { id: 'nearby', label: 'Nearby', href: '/explore' },
  { id: 'directions', label: 'Directions', href: '/directions' },
  { id: 'food', label: 'Food', href: '/explore' },
  { id: 'hotels', label: 'Hotels', href: '/hotels' },
  { id: 'currency', label: 'Currency', href: '/currency' },
  { id: 'esim', label: 'eSIM', href: '/esim' },
  { id: 'emergency', label: 'Emergency', href: '/emergency' },
  { id: 'ai', label: 'AI', href: '/assistant' },
] as const;

export const LOCAL_EMERGENCY_NUMBERS = {
  JP: { police: '110', ambulance: '119', fire: '119' },
  PH: { police: '911', ambulance: '911', fire: '911' },
  US: { police: '911', ambulance: '911', fire: '911' },
  DEFAULT: { police: '112', ambulance: '112', fire: '112' },
} as const;
