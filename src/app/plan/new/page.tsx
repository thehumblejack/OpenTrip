"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plane, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { createClient } from "@/utils/supabase/client";

export default function NewTripPage() {
  const router = useRouter();
  const [destination, setDestination] = useState("");
  const [destLat, setDestLat] = useState<string>();
  const [destLon, setDestLon] = useState<string>();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then((res: any) => {
      if (!res.data?.user) {
        router.push("/login");
      } else {
        setUser(res.data.user);
      }
    });
  }, [supabase, router]);

  const handleCreateTrip = async () => {
    if (!destination || !startDate || !endDate || !user) return;

    const { data: tripData, error } = await supabase.from('trips').insert({
      user_id: user.id,
      destination,
      start_date: format(startDate, "yyyy-MM-dd"),
      end_date: format(endDate, "yyyy-MM-dd"),
      dest_lat: destLat ? parseFloat(destLat) : null,
      dest_lon: destLon ? parseFloat(destLon) : null
    }).select().single();

    if (tripData) {
      router.push(`/plan/${tripData.id}`);
    } else {
      alert("Failed to create trip: " + error?.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 px-8 h-16 flex items-center justify-between shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-zinc-900 w-8 h-8 rounded-lg flex items-center justify-center"><Plane className="w-4 h-4 text-white" /></div>
          <h1 className="text-sm font-bold text-zinc-900 uppercase tracking-tighter">MyTripPlanner</h1>
        </div>
        <Button variant="ghost" onClick={() => router.push("/destinations")} className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900">Cancel</Button>
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
