"use client";

import { useState, useCallback, useRef } from "react";

export interface PlaceSuggestion {
  id: string | number;
  name: string;
  category: string;
  categoryLabel: string;
  lat: string;
  lon: string;
  thumbnail?: string;
  _wikipedia?: string;
}

const CATEGORY_MAP: Record<string, string> = {
  "tourism=attraction": "Attraction", "tourism=museum": "Museum", "tourism=viewpoint": "Viewpoint",
  "tourism=artwork": "Art", "tourism=theme_park": "Theme Park", "tourism=zoo": "Zoo",
  "tourism=gallery": "Gallery", "leisure=park": "Park", "leisure=beach": "Beach",
  "amenity=restaurant": "Restaurant", "amenity=cafe": "Café", "amenity=bar": "Bar",
  "historic=monument": "Monument", "historic=castle": "Castle", "historic=ruins": "Ruins",
};

const CATEGORY_ICONS: Record<string, string> = {
  Attraction: "🎯", Museum: "🏛️", Viewpoint: "🏔️", Art: "🎨", "Theme Park": "🎡",
  Zoo: "🦁", Gallery: "🖼️", Park: "🌿", Beach: "🏖️", Restaurant: "🍽️",
  Café: "☕", Bar: "🍸", Monument: "🗿", Castle: "🏰", Ruins: "🏚️", Hotel: "🏨",
};

const CATEGORY_COLORS: Record<string, string> = {
  Museum: "#6366f1", Attraction: "#f59e0b", Park: "#22c55e", Beach: "#0ea5e9",
  Viewpoint: "#8b5cf6", Restaurant: "#ef4444", Café: "#d97706", Gallery: "#ec4899",
  "Theme Park": "#f97316", Zoo: "#84cc16", Art: "#a855f7", Monument: "#64748b",
  Castle: "#78716c", Ruins: "#94a3b8", Bar: "#e11d48", Hotel: "#0369a1",
};

export const getCategoryIcon = (label: string) => CATEGORY_ICONS[label] ?? "📍";
export const getCategoryColor = (label: string) => CATEGORY_COLORS[label] ?? "#334155";

/** Resolve Wikimedia Commons filename → direct image URL (no API key needed) */
function wikimediaUrl(fileTag: string): string | null {
  // fileTag format: "File:Something.jpg" or just "Something.jpg"
  const raw = fileTag.replace(/^File:/i, "").trim();
  if (!raw) return null;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(raw)}?width=400`;
}

/** Batch-fetch Wikipedia page thumbnails for names that have no image yet */
async function fetchWikiThumbs(names: string[]): Promise<Record<string, string>> {
  if (!names.length) return {};
  try {
    const titles = names.slice(0, 20).join("|");
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=pageimages&format=json&pithumbsize=400&origin=*`;
    const res = await fetch(url);
    const data = await res.json();
    const out: Record<string, string> = {};
    for (const page of Object.values(data.query?.pages ?? {}) as any[]) {
      if (page.thumbnail?.source) out[page.title] = page.thumbnail.source;
    }
    return out;
  } catch { return {}; }
}

export async function fetchPlaceGallery(wikipediaTitle: string | undefined, name: string): Promise<string[]> {
  const query = wikipediaTitle || name;
  try {
    const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=images&titles=${encodeURIComponent(query)}&format=json&origin=*&imlimit=10`);
    const data = await res.json();
    const pages = data.query?.pages;
    if (!pages) return [];
    const pageId = Object.keys(pages)[0];
    const imageFiles = pages[pageId].images?.map((img: any) => img.title) || [];
    
    // Filter out icons and small assets
    const filtered = imageFiles.filter((f: string) => !f.match(/\.(svg|gif)$|icon|logo|scale/i));
    
    // Get URLs for the first 5 images
    const urls = await Promise.all(filtered.slice(0, 5).map(async (fileName: string) => {
      const imgRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(fileName)}&prop=imageinfo&iiprop=url&format=json&origin=*`);
      const imgData = await imgRes.json();
      const imgPages = imgData.query?.pages;
      const imgPageId = Object.keys(imgPages)[0];
      return imgPages[imgPageId].imageinfo?.[0]?.url;
    }));
    
    return urls.filter(Boolean);
  } catch (e) {
    console.error("Failed to fetch gallery", e);
    return [];
  }
}

export function usePlaceSuggestions() {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchSuggestions = useCallback(async (destination: string) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true); setError(null); setSuggestions([]);
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`
      );
      const geoData = await geoRes.json();
      if (!geoData.length) { setError("Destination not found."); return; }
      const { boundingbox } = geoData[0];
      const [s, n, w, e] = boundingbox;

      // Request OSM tags including image sources - focusing on 'Pro' quality landmarks
      const query = `[out:json][timeout:25];(
        node["tourism"~"attraction|museum|viewpoint|gallery|theme_park|zoo"](${s},${w},${n},${e});
        node["historic"~"castle|monument|ruins"](${s},${w},${n},${e});
        node["leisure"~"park|beach"](${s},${w},${n},${e});
        way["tourism"~"attraction|museum|viewpoint|gallery|theme_park|zoo"](${s},${w},${n},${e});
        way["historic"~"castle|monument|ruins"](${s},${w},${n},${e});
        way["leisure"~"park|beach"](${s},${w},${n},${e});
      );out center tags 50;`;

      const ovRes = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: query });
      const ovData = await ovRes.json();

      const raw: PlaceSuggestion[] = ovData.elements
        .filter((el: any) => el.tags?.name && el.tags.name.length > 2) // Basic name check
        .map((el: any) => {
          let label = "Attraction";
          for (const key of Object.keys(CATEGORY_MAP)) {
            const [k, v] = key.split("=");
            if (el.tags[k] === v) { label = CATEGORY_MAP[key]; break; }
          }
          
          // Resolve thumbnail: priority = image tag > wikimedia_commons > wikipedia (later)
          let thumbnail: string | undefined;
          if (el.tags.image) thumbnail = el.tags.image;
          else if (el.tags.wikimedia_commons) thumbnail = wikimediaUrl(el.tags.wikimedia_commons) ?? undefined;

          const lat = el.lat ?? el.center?.lat;
          const lon = el.lon ?? el.center?.lon;

          // Significance Score
          let score = 0;
          if (el.tags.wikipedia) score += 15;
          if (el.tags.wikidata) score += 5;
          if (el.tags.image || el.tags.wikimedia_commons) score += 10;
          if (["Museum", "Monument", "Castle"].includes(label)) score += 10;
          if (el.tags.tourism === "attraction") score += 5;

          return {
            id: el.id, name: el.tags.name, category: label, categoryLabel: label,
            lat: String(lat), lon: String(lon),
            thumbnail,
            score,
            _wikipedia: el.tags.wikipedia?.split(":").slice(1).join(":"),
          };
        })
        .filter((p: any) => p.lat && p.lon)
        .sort((a: any, b: any) => b.score - a.score) // Sort by best/most real first
        .slice(0, 20) as PlaceSuggestion[];

      // Enrich with Wikipedia thumbnails for those still without images
      const noImage = (raw as any[]).filter(p => !p.thumbnail).map(p => p._wikipedia || p.name);
      const wikiThumbs = await fetchWikiThumbs(noImage);

      const enriched: PlaceSuggestion[] = (raw as any[]).map(p => ({
        ...p,
        thumbnail: p.thumbnail ?? wikiThumbs[p._wikipedia] ?? wikiThumbs[p.name],
      }));

      setSuggestions(enriched);
    } catch (e) { setError("Failed to load suggestions."); }
    finally { setLoading(false); isFetchingRef.current = false; }
  }, []);

  return { suggestions, loading, error, fetchSuggestions };
}
