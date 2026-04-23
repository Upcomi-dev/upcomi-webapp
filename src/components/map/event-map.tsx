"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, {
  Source,
  Layer,
  type MapRef,
  type MapLayerMouseEvent,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { EventCard } from "@/components/events/event-card";
import {
  EVENT_TYPE_LEGEND,
  getEventTypeColor,
  type MapEvent,
} from "@/lib/types/database";

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

/** Bottom sheet peek height on mobile — keep markers above the sheet. */
const MOBILE_BOTTOM_INSET = 148;
const MOBILE_MARKER_TOUCH_RADIUS = 22;
const DESKTOP_MARKER_TOUCH_RADIUS = 10;

interface EventMapProps {
  events: MapEvent[];
  selectedEventId?: number | null;
  hoveredEventId?: number | null;
  dimOtherMarkers?: boolean;
  flyToEventId?: number | null;
  isVisible?: boolean;
  activeEventTypes?: string[];
  onEventSelect?: (eventId: number | null) => void;
  onToggleEventType?: (eventType: string) => void;
}

/** Round coordinates to ~11m precision to group co-located events. */
function coordKey(lng: number, lat: number) {
  return `${lng.toFixed(4)},${lat.toFixed(4)}`;
}

export function EventMap({
  events,
  selectedEventId,
  hoveredEventId,
  dimOtherMarkers = false,
  flyToEventId,
  isVisible = true,
  activeEventTypes = [],
  onEventSelect,
  onToggleEventType,
}: EventMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [activeGroup, setActiveGroup] = useState<MapEvent[] | null>(null);
  const hasCenteredInitially = useRef(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const validEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          Number.isFinite(event.longitude) &&
          Number.isFinite(event.latitude) &&
          Math.abs(event.longitude) <= 180 &&
          Math.abs(event.latitude) <= 90
      ),
    [events]
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
          typeColor: getEventTypeColor(first.type_event),
        },
      });
    }

    return {
      geojson: { type: "FeatureCollection" as const, features },
      groupedById: byId,
    };
  }, [validEvents, selectedEventId, hoveredEventId]);

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
          padding: isMobile
            ? { top: 0, right: 0, bottom: MOBILE_BOTTOM_INSET, left: 0 }
            : undefined,
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
          padding: isMobile
            ? { top: 56, right: 24, bottom: MOBILE_BOTTOM_INSET + 24, left: 24 }
            : { top: 56, right: 56, bottom: 56, left: 56 },
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
  }, [validEvents, isMobile]);

  // Center on events only once on mount
  const hasFittedBounds = useRef(false);
  useEffect(() => {
    if (hasFittedBounds.current) return;
    if (!isVisible) return;
    if (validEvents.length === 0) return;
    hasFittedBounds.current = true;
    centerOnEvents();
  }, [centerOnEvents, isVisible, validEvents.length]);

  useEffect(() => {
    if (!isVisible) return;

    const map = mapRef.current;
    if (!map) return;

    window.requestAnimationFrame(() => {
      map.resize();

      if (validEvents.length > 0) {
        centerOnEvents();
      }
    });
  }, [centerOnEvents, isVisible, validEvents.length]);

  // Fly to event when clicked from panel
  const prevFlyTo = useRef<number | null>(null);
  useEffect(() => {
    if (!isVisible) return;
    if (flyToEventId == null) return;
    if (flyToEventId === prevFlyTo.current) return;
    prevFlyTo.current = flyToEventId;
    const map = mapRef.current;
    if (!map || !map.loaded()) return;
    const event = validEvents.find((e) => e.id === flyToEventId);
    if (!event) return;
    map.flyTo({
      center: [event.longitude, event.latitude],
      zoom: 7,
      duration: 1000,
      padding: isMobile
        ? { top: 0, right: 0, bottom: MOBILE_BOTTOM_INSET, left: 0 }
        : undefined,
    });
  }, [flyToEventId, isMobile, isVisible, validEvents]);

  // Close grouped cards on zoom/move
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !activeGroup) return;
    const close = () => setActiveGroup(null);
    map.on("zoom", close);
    map.on("move", close);
    return () => {
      map.off("zoom", close);
      map.off("move", close);
    };
  }, [activeGroup]);

  const handleClick = useCallback(
    (e: MapLayerMouseEvent) => {
      try {
        const map = mapRef.current;
        if (!map) return;

        const point = e.point;

        // Check main dots
        let dotHits: ReturnType<typeof map.queryRenderedFeatures> = [];
        try {
          dotHits = map.queryRenderedFeatures(point, {
            layers: ["event-dots-hitbox", "event-dots"],
          });
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
            setActiveGroup(null);
            onEventSelect?.(first.id);
          } else {
            onEventSelect?.(null);
            setActiveGroup(group);
          }
          return;
        }

        // Clicked empty area
        setActiveGroup(null);
        onEventSelect?.(null);
      } catch {
        // ignore
      }
    },
    [groupedById, onEventSelect]
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
        <Layer
          id="event-dots-hitbox"
          type="circle"
          paint={{
            "circle-color": "#000000",
            "circle-radius": [
              "case",
              ["==", ["get", "isSelected"], 1],
              isMobile ? MOBILE_MARKER_TOUCH_RADIUS + 4 : DESKTOP_MARKER_TOUCH_RADIUS + 2,
              ["==", ["get", "isHovered"], 1],
              isMobile ? MOBILE_MARKER_TOUCH_RADIUS + 2 : DESKTOP_MARKER_TOUCH_RADIUS + 1,
              isMobile ? MOBILE_MARKER_TOUCH_RADIUS : DESKTOP_MARKER_TOUCH_RADIUS,
            ],
            "circle-opacity": 0.001,
            "circle-stroke-width": 0,
          }}
        />
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
            "circle-color": ["coalesce", ["get", "typeColor"], "#eb5f3b"],
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

      <div className="absolute top-4 right-4 z-10 hidden max-w-[240px] flex-col gap-2.5 md:flex">
        <MapFilterCard>
          <div className="grid gap-2">
            {EVENT_TYPE_LEGEND.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => onToggleEventType?.(item.label)}
                className="pointer-events-auto flex cursor-pointer items-center gap-2.5 rounded-full px-2 py-1 text-[13px] text-foreground/72 transition-colors hover:bg-white/32"
                style={{
                  opacity:
                    activeEventTypes.length === 0 || activeEventTypes.includes(item.label)
                      ? 1
                      : 0.45,
                }}
              >
                <span
                  className="block h-3 w-3 rounded-full border border-white/80 shadow-[0_0_0_1px_rgba(36,23,15,0.06)]"
                  style={{ backgroundColor: item.color }}
                />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </MapFilterCard>

      </div>

      {activeGroup ? (
        <div
          className="pointer-events-none absolute inset-x-0 z-10"
          style={{ bottom: isMobile ? MOBILE_BOTTOM_INSET + 20 : 24 }}
        >
          <div className="pointer-events-auto mx-auto flex w-full max-w-[min(100%,960px)] flex-col gap-3 px-4">
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {activeGroup.map((event) => (
                <div
                  key={event.id}
                  className={
                    selectedEventId === event.id
                      ? "rounded-[24px] ring-2 ring-coral/45 ring-offset-2 ring-offset-transparent"
                      : undefined
                  }
                >
                  <EventCard
                    {...event}
                    variant="carousel"
                    onEventClick={(eventId) => {
                      setActiveGroup(null);
                      onEventSelect?.(eventId);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

    </Map>
  );
}

function MapFilterCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[22px] border border-white/28 bg-[rgba(255,251,246,0.44)] p-3 shadow-[0_8px_24px_rgba(36,23,15,0.05)] backdrop-blur-md">
      {children}
    </div>
  );
}
