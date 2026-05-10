"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { format, addDays, differenceInDays } from "date-fns";
import { Calendar as CalendarIcon, MapPin, Clock, Plus, FileText, Trash2, Paperclip, Map as MapIcon, Plane, AlignLeft, Search, ExternalLink, Image as ImageIcon, ChevronLeft, ChevronRight, X, GripVertical, Compass, Sparkles, Loader2, Utensils, Cloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { usePlaceSuggestions, getCategoryIcon, getCategoryColor, fetchPlaceGallery } from "@/hooks/usePlaceSuggestions";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { createClient } from "@/utils/supabase/client";
import { Separator } from "@/components/ui/separator";
import { WeatherBar } from "@/components/WeatherBar";
import { BackupManager } from "@/components/BackupManager";

const TripMap = dynamic(() => import("@/components/TripMap").then(m => ({ default: m.TripMap })), { ssr: false });

interface TripDocument { id: string; name: string; url: string; }
interface ActivityAttachment { id: string; name: string; url: string; type: 'image' | 'file'; }
interface Activity { id: string; date: string; time: string; duration: number; title: string; notes: string; location: string; lat?: string; lon?: string; category?: string; attachments?: ActivityAttachment[]; }
interface Trip { id?: string; destination: string; startDate: Date; endDate: Date; documents: TripDocument[]; activities: Activity[]; customExplorations: Activity[]; destLat?: string; destLon?: string; }

export default function Home() {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [destination, setDestination] = useState("");
  const [destLat, setDestLat] = useState<string>();
  const [destLon, setDestLon] = useState<string>();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogDay, setDialogDay] = useState<Date>();
  const [aTime, setATime] = useState("10:00");
  const [aTitle, setATitle] = useState("");
  const [aLocation, setALocation] = useState("");
  const [aLat, setALat] = useState<string>();
  const [aLon, setALon] = useState<string>();
  const [aNotes, setANotes] = useState("");
  const [aDuration, setADuration] = useState(60);
  const [aCategory, setACategory] = useState("Attraction");
  const [aAttachments, setAAttachments] = useState<ActivityAttachment[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("itinerary");
  const [hoveredSuggestionId, setHoveredSuggestionId] = useState<string | number | null>(null);
  const [focusedPlace, setFocusedPlace] = useState<{ lat: string; lon: string } | null>(null);
  const [exploreSearch, setExploreSearch] = useState("");
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [galleryPlace, setGalleryPlace] = useState<any | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [isGalleryLoading, setIsGalleryLoading] = useState(false);
  const [calendarMode, setCalendarMode] = useState<"month" | "week" | "day">("day");
  const [customExplorationTitle, setCustomExplorationTitle] = useState("");
  const [customExplorationCategory, setCustomExplorationCategory] = useState("Attraction");
  const [customExplorationLat, setCustomExplorationLat] = useState<string>();
  const [customExplorationLon, setCustomExplorationLon] = useState<string>();
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  const [exploreSubTab, setExploreSubTab] = useState("suggestions");
  const [selectedCopyDays, setSelectedCopyDays] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoadingTrip, setIsLoadingTrip] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "error">("synced");
  const syncInProgressRef = useRef(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const supabase = createClient();
  const { suggestions, loading: suggestionsLoading, error: suggestionsError, fetchSuggestions } = usePlaceSuggestions();

  // Handle Auth & Load Trip
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) loadTripFromSupabase(user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadTripFromSupabase(session.user.id);
      else if (_event === 'SIGNED_OUT') setTrip(null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const loadTripFromSupabase = async (userId: string) => {
    setIsLoadingTrip(true);
    const { data: trips, error } = await supabase.from('trips').select('*, activities(*)').eq('user_id', userId).order('created_at', { ascending: false }).limit(1);
    if (trips?.[0]) {
      const t = trips[0];
      const allActs = t.activities || [];
      // Deduplicate activities in case database has duplicates
      const seen = new Set();
      const uniqueActs = [];
      for (const act of allActs) {
        const key = `${act.title}|${act.date}|${act.time}|${act.location}|${act.is_exploration}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueActs.push(act);
        }
      }

      setTrip({
        ...t,
        startDate: new Date(t.start_date),
        endDate: new Date(t.end_date),
        destLat: t.dest_lat?.toString(),
        destLon: t.dest_lon?.toString(),
        activities: uniqueActs.filter((a: any) => !a.is_exploration).map((a: any) => ({
          ...a,
          date: a.date,
          attachments: [] 
        })).sort((a: any, b: any) => (a.time || "").localeCompare(b.time || "")),
        customExplorations: uniqueActs.filter((a: any) => a.is_exploration).map((a: any) => ({
          ...a,
          category: a.category || "Attraction"
        })),
        documents: []
      });
      fetchSuggestions(t.destination);
    }
    setIsLoadingTrip(false);
  };

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else alert("Check your email for the confirmation link!");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // Persist trip to localStorage
  useEffect(() => {
    const saved = localStorage.getItem("my-trip-planner-trip");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        parsed.startDate = new Date(parsed.startDate);
        parsed.endDate = new Date(parsed.endDate);
        if (!parsed.customExplorations) parsed.customExplorations = [];
        setTrip(parsed);
        fetchSuggestions(parsed.destination);
      } catch (e) {
        console.error("Failed to load saved trip", e);
      }
    }
  }, [fetchSuggestions]);

  useEffect(() => {
    if (user) {
      loadTripFromSupabase(user.id);
      
      // Auto-migrate local data if it exists
      const localData = localStorage.getItem('travel-itinerary');
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          if (parsed.activities?.length > 0 || parsed.customExplorations?.length > 0) {
            console.log("Migrating local data to Supabase...");
            // Merge local data into state and syncTripToSupabase will handle the rest
            setTrip(prev => ({
              ...(prev || { destination: parsed.destination || "", startDate: new Date(), endDate: new Date(), documents: [], activities: [], customExplorations: [] }),
              activities: [...(prev?.activities || []), ...parsed.activities.filter((la: any) => !prev?.activities.find((pa: any) => pa.id === la.id))],
              customExplorations: [...(prev?.customExplorations || []), ...parsed.customExplorations.filter((le: any) => !prev?.customExplorations.find((pe: any) => pe.id === le.id))],
            }));
            // Remove local data after successful "lift"
            localStorage.removeItem('travel-itinerary');
          }
        } catch (e) {
          console.error("Migration error:", e);
        }
      }
    }
  }, [user]);

  useEffect(() => {
    if (trip && !isLoadingTrip) {
      localStorage.setItem("my-trip-planner-trip", JSON.stringify(trip));
      if (user) syncTripToSupabase();
    }
  }, [trip, user, isLoadingTrip]);

  const syncTripToSupabase = async () => {
    if (!user || !trip) return;
    if (syncInProgressRef.current) return;
    syncInProgressRef.current = true;
    setSyncStatus("syncing");
    
    // 1. Upsert Trip
    const { data: tripData, error: tripErr } = await supabase.from('trips').upsert({
      ...(trip.id ? { id: trip.id } : {}),
      user_id: user.id,
      destination: trip.destination,
      start_date: format(trip.startDate, "yyyy-MM-dd"),
      end_date: format(trip.endDate, "yyyy-MM-dd"),
      dest_lat: trip.destLat ? parseFloat(trip.destLat) : null,
      dest_lon: trip.destLon ? parseFloat(trip.destLon) : null
    }).select().single();

    if (tripErr) {
      console.error("Trip sync error:", tripErr);
      setSyncStatus("error");
      syncInProgressRef.current = false;
      return;
    }
    if (!tripData) {
      syncInProgressRef.current = false;
      return;
    }

    // Update local ID if it was newly created
    if (!trip.id) setTrip(prev => prev ? ({ ...prev, id: tripData.id }) : null);

    // 2. Sync Activities & Explorations
    const { error: delErr } = await supabase.from('activities').delete().eq('trip_id', tripData.id);
    if (delErr) {
      console.error("Activity clear error:", delErr);
      setSyncStatus("error");
      syncInProgressRef.current = false;
      return;
    }

    const allItemsToSync = [
      ...trip.activities.map(a => ({ ...a, is_exploration: false })),
      ...trip.customExplorations.map(e => ({ ...e, is_exploration: true }))
    ];

    if (allItemsToSync.length > 0) {
      try {
        const { error: insErr } = await supabase.from('activities').upsert(
          allItemsToSync.map(item => {
            let parsedDate = null;
            if (item.date) {
              if (typeof item.date === 'string') parsedDate = item.date.split('T')[0];
              else if (item.date instanceof Date) parsedDate = item.date.toISOString().split('T')[0];
            }
            return {
              id: item.id && typeof item.id === 'string' && item.id.length === 36 ? item.id : undefined,
              trip_id: tripData.id,
              title: item.title || "Untitled",
              date: parsedDate,
              time: item.time || null,
              duration: item.duration || null,
              category: item.category,
              location: item.location,
              lat: item.lat && item.lat !== "" ? parseFloat(item.lat) : null,
              lon: item.lon && item.lon !== "" ? parseFloat(item.lon) : null,
              notes: item.notes || null,
              is_exploration: item.is_exploration
            };
          }),
          { onConflict: 'id' }
        );
        if (insErr) {
          console.error("Activity sync error:", insErr);
          setSyncStatus("error");
          syncInProgressRef.current = false;
          return;
        }
      } catch (err) {
        console.error("Critical error during sync map:", err);
        setSyncStatus("error");
        syncInProgressRef.current = false;
        return;
      }
    }
    setSyncStatus("synced");
    syncInProgressRef.current = false;
  };

  const tripDays = useMemo(() => {
    if (!trip) return [];
    const n = differenceInDays(trip.endDate, trip.startDate) + 1;
    return Array.from({ length: n }, (_, i) => addDays(trip.startDate, i));
  }, [trip]);

  const suggestionsByCategory = useMemo(() => {
    const filtered = selectedCategory ? suggestions.filter(s => s.categoryLabel === selectedCategory) : suggestions;
    const map: Record<string, typeof suggestions> = {};
    filtered.forEach(s => {
      if (!map[s.categoryLabel]) map[s.categoryLabel] = [];
      map[s.categoryLabel].push(s);
    });
    return map;
  }, [suggestions, selectedCategory]);

  const getEndTime = (startTime: string, duration: number) => {
    const [h, m] = startTime.split(":").map(Number);
    const totalMinutes = h * 60 + m + duration;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
  };

  const calculateDuration = (start: string, end: string) => {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff < 0) diff += 1440; 
    return diff;
  };

  const [dragState, setDragState] = useState<{ id: string, type: 'move' | 'resize-top' | 'resize-bottom', startY: number, initialTime: string, initialDuration: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent, act: Activity, type: 'move' | 'resize-top' | 'resize-bottom') => {
    e.preventDefault();
    e.stopPropagation();
    setDragState({ id: act.id, type, startY: e.clientY, initialTime: act.time, initialDuration: act.duration || 60 });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState || !trip) return;
      const deltaY = e.clientY - dragState.startY;
      const hoursDelta = Math.round(deltaY / 60); 
      if (hoursDelta === 0) return;
      const act = trip.activities.find(a => a.id === dragState.id);
      if (!act) return;

      let newTime = act.time;
      let newDuration = act.duration || 60;

      if (dragState.type === 'move') {
        const [h, m] = dragState.initialTime.split(":").map(Number);
        const newH = Math.max(0, Math.min(23, h + hoursDelta));
        newTime = `${newH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      } else if (dragState.type === 'resize-bottom') {
        newDuration = Math.max(30, dragState.initialDuration + hoursDelta * 60);
      } else if (dragState.type === 'resize-top') {
        const [h, m] = dragState.initialTime.split(":").map(Number);
        const newH = Math.max(0, Math.min(23, h + hoursDelta));
        const durationChange = (h - newH) * 60;
        newTime = `${newH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        newDuration = Math.max(30, dragState.initialDuration + durationChange);
      }

      setTrip({
        ...trip,
        activities: trip.activities.map(a => 
          a.id === dragState.id ? { ...a, time: newTime, duration: newDuration } : a
        ).sort((a, b) => (a.time || "").localeCompare(b.time || ""))
      });
    };
    const handleMouseUp = () => setDragState(null);
    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, trip]);

  const [editingId, setEditingId] = useState<string | null>(null);

  const openDialog = (day: Date, time?: string) => { 
    setDialogDay(day); 
    if (time) setATime(time);
    setEditingId(null);
    setATitle(""); setALocation(""); setALat(undefined); setALon(undefined); setANotes(""); setADuration(60); setACategory("Attraction"); setAAttachments([]);
    setSelectedCopyDays([]);
    setIsDialogOpen(true); 
  };

  const openEditDialog = (act: Activity) => {
    setEditingId(act.id);
    setDialogDay(new Date(act.date));
    setATime(act.time); setATitle(act.title); setALocation(act.location); setALat(act.lat); setALon(act.lon); setANotes(act.notes); setADuration(act.duration || 60);
    setACategory(act.category || "Attraction");
    setAAttachments(act.attachments || []);
    setSelectedCopyDays([]);
    setIsDialogOpen(true);
  };

  const handleAddActivity = () => {
    if (!trip || !dialogDay || !aTitle || !aTime) return;
    const baseData = { date: dialogDay.toISOString(), time: aTime, duration: aDuration, title: aTitle, notes: aNotes, location: aLocation, lat: aLat, lon: aLon, category: aCategory, attachments: aAttachments };
    
    let newActivities = [...trip.activities];
    if (editingId) {
      newActivities = newActivities.map(a => a.id === editingId ? { ...a, ...baseData } : a);
    } else {
      newActivities.push({ id: crypto.randomUUID(), ...baseData });
    }

    // Add copies for other days
    selectedCopyDays.forEach(dayIso => {
      if (dayIso === dialogDay.toISOString()) return;
      newActivities.push({
        id: crypto.randomUUID(),
        ...baseData,
        date: dayIso
      });
    });

    setTrip({ ...trip, activities: newActivities.sort((a, b) => (a.time || "").localeCompare(b.time || "")) });
    setIsDialogOpen(false); setEditingId(null); setATitle(""); setALocation(""); setALat(undefined); setALon(undefined); setANotes(""); setATime("10:00"); setADuration(60); setACategory("Attraction"); setAAttachments([]);
    if (selectedCopyDays.length > 0) {
      setToastMessage(`Successfully duplicated activity to ${selectedCopyDays.length} other days.`);
      setTimeout(() => setToastMessage(null), 4000);
    }
    setSelectedCopyDays([]);
  };

  const handleActivityFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const file = e.target.files[0];
    const isImage = file.type.startsWith('image/');
    setAAttachments([...aAttachments, { id: crypto.randomUUID(), name: file.name, url: URL.createObjectURL(file), type: isImage ? 'image' : 'file' }]);
  };

  const deleteActivity = (id: string) => {
    if (!trip) return;
    setTrip({ ...trip, activities: trip.activities.filter(a => a.id !== id) });
    if (selectedId === id) setSelectedId(null);
    setIdToDelete(null);
  };

  const handleAddCustomExploration = () => {
    if (!trip || !customExplorationTitle) return;
    const newItem: Activity = { id: crypto.randomUUID(), date: "", time: "", duration: 60, title: customExplorationTitle, notes: "", location: customExplorationTitle, category: customExplorationCategory, lat: customExplorationLat, lon: customExplorationLon };
    setTrip({ ...trip, customExplorations: [...trip.customExplorations, newItem] });
    setCustomExplorationTitle(""); setCustomExplorationLat(undefined); setCustomExplorationLon(undefined);
  };

  const deleteCustomExploration = (id: string) => {
    if (!trip) return;
    setTrip({ ...trip, customExplorations: trip.customExplorations.filter(e => e.id !== id) });
  };

  const handleMapClick = async (lat: number, lon: number) => {
    if (!trip) return;
    setActiveTab("explore");
    setExploreSubTab("custom");
    setCustomExplorationLat(lat.toString());
    setCustomExplorationLon(lon.toString());
    setCustomExplorationTitle("Loading address...");
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      const data = await res.json();
      const placeName = data.display_name || "Custom Map Spot";
      const shortName = placeName.split(",").slice(0, 3).join(",").trim() || placeName;
      setCustomExplorationTitle(shortName);
    } catch (e) {
      setCustomExplorationTitle("Selected Map Spot");
    }
  };

  const handleExploreAdd = useCallback((place: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setALocation(place.name || place.location || ""); setALat(place.lat); setALon(place.lon); setATitle(place.name || place.title || "");
    setACategory(place.categoryLabel || "Attraction");
    setDialogDay(tripDays[0]); setADuration(60); setAAttachments([]); setIsDialogOpen(true);
    if (place.lat && place.lon) setFocusedPlace({ lat: place.lat, lon: place.lon });
  }, [tripDays]);

  const handleExploreFocus = useCallback((place: any) => {
    if (place.lat && place.lon) setFocusedPlace({ lat: place.lat, lon: place.lon });
  }, []);

  const handleSourceClick = (source: string) => {
    if (!trip) return;
    setSelectedSource(source);
    const query = source === "TripAdvisor" ? `Top things to do in ${trip.destination}` : source === "GetYourGuide" ? `Activities and tours in ${trip.destination}` : source === "Yelp Best" ? `Top rated restaurants and spots in ${trip.destination}` : `${source} suggestions in ${trip.destination}`;
    setExploreSearch(query); fetchSuggestions(query);
  };

  const handleCreateTrip = () => {
    if (!destination || !startDate || !endDate) return;
    setTrip({ destination, startDate, endDate, documents: [], activities: [], customExplorations: [], destLat, destLon });
    fetchSuggestions(destination);
  };

  const clearTrip = () => { if (confirm("Start over?")) { setTrip(null); localStorage.removeItem("my-trip-planner-trip"); setDestination(""); setStartDate(undefined); setEndDate(undefined); } };
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !trip) return;
    const file = e.target.files[0];
    let fileUrl = URL.createObjectURL(file);

    if (user) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('trip-documents')
        .upload(filePath, file);
        
      if (!uploadError) {
        const { data } = supabase.storage.from('trip-documents').getPublicUrl(filePath);
        fileUrl = data.publicUrl;
      }
    }

    setTrip({ ...trip, documents: [...trip.documents, { id: crypto.randomUUID(), name: file.name, url: fileUrl }] });
  };

  const selectedActivity = useMemo(() => trip?.activities.find(a => a.id === selectedId) ?? null, [trip, selectedId]);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafafa] p-6 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-zinc-100 rounded-full blur-[120px] opacity-50" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zinc-200 rounded-full blur-[120px] opacity-50" />
        
        <div className="relative z-10 w-full max-w-md space-y-8">
          <div className="text-center space-y-4">
            <div className="mx-auto bg-zinc-900 w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl rotate-3">
              <Plane className="w-7 h-7 text-white" />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tighter text-zinc-900">MyTripPlanner</h1>
              <p className="text-zinc-500 font-medium text-sm">Synchronized Travel OS</p>
            </div>
          </div>

          <Card className="border-0 shadow-2xl rounded-[32px] overflow-hidden bg-white/80 backdrop-blur-xl">
            <CardHeader className="text-center pt-10 pb-6">
              <CardTitle className="text-2xl font-bold">Ready to explore?</CardTitle>
              <CardDescription className="text-zinc-500 px-4">
                Sign in to create itineraries, sync documents, and explore hidden gems.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8 space-y-6">
              <form onSubmit={handleAuthAction} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Email Address</Label>
                  <Input 
                    type="email" 
                    placeholder="name@example.com" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Password</Label>
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>
                <Button type="submit" className="w-full h-12 rounded-xl text-sm font-bold gap-3 shadow-lg hover:shadow-xl transition-all mt-2">
                  {isSignUp ? "Create My Account" : "Sign In to My Planner"}
                </Button>
              </form>

              <div className="text-center">
                <button 
                  onClick={() => setIsSignUp(!isSignUp)} 
                  className="text-[10px] font-bold text-zinc-400 hover:text-zinc-900 uppercase tracking-widest transition-colors"
                >
                  {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><Separator /></div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold text-zinc-400 bg-white/0"><span className="px-2 bg-white">Explore Features</span></div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-zinc-50/50 border border-zinc-100">
                  <Compass className="w-4 h-4 text-zinc-400" />
                  <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-500 text-center">Discovery</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-zinc-50/50 border border-zinc-100">
                  <MapIcon className="w-4 h-4 text-zinc-400" />
                  <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-500 text-center">Map</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-zinc-50/50 border border-zinc-100">
                  <Cloud className="w-4 h-4 text-zinc-400" />
                  <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-500 text-center">Sync</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-zinc-50/50 border-t border-zinc-100 py-4 flex justify-center">
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Travel OS v1.0 · Supabase Secure</p>
            </CardFooter>
          </Card>

          <div className="flex justify-center gap-2">
            <Badge variant="secondary" className="bg-white/50 text-zinc-400 border-zinc-200 text-[9px] font-bold uppercase px-3">Private</Badge>
            <Badge variant="secondary" className="bg-white/50 text-zinc-400 border-zinc-200 text-[9px] font-bold uppercase px-3">Fast</Badge>
            <Badge variant="secondary" className="bg-white/50 text-zinc-400 border-zinc-200 text-[9px] font-bold uppercase px-3">Global</Badge>
          </div>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-50">
        <header className="bg-white/80 backdrop-blur-md border-b border-zinc-200 px-8 h-16 flex items-center justify-between shrink-0 sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="bg-zinc-900 w-8 h-8 rounded-lg flex items-center justify-center"><Plane className="w-4 h-4 text-white" /></div>
            <h1 className="text-sm font-bold text-zinc-900 uppercase tracking-tighter">MyTripPlanner</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold text-zinc-900 leading-none">{user.email?.split('@')[0]}</p>
              <button onClick={handleSignOut} className="text-[9px] font-bold text-zinc-400 hover:text-red-500 uppercase tracking-widest mt-1">Sign Out</button>
            </div>
            <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center overflow-hidden">
              {user.user_metadata?.avatar_url ? <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" /> : <span className="text-[10px] font-bold text-zinc-500">{user.email?.[0].toUpperCase()}</span>}
            </div>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-0 rounded-[32px] overflow-hidden bg-white">
            <div className="h-32 bg-zinc-900 relative flex items-center justify-center">
              <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
              <div className="relative text-center">
                <CardTitle className="text-2xl font-bold text-white mb-1">Plan Your Trip</CardTitle>
                <CardDescription className="text-zinc-400 text-xs uppercase tracking-widest font-bold">New Itinerary</CardDescription>
              </div>
            </div>
            <CardContent className="space-y-6 px-8 pt-8 pb-10">
              <div className="space-y-2"><Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Where are you going?</Label><LocationAutocomplete value={destination} onChange={setDestination} onCoordinatesSelect={(lat, lon) => { setDestLat(lat); setDestLon(lon); }} placeholder="Search destination..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Start Date</Label><Popover><PopoverTrigger render={<Button variant="outline" className={cn("w-full h-11 justify-start text-left font-medium text-sm rounded-xl", !startDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-3.5 w-3.5" />{startDate ? format(startDate, "MMM d, yyyy") : "Departure"}</Button>} /><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={startDate} onSelect={setStartDate} weekStartsOn={1} /></PopoverContent></Popover></div>
                <div className="space-y-2"><Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">End Date</Label><Popover><PopoverTrigger render={<Button variant="outline" className={cn("w-full h-11 justify-start text-left font-medium text-sm rounded-xl", !endDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-3.5 w-3.5" />{endDate ? format(endDate, "MMM d, yyyy") : "Return"}</Button>} /><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={endDate} onSelect={setEndDate} weekStartsOn={1} /></PopoverContent></Popover></div>
              </div>
              <Button className="w-full h-12 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all mt-4" onClick={handleCreateTrip} disabled={!destination || !startDate || !endDate}>Create My Trip</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-50 overflow-hidden">
      <header className="bg-white border-b border-zinc-200 px-6 h-14 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-zinc-900 w-7 h-7 rounded-lg flex items-center justify-center"><Plane className="w-3.5 h-3.5 text-white" /></div>
          <div>
            <h1 className="text-sm font-bold text-zinc-900 leading-none">{trip.destination}</h1>
            <p className="text-[10px] text-zinc-400 mt-1 font-medium">{format(trip.startDate, "MMM d")} – {format(trip.endDate, "MMM d, yyyy")} · {tripDays.length} days</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 pr-4 border-r border-zinc-100">
            <input type="file" id="doc-upload" className="hidden" onChange={handleFileUpload} accept=".pdf,.png,.jpg,.jpeg" />
            <Label htmlFor="doc-upload" className="h-8 flex items-center gap-1.5 px-3 border border-zinc-100 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-50 cursor-pointer transition-colors text-zinc-500"><Paperclip className="w-3 h-3" /> Attach</Label>
          </div>
          <div className="flex items-center gap-2 pr-4 border-r border-zinc-100">
            {syncStatus === "syncing" && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />}
            {syncStatus === "synced" && <Cloud className="w-3.5 h-3.5 text-green-500" />}
            {syncStatus === "error" && <Cloud className="w-3.5 h-3.5 text-red-500" />}
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 hidden sm:inline-block">
              {syncStatus === "syncing" ? "Syncing..." : syncStatus === "synced" ? "Cloud Synced" : "Sync Error"}
            </span>
          </div>
          
          <div className="flex items-center gap-2 pr-4 border-r border-zinc-100">
            <BackupManager trip={trip} onRestore={(restoredTrip) => setTrip(restoredTrip)} />
          </div>

          {user && (
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-bold text-zinc-900 leading-none">{user.email?.split('@')[0]}</p>
                <button onClick={handleSignOut} className="text-[9px] font-bold text-zinc-400 hover:text-red-500 uppercase tracking-widest mt-1">Sign Out</button>
              </div>
              <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center overflow-hidden">
                {user.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-bold text-zinc-500">{user.email?.[0].toUpperCase()}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <WeatherBar lat={trip.destLat} lon={trip.destLon} />

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={25} minSize={20} className="flex flex-col bg-white border-r border-zinc-100">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
            <div className="px-4 pt-3 pb-0 border-b border-zinc-100 shrink-0">
              <TabsList className="w-full h-8 gap-0 bg-transparent rounded-none border-b-0">
                <TabsTrigger value="itinerary" className="flex-1 text-xs gap-1.5 data-[state=active]:bg-zinc-100"><CalendarIcon className="w-3.5 h-3.5" /> Itinerary</TabsTrigger>
                <TabsTrigger value="explore" className="flex-1 text-xs gap-1.5 data-[state=active]:bg-zinc-100"><Compass className="w-3.5 h-3.5" /> Explore {suggestionsLoading && <Loader2 className="w-3 h-3 animate-spin" />}</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="explore" className="flex-1 min-h-0 overflow-hidden m-0">
              <Tabs value={exploreSubTab} onValueChange={setExploreSubTab} className="flex flex-col h-full">
                <div className="px-4 py-2 border-b border-zinc-100 flex justify-center bg-zinc-50/50">
                  <TabsList className="h-7 bg-white/50 border border-zinc-100">
                    <TabsTrigger value="suggestions" className="text-[10px] uppercase font-bold tracking-widest px-4">Suggestions</TabsTrigger>
                    <TabsTrigger value="custom" className="text-[10px] uppercase font-bold tracking-widest px-4">Custom</TabsTrigger>
                  </TabsList>
                </div>
                <div className="flex-1 overflow-hidden">
                  <TabsContent value="suggestions" className="h-full m-0"><ScrollArea className="h-full"><div className="p-4 space-y-6">
                    <div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" /><Input className="pl-8 h-8 text-xs" placeholder="Search places..." value={exploreSearch} onChange={e => setExploreSearch(e.target.value)} onKeyDown={e => { if (e.key === "Enter") fetchSuggestions(exploreSearch.trim()); }} /></div><Button size="sm" className="h-8 text-xs px-3" onClick={() => fetchSuggestions(exploreSearch.trim() || trip.destination)} disabled={suggestionsLoading}>{suggestionsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Search"}</Button></div>
                    <div className="space-y-3"><p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Discover From</p><div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">{["Google Places", "TripAdvisor", "GetYourGuide", "Yelp Best"].map(s => <button key={s} onClick={() => handleSourceClick(s)} className={cn("whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-bold transition-all border shrink-0", selectedSource === s ? "bg-zinc-900 border-zinc-900 text-white shadow-md shadow-zinc-200" : "bg-white border-zinc-100 text-zinc-500 hover:border-zinc-300")}>{s}</button>)}</div></div>
                    <div className="flex flex-wrap gap-1.5">{["Attraction", "Museum", "Park", "Beach", "Monument", "Art", "Food"].map(cat => <button key={cat} onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border", selectedCategory === cat ? "bg-zinc-900 border-zinc-900 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:bg-white")}>{cat === "Food" ? <Utensils className="w-3 h-3 inline mr-1" /> : getCategoryIcon(cat)} {cat}</button>)}</div>
                    {suggestionsLoading ? <div className="py-16 flex flex-col items-center justify-center gap-3 text-zinc-400"><Loader2 className="animate-spin" /><p className="text-sm">Finding best places...</p></div> : Object.entries(suggestionsByCategory).map(([cat, places]) => (
                      <div key={cat} className="space-y-2"><div className="flex items-center gap-2 mb-2"><p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">{cat}</p><div className="flex-1 h-px bg-zinc-100" /></div><div className="space-y-2">{places.map(place => (
                        <div key={place.id} draggable onDragStart={e => { e.dataTransfer.setData("application/json", JSON.stringify(place)); e.dataTransfer.effectAllowed = "copy"; }} onClick={() => handleExploreFocus(place)} onMouseEnter={() => setHoveredSuggestionId(place.id)} onMouseLeave={() => setHoveredSuggestionId(null)} className={cn("group flex gap-3 rounded-2xl border bg-white overflow-hidden cursor-grab active:cursor-grabbing transition-all p-2", hoveredSuggestionId === place.id ? "border-zinc-400 shadow-lg" : "border-zinc-200")}>
                          <div className="w-20 h-20 shrink-0 rounded-xl bg-zinc-100 overflow-hidden" onClick={e => fetchPlaceGallery(place._wikipedia, place.name).then(imgs => { setGalleryPlace(place); setGalleryImages(imgs); })}>{place.thumbnail ? <img src={place.thumbnail} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">{getCategoryIcon(place.categoryLabel)}</div>}</div>
                          <div className="flex-1 min-w-0 py-0.5 flex flex-col justify-between"><div><p className="text-[10px] font-bold text-zinc-400 uppercase">{place.categoryLabel}</p><p className="text-xs font-bold text-zinc-900 leading-tight line-clamp-2">{place.name}</p></div><button onClick={e => handleExploreAdd(place, e)} className="h-6 px-2.5 rounded-lg text-[9px] font-bold text-white shadow-sm self-start" style={{ background: getCategoryColor(place.categoryLabel) }}><Plus className="w-2.5 h-2.5 inline mr-1" /> ADD</button></div>
                        </div>
                      ))}</div></div>
                    ))}
                  </div></ScrollArea></TabsContent>
                  <TabsContent value="custom" className="h-full m-0"><ScrollArea className="h-full"><div className="p-4 space-y-6">
                    <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 space-y-3"><p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Add Custom Item</p><LocationAutocomplete placeholder="Search for a place..." value={customExplorationTitle} onChange={setCustomExplorationTitle} onCoordinatesSelect={(lat, lon) => { setCustomExplorationLat(lat); setCustomExplorationLon(lon); }} /><div className="flex flex-wrap gap-1.5">{["Attraction", "Museum", "Park", "Beach", "Monument", "Art", "Food"].map(cat => <button key={cat} onClick={() => setCustomExplorationCategory(cat)} className={cn("px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all border shrink-0", customExplorationCategory === cat ? "bg-zinc-900 border-zinc-900 text-white" : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300")}>{cat === "Food" ? <Utensils className="w-2.5 h-2.5 inline mr-1" /> : getCategoryIcon(cat)} {cat}</button>)}</div><Button className="w-full h-9 text-xs font-bold" onClick={handleAddCustomExploration}>Create Exploration</Button></div>
                    <div className="space-y-3"><div className="flex items-center gap-2"><p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">My Custom Spots</p><div className="flex-1 h-px bg-zinc-100" /><Badge variant="outline" className="text-[9px]">{trip.customExplorations.length}</Badge></div>{trip.customExplorations.length === 0 ? <div className="py-12 flex flex-col items-center justify-center text-center"><div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center mb-3 text-zinc-200"><Sparkles className="w-6 h-6" /></div><p className="text-xs font-bold text-zinc-400">No custom items yet</p></div> : <div className="space-y-2">{trip.customExplorations.map((item, idx) => (
                      <div key={item.id} draggable onDragStart={e => { e.dataTransfer.setData("application/json", JSON.stringify({ ...item, name: item.title, categoryLabel: item.category })); e.dataTransfer.effectAllowed = "copy"; }} onClick={() => handleExploreFocus(item)} className="group flex gap-3 rounded-2xl border border-zinc-200 bg-white p-2.5 cursor-grab active:cursor-grabbing hover:border-zinc-300 transition-all">
                        <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-lg shrink-0 relative">
                          {item.category === "Food" ? <Utensils className="w-5 h-5 text-zinc-900" /> : getCategoryIcon(item.category || "Attraction")}
                          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-zinc-900 text-white rounded-full flex items-center justify-center text-[8px] font-bold shadow-sm">{idx + 1}</div>
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center"><p className="text-[10px] font-bold text-zinc-400 uppercase">{item.category}</p><p className="text-xs font-bold text-zinc-900 leading-tight truncate">{item.title}</p></div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={e => handleExploreAdd(item, e)} className="p-1.5 hover:bg-zinc-50 rounded-lg text-zinc-400 hover:text-zinc-900"><Plus className="w-3.5 h-3.5" /></button><button onClick={() => deleteCustomExploration(item.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-zinc-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button></div>
                      </div>
                    ))}</div>}</div>
                  </div></ScrollArea></TabsContent>
                </div>
              </Tabs>
            </TabsContent>

            <TabsContent value="itinerary" className="flex-1 min-h-0 overflow-hidden m-0 bg-zinc-50/30">
              <ScrollArea className="h-full"><div className="p-4 space-y-4">
                <Accordion multiple className="space-y-3">{tripDays.map((day, idx) => {
                  const acts = trip.activities.filter(a => a.date === day.toISOString() || a.date === format(day, "yyyy-MM-dd")).sort((a,b) => (a.time || "").localeCompare(b.time || ""));
                  return (
                    <AccordionItem key={day.toISOString()} value={day.toISOString()} className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-sm">
                      <div className="flex items-center pr-2"><div className="flex-1 flex items-center gap-2 py-3 pl-3"><div className="w-6 h-6 rounded-lg bg-zinc-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0">{idx + 1}</div><div className="text-left"><p className="text-[11px] font-bold text-zinc-900 leading-none">{format(day, "EEE")}</p><p className="text-[9px] text-zinc-400 mt-1 font-bold uppercase tracking-wider">{format(day, "MMM d")}</p></div></div><button onClick={() => openDialog(day)} className="p-1.5 text-zinc-400 hover:text-zinc-900"><Plus className="w-3.5 h-3.5" /></button><AccordionTrigger className="p-1.5" /></div>
                      <AccordionContent className="border-t border-zinc-50 p-3 space-y-2">{acts.length === 0 ? <p className="text-[10px] text-zinc-400 text-center py-2">Empty</p> : acts.map(act => (
                        <div key={act.id} onClick={() => openEditDialog(act)} className={cn("group/item relative rounded-xl border p-2.5 cursor-pointer transition-all", selectedId === act.id ? "bg-zinc-900 text-white border-zinc-900 shadow-lg" : "bg-white hover:border-zinc-300")}>
                          <div className="flex justify-between items-start"><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1 opacity-60"><Clock className="w-2.5 h-2.5" /><span className="text-[9px] font-bold">{act.time}</span></div><p className="text-[11px] font-bold line-clamp-1">{act.title}</p></div><button onClick={e => { e.stopPropagation(); setIdToDelete(act.id); }} className={cn("p-1.5 rounded-lg transition-all", selectedId === act.id ? "text-white/20 hover:text-red-400 hover:bg-white/10" : "text-zinc-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover/item:opacity-100")}><Trash2 className="w-3 h-3" /></button></div>
                        </div>
                      ))}</AccordionContent>
                    </AccordionItem>
                  );
                })}</Accordion>
              </div></ScrollArea>
            </TabsContent>
          </Tabs>
        </ResizablePanel>

        <ResizableHandle withHandle className="w-1 bg-zinc-100 hover:bg-zinc-200 transition-colors" />

        <ResizablePanel defaultSize={45} minSize={35} className="flex flex-col bg-white border-r border-zinc-100">
          <div className="flex items-center justify-between px-6 h-14 border-b border-zinc-100 shrink-0">
            <div className="flex items-center gap-2.5"><div className="bg-zinc-100 p-1.5 rounded-lg"><CalendarIcon className="w-4 h-4 text-zinc-900" /></div><h2 className="text-sm font-bold text-zinc-900 uppercase tracking-tighter">Plan Overview</h2></div>
            <div className="flex bg-zinc-100 p-0.5 rounded-lg">{(["month", "week", "day"] as const).map(m => <button key={m} onClick={() => setCalendarMode(m)} className={cn("px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md", calendarMode === m ? "bg-white shadow-sm text-zinc-900" : "text-zinc-400")}>{m}</button>)}</div>
          </div>
          <ScrollArea className="flex-1"><div className="p-6">
            {calendarMode === "day" ? (
              <div className="space-y-16">{tripDays.map(day => {
                const acts = trip.activities.filter(a => a.date === day.toISOString() || a.date === format(day, "yyyy-MM-dd"));
                return (
                  <div key={day.toISOString()} className="flex flex-col"><div className="flex items-center gap-3 mb-6"><h3 className="text-lg font-bold text-zinc-900 tracking-tighter">{format(day, "EEEE, MMMM d")}</h3><div className="flex-1 h-px bg-zinc-100" /></div><div className="relative border border-zinc-100 rounded-[32px] bg-white overflow-hidden shadow-sm h-[800px]"><div className="flex h-full overflow-y-auto scrollbar-hide"><div className="w-14 border-r border-zinc-50 shrink-0 bg-zinc-50/50 flex flex-col py-4">{Array.from({ length: 24 }).map((_, i) => <div key={i} className="h-[60px] relative shrink-0"><span className="absolute -top-2 right-2 text-[9px] font-bold text-zinc-400">{i === 0 ? "12 AM" : i < 12 ? `${i} AM` : i === 12 ? "12 PM" : `${i - 12} PM`}</span></div>)}</div><div className="flex-1 relative h-[1440px]"><div className="absolute inset-0 w-full">{Array.from({ length: 24 }).map((_, i) => <div key={i} onClick={() => openDialog(day, `${i.toString().padStart(2, '0')}:00`)} onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("bg-zinc-100"); }} onDragLeave={e => e.currentTarget.classList.remove("bg-zinc-100")} onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove("bg-zinc-100"); try { const place = JSON.parse(e.dataTransfer.getData("application/json")); const newAct = { id: crypto.randomUUID(), date: format(day, "yyyy-MM-dd"), time: `${i.toString().padStart(2, '0')}:00`, duration: place.duration || 60, title: place.name || place.title, notes: place.notes || "", location: place.name || place.location, lat: place.lat, lon: place.lon, attachments: place.attachments || [], is_exploration: false }; setTrip({ ...trip, activities: [...trip.activities, newAct].sort((a,b) => (a.time || "").localeCompare(b.time || "")) }); } catch (err) { console.error(err); } }} className="h-[60px] border-b border-zinc-50/50 w-full hover:bg-zinc-50/80 cursor-cell transition-colors group relative"><div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100"><Plus className="w-4 h-4 text-zinc-300" /></div></div>)}</div><div className="relative w-full h-full pointer-events-none">{acts.map(act => {
                    const [h, m] = act.time.split(":").map(Number);
                    const top = (h * 60 + m), height = act.duration || 60;
                    return (
                      <div key={act.id} onMouseDown={e => handleMouseDown(e, act, 'move')} onClick={e => { e.stopPropagation(); if (!dragState) openEditDialog(act); }} style={{ top: `${top}px`, height: `${height}px` }} className={cn("absolute left-2 right-2 rounded-2xl border p-3 z-10 cursor-move pointer-events-auto group/act shadow-sm transition-all", selectedId === act.id ? "bg-zinc-900 border-zinc-900 text-white shadow-xl z-20" : "bg-white border-zinc-100", dragState?.id === act.id ? "opacity-80 scale-[1.02] shadow-2xl z-50 ring-2 ring-zinc-900 ring-offset-2 no-transition" : "transition-all")}>
                        <div onMouseDown={e => handleMouseDown(e, act, 'resize-top')} className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-white/20 z-30 rounded-t-2xl" /><div onMouseDown={e => handleMouseDown(e, act, 'resize-bottom')} className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-white/20 z-30 rounded-b-2xl" />
                        <div className="flex justify-between items-start h-full">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <GripVertical className="w-3 h-3 opacity-20 group-hover/act:opacity-100" />
                              <span className="text-[9px] font-bold text-zinc-400 group-hover/act:text-zinc-500 transition-colors">{act.time}</span>
                              <div className="flex-1" />
                              {act.attachments && act.attachments.length > 0 && <span className="flex items-center gap-1 text-[8px] font-bold text-zinc-400"><Paperclip className="w-2 h-2" />{act.attachments.length}</span>}
                              {act.category && <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-500 ml-2">{getCategoryIcon(act.category)} {act.category}</span>}
                            </div>
                            <p className="text-[11px] font-bold leading-tight line-clamp-2 text-zinc-900 group-hover/act:text-black transition-colors">{act.title}</p>
                          </div>
                          {!dragState && (
                            <button 
                              onClick={e => { e.stopPropagation(); setIdToDelete(act.id); }} 
                              className="p-1.5 opacity-0 group-hover/act:opacity-100 hover:bg-red-50 rounded-lg text-zinc-300 hover:text-red-500 transition-all shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}</div></div></div></div></div>
                );
              })}</div>
            ) : calendarMode === "week" ? (
              <div className="grid grid-cols-7 gap-px bg-zinc-200 rounded-[32px] overflow-hidden border border-zinc-200">{Array.from({ length: 7 }).map((_, i) => {
                const day = tripDays[i], acts = day ? trip.activities.filter(a => a.date === day.toISOString() || a.date === format(day, "yyyy-MM-dd")) : [];
                return (
                  <div key={i} className="bg-white min-h-[500px] flex flex-col"><div className="p-4 border-b border-zinc-100 bg-zinc-50/50"><span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">{day ? format(day, "EEE") : "—"}</span><span className={cn("text-base font-bold", day ? "text-zinc-900" : "text-zinc-300")}>{day ? format(day, "d") : i+1}</span></div><div className="flex-1 p-2 space-y-2">{acts.map(act => (
                  <div key={act.id} onClick={() => openEditDialog(act)} className={cn("group/week relative p-2 rounded-xl border text-[10px] font-bold cursor-pointer transition-all", selectedId === act.id ? "bg-zinc-900 text-white border-zinc-900 shadow-md" : "bg-white hover:border-zinc-300")}><div className="flex justify-between items-start"><div className="flex-1 min-w-0"><div className="flex items-center justify-between mb-1"><span className="opacity-60">{act.time}</span><div className="flex items-center gap-1">{act.attachments && act.attachments.length > 0 && <Paperclip className="w-2 h-2 text-zinc-300" />}{act.category && <span className="text-[7px] bg-zinc-50 px-1 rounded">{getCategoryIcon(act.category)}</span>}</div></div><p className="line-clamp-2">{act.title}</p></div><button onClick={e => { e.stopPropagation(); setIdToDelete(act.id); }} className={cn("p-1 rounded-md transition-all", selectedId === act.id ? "text-white/20 hover:text-red-400 hover:bg-white/10" : "text-zinc-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover/week:opacity-100")}><Trash2 className="w-2.5 h-2.5" /></button></div></div>
                  ))}</div></div>
                );
              })}</div>
            ) : <div className="grid grid-cols-7 gap-px bg-zinc-200 rounded-[40px] overflow-hidden border border-zinc-200">{Array.from({ length: 35 }).map((_, i) => { const d = i-2; return <div key={i} className="bg-white aspect-square p-3 hover:bg-zinc-50 transition-colors"><span className={cn("text-[10px] font-bold", d>0 && d<=31 ? "text-zinc-900" : "opacity-0")}>{d>0 && d<=31 ? d : ""}</span></div>; })}</div>}
          </div></ScrollArea>
        </ResizablePanel>

        <ResizableHandle withHandle className="w-1 bg-zinc-100 hover:bg-zinc-200 transition-colors" />

        <ResizablePanel defaultSize={30} minSize={25} className="relative bg-zinc-100">
          <TripMap 
            destLat={trip.destLat} 
            destLon={trip.destLon} 
            destination={trip.destination} 
            activities={trip.activities}
            suggestions={
              activeTab !== "explore" ? [] :
              exploreSubTab === "suggestions" ? suggestions :
              trip.customExplorations.map(e => ({ 
                id: e.id, 
                name: e.title, 
                lat: e.lat!, 
                lon: e.lon!, 
                categoryLabel: e.category!, 
                thumbnail: "" 
              } as any))
            } 
            hoveredId={hoveredSuggestionId} 
            onHoverSuggestion={setHoveredSuggestionId} 
            onSelectSuggestion={place => handleExploreAdd(place, { stopPropagation: () => {} } as any)} 
            onSelectActivity={openEditDialog}
            selectedActivity={selectedActivity} 
            activeTab={activeTab} 
            focusedPlace={focusedPlace} 
            onMapClick={handleMapClick}
            draftLocation={exploreSubTab === "custom" && customExplorationLat && customExplorationLon ? { lat: customExplorationLat, lon: customExplorationLon } : null}
          />
          {selectedActivity?.location && <div className="absolute top-5 right-5 w-72 z-[1000]"><Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm"><CardHeader className="pb-2 pt-4 px-4"><Badge variant="secondary" className="w-fit text-[10px] mb-2">{format(new Date(selectedActivity.date), "MMM d")}</Badge><CardTitle className="text-base">{selectedActivity.title}</CardTitle></CardHeader><CardContent className="px-4 pb-4 space-y-2 text-xs text-zinc-500"><div className="flex gap-1.5"><MapPin className="w-3.5 h-3.5" /><span>{selectedActivity.location}</span></div>{selectedActivity.notes && <p className="bg-zinc-50 p-2.5 rounded-lg">{selectedActivity.notes}</p>}</CardContent></Card></div>}
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Activity Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Activity" : "Add Activity"}</DialogTitle>
            <DialogDescription>
              Refine your schedule and travel documents here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Media Section */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Media & Attachments</Label>
                <input type="file" id="act-file-up" className="hidden" onChange={handleActivityFileUpload} multiple />
                <Label htmlFor="act-file-up" className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-900 font-medium">
                  Attach files
                </Label>
              </div>
              <ScrollArea className="h-[120px] rounded-md border p-2 bg-zinc-50/50">
                {aAttachments.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-zinc-400 text-xs italic">
                    No files attached
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {aAttachments.map(f => (
                      <div key={f.id} className="group relative w-16 h-16 rounded-md border bg-white overflow-hidden shrink-0 shadow-sm">
                        {f.type === 'image' ? (
                          <img src={f.url} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-1">
                            <FileText className="w-4 h-4 text-zinc-400 mb-0.5" />
                            <span className="text-[7px] font-bold text-zinc-400 text-center line-clamp-2 px-0.5 leading-none">{f.name}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                          <button onClick={() => window.open(f.url, '_blank')} className="p-1.5 bg-white rounded-lg text-zinc-900 hover:scale-110 transition-transform">
                            <ExternalLink className="w-3 h-3" />
                          </button>
                          <button onClick={() => setAAttachments(aAttachments.filter(x => x.id !== f.id))} className="p-1.5 bg-white rounded-lg text-red-500 hover:scale-110 transition-transform">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Form Fields */}
            <div className="grid gap-2">
              <Label htmlFor="act-title">Title</Label>
              <Input id="act-title" value={aTitle} onChange={e => setATitle(e.target.value)} placeholder="e.g. Dinner" />
            </div>

            <div className="grid gap-2">
              <Label>Location</Label>
              <LocationAutocomplete value={aLocation} onChange={setALocation} onCoordinatesSelect={(lat, lon) => { setALat(lat); setALon(lon); }} />
            </div>

            <div className="grid gap-2">
              <Label>Category</Label>
              <div className="flex flex-wrap gap-1.5">
                {["Attraction", "Museum", "Park", "Beach", "Monument", "Art", "Food", "Hotel"].map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setACategory(cat)} 
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                      aCategory === cat 
                        ? "bg-zinc-900 border-zinc-900 text-white" 
                        : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:bg-white"
                    )}
                  >
                    {getCategoryIcon(cat)} {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Time</Label>
                <Input type="time" value={aTime} onChange={e => setATime(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>End Time</Label>
                <Input type="time" value={getEndTime(aTime, aDuration)} onChange={e => setADuration(calculateDuration(aTime, e.target.value))} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Notes & Instructions</Label>
              <Textarea value={aNotes || ""} onChange={e => setANotes(e.target.value)} placeholder="Reservation details..." className="min-h-[80px]" />
            </div>

            {tripDays.length > 1 && (
              <div className="space-y-3 pt-2 border-t border-zinc-100">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Duplicate to other days</Label>
                  <button 
                    onClick={() => {
                      if (selectedCopyDays.length === tripDays.length - 1) setSelectedCopyDays([]);
                      else setSelectedCopyDays(tripDays.map(d => d.toISOString()).filter(iso => iso !== dialogDay?.toISOString()));
                    }}
                    className="text-[10px] font-bold text-zinc-400 hover:text-zinc-900 transition-colors"
                  >
                    {selectedCopyDays.length === tripDays.length - 1 ? "Deselect All" : "Select All"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tripDays.map((day, idx) => {
                    const iso = day.toISOString();
                    const isCurrent = iso === dialogDay?.toISOString();
                    const isSelected = selectedCopyDays.includes(iso);
                    if (isCurrent) return null;
                    return (
                      <button
                        key={iso}
                        onClick={() => setSelectedCopyDays(prev => isSelected ? prev.filter(d => d !== iso) : [...prev, iso])}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border shrink-0",
                          isSelected 
                            ? "bg-zinc-900 border-zinc-900 text-white" 
                            : "bg-zinc-50 border-zinc-200 text-zinc-400 hover:border-zinc-300"
                        )}
                      >
                        Day {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddActivity}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!idToDelete} onOpenChange={open => !open && setIdToDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Activity?</DialogTitle>
            <DialogDescription>
              This will permanently remove the item from your itinerary. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIdToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => idToDelete && deleteActivity(idToDelete)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {galleryPlace && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-8">
          <div className="absolute inset-0 bg-black/90" onClick={() => setGalleryPlace(null)} />
          <div className="relative w-full max-w-5xl bg-zinc-950 rounded-[32px] overflow-hidden flex h-[70vh]">
            <div className="flex-1 bg-black flex items-center justify-center">{isGalleryLoading ? <Loader2 className="animate-spin text-white" /> : galleryImages[0] && <img src={galleryImages[0]} className="w-full h-full object-contain" />}</div>
            <div className="w-80 bg-zinc-900 p-8 flex flex-col justify-between">
              <div><h3 className="text-2xl font-bold text-white mb-4">{galleryPlace.name}</h3><p className="text-white/40 text-sm">{galleryPlace.categoryLabel}</p></div>
              <Button className="w-full bg-white text-black" onClick={e => { handleExploreAdd(galleryPlace, e as any); setGalleryPlace(null); }}>Add to Trip</Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-zinc-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-zinc-400" />
            <p className="text-sm font-bold tracking-tight">{toastMessage}</p>
            <button onClick={() => setToastMessage(null)} className="p-1 hover:bg-zinc-800 rounded-full transition-colors ml-4">
              <X className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
