import type { ComponentType } from 'react';

import type { MapViewProps } from '@/providers/maps/maps.provider';

/**
 * Native stub. Web must import `web-leaflet-map.web` explicitly — do not rely on
 * Metro picking `.web.tsx` over this file for extensionless `@/` imports.
 */
export const WebLeafletMapView: ComponentType<MapViewProps> = () => null;
