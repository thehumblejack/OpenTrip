"use client";

import { useEffect, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface LocationAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  onCoordinatesSelect?: (lat: string, lon: string) => void;
  placeholder?: string;
  className?: string;
}

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address: any;
}

export function LocationAutocomplete({ value, onChange, onCoordinatesSelect, placeholder, className }: LocationAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchSuggestions = async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
      }
    } catch (e) {
      console.error("Error fetching location suggestions:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);
    setOpen(true);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 150);
  };

  const handleSelect = (suggestion: NominatimResult) => {
    const mainText = suggestion.display_name.split(',')[0];
    setInputValue(mainText);
    onChange(suggestion.display_name);
    if (onCoordinatesSelect) {
      onCoordinatesSelect(suggestion.lat, suggestion.lon);
    }
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <Input
        value={inputValue}
        onChange={handleInput}
        placeholder={placeholder || "Search location..."}
        className={cn("w-full", className)}
        onFocus={() => {
          setOpen(true);
          if (inputValue && suggestions.length === 0) fetchSuggestions(inputValue);
        }}
      />
      
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion) => {
            const parts = suggestion.display_name.split(', ');
            const main_text = parts[0];
            const secondary_text = parts.slice(1).join(', ');

            return (
              <li
                key={suggestion.place_id}
                onClick={() => handleSelect(suggestion)}
                className="flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-zinc-100 transition-colors"
              >
                <MapPin className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-zinc-900">{main_text}</span>
                  <span className="text-xs text-zinc-500 line-clamp-1">{secondary_text}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
