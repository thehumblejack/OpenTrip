"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Upload, Database, AlertCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

interface BackupManagerProps {
  trip: any;
  onRestore: (tripData: any) => void;
}

export function BackupManager({ trip, onRestore }: BackupManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleDownloadBackup = () => {
    if (!trip) return;
    
    // Create a clean backup object
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
          // Re-hydrate Date objects
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
      
      // Reset input so the same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <input 
        type="file" 
        accept=".json" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleRestoreBackup} 
      />
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 text-zinc-600">
          <Database className="w-3.5 h-3.5" />
          Backups
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5 text-sm font-semibold text-zinc-900">Data Management</div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDownloadBackup} disabled={!trip}>
            <Download className="w-4 h-4 mr-2" />
            Download JSON Backup
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            Restore from Backup
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <div className="p-2 px-3 flex items-start gap-2 bg-amber-50 text-amber-900 rounded-sm m-1 mt-2">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <p className="text-[10px] leading-tight">
              Backups are saved as JSON files to your computer. You can open them in any text editor to view your data.
            </p>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
