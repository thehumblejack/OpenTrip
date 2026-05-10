"use client";

import { Search, Compass, Sparkles, Plus, Trash2, Utensils, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { cn } from "@/lib/utils";
import { getCategoryIcon, getCategoryColor } from "@/hooks/usePlaceSuggestions";

interface ExploreTabProps {
  exploreSubTab: string;
  setExploreSubTab: (val: string) => void;
  exploreSearch: string;
  setExploreSearch: (val: string) => void;
  fetchSuggestions: (query: string) => void;
  suggestionsLoading: boolean;
  selectedSource: string | null;
  handleSourceClick: (s: string) => void;
  selectedCategory: string | null;
  setSelectedCategory: (val: string | null) => void;
  suggestionsByCategory: Record<string, any[]>;
  handleExploreAdd: (place: any, e: React.MouseEvent) => void;
  handleExploreFocus: (place: any) => void;
  hoveredSuggestionId: string | number | null;
  setHoveredSuggestionId: (id: string | number | null) => void;
  fetchPlaceGallery: (placeId: string, name: string) => Promise<string[]>;
  setGalleryPlace: (place: any) => void;
  setGalleryImages: (imgs: string[]) => void;
  customExplorationTitle: string;
  setCustomExplorationTitle: (val: string) => void;
  setCustomExplorationLat: (val: string) => void;
  setCustomExplorationLon: (val: string) => void;
  customExplorationCategory: string;
  setCustomExplorationCategory: (val: string) => void;
  handleAddCustomExploration: () => void;
  trip: any;
  deleteCustomExploration: (id: string) => void;
  tripDestination: string;
}

export function ExploreTab({
  exploreSubTab,
  setExploreSubTab,
  exploreSearch,
  setExploreSearch,
  fetchSuggestions,
  suggestionsLoading,
  selectedSource,
  handleSourceClick,
  selectedCategory,
  setSelectedCategory,
  suggestionsByCategory,
  handleExploreAdd,
  handleExploreFocus,
  hoveredSuggestionId,
  setHoveredSuggestionId,
  fetchPlaceGallery,
  setGalleryPlace,
  setGalleryImages,
  customExplorationTitle,
  setCustomExplorationTitle,
  setCustomExplorationLat,
  setCustomExplorationLon,
  customExplorationCategory,
  setCustomExplorationCategory,
  handleAddCustomExploration,
  trip,
  deleteCustomExploration,
  tripDestination
}: ExploreTabProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-6">
            <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 space-y-3">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Add Custom Item</p>
              <LocationAutocomplete 
                placeholder="Search for a place..." 
                value={customExplorationTitle} 
                onChange={setCustomExplorationTitle} 
                onCoordinatesSelect={(lat, lon) => { setCustomExplorationLat(lat); setCustomExplorationLon(lon); }} 
              />
              <div className="flex flex-wrap gap-1.5">
                {["Attraction", "Museum", "Park", "Beach", "Monument", "Art", "Food"].map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setCustomExplorationCategory(cat)} 
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all border shrink-0", 
                      customExplorationCategory === cat ? "bg-zinc-900 border-zinc-900 text-white" : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
                    )}
                  >
                    {cat === "Food" ? <Utensils className="w-2.5 h-2.5 inline mr-1" /> : getCategoryIcon(cat)} {cat}
                  </button>
                ))}
              </div>
              <Button className="w-full h-9 text-xs font-bold" onClick={handleAddCustomExploration}>Create Exploration</Button>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">My Custom Spots</p>
                <div className="flex-1 h-px bg-zinc-100" />
                <Badge variant="outline" className="text-[9px]">{trip.customExplorations.length}</Badge>
              </div>
              {trip.customExplorations.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center mb-3 text-zinc-200">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-zinc-400">No custom items yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {trip.customExplorations.map((item: any, idx: number) => (
                    <div 
                      key={item.id} 
                      draggable 
                      onDragStart={e => { e.dataTransfer.setData("application/json", JSON.stringify({ ...item, name: item.title, categoryLabel: item.category })); e.dataTransfer.effectAllowed = "copy"; }} 
                      onClick={() => handleExploreFocus(item)} 
                      className="group flex gap-3 rounded-2xl border border-zinc-200 bg-white p-2.5 cursor-grab active:cursor-grabbing hover:border-zinc-300 transition-all"
                    >
                      <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-lg shrink-0 relative">
                        {item.category === "Food" ? <Utensils className="w-5 h-5 text-zinc-900" /> : getCategoryIcon(item.category || "Attraction")}
                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-zinc-900 text-white rounded-full flex items-center justify-center text-[8px] font-bold shadow-sm">{idx + 1}</div>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase">{item.category}</p>
                        <p className="text-xs font-bold text-zinc-900 leading-tight truncate">{item.title}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={e => handleExploreAdd(item, e)} className="p-1.5 hover:bg-zinc-50 rounded-lg text-zinc-400 hover:text-zinc-900">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteCustomExploration(item.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-zinc-300 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
