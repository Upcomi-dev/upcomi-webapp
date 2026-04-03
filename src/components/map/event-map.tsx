"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, {
  Source,
  Layer,
  type MapRef,
  type MapLayerMouseEvent,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapEvent } from "@/lib/types/database";

const MAP_STYLE = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    },
  },
  layers: [
    {
      id: "carto-base",
      type: "raster",
      source: "carto",
      minzoom: 0,
      maxzoom: 20,
    },
  ],
} satisfies import("maplibre-gl").StyleSpecification;

const FRANCE_VIEW = {
  longitude: 2.2137,
  latitude: 46.2276,
  zoom: 5.4,
};

/** Pixel radius of the spider circle. */
const SPIDER_RADIUS_PX = 40;

interface EventMapProps {
  events: MapEvent[];
  selectedEventId?: number | null;
  hoveredEventId?: number | null;
  dimOtherMarkers?: boolean;
  flyToEventId?: number | null;
  onEventSelect?: (eventId: number | null) => void;
}

/** Round coordinates to ~11m precision to group co-located events. */
function coordKey(lng: number, lat: number) {
  return `${lng.toFixed(4)},${lat.toFixed(4)}`;
}

/**
 * Spread N points evenly around a center, returning lng/lat offsets.
 * The offset size is relative to the current zoom level so the spider
 * looks the same visual size regardless of zoom.
 */
function spiderPositions(
  centerLng: number,
  centerLat: number,
  count: number,
  zoom: number
) {
  // Approximate degrees-per-pixel at this zoom & latitude
  const metersPerPx = (156543.03 * Math.cos((centerLat * Math.PI) / 180)) / Math.pow(2, zoom);
  const degreesPerPx = metersPerPx / 111320;
  const radius = SPIDER_RADIUS_PX * degreesPerPx;

  return Array.from({ length: count }, (_, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    return {
      lng: centerLng + radius * Math.cos(angle),
      lat: centerLat + radius * Math.sin(angle),
    };
  });
}

export function EventMap({ events, selectedEventId, hoveredEventId, dimOtherMarkers = false, flyToEventId, onEventSelect }: EventMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [spiderfied, setSpiderfied] = useState<{
    key: string;
    centerLng: number;
    centerLat: number;
    events: MapEvent[];
  } | null>(null);
  const hasCenteredInitially = useRef(false);

  const validEvents = events.filter(
    (event) =>
      Number.isFinite(event.longitude) &&
      Number.isFinite(event.latitude) &&
      Math.abs(event.longitude) <= 180 &&
      Math.abs(event.latitude) <= 90
  );

  // Group events sharing coordinates, indexed by the first event's id
  const { geojson, groupedById } = useMemo(() => {
    const coordGroups: globalThis.Map<string, MapEvent[]> = new globalThis.Map();
    for (const event of validEvents) {
      const key = coordKey(event.longitude, event.latitude);
      const group = coordGroups.get(key);
      if (group) {
        group.push(event);
      } else {
        coordGroups.set(key, [event]);
      }
    }

    const byId: globalThis.Map<number, MapEvent[]> = new globalThis.Map();
    const features: GeoJSON.Feature[] = [];
    for (const [, group] of coordGroups) {
      const first = group[0];
      byId.set(first.id, group);
      const groupContainsSelected = selectedEventId != null && group.some((e) => e.id === selectedEventId);
      const groupContainsHovered = hoveredEventId != null && group.some((e) => e.id === hoveredEventId);
      features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [first.longitude, first.latitude],
        },
        properties: {
          id: first.id,
          count: group.length,
          isSelected: groupContainsSelected ? 1 : 0,
          isHovered: groupContainsHovered ? 1 : 0,
        },
      });
    }

    return {
      geojson: { type: "FeatureCollection" as const, features },
      groupedById: byId,
    };
  }, [validEvents, selectedEventId, hoveredEventId]);

  // GeoJSON for spider legs + dots
  const spiderGeojson = useMemo<GeoJSON.FeatureCollection>(() => {
    if (!spiderfied) return { type: "FeatureCollection", features: [] };

    const zoom = mapRef.current?.getZoom() ?? 6;
    const positions = spiderPositions(
      spiderfied.centerLng,
      spiderfied.centerLat,
      spiderfied.events.length,
      zoom
    );

    const features: GeoJSON.Feature[] = [];

    spiderfied.events.forEach((event, i) => {
      const pos = positions[i];
      // Leg line from center to spider dot
      features.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [spiderfied.centerLng, spiderfied.centerLat],
            [pos.lng, pos.lat],
          ],
        },
        properties: { _type: "leg" },
      });
      // Spider dot
      features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [pos.lng, pos.lat],
        },
        properties: { _type: "dot", id: event.id },
      });
    });

    return { type: "FeatureCollection", features };
  }, [spiderfied]);

  const centerOnEvents = useCallback(() => {
    const map = mapRef.current;
    if (!map || validEvents.length === 0) return;

    const runFit = () => {
      map.resize();

      if (validEvents.length === 1) {
        map.easeTo({
          center: [validEvents[0].longitude, validEvents[0].latitude],
          zoom: 7.5,
          duration: 900,
        });
        return;
      }

      let minLng = validEvents[0].longitude;
      let maxLng = validEvents[0].longitude;
      let minLat = validEvents[0].latitude;
      let maxLat = validEvents[0].latitude;

      for (const event of validEvents) {
        minLng = Math.min(minLng, event.longitude);
        maxLng = Math.max(maxLng, event.longitude);
        minLat = Math.min(minLat, event.latitude);
        maxLat = Math.max(maxLat, event.latitude);
      }

      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        {
          padding: { top: 56, right: 56, bottom: 56, left: 56 },
          duration: 900,
          maxZoom: 8.5,
        }
      );
    };

    if (typeof window !== "undefined") {
      window.requestAnimationFrame(runFit);
    } else {
      runFit();
    }
  }, [validEvents]);

  // Center on events only once on mount
  const hasFittedBounds = useRef(false);
  useEffect(() => {
    if (hasFittedBounds.current) return;
    if (validEvents.length === 0) return;
    hasFittedBounds.current = true;
    centerOnEvents();
  }, [centerOnEvents]);

  // Fly to event when clicked from panel
  const prevFlyTo = useRef<number | null>(null);
  useEffect(() => {
    if (flyToEventId == null) return;
    if (flyToEventId === prevFlyTo.current) return;
    prevFlyTo.current = flyToEventId;
    const map = mapRef.current;
    if (!map) return;
    const event = validEvents.find((e) => e.id === flyToEventId);
    if (!event) return;
    map.flyTo({
      center: [event.longitude, event.latitude],
      zoom: 7,
      duration: 1000,
    });
  }, [flyToEventId, validEvents]);

  // Close spider on zoom/move
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !spiderfied) return;
    const close = () => setSpiderfied(null);
    map.on("zoom", close);
    map.on("move", close);
    return () => {
      map.off("zoom", close);
      map.off("move", close);
    };
  }, [spiderfied]);

  const handleClick = useCallback(
    (e: MapLayerMouseEvent) => {
      try {
        const map = mapRef.current;
        if (!map) return;

        const point = e.point;

        // Check spider dots first (layer may not exist yet)
        let spiderHits: ReturnType<typeof map.queryRenderedFeatures> = [];
        try {
          spiderHits = map.queryRenderedFeatures(point, { layers: ["spider-dots"] });
        } catch {
          // spider layer not yet rendered
        }
        if (spiderHits.length > 0) {
          const eventId = spiderHits[0].properties?.id;
          const event = validEvents.find((ev) => ev.id === eventId);
          if (event) {
            setSpiderfied(null);
            onEventSelect?.(event.id);
          }
          return;
        }

        // Check main dots
        let dotHits: ReturnType<typeof map.queryRenderedFeatures> = [];
        try {
          dotHits = map.queryRenderedFeatures(point, { layers: ["event-dots"] });
        } catch {
          // layer not ready
        }

        if (dotHits.length > 0) {
          const feature = dotHits[0];
          const featureId = feature.properties?.id as number;
          const group = groupedById.get(featureId);
          if (!group) return;

          const first = group[0];
          if (group.length === 1) {
            setSpiderfied(null);
            onEventSelect?.(first.id);
          } else {
            onEventSelect?.(null);
            setSpiderfied({
              key: coordKey(first.longitude, first.latitude),
              centerLng: first.longitude,
              centerLat: first.latitude,
              events: group,
            });
          }
          return;
        }

        // Clicked empty area
        setSpiderfied(null);
        onEventSelect?.(null);
      } catch {
        // ignore
      }
    },
    [groupedById, validEvents, onEventSelect]
  );

  return (
    <Map
      ref={mapRef}
      initialViewState={FRANCE_VIEW}
      style={{ width: "100%", height: "100%" }}
      mapStyle={MAP_STYLE}
      onClick={handleClick}
      onLoad={() => {
        if (!hasCenteredInitially.current) {
          hasCenteredInitially.current = true;
          mapRef.current?.jumpTo(FRANCE_VIEW);
        }
        centerOnEvents();
      }}
      cursor="pointer"
    >
      {/* Main dots */}
      <Source id="events" type="geojson" data={geojson}>
        {/* Hovered dot highlight ring */}
        <Layer
          id="event-dots-hover"
          type="circle"
          filter={["==", ["get", "isHovered"], 1]}
          paint={{
            "circle-color": "rgba(235, 95, 59, 0.10)",
            "circle-radius": 18,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#eb5f3b",
            "circle-stroke-opacity": 0.4,
          }}
        />
        {/* Selected dot highlight ring (behind the dot) */}
        <Layer
          id="event-dots-highlight"
          type="circle"
          filter={["==", ["get", "isSelected"], 1]}
          paint={{
            "circle-color": "rgba(235, 95, 59, 0.15)",
            "circle-radius": 14,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#eb5f3b",
            "circle-stroke-opacity": 0.5,
          }}
        />
        <Layer
          id="event-dots"
          type="circle"
          paint={{
            "circle-color": "#eb5f3b",
            "circle-radius": [
              "case",
              ["==", ["get", "isSelected"], 1], 8,
              ["==", ["get", "isHovered"], 1], 7,
              6,
            ],
            "circle-stroke-width": [
              "case",
              ["==", ["get", "isSelected"], 1], 2,
              0,
            ],
            "circle-stroke-color": "#ffffff",
            "circle-opacity": [
              "case",
              ["==", ["get", "isSelected"], 1], 1,
              ["==", ["get", "isHovered"], 1], 1,
              dimOtherMarkers ? 0.25 : 0.85,
            ],
          }}
        />
      </Source>

      {/* Spider legs + dots */}
      <Source id="spider" type="geojson" data={spiderGeojson}>
        <Layer
          id="spider-legs"
          type="line"
          filter={["==", ["get", "_type"], "leg"]}
          paint={{
            "line-color": "#eb5f3b",
            "line-width": 1,
            "line-opacity": 0.35,
          }}
        />
        <Layer
          id="spider-dots"
          type="circle"
          filter={["==", ["get", "_type"], "dot"]}
          paint={{
            "circle-color": "#eb5f3b",
            "circle-radius": 6,
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#ffffff",
            "circle-opacity": 1,
          }}
        />
      </Source>

    </Map>
  );
}
