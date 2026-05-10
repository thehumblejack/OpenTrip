"use client";

import { Search, Sparkles, MapPin, Plus, ExternalLink, Image as ImageIcon, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getCategoryIcon, getCategoryColor } from "@/hooks/usePlaceSuggestions";

interface ExploreSuggestionsProps {
  exploreSearch: string;
  setExploreSearch: (val: string) => void;
  fetchSuggestions: (query: string) => void;
  suggestionsLoading: boolean;
  selectedCategory: string | null;
  setSelectedCategory: (val: string | null) => void;
  suggestionsByCategory: Record<string, any[]>;
  handleExploreAdd: (place: any, e: React.MouseEvent) => void;
  handleExploreFocus: (place: any) => void;
  hoveredSuggestionId: string | number | null;
  setHoveredSuggestionId: (id: string | number | null) => void;
  fetchPlaceGallery: (place: any) => void;
  setGalleryPlace: (place: any) => void;
  setIsGalleryLoading: (val: boolean) => void;
  setGalleryImages: (imgs: string[]) => void;
}

export function ExploreSuggestions({
  exploreSearch,
  setExploreSearch,
  fetchSuggestions,
  suggestionsLoading,
  selectedCategory,
  setSelectedCategory,
  suggestionsByCategory,
  handleExploreAdd,
  handleExploreFocus,
  hoveredSuggestionId,
  setHoveredSuggestionId,
  fetchPlaceGallery,
  setGalleryPlace,
  setIsGalleryLoading,
  setGalleryImages
}: ExploreSuggestionsProps) {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b space-y-4 bg-zinc-50/50">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-zinc-900 transition-colors" />
          <Input 
            placeholder="Search custom spots or inspiration..." 
            className="pl-10 h-11 bg-white border-zinc-200 rounded-xl shadow-sm focus:ring-2 focus:ring-zinc-900/5 transition-all"
            value={exploreSearch}
            onChange={e => setExploreSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchSuggestions(exploreSearch)}
          />
          {suggestionsLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-zinc-400" />}
        </div>
        
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-2">
            <Badge 
              variant={!selectedCategory ? "default" : "secondary"}
              className="cursor-pointer rounded-lg px-3 py-1 text-[10px] uppercase tracking-wider font-bold"
              onClick={() => setSelectedCategory(null)}
            >
              All Spots
            </Badge>
            {Object.keys(suggestionsByCategory).map(cat => (
              <Badge 
                key={cat}
                variant={selectedCategory === cat ? "default" : "secondary"}
                className={cn(
                  "cursor-pointer rounded-lg px-3 py-1 text-[10px] uppercase tracking-wider font-bold transition-all",
                  selectedCategory === cat ? "shadow-md scale-105" : "opacity-70 hover:opacity-100"
                )}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>
        </ScrollArea>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-8">
          {Object.entries(suggestionsByCategory).map(([category, items]) => (
            <div key={category} className="space-y-4">
              <div className="flex items-center gap-2">
                <div className={cn("p-1.5 rounded-lg", getCategoryColor(category))}>
                  {getCategoryIcon(category)}
                </div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">{category}</h3>
                <Badge variant="outline" className="ml-auto text-[9px] border-zinc-100 text-zinc-400 font-bold">{items.length}</Badge>
              </div>
              <div className="grid gap-3">
                {items.map((place) => (
                  <Card 
                    key={place.id}
                    className={cn(
                      "group relative p-4 border-zinc-100 hover:border-zinc-300 transition-all cursor-pointer overflow-hidden rounded-2xl",
                      hoveredSuggestionId === place.id ? "border-zinc-900 shadow-xl -translate-y-1" : "hover:shadow-lg"
                    )}
                    onMouseEnter={() => { setHoveredSuggestionId(place.id); handleExploreFocus(place); }}
                    onMouseLeave={() => setHoveredSuggestionId(null)}
                    onClick={() => handleExploreFocus(place)}
                  >
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="font-bold text-sm text-zinc-900 leading-tight group-hover:text-zinc-600 transition-colors">{place.name}</h4>
                          <button 
                            onClick={(e) => handleExploreAdd(place, e)}
                            className="p-2 rounded-xl bg-zinc-900 text-white shadow-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all active:scale-95"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-[10px] font-medium text-zinc-500 bg-zinc-50 px-2 py-0.5 rounded-md">
                            <MapPin className="w-3 h-3" />
                            {place.distance ? `${place.distance}m` : "Nearby"}
                          </div>
                          {place.rating && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                              ★ {place.rating}
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-2">{place.description}</p>
                        
                        <div className="flex items-center gap-2 pt-1">
                          <button 
                            className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-900 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setGalleryPlace(place);
                              setIsGalleryLoading(true);
                              fetchPlaceGallery(place).then(imgs => {
                                setGalleryImages(imgs);
                                setIsGalleryLoading(false);
                              });
                            }}
                          >
                            <ImageIcon className="w-3 h-3" />
                            Gallery
                          </button>
                          <span className="text-zinc-200">•</span>
                          <a 
                            href={`https://www.google.com/search?q=${encodeURIComponent(place.name + " " + (place.location || ""))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-900 transition-colors"
                            onClick={e => e.stopPropagation()}
                          >
                            <ExternalLink className="w-3 h-3" />
                            Details
                          </a>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
          
          {Object.keys(suggestionsByCategory).length === 0 && !suggestionsLoading && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-zinc-200" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-zinc-400">No spots found yet</p>
                <p className="text-[10px] text-zinc-300 px-10 leading-relaxed uppercase tracking-widest font-bold">Try searching for "Restaurants in Paris" or "Museums"</p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
