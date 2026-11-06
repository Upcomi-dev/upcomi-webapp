"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function EventPopup({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <Dialog open onOpenChange={(open) => !open && router.back()}>
      <DialogContent
        data-event-popup
        overlayClassName="z-[70] bg-[rgba(36,23,15,0.34)] supports-backdrop-filter:backdrop-blur-md"
        className="top-0 left-0 z-[80] flex h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-0 bg-[linear-gradient(180deg,rgba(255,251,246,0.99),rgba(246,236,223,0.98))] p-0 shadow-[0_30px_90px_rgba(36,23,15,0.22)] sm:max-w-none md:top-1/2 md:left-1/2 md:h-[min(920px,calc(100dvh-2rem))] md:w-[min(1040px,calc(100vw-2rem))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[32px] md:border md:border-white/60"
      >
        <DialogTitle className="sr-only">Détail de l&apos;événement</DialogTitle>
        <div
          className="isolate min-h-0 flex-1 overflow-y-auto"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
