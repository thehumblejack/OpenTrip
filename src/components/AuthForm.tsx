"use client";

import { Plane, Compass, Map as MapIcon, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface AuthFormProps {
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  isSignUp: boolean;
  setIsSignUp: (val: boolean) => void;
  handleAuthAction: (e: React.FormEvent) => void;
}

export function AuthForm({
  email,
  setEmail,
  password,
  setPassword,
  isSignUp,
  setIsSignUp,
  handleAuthAction
}: AuthFormProps) {
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
              <Button 
                variant="link"
                onClick={() => setIsSignUp(!isSignUp)} 
                className="text-[10px] font-bold text-zinc-400 hover:text-zinc-900 uppercase tracking-widest transition-colors h-auto p-0"
              >
                {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
              </Button>
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
        </Card>

        <div className="text-center">
          <p className="text-[10px] text-zinc-400 font-medium">© 2026 OpenTrip OS. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
