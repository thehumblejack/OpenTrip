import { format } from "date-fns";
import { Plane, Calendar as CalendarIcon, MapPin, Plus, Trash2, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Trip {
  id?: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  destLat?: string;
  destLon?: string;
}

interface DashboardProps {
  trips: Trip[];
  onSelectTrip: (trip: Trip) => void;
  onCreateNew: () => void;
  onDeleteTrip?: (id: string) => void;
  userEmail?: string;
  onSignOut: () => void;
}

export function Dashboard({ trips, onSelectTrip, onCreateNew, onDeleteTrip, userEmail, onSignOut }: DashboardProps) {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-zinc-200 px-8 h-16 flex items-center justify-between shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-zinc-900 w-8 h-8 rounded-lg flex items-center justify-center">
            <Plane className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-sm font-bold text-zinc-900 uppercase tracking-tighter">MyTripPlanner</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-bold text-zinc-900 leading-none">{userEmail?.split('@')[0]}</p>
            <button onClick={onSignOut} className="text-[9px] font-bold text-zinc-400 hover:text-red-500 uppercase tracking-widest mt-1">Sign Out</button>
          </div>
          <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center overflow-hidden">
            <span className="text-[10px] font-bold text-zinc-500">{userEmail?.[0].toUpperCase()}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-8">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">My Destinations</h2>
            <p className="text-zinc-500 text-sm mt-1">Manage and plan your upcoming adventures</p>
          </div>
          <Button 
            onClick={onCreateNew}
            className="rounded-xl h-11 px-6 bg-zinc-900 hover:bg-zinc-800 text-white shadow-lg hover:shadow-xl transition-all gap-2"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-bold">New Trip</span>
          </Button>
        </div>

        {trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white border border-dashed border-zinc-200 rounded-[32px]">
            <div className="bg-zinc-50 p-4 rounded-full mb-4">
              <MapPin className="w-8 h-8 text-zinc-300" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900">No destinations yet</h3>
            <p className="text-zinc-500 text-sm mb-6">Start by creating your first trip itinerary</p>
            <Button variant="outline" onClick={onCreateNew} className="rounded-xl">Create a Trip</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <Card 
                key={trip.id} 
                className="group border-0 shadow-sm hover:shadow-xl transition-all duration-300 rounded-[24px] overflow-hidden bg-white cursor-pointer"
                onClick={() => onSelectTrip(trip)}
              >
                <div className="h-32 bg-zinc-100 relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                  {/* Random destination image placeholder */}
                  <img 
                    src={`https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=800&q=80&sig=${trip.id}`} 
                    className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                    alt={trip.destination}
                  />
                  <div className="absolute bottom-4 left-6 z-20">
                    <Badge className="bg-white/20 backdrop-blur-md text-white border-0 text-[9px] font-bold uppercase tracking-wider mb-1">
                      Upcoming
                    </Badge>
                    <h3 className="text-white font-bold text-xl tracking-tight">{trip.destination}</h3>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-zinc-500">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-medium uppercase tracking-wider">
                        {format(new Date(trip.startDate), "MMM d")} – {format(new Date(trip.endDate), "MMM d, yyyy")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-medium">Destination coordinates ready</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="px-6 pb-6 pt-0 flex justify-between items-center">
                  <Button variant="ghost" className="h-8 px-0 text-zinc-900 font-bold text-[11px] uppercase tracking-widest gap-2 hover:bg-transparent group-hover:translate-x-1 transition-transform">
                    Open Planner <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                  {onDeleteTrip && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Are you sure you want to delete this trip?")) {
                          onDeleteTrip(trip.id!);
                        }
                      }}
                      className="h-8 w-8 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
