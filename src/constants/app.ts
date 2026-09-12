export const APP_NAME = 'TravelAssistant';
export const APP_TAGLINE = 'Your intelligent global travel companion';

export const QUICK_ACTIONS = [
  { id: 'nearby', label: 'Nearby', href: '/explore', category: 'all' },
  { id: 'directions', label: 'Directions', href: '/directions' },
  { id: 'food', label: 'Food', href: '/explore', category: 'restaurant' },
  { id: 'convenience', label: 'Convenience', href: '/explore', category: 'convenience' },
  { id: 'hotels', label: 'Hotels', href: '/explore', category: 'hotel' },
  { id: 'currency', label: 'Currency', href: '/currency' },
  { id: 'esim', label: 'eSIM', href: '/esim' },
  { id: 'emergency', label: 'Emergency', href: '/emergency' },
  { id: 'ai', label: 'AI', href: '/assistant' },
] as const;

export const LOCAL_EMERGENCY_NUMBERS = {
  JP: { police: '110', ambulance: '119', fire: '119' },
  PH: { police: '911', ambulance: '911', fire: '911' },
  US: { police: '911', ambulance: '911', fire: '911' },
  KR: { police: '112', ambulance: '119', fire: '119' },
  TH: { police: '191', ambulance: '1669', fire: '199' },
  SG: { police: '999', ambulance: '995', fire: '995' },
  VN: { police: '113', ambulance: '115', fire: '114' },
  ID: { police: '110', ambulance: '118', fire: '113' },
  MY: { police: '999', ambulance: '999', fire: '994' },
  HK: { police: '999', ambulance: '999', fire: '999' },
  TW: { police: '110', ambulance: '119', fire: '119' },
  CN: { police: '110', ambulance: '120', fire: '119' },
  AU: { police: '000', ambulance: '000', fire: '000' },
  NZ: { police: '111', ambulance: '111', fire: '111' },
  GB: { police: '999', ambulance: '999', fire: '999' },
  FR: { police: '17', ambulance: '15', fire: '18' },
  DE: { police: '110', ambulance: '112', fire: '112' },
  ES: { police: '112', ambulance: '112', fire: '112' },
  IT: { police: '112', ambulance: '118', fire: '115' },
  CA: { police: '911', ambulance: '911', fire: '911' },
  DEFAULT: { police: '112', ambulance: '112', fire: '112' },
} as const;
