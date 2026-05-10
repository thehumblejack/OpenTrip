"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { PlaceSuggestion, getCategoryColor } from "@/hooks/usePlaceSuggestions";

interface ExploreMapProps {
  suggestions: PlaceSuggestion[];
  hoveredId: number | null;
  onHover: (id: number | null) => void;
  onSelect: (place: PlaceSuggestion) => void;
}

export function ExploreMap({ suggestions, hoveredId, onHover, onSelect }: ExploreMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<number, L.Marker>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Fit bounds when suggestions change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !suggestions.length) return;

    // Clear old markers
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    const latlngs: L.LatLngTuple[] = [];

    suggestions.forEach((place, index) => {
      const color = getCategoryColor(place.categoryLabel);
      const num = index + 1;

      // Custom numbered SVG marker
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
          background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);
          display:flex;align-items:center;justify-content:center;
        "><span style="transform:rotate(45deg);color:white;font-weight:700;font-size:10px;font-family:ui-sans-serif,system-ui,sans-serif;display:block;text-align:center;line-height:24px;">${num}</span></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      const marker = L.marker([+place.lat, +place.lon], { icon })
        .addTo(map)
        .on("click", () => onSelect(place))
        .on("mouseover", () => onHover(place.id))
        .on("mouseout", () => onHover(null));

      markersRef.current[place.id] = marker;
      latlngs.push([+place.lat, +place.lon]);
    });

    if (latlngs.length) map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40] });
  }, [suggestions, onSelect, onHover]);

  // Highlight on hover
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    suggestions.forEach((place, index) => {
      const marker = markersRef.current[place.id];
      if (!marker) return;
      const isHovered = hoveredId === place.id;
      const color = getCategoryColor(place.categoryLabel);
      const num = index + 1;
      const size = isHovered ? 36 : 28;
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
          background:${color};border:${isHovered ? "3px" : "2px"} solid white;
          box-shadow:${isHovered ? "0 4px 16px rgba(0,0,0,0.45)" : "0 2px 6px rgba(0,0,0,0.3)"};
          transition:all 0.15s ease;
          display:flex;align-items:center;justify-content:center;
        "><span style="transform:rotate(45deg);color:white;font-weight:700;font-size:${isHovered ? 12 : 10}px;font-family:ui-sans-serif,system-ui,sans-serif;display:block;text-align:center;line-height:${size - 4}px;">${num}</span></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size],
      });
      marker.setIcon(icon);
      if (isHovered) marker.setZIndexOffset(1000);
      else marker.setZIndexOffset(0);
    });
  }, [hoveredId, suggestions]);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full" />;
}
