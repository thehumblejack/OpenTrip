"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Dashboard } from "@/components/Dashboard";

interface Trip {
  id?: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  destLat?: string;
  destLon?: string;
}

const parseLocalDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  if (dateStr.includes('T')) return new Date(dateStr);
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export default function DestinationsPage() {
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();
  const router = useRouter();

  const loadAllTrips = useCallback(async (userId: string) => {
    const { data: trips } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (trips) {
      setAllTrips(trips.map((t: any) => ({
        ...t,
        startDate: parseLocalDate(t.start_date),
        endDate: parseLocalDate(t.end_date)
      })));
    }
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getUser().then((res: any) => {
      if (res.data?.user) {
        setUser(res.data.user);
        loadAllTrips(res.data.user.id);
      } else {
        router.push("/login");
      }
    });
  }, [supabase, router, loadAllTrips]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const deleteTripFromSupabase = async (tripId: string) => {
    const { error } = await supabase.from('trips').delete().eq('id', tripId);
    if (!error) {
      setAllTrips(prev => prev.filter(t => t.id !== tripId));
    } else {
      alert("Failed to delete trip: " + error.message);
    }
  };

  return (
    <Dashboard 
      trips={allTrips}
      onSelectTrip={(t) => router.push(`/plan/${t.id}`)}
      onCreateNew={() => router.push("/plan/new")}
      onDeleteTrip={deleteTripFromSupabase}
      userEmail={user?.email}
      onSignOut={handleSignOut}
    />
  );
}
