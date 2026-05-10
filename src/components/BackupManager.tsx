"use client";

import { useState, useRef, useEffect } from "react";
import { Download, Upload, Database, AlertCircle, X } from "lucide-react";
import { format } from "date-fns";

interface BackupManagerProps {
  trip: any;
  onRestore: (tripData: any) => void;
}

export function BackupManager({ trip, onRestore }: BackupManagerProps) {
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);
  
  const handleDownloadBackup = () => {
    if (!trip) return;
    
    const backupData = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      trip: trip
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trip-backup-${format(new Date(), "yyyy-MM-dd-HHmm")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        
        if (parsed.trip && parsed.trip.destination) {
          const restoredTrip = {
            ...parsed.trip,
            startDate: new Date(parsed.trip.startDate),
            endDate: new Date(parsed.trip.endDate),
          };
          onRestore(restoredTrip);
          alert("Backup successfully restored! The app will now sync this to the cloud.");
        } else {
          alert("Invalid backup file format. Could not restore.");
        }
      } catch (error) {
        console.error("Failed to parse backup:", error);
        alert("Failed to read the backup file. It might be corrupted.");
      }
      
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
    setOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <input 
        type="file" 
        accept=".json" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleRestoreBackup} 
      />
      
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors border border-zinc-200 bg-white hover:bg-zinc-50 h-8 rounded-md px-3 text-zinc-600"
      >
        <Database className="w-3.5 h-3.5" />
        Backups
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute right-0 top-10 z-50 w-56 rounded-lg bg-white p-1 shadow-lg ring-1 ring-zinc-200 animate-in fade-in-0 zoom-in-95 duration-100">
          <div className="px-2 py-1.5 text-xs font-semibold text-zinc-900">Data Management</div>
          <div className="h-px bg-zinc-100 -mx-0 my-1" />
          
          <button
            onClick={handleDownloadBackup}
            disabled={!trip}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            <Download className="w-4 h-4" />
            Download JSON Backup
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Restore from Backup
          </button>

          <div className="h-px bg-zinc-100 -mx-0 my-1" />
          <div className="p-2 px-3 flex items-start gap-2 bg-amber-50 text-amber-900 rounded-sm m-1 mt-1 mb-1">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <p className="text-[10px] leading-tight">
              Backups are saved as JSON files to your computer. You can open them in any text editor to view your data.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
