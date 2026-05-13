"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { format, addDays, differenceInDays } from "date-fns";
import { Calendar as CalendarIcon, Clock, Plus, FileText, Trash2, Paperclip, Plane, X, GripVertical, Compass, Sparkles, Loader2, Cloud, MapPin, ExternalLink } from "lucide-react";
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
import { ExploreTab } from "@/components/ExploreTab";
import { Itinerary } from "@/components/Itinerary";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const TripMap = dynamic(() => import("@/components/TripMap").then(m => ({ default: m.TripMap })), { ssr: false });

interface TripDocument { id: string; name: string; url: string; }
interface ActivityAttachment { id: string; name: string; url: string; type: 'image' | 'file'; }
interface Activity { id: string; date: string; time: string; duration: number; title: string; notes: string; location: string; lat?: string; lon?: string; category?: string; attachments?: ActivityAttachment[]; }
interface Trip { id?: string; destination: string; startDate: Date; endDate: Date; documents: TripDocument[]; activities: Activity[]; customExplorations: Activity[]; destLat?: string; destLon?: string; }

const parseLocalDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  if (dateStr.includes('T')) return new Date(dateStr);
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export default function PlanPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;
  
  const [trip, setTrip] = useState<Trip | null>(null);
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
  const [exploreSubTab, setExploreSubTab] = useState("custom");
  const [selectedCopyDays, setSelectedCopyDays] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoadingTrip, setIsLoadingTrip] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "error">("synced");
  const syncInProgressRef = useRef(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const supabase = createClient();
  const { suggestions, loading: suggestionsLoading, error: suggestionsError, fetchSuggestions } = usePlaceSuggestions();
  const hasLoadedTripRef = useRef(false);

  const loadTripDetails = useCallback(async (id: string) => {
    setIsLoadingTrip(true);
    const { data: tripData } = await supabase
      .from('trips')
      .select('*, activities(*), explorations(*)')
      .eq('id', id)
      .single();

    if (tripData) {
      const activities = (tripData.activities as any[]) || [];
      const explorations = (tripData.explorations as any[]) || [];

      setTrip({
        ...tripData,
        startDate: parseLocalDate(tripData.start_date),
        endDate: parseLocalDate(tripData.end_date),
        destLat: tripData.dest_lat?.toString(),
        destLon: tripData.dest_lon?.toString(),
        activities: activities.map((a: any) => ({
          ...a,
          date: a.date,
          attachments: [] 
        })).sort((a: any, b: any) => (a.time || "").localeCompare(b.time || "")),
        customExplorations: explorations.map((a: any) => ({
          ...a,
          category: a.category || "Attraction"
        })),
        documents: []
      });
      fetchSuggestions(tripData.destination);
    }
    hasLoadedTripRef.current = true;
    setIsLoadingTrip(false);
  }, [supabase, fetchSuggestions]);

  useEffect(() => {
    supabase.auth.getUser().then((res: any) => {
      if (res.data?.user) {
        setUser(res.data.user);
        if (tripId && tripId !== 'new') {
          loadTripDetails(tripId);
        } else {
          setIsLoadingTrip(false);
        }
      } else {
        router.push("/login");
      }
    });
  }, [supabase, router, tripId, loadTripDetails]);

  const syncTripToSupabase = useCallback(async () => {
    if (!user || !trip) return;
    if (!hasLoadedTripRef.current) return;
    if (syncInProgressRef.current) return;
    syncInProgressRef.current = true;
    setSyncStatus("syncing");
    
    const { data: tripData, error: tripErr } = await supabase.from('trips').upsert({
      ...(trip.id ? { id: trip.id } : {}),
      user_id: user.id,
      destination: trip.destination,
      start_date: format(trip.startDate, "yyyy-MM-dd"),
      end_date: format(trip.endDate, "yyyy-MM-dd"),
      dest_lat: trip.destLat ? parseFloat(trip.destLat) : null,
      dest_lon: trip.destLon ? parseFloat(trip.destLon) : null
    }).select().single();

    if (tripErr || !tripData) {
      setSyncStatus("error");
      syncInProgressRef.current = false;
      return;
    }

    if (!trip.id) {
      setTrip(prev => prev ? ({ ...prev, id: tripData.id }) : null);
      router.replace(`/plan/${tripData.id}`);
    }

    try {
      if (trip.activities.length > 0) {
        const uniqueActs = Array.from(new Map(trip.activities.map(a => [a.id, a])).values());
        await supabase.from('activities').upsert(
          uniqueActs.map(item => ({
            id: item.id && item.id.length === 36 ? item.id : undefined,
            trip_id: tripData.id,
            title: item.title || "Untitled",
            date: item.date,
            time: item.time || null,
            duration: item.duration || null,
            category: item.category,
            location: item.location,
            lat: item.lat ? parseFloat(item.lat) : null,
            lon: item.lon ? parseFloat(item.lon) : null,
            notes: item.notes || null,
            is_exploration: false
          })),
          { onConflict: 'id' }
        );
      }

      if (trip.customExplorations.length > 0) {
        const uniqueExps = Array.from(new Map(trip.customExplorations.map(e => [e.id, e])).values());
        await supabase.from('explorations').upsert(
          uniqueExps.map(item => ({
            id: item.id && item.id.length === 36 ? item.id : undefined,
            trip_id: tripData.id,
            title: item.title || "Untitled",
            location: item.location,
            lat: item.lat ? parseFloat(item.lat) : null,
            lon: item.lon ? parseFloat(item.lon) : null,
            category: item.category,
            notes: item.notes || null
          })),
          { onConflict: 'id' }
        );
      }
      setSyncStatus("synced");
    } catch (err) {
      setSyncStatus("error");
    } finally {
      syncInProgressRef.current = false;
    }
  }, [user, trip, supabase, router]);

  useEffect(() => {
    if (trip && !isLoadingTrip) {
      if (user) syncTripToSupabase();
    }
  }, [trip, user, isLoadingTrip, syncTripToSupabase]);

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
    setDialogDay(day); if (time) setATime(time);
    setEditingId(null); setATitle(""); setALocation(""); setALat(undefined); setALon(undefined); setANotes(""); setADuration(60); setACategory("Attraction"); setAAttachments([]);
    setSelectedCopyDays([]); setIsDialogOpen(true); 
  };

  const openEditDialog = (act: Activity) => {
    setEditingId(act.id); setDialogDay(parseLocalDate(act.date));
    setATime(act.time); setATitle(act.title); setALocation(act.location); setALat(act.lat); setALon(act.lon); setANotes(act.notes); setADuration(act.duration || 60);
    setACategory(act.category || "Attraction"); setAAttachments(act.attachments || []);
    setSelectedCopyDays([]); setIsDialogOpen(true);
  };

  const handleAddActivity = () => {
    if (!trip || !dialogDay || !aTitle || !aTime) return;
    const baseData = { date: format(dialogDay, "yyyy-MM-dd"), time: aTime, duration: aDuration, title: aTitle, notes: aNotes, location: aLocation, lat: aLat, lon: aLon, category: aCategory, attachments: aAttachments };
    
    let newActivities = [...trip.activities];
    if (editingId) {
      newActivities = newActivities.map(a => a.id === editingId ? { ...a, ...baseData } : a);
    } else {
      newActivities.push({ id: crypto.randomUUID(), ...baseData });
    }

    selectedCopyDays.forEach(dayIso => {
      if (dayIso === format(dialogDay, "yyyy-MM-dd")) return;
      newActivities.push({ id: crypto.randomUUID(), ...baseData, date: dayIso });
    });

    setTrip({ ...trip, activities: newActivities.sort((a, b) => (a.time || "").localeCompare(b.time || "")) });
    setIsDialogOpen(false);
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
    const query = `${source} suggestions in ${trip.destination}`;
    setExploreSearch(query); fetchSuggestions(query);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !trip || !user) return;
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('trip-documents').upload(filePath, file);
    if (!uploadError) {
      const { data } = supabase.storage.from('trip-documents').getPublicUrl(filePath);
      setTrip({ ...trip, documents: [...trip.documents, { id: crypto.randomUUID(), name: file.name, url: data.publicUrl }] });
    }
  };

  const selectedActivity = useMemo(() => trip?.activities.find(a => a.id === selectedId) ?? null, [trip, selectedId]);

  if (isLoadingTrip) return <div className="h-screen flex items-center justify-center bg-zinc-50"><Loader2 className="w-8 h-8 animate-spin text-zinc-400" /></div>;
  if (!trip) return <div className="h-screen flex items-center justify-center bg-zinc-50">Trip not found</div>;

  return (
    <div className="h-screen flex flex-col bg-zinc-50 overflow-hidden">
      <header className="bg-white border-b border-zinc-200 px-6 h-14 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/destinations")} className="h-8 w-8 text-zinc-400 hover:text-zinc-900 mr-2">
            <X className="w-4 h-4" />
          </Button>
          <div className="bg-zinc-900 w-7 h-7 rounded-lg flex items-center justify-center"><Plane className="w-3.5 h-3.5 text-white" /></div>
          <div>
            <h1 className="text-sm font-bold text-zinc-900 leading-none">{trip.destination}</h1>
            <p className="text-[10px] text-zinc-400 mt-1 font-medium">{format(trip.startDate, "MMM d")} – {format(trip.endDate, "MMM d, yyyy")} · {tripDays.length} days</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 pr-4 border-r border-zinc-100">
            {syncStatus === "syncing" && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />}
            {syncStatus === "synced" && <Cloud className="w-3.5 h-3.5 text-green-500" />}
            {syncStatus === "error" && <Cloud className="w-3.5 h-3.5 text-red-500" />}
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 hidden sm:inline-block">
              {syncStatus === "syncing" ? "Syncing..." : syncStatus === "synced" ? "Cloud Synced" : "Sync Error"}
            </span>
          </div>
          <BackupManager trip={trip} onRestore={(restoredTrip) => setTrip(restoredTrip)} />
          {user && (
            <div className="flex items-center gap-3 pl-2">
              <DropdownMenu>
                <DropdownMenuTrigger render={
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center overflow-hidden p-0">
                    <span className="text-[10px] font-bold text-zinc-600">{user.email?.[0].toUpperCase()}</span>
                  </Button>
                } />
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.email?.split('@')[0]}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600 font-bold focus:text-red-600 cursor-pointer">
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
              <ExploreTab exploreSubTab={exploreSubTab} setExploreSubTab={setExploreSubTab} exploreSearch={exploreSearch} setExploreSearch={setExploreSearch} fetchSuggestions={fetchSuggestions} suggestionsLoading={suggestionsLoading} selectedSource={selectedSource} handleSourceClick={handleSourceClick} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} suggestionsByCategory={suggestionsByCategory} handleExploreAdd={handleExploreAdd} handleExploreFocus={handleExploreFocus} hoveredSuggestionId={hoveredSuggestionId} setHoveredSuggestionId={setHoveredSuggestionId} fetchPlaceGallery={fetchPlaceGallery} setGalleryPlace={setGalleryPlace} setGalleryImages={setGalleryImages} customExplorationTitle={customExplorationTitle} setCustomExplorationTitle={setCustomExplorationTitle} setCustomExplorationLat={setCustomExplorationLat} setCustomExplorationLon={setCustomExplorationLon} customExplorationCategory={customExplorationCategory} setCustomExplorationCategory={setCustomExplorationCategory} handleAddCustomExploration={handleAddCustomExploration} trip={trip} deleteCustomExploration={deleteCustomExploration} tripDestination={trip?.destination || ""} />
            </TabsContent>

            <TabsContent value="itinerary" className="flex-1 min-h-0 overflow-hidden m-0 bg-zinc-50/30">
              <Itinerary tripDays={tripDays} trip={trip} selectedId={selectedId} openDialog={openDialog} openEditDialog={openEditDialog} setIdToDelete={setIdToDelete} />
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
                const acts = trip.activities.filter(a => a.date === format(day, "yyyy-MM-dd"));
                return (
                  <div key={day.toISOString()} className="flex flex-col"><div className="flex items-center gap-3 mb-6"><h3 className="text-lg font-bold text-zinc-900 tracking-tighter">{format(day, "EEEE, MMMM d")}</h3><div className="flex-1 h-px bg-zinc-100" /></div><div className="relative border border-zinc-100 rounded-[32px] bg-white overflow-hidden shadow-sm h-[800px]"><div className="flex h-full overflow-y-auto scrollbar-hide"><div className="w-14 border-r border-zinc-50 shrink-0 bg-zinc-50/50 flex flex-col py-4">{Array.from({ length: 24 }).map((_, i) => <div key={i} className="h-[60px] relative shrink-0"><span className="absolute -top-2 right-2 text-[9px] font-bold text-zinc-400">{i === 0 ? "12 AM" : i < 12 ? `${i} AM` : i === 12 ? "12 PM" : `${i - 12} PM`}</span></div>)}</div><div className="flex-1 relative h-[1440px]"><div className="absolute inset-0 w-full">{Array.from({ length: 24 }).map((_, i) => <div key={i} onClick={() => openDialog(day, `${i.toString().padStart(2, '0')}:00`)} className="h-[60px] border-b border-zinc-50/50 w-full hover:bg-zinc-50/80 cursor-cell transition-colors group relative"><div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100"><Plus className="w-4 h-4 text-zinc-300" /></div></div>)}</div><div className="relative w-full h-full pointer-events-none">{acts.map(act => {
                    const [h, m] = act.time.split(":").map(Number);
                    const top = (h * 60 + m), height = act.duration || 60;
                    return (
                      <div key={act.id} onMouseDown={e => handleMouseDown(e, act, 'move')} onClick={e => { e.stopPropagation(); if (!dragState) openEditDialog(act); }} style={{ top: `${top}px`, height: `${height}px` }} className={cn("absolute left-2 right-2 rounded-2xl border p-3 z-10 cursor-move pointer-events-auto group/act shadow-sm transition-all", selectedId === act.id ? "bg-zinc-900 border-zinc-900 text-white shadow-xl z-20" : "bg-white border-zinc-100", dragState?.id === act.id ? "opacity-80 scale-[1.02] shadow-2xl z-50 ring-2 ring-zinc-900 ring-offset-2 no-transition" : "transition-all")}>
                        <div onMouseDown={e => handleMouseDown(e, act, 'resize-top')} className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-white/20 z-30 rounded-t-2xl" /><div onMouseDown={e => handleMouseDown(e, act, 'resize-bottom')} className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-white/20 z-30 rounded-b-2xl" />
                        <div className="flex justify-between items-start h-full"><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><GripVertical className="w-3 h-3 opacity-20 group-hover/act:opacity-100" /><span className="text-[9px] font-bold text-zinc-400 group-hover/act:text-zinc-500 transition-colors">{act.time}</span><div className="flex-1" />{act.attachments && act.attachments.length > 0 && <span className="flex items-center gap-1 text-[8px] font-bold text-zinc-400"><Paperclip className="w-2 h-2" />{act.attachments.length}</span>}{act.category && <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-500 ml-2">{getCategoryIcon(act.category)} {act.category}</span>}</div><p className="text-[11px] font-bold leading-tight line-clamp-2 text-zinc-900 group-hover/act:text-black transition-colors">{act.title}</p></div>{!dragState && <button onClick={e => { e.stopPropagation(); setIdToDelete(act.id); }} className="p-1.5 opacity-0 group-hover/act:opacity-100 hover:bg-red-50 rounded-lg text-zinc-300 hover:text-red-500 transition-all shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>}</div>
                      </div>
                    );
                  })}</div></div></div></div></div>
                );
              })}</div>
            ) : calendarMode === "week" ? (
              <div className="grid grid-cols-7 gap-px bg-zinc-200 rounded-[32px] overflow-hidden border border-zinc-200">{Array.from({ length: 7 }).map((_, i) => {
                const day = tripDays[i], acts = day ? trip.activities.filter(a => a.date === format(day, "yyyy-MM-dd")) : [];
                return <div key={i} className="bg-white min-h-[500px] flex flex-col"><div className="p-4 border-b border-zinc-100 bg-zinc-50/50"><span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">{day ? format(day, "EEE") : "—"}</span><span className={cn("text-base font-bold", day ? "text-zinc-900" : "text-zinc-300")}>{day ? format(day, "d") : i+1}</span></div><div className="flex-1 p-2 space-y-2">{acts.map(act => <div key={act.id} onClick={() => openEditDialog(act)} className={cn("group/week relative p-2 rounded-xl border text-[10px] font-bold cursor-pointer transition-all", selectedId === act.id ? "bg-zinc-900 text-white border-zinc-900 shadow-md" : "bg-white hover:border-zinc-300")}><div className="flex justify-between items-start"><div className="flex-1 min-w-0"><div className="flex items-center justify-between mb-1"><span className="opacity-60">{act.time}</span><div className="flex items-center gap-1">{act.attachments && act.attachments.length > 0 && <Paperclip className="w-2 h-2 text-zinc-300" />}{act.category && <span className="text-[7px] bg-zinc-50 px-1 rounded">{getCategoryIcon(act.category)}</span>}</div></div><p className="line-clamp-2">{act.title}</p></div><button onClick={e => { e.stopPropagation(); setIdToDelete(act.id); }} className={cn("p-1 rounded-md transition-all", selectedId === act.id ? "text-white/20 hover:text-red-400 hover:bg-white/10" : "text-zinc-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover/week:opacity-100")}><Trash2 className="w-2.5 h-2.5" /></button></div></div>)}</div></div>;
              })}</div>
            ) : <div className="grid grid-cols-7 gap-px bg-zinc-200 rounded-[40px] overflow-hidden border border-zinc-200">{Array.from({ length: 35 }).map((_, i) => { const d = i-2; return <div key={i} className="bg-white aspect-square p-3 hover:bg-zinc-50 transition-colors"><span className={cn("text-[10px] font-bold", d>0 && d<=31 ? "text-zinc-900" : "opacity-0")}>{d>0 && d<=31 ? d : ""}</span></div>; })}</div>}
          </div></ScrollArea>
        </ResizablePanel>

        <ResizableHandle withHandle className="w-1 bg-zinc-100 hover:bg-zinc-200 transition-colors" />

        <ResizablePanel defaultSize={30} minSize={25} className="relative bg-zinc-100">
          <TripMap destLat={trip.destLat} destLon={trip.destLon} destination={trip.destination} activities={trip.activities} suggestions={[...(activeTab === "explore" && exploreSubTab === "suggestions" ? suggestions : []), ...trip.customExplorations.map(e => ({ id: e.id, name: e.title, lat: e.lat!, lon: e.lon!, category: e.category || "Attraction", categoryLabel: e.category || "Attraction" } as any))]} hoveredId={hoveredSuggestionId} onHoverSuggestion={setHoveredSuggestionId} onSelectSuggestion={place => handleExploreAdd(place, { stopPropagation: () => {} } as any)} onSelectActivity={openEditDialog} selectedActivity={selectedActivity} activeTab={activeTab} focusedPlace={focusedPlace} onMapClick={handleMapClick} draftLocation={exploreSubTab === "custom" && customExplorationLat && customExplorationLon ? { lat: customExplorationLat, lon: customExplorationLon } : null} />
          {selectedActivity?.location && <div className="absolute top-5 right-5 w-72 z-[1000]"><Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm"><CardHeader className="pb-2 pt-4 px-4"><Badge variant="secondary" className="w-fit text-[10px] mb-2">{format(parseLocalDate(selectedActivity.date), "MMM d")}</Badge><CardTitle className="text-base">{selectedActivity.title}</CardTitle></CardHeader><CardContent className="px-4 pb-4 space-y-2 text-xs text-zinc-500"><div className="flex gap-1.5"><MapPin className="w-3.5 h-3.5" /><span>{selectedActivity.location}</span></div>{selectedActivity.notes && <p className="bg-zinc-50 p-2.5 rounded-lg">{selectedActivity.notes}</p>}</CardContent></Card></div>}
        </ResizablePanel>
      </ResizablePanelGroup>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editingId ? "Edit Activity" : "Add Activity"}</DialogTitle><DialogDescription>Refine your schedule and travel documents here. Click save when you're done.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4"><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>What are you doing?</Label><Input value={aTitle} onChange={e => setATitle(e.target.value)} placeholder="E.g., Dinner at Sky Lounge" /></div><div className="space-y-2"><Label>Category</Label><div className="flex gap-2">{['Attraction', 'Food', 'Transport', 'Hotel'].map(cat => <Button key={cat} variant={aCategory === cat ? "default" : "outline"} size="sm" onClick={() => setACategory(cat)} className="text-[10px] h-7">{getCategoryIcon(cat)} {cat}</Button>)}</div></div></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Where?</Label><LocationAutocomplete value={aLocation} onChange={setALocation} onCoordinatesSelect={(lat, lon) => { setALat(lat); setALon(lon); }} placeholder="Search location..." /></div><div className="grid grid-cols-2 gap-2"><div className="space-y-2"><Label>Time</Label><Input type="time" value={aTime} onChange={e => setATime(e.target.value)} /></div><div className="space-y-2"><Label>Duration (min)</Label><Input type="number" value={aDuration} onChange={e => setADuration(Number(e.target.value))} /></div></div></div><div className="space-y-2"><Label>Notes</Label><Textarea value={aNotes} onChange={e => setANotes(e.target.value)} placeholder="Optional details..." /></div></div>
          <DialogFooter><Button onClick={handleAddActivity}>{editingId ? "Update Activity" : "Save Activity"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
