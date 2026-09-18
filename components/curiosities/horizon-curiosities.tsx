"use client";

import { Sparkles } from "lucide-react";

import { AcousticWaves } from "@/components/curiosities/acoustic-waves";
import { Spaghettification } from "@/components/curiosities/spaghettification";
import { TimeDilation } from "@/components/curiosities/time-dilation";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TOPICS = [
  { value: "tides", label: "Spaghettification", Panel: Spaghettification },
  { value: "sound", label: "Acoustic waves", Panel: AcousticWaves },
  { value: "time", label: "Time dilation", Panel: TimeDilation },
] as const;

/** Floating quick-access drawer with three small interactive physics toys. */
export function HorizonCuriosities() {
  return (
    <Sheet>
      <SheetTrigger className="group fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-full border border-ember/30 bg-black/70 py-2 pr-4 pl-2.5 text-sm text-white shadow-[0_0_30px_-8px_var(--ember)] backdrop-blur-xl transition-all duration-300 outline-none hover:border-ember/60 hover:shadow-[0_0_40px_-6px_var(--ember)] focus-visible:ring-2 focus-visible:ring-ember/60 sm:right-6 sm:bottom-6">
        <span className="flex size-7 items-center justify-center rounded-full bg-ember/15 text-ember transition-transform duration-500 group-hover:rotate-90">
          <Sparkles className="size-4" />
        </span>
        Horizon Curiosities
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full gap-0 border-white/10 bg-background/90 backdrop-blur-2xl data-[side=right]:w-full data-[side=right]:sm:max-w-md"
      >
        <SheetHeader className="border-b border-border/60 px-6 pt-6 pb-4">
          <p className="font-mono text-[11px] tracking-widest text-ember uppercase">Field notes</p>
          <SheetTitle className="font-display text-3xl font-normal italic">Horizon Curiosities</SheetTitle>
          <SheetDescription>Three small experiments at the edge of spacetime.</SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="tides" className="min-h-0 flex-1 gap-0">
          <div className="px-6 pt-4">
            <TabsList className="w-full">
              {TOPICS.map((t) => (
                <TabsTrigger key={t.value} value={t.value} className="text-xs">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {TOPICS.map(({ value, Panel }) => (
            <TabsContent key={value} value={value} className="overflow-y-auto px-6 pt-5 pb-8">
              <Panel />
            </TabsContent>
          ))}
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
