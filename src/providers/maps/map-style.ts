/** Shared map basemap style ids (provider-agnostic). */
export type AppMapStyleId = 'standard' | 'terrain' | 'satellite';

export const APP_MAP_STYLES: {
  id: AppMapStyleId;
  label: string;
  hint: string;
}[] = [
  { id: 'standard', label: 'Map', hint: 'Streets' },
  { id: 'terrain', label: 'Terrain', hint: 'Topo' },
  { id: 'satellite', label: 'Satellite', hint: 'Imagery' },
];

export type LeafletTileConfig = {
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string;
};

/** Free tile sources only — no CARTO / keyed basemaps. */
export function leafletTilesForStyle(style: AppMapStyleId): LeafletTileConfig {
  switch (style) {
    case 'terrain':
      return {
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution:
          'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
        maxZoom: 17,
        subdomains: 'abc',
      };
    case 'satellite':
      return {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution:
          'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
        maxZoom: 19,
      };
    case 'standard':
    default:
      return {
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      };
  }
}

/** react-native-maps `mapType` values. */
export function nativeMapTypeForStyle(
  style: AppMapStyleId,
): 'standard' | 'terrain' | 'satellite' {
  switch (style) {
    case 'terrain':
      return 'terrain';
    case 'satellite':
      return 'satellite';
    case 'standard':
    default:
      return 'standard';
  }
}
