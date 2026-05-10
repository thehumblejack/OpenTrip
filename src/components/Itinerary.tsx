"use client";

import { Plus, Trash2, Clock, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ItineraryProps {
  tripDays: Date[];
  trip: any;
  selectedId: string | null;
  openDialog: (day: Date) => void;
  openEditDialog: (act: any) => void;
  setIdToDelete: (id: string) => void;
}

export function Itinerary({
  tripDays,
  trip,
  selectedId,
  openDialog,
  openEditDialog,
  setIdToDelete
}: ItineraryProps) {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <Accordion type="multiple" className="space-y-3">
          {tripDays.map((day, idx) => {
            const acts = trip.activities
              .filter((a: any) => a.date === day.toISOString() || a.date === format(day, "yyyy-MM-dd"))
              .sort((a: any, b: any) => (a.time || "").localeCompare(b.time || ""));
            
            return (
              <AccordionItem 
                key={day.toISOString()} 
                value={day.toISOString()} 
                className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-sm"
              >
                <div className="flex items-center pr-2">
                  <div className="flex-1 flex items-center gap-2 py-3 pl-3">
                    <div className="w-6 h-6 rounded-lg bg-zinc-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                      {idx + 1}
                    </div>
                    <div className="text-left">
                      <p className="text-[11px] font-bold text-zinc-900 leading-none">{format(day, "EEE")}</p>
                      <p className="text-[9px] text-zinc-400 mt-1 font-bold uppercase tracking-wider">{format(day, "MMM d")}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => openDialog(day)} 
                    className="p-1.5 text-zinc-400 hover:text-zinc-900"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <AccordionTrigger className="p-1.5" />
                </div>
                <AccordionContent className="border-t border-zinc-50 p-3 space-y-2">
                  {acts.length === 0 ? (
                    <p className="text-[10px] text-zinc-400 text-center py-2">Empty</p>
                  ) : (
                    acts.map((act: any) => (
                      <div 
                        key={act.id} 
                        onClick={() => openEditDialog(act)} 
                        className={cn(
                          "group/item relative rounded-xl border p-2.5 cursor-pointer transition-all", 
                          selectedId === act.id ? "bg-zinc-900 text-white border-zinc-900 shadow-lg" : "bg-white hover:border-zinc-300"
                        )}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 opacity-60">
                              <Clock className="w-2.5 h-2.5" />
                              <span className="text-[9px] font-bold">{act.time}</span>
                            </div>
                            <p className="text-[11px] font-bold line-clamp-1">{act.title}</p>
                          </div>
                          <button 
                            onClick={e => { e.stopPropagation(); setIdToDelete(act.id); }} 
                            className={cn(
                              "p-1.5 rounded-lg transition-all", 
                              selectedId === act.id ? "text-white/20 hover:text-red-400 hover:bg-white/10" : "text-zinc-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover/item:opacity-100"
                            )}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </ScrollArea>
  );
}
