import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

import type { MapViewProps } from '@/providers/maps/maps.provider';
import { leafletTilesForStyle } from '@/providers/maps/map-style';
import { useLocationStore } from '@/stores/location-store';
import { useMapStyleStore } from '@/stores/map-style-store';

const LEAFLET_CSS_ID = 'ta-leaflet-css';
const LEAFLET_CSS_HREF = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

/** Ensure Leaflet CSS is in the document (NativeWind can swallow CSS module imports). */
function ensureLeafletCss() {
  if (typeof document === 'undefined') {
    return;
  }
  if (document.getElementById(LEAFLET_CSS_ID)) {
    return;
  }
  const link = document.createElement('link');
  link.id = LEAFLET_CSS_ID;
  link.rel = 'stylesheet';
  link.href = LEAFLET_CSS_HREF;
  document.head.appendChild(link);
}

/** Fix default marker icons under Metro/Expo bundling. */
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const selectedIcon = L.divIcon({
  className: 'ta-map-marker-selected',
  html: `<div style="width:18px;height:18px;border-radius:999px;background:#FF6B4A;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const userLocationIcon = L.divIcon({
  className: 'ta-map-user-location',
  html: `<div style="position:relative;width:22px;height:22px">
    <div style="position:absolute;inset:0;border-radius:999px;background:rgba(11,114,106,.28);animation:ta-pulse 1.8s ease-out infinite"></div>
    <div style="position:absolute;left:4px;top:4px;width:14px;height:14px;border-radius:999px;background:#0B726A;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.35)"></div>
  </div>
  <style>@keyframes ta-pulse{0%{transform:scale(.55);opacity:.9}70%{transform:scale(1.55);opacity:0}100%{opacity:0}}</style>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function MapReadyFixes({
  center,
  zoom,
  fitToCoordinates,
  followUserLocation,
  userLocation,
}: {
  center: { latitude: number; longitude: number };
  zoom: number;
  fitToCoordinates?: { latitude: number; longitude: number }[];
  followUserLocation?: boolean;
  userLocation?: { latitude: number; longitude: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    ensureLeafletCss();
    // ScrollView / flex layouts often mount Leaflet at 0×0 — force a remeasure.
    const invalidate = () => map.invalidateSize({ animate: false });
    invalidate();
    const t1 = window.setTimeout(invalidate, 100);
    const t2 = window.setTimeout(invalidate, 400);
    window.addEventListener('resize', invalidate);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('resize', invalidate);
    };
  }, [map]);

  useEffect(() => {
    if (fitToCoordinates && fitToCoordinates.length >= 2) {
      const points = [...fitToCoordinates];
      if (userLocation) {
        points.push(userLocation);
      }
      const bounds = L.latLngBounds(
        points.map((point) => [point.latitude, point.longitude] as [number, number]),
      );
      map.fitBounds(bounds, { padding: [48, 48], animate: true });
      return;
    }
    if (followUserLocation && userLocation) {
      map.setView([userLocation.latitude, userLocation.longitude], Math.round(zoom), {
        animate: true,
      });
      return;
    }
    map.setView([center.latitude, center.longitude], Math.round(zoom), { animate: true });
  }, [
    center.latitude,
    center.longitude,
    zoom,
    fitToCoordinates,
    followUserLocation,
    userLocation?.latitude,
    userLocation?.longitude,
    map,
  ]);

  return null;
}

function MapClickHandler({
  onMapPress,
}: {
  onMapPress?: (coordinate: { latitude: number; longitude: number }) => void;
}) {
  useMapEvents({
    click(event) {
      onMapPress?.({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
  });
  return null;
}

/**
 * Interactive OpenStreetMap canvas for Expo web (Leaflet).
 * Import this file explicitly as `web-leaflet-map.web` — Metro's platform
 * resolution does not always pick `.web.tsx` over a sibling `.ts` stub.
 */
export function WebLeafletMapView({
  camera,
  markers = [],
  polylines = [],
  fitToCoordinates,
  userLocation: userLocationProp,
  showUserLocation = true,
  followUserLocation = false,
  mapHeight = 480,
  mapStyle: mapStyleProp,
  selectedMarkerId,
  onMarkerPress,
  onMapPress,
}: MapViewProps) {
  const storeCoords = useLocationStore((state) => state.coords);
  const storeStyle = useMapStyleStore((state) => state.style);
  const userLocation = userLocationProp === undefined ? storeCoords : userLocationProp;
  const mapStyle = mapStyleProp ?? storeStyle;
  const tiles = useMemo(() => leafletTilesForStyle(mapStyle), [mapStyle]);

  useEffect(() => {
    ensureLeafletCss();
  }, []);

  const center = useMemo(() => {
    if (followUserLocation && userLocation) {
      return [userLocation.latitude, userLocation.longitude] as [number, number];
    }
    return [camera.center.latitude, camera.center.longitude] as [number, number];
  }, [
    followUserLocation,
    userLocation?.latitude,
    userLocation?.longitude,
    camera.center.latitude,
    camera.center.longitude,
  ]);

  return (
    <div
      data-testid="web-leaflet-map"
      data-map-style={mapStyle}
      style={{
        height: mapHeight,
        width: '100%',
        borderRadius: 28,
        overflow: 'hidden',
        border: '1px solid rgba(10, 74, 70, 0.35)',
        backgroundColor: '#dceeea',
        zIndex: 0,
        position: 'relative',
      }}
    >
      <MapContainer
        center={center}
        zoom={Math.round(camera.zoom)}
        style={{ height: '100%', width: '100%', background: '#dceeea' }}
        scrollWheelZoom
        // Custom +/- live on the Map screen; hide Leaflet defaults.
        zoomControl={false}
      >
        <TileLayer
          key={mapStyle}
          attribution={tiles.attribution}
          // Free OSM / OpenTopoMap / Esri tiles — no CARTO API key.
          url={tiles.url}
          maxZoom={tiles.maxZoom}
          {...(tiles.subdomains ? { subdomains: tiles.subdomains } : {})}
          detectRetina
        />
        <MapReadyFixes
          center={camera.center}
          zoom={camera.zoom}
          fitToCoordinates={fitToCoordinates}
          followUserLocation={followUserLocation}
          userLocation={userLocation}
        />
        <MapClickHandler onMapPress={onMapPress} />
        {polylines.map((line) =>
          line.coordinates.length >= 2 ? (
            <Polyline
              key={line.id}
              positions={line.coordinates.map(
                (point) => [point.latitude, point.longitude] as [number, number],
              )}
              pathOptions={{
                color: line.color ?? '#0B726A',
                weight: line.strokeWidth ?? 5,
              }}
            />
          ) : null,
        )}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.coordinate.latitude, marker.coordinate.longitude]}
            icon={marker.id === selectedMarkerId ? selectedIcon : defaultIcon}
            eventHandlers={{
              click: () => onMarkerPress?.(marker.id),
            }}
            title={marker.title}
          />
        ))}
        {showUserLocation && userLocation ? (
          <Marker
            key="__user_location__"
            position={[userLocation.latitude, userLocation.longitude]}
            icon={userLocationIcon}
            zIndexOffset={1000}
            title="You are here"
          />
        ) : null}
      </MapContainer>
    </div>
  );
}
