"use client";

import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import { PlaceSuggestion, getCategoryColor } from "@/hooks/usePlaceSuggestions";

interface Activity {
  id: string; lat?: string; lon?: string; title: string; time: string; date: string; location: string; duration: number; notes: string;
}

interface TripMapProps {
  destLat?: string;
  destLon?: string;
  destination?: string;
  suggestions: PlaceSuggestion[];
  activities: Activity[];
  hoveredId: string | number | null;
  onHoverSuggestion: (id: string | number | null) => void;
  onSelectSuggestion: (place: PlaceSuggestion) => void;
  onSelectActivity: (act: Activity) => void;
  selectedActivity: Activity | null;
  activeTab: string;
  focusedPlace?: { lat: string; lon: string } | null;
  onMapClick?: (lat: number, lon: number) => void;
}

const OSM_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const SAT_TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

export function TripMap({ destLat, destLon, destination, suggestions, activities, hoveredId, onHoverSuggestion, onSelectSuggestion, onSelectActivity, selectedActivity, activeTab, focusedPlace, onMapClick }: TripMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const isSatRef = useRef(false);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const itineraryMarkersRef = useRef<Record<string, L.Marker>>({});
  const destMarkerRef = useRef<L.Marker | null>(null);
  const layerBtnRef = useRef<HTMLButtonElement | null>(null);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: false, attributionControl: false });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    const tile = L.tileLayer(OSM_TILES).addTo(map);
    tileLayerRef.current = tile;
    mapRef.current = map;
    map.setView([20, 0], 2);
    
    map.on("click", (e) => {
      if (onMapClick) onMapClick(e.latlng.lat, e.latlng.lng);
    });

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Sync Destination
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !destLat || !destLon) return;
    if (destMarkerRef.current) destMarkerRef.current.remove();
    const icon = L.divIcon({
      className: "",
      html: `<div style="width:14px;height:14px;background:#18181b;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
      iconSize: [14, 14], iconAnchor: [7, 7],
    });
    destMarkerRef.current = L.marker([+destLat, +destLon], { icon }).addTo(map);
    if (destination) destMarkerRef.current.bindTooltip(destination, { direction: "top" });
    map.flyTo([+destLat, +destLon], 12, { duration: 1.5 });
  }, [destLat, destLon, destination]);

  // Unified Marker Sync
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old
    Object.values(itineraryMarkersRef.current).forEach(m => m.remove());
    Object.values(markersRef.current).forEach(m => m.remove());
    itineraryMarkersRef.current = {};
    markersRef.current = {};

    const allBounds: L.LatLngTuple[] = [];

    // Render Itinerary (Only if on itinerary tab or always? Let's show always for context)
    activities.forEach((act, idx) => {
      if (!act.lat || !act.lon) return;
      const isSelected = selectedActivity?.id === act.id;
      const num = idx + 1;
      const icon = L.divIcon({
        className: isSelected ? "focused-marker-pulse" : "",
        html: makeMarkerHtml(num, "#18181b", isSelected, isSelected),
        iconSize: isSelected ? [36, 46] : [28, 36],
        iconAnchor: isSelected ? [18, 46] : [14, 36],
      });
      const m = L.marker([+act.lat, +act.lon], { icon, zIndexOffset: isSelected ? 1000 : 500 })
        .addTo(map)
        .on("click", () => onSelectActivity(act));
      m.bindTooltip(act.title, { direction: "top", offset: [0, -8] });
      itineraryMarkersRef.current[act.id] = m;
      allBounds.push([+act.lat, +act.lon]);
    });

    // Render Explore Suggestions
    suggestions.forEach((place, idx) => {
      if (!place.lat || !place.lon) return;
      const isFocused = focusedPlace?.lat === place.lat && focusedPlace?.lon === place.lon;
      const hovered = String(hoveredId) === String(place.id) || isFocused;
      const num = idx + 1;
      const icon = L.divIcon({
        className: isFocused ? "focused-marker-pulse" : "",
        html: makeMarkerHtml(num, getCategoryColor(place.categoryLabel), hovered, isFocused),
        iconSize: hovered ? [36, 46] : [28, 36],
        iconAnchor: hovered ? [18, 46] : [14, 36],
      });
      const m = L.marker([+place.lat, +place.lon], { icon, zIndexOffset: hovered ? 1000 : 0 })
        .addTo(map)
        .on("click", () => onSelectSuggestion(place))
        .on("mouseover", () => onHoverSuggestion(place.id))
        .on("mouseout", () => onHoverSuggestion(null));
      markersRef.current[String(place.id)] = m;
      allBounds.push([+place.lat, +place.lon]);
    });

    if (focusedPlace?.lat && focusedPlace?.lon) {
      map.flyTo([+focusedPlace.lat, +focusedPlace.lon], 15, { duration: 1.5 });
    } else if (selectedActivity?.lat && selectedActivity?.lon) {
      map.flyTo([+selectedActivity.lat, +selectedActivity.lon], 15, { duration: 1 });
    }
  }, [activities, suggestions, selectedActivity, focusedPlace, hoveredId, activeTab, onSelectSuggestion, onHoverSuggestion]);

  // Layer toggle (imperative button)
  const toggleLayer = useCallback(() => {
    const map = mapRef.current;
    if (!map || !tileLayerRef.current) return;
    tileLayerRef.current.remove();
    isSatRef.current = !isSatRef.current;
    tileLayerRef.current = L.tileLayer(isSatRef.current ? SAT_TILES : OSM_TILES).addTo(map);
    if (layerBtnRef.current) layerBtnRef.current.textContent = isSatRef.current ? "🗺 Map" : "🛰 Satellite";
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full">
      <style jsx global>{`
        @keyframes marker-pulse {
          0% { box-shadow: 0 0 0 0 rgba(24, 24, 27, 0.4); }
          70% { box-shadow: 0 0 0 20px rgba(24, 24, 27, 0); }
          100% { box-shadow: 0 0 0 0 rgba(24, 24, 27, 0); }
        }
        .focused-marker-pulse div {
          animation: marker-pulse 2s infinite;
        }
      `}</style>
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
      {/* Layer toggle */}
      <button
        ref={layerBtnRef}
        onClick={toggleLayer}
        className="absolute bottom-8 left-4 z-[1000] bg-white text-zinc-700 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg border border-zinc-200 hover:bg-zinc-50 transition-colors"
      >
        🛰 Satellite
      </button>
    </div>
  );
}

function makeMarkerHtml(num: number, color: string, hovered: boolean, isFocused?: boolean) {
  const size = hovered ? 36 : 28;
  const fs = hovered ? 13 : 10;
  const ringColor = isFocused ? "#18181b" : "white";
  return `<div style="
    width:${size}px;height:${size}px;
    background:${color};border-radius:${size}px ${size}px ${size}px 0;
    transform:rotate(-45deg);
    border:${hovered ? 3 : 2}px solid ${ringColor};
    box-shadow:${hovered ? "0 4px 16px rgba(0,0,0,0.45)" : "0 2px 6px rgba(0,0,0,0.3)"};
    display:flex;align-items:center;justify-content:center;
    transition:all 0.12s ease;
  "><span style="
    transform:rotate(45deg);color:white;font-weight:700;
    font-size:${fs}px;font-family:ui-sans-serif,system-ui,sans-serif;
    display:block;text-align:center;line-height:${size - 4}px;
  ">${num}</span></div>`;
}
