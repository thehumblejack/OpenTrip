"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, Sun, Thermometer, Droplets, Wind, ChevronRight, ChevronLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface WeatherBarProps {
  lat?: string;
  lon?: string;
}

const WMO_CODES: Record<number, { label: string; icon: React.ReactNode }> = {
  0: { label: "Clear sky", icon: <Sun className="w-5 h-5 text-amber-500" /> },
  1: { label: "Mainly clear", icon: <Sun className="w-5 h-5 text-amber-400" /> },
  2: { label: "Partly cloudy", icon: <Cloud className="w-5 h-5 text-zinc-400" /> },
  3: { label: "Overcast", icon: <Cloud className="w-5 h-5 text-zinc-500" /> },
  45: { label: "Fog", icon: <CloudFog className="w-5 h-5 text-zinc-400" /> },
  48: { label: "Rime fog", icon: <CloudFog className="w-5 h-5 text-zinc-400" /> },
  51: { label: "Light drizzle", icon: <CloudDrizzle className="w-5 h-5 text-blue-400" /> },
  53: { label: "Moderate drizzle", icon: <CloudDrizzle className="w-5 h-5 text-blue-500" /> },
  55: { label: "Dense drizzle", icon: <CloudDrizzle className="w-5 h-5 text-blue-600" /> },
  56: { label: "Freezing drizzle", icon: <CloudDrizzle className="w-5 h-5 text-blue-300" /> },
  57: { label: "Dense freezing drizzle", icon: <CloudDrizzle className="w-5 h-5 text-blue-400" /> },
  61: { label: "Slight rain", icon: <CloudRain className="w-5 h-5 text-blue-500" /> },
  63: { label: "Moderate rain", icon: <CloudRain className="w-5 h-5 text-blue-600" /> },
  65: { label: "Heavy rain", icon: <CloudRain className="w-5 h-5 text-blue-700" /> },
  66: { label: "Freezing rain", icon: <CloudRain className="w-5 h-5 text-blue-300" /> },
  67: { label: "Heavy freezing rain", icon: <CloudRain className="w-5 h-5 text-blue-400" /> },
  71: { label: "Slight snow", icon: <CloudSnow className="w-5 h-5 text-sky-200" /> },
  73: { label: "Moderate snow", icon: <CloudSnow className="w-5 h-5 text-sky-300" /> },
  75: { label: "Heavy snow", icon: <CloudSnow className="w-5 h-5 text-sky-400" /> },
  77: { label: "Snow grains", icon: <CloudSnow className="w-5 h-5 text-sky-200" /> },
  80: { label: "Slight rain showers", icon: <CloudRain className="w-5 h-5 text-blue-400" /> },
  81: { label: "Moderate rain showers", icon: <CloudRain className="w-5 h-5 text-blue-500" /> },
  82: { label: "Violent rain showers", icon: <CloudRain className="w-5 h-5 text-blue-600" /> },
  85: { label: "Slight snow showers", icon: <CloudSnow className="w-5 h-5 text-sky-300" /> },
  86: { label: "Heavy snow showers", icon: <CloudSnow className="w-5 h-5 text-sky-400" /> },
  95: { label: "Thunderstorm", icon: <CloudLightning className="w-5 h-5 text-amber-600" /> },
  96: { label: "Thunderstorm + hail", icon: <CloudLightning className="w-5 h-5 text-amber-700" /> },
  99: { label: "Heavy thunderstorm", icon: <CloudLightning className="w-5 h-5 text-amber-800" /> },
};

function getWeather(code: number) {
  return WMO_CODES[code] || WMO_CODES[0];
}

export function WeatherBar({ lat, lon }: WeatherBarProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!lat || !lon) return;
    let isMounted = true;
    const fetchWeather = async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max&hourly=temperature_2m,precipitation_probability,weathercode,windspeed_10m&timezone=auto&forecast_days=16`);
        const json = await res.json();
        if (isMounted) setData(json);
      } catch (e) {
        console.error("Failed to fetch weather", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchWeather();
    return () => { isMounted = false; };
  }, [lat, lon]);

  if (!lat || !lon) return null;

  return (
    <div className="bg-white border-b border-zinc-200 shrink-0 h-[72px] flex items-center shadow-sm relative z-0">
      {loading ? (
        <div className="w-full flex items-center justify-center text-xs text-zinc-400 font-bold uppercase tracking-widest gap-2">
          <Cloud className="w-4 h-4 animate-pulse" /> Loading 7-day forecast...
        </div>
      ) : data?.daily ? (
        <>
          <ScrollArea className="w-full whitespace-nowrap" orientation="horizontal">
            <div className="flex px-4 py-2 w-max gap-2">
              {data.daily.time.map((dateStr: string, idx: number) => {
                const weather = getWeather(data.daily.weathercode[idx]);
                const maxT = Math.round(data.daily.temperature_2m_max[idx]);
                const minT = Math.round(data.daily.temperature_2m_min[idx]);
                const precip = data.daily.precipitation_probability_max[idx];
                const date = parseISO(dateStr);
                
                return (
                  <div 
                    key={dateStr}
                    onClick={() => setSelectedDayIdx(idx)}
                    className="flex flex-col items-center justify-center px-4 py-1.5 rounded-xl border border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50 cursor-pointer transition-all bg-white min-w-[90px] group"
                  >
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 group-hover:text-zinc-900 transition-colors">
                      {idx === 0 ? "Today" : format(date, "EEE d")}
                    </p>
                    <div className="flex items-center gap-2">
                      {weather.icon}
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-zinc-900 leading-none">{maxT}°</span>
                        <span className="text-[9px] font-bold text-zinc-400 leading-none mt-0.5">{minT}°</span>
                      </div>
                    </div>
                    {precip > 20 && (
                      <div className="flex items-center gap-0.5 mt-1 text-[8px] font-bold text-blue-400">
                        <Droplets className="w-2.5 h-2.5" /> {precip}%
                      </div>
                    )}
                  </div>
                );
              })}
              <a 
                href="https://open-meteo.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center px-4 py-1.5 rounded-xl border border-zinc-100 border-dashed hover:border-zinc-300 hover:bg-zinc-50 cursor-pointer transition-all bg-white min-w-[100px] group text-[10px] font-bold text-zinc-400 text-center"
              >
                Weather data by<br/><span className="text-blue-500 group-hover:text-blue-600 mt-1">Open-Meteo ↗</span>
              </a>
            </div>
          </ScrollArea>
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none" />
        </>
      ) : (
        <div className="w-full flex items-center justify-center text-xs text-zinc-400 font-bold uppercase tracking-widest">
          Weather unavailable
        </div>
      )}

      {/* Detailed Weather Dialog */}
      <Dialog open={selectedDayIdx !== null} onOpenChange={(open) => !open && setSelectedDayIdx(null)}>
        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden rounded-[24px]">
          {selectedDayIdx !== null && data?.daily && (
            <>
              <div className="bg-zinc-900 p-6 text-white relative overflow-hidden">
                <div className="absolute -top-10 -right-10 opacity-10 transform scale-150">
                  {getWeather(data.daily.weathercode[selectedDayIdx]).icon}
                </div>
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold tracking-tight mb-1">
                    {format(parseISO(data.daily.time[selectedDayIdx]), "EEEE, MMMM do")}
                  </h2>
                  <div className="flex items-center gap-3">
                    {getWeather(data.daily.weathercode[selectedDayIdx]).icon}
                    <span className="font-medium text-zinc-300">
                      {getWeather(data.daily.weathercode[selectedDayIdx]).label}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-zinc-50 space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded-2xl border border-zinc-100 flex flex-col items-center justify-center text-center">
                    <Thermometer className="w-4 h-4 text-red-400 mb-1" />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">High</span>
                    <span className="text-sm font-bold text-zinc-900">{Math.round(data.daily.temperature_2m_max[selectedDayIdx])}°C</span>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-zinc-100 flex flex-col items-center justify-center text-center">
                    <Thermometer className="w-4 h-4 text-blue-400 mb-1" />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Low</span>
                    <span className="text-sm font-bold text-zinc-900">{Math.round(data.daily.temperature_2m_min[selectedDayIdx])}°C</span>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-zinc-100 flex flex-col items-center justify-center text-center">
                    <Wind className="w-4 h-4 text-zinc-400 mb-1" />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Wind</span>
                    <span className="text-sm font-bold text-zinc-900">{Math.round(data.daily.windspeed_10m_max[selectedDayIdx])} km/h</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Hourly Forecast</h3>
                  <ScrollArea className="w-full whitespace-nowrap" orientation="horizontal">
                    <div className="flex gap-2 pb-3">
                      {data.hourly.time.map((timeStr: string, hIdx: number) => {
                        // Only show hours for the selected day
                        const dayStartStr = data.daily.time[selectedDayIdx];
                        if (!timeStr.startsWith(dayStartStr)) return null;
                        
                        // Skip some hours to not crowd it (every 3 hours)
                        const hour = parseISO(timeStr).getHours();
                        if (hour % 3 !== 0) return null;

                        const hTemp = Math.round(data.hourly.temperature_2m[hIdx]);
                        const hPrecip = data.hourly.precipitation_probability[hIdx];
                        const hIcon = getWeather(data.hourly.weathercode[hIdx]).icon;

                        return (
                          <div key={timeStr} className="bg-white border border-zinc-100 rounded-xl p-3 flex flex-col items-center min-w-[70px]">
                            <span className="text-[10px] font-bold text-zinc-500 mb-2">{format(parseISO(timeStr), "ha")}</span>
                            {hIcon}
                            <span className="text-xs font-bold text-zinc-900 mt-2">{hTemp}°</span>
                            {hPrecip > 10 && (
                              <span className="text-[9px] font-bold text-blue-400 mt-1 flex items-center gap-0.5">
                                <Droplets className="w-2.5 h-2.5" /> {hPrecip}%
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
                
                <div className="flex justify-end pt-2 border-t border-zinc-100">
                  <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-zinc-400 hover:text-blue-500 uppercase tracking-widest transition-colors">
                    Source: Open-Meteo ↗
                  </a>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
