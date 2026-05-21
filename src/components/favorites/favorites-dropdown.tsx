"use client";

import type { CSSProperties, RefObject } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FavoriteEventModal } from "./favorite-event-modal";
import type { FavoriteEvent } from "./favorites-context";
import { FavoritesPanelBody } from "./favorites-panel-body";

interface FavoritesDropdownProps {
  anchorRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

const PANEL_WIDTH = 460;
const PANEL_EDGE_GAP = 16;
const ARROW_SIZE = 16;
const ARROW_RIGHT_OFFSET = 76;

type DropdownStyle = CSSProperties & {
  "--favorites-anchor-right": string;
};

export function FavoritesDropdown({ anchorRef, onClose }: FavoritesDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [selectedEvent, setSelectedEvent] = useState<FavoriteEvent | null>(null);
  const [position, setPosition] = useState({
    arrowRight: ARROW_RIGHT_OFFSET,
    left: PANEL_EDGE_GAP,
    width: PANEL_WIDTH,
  });

  useLayoutEffect(() => {
    function updatePosition() {
      const viewportWidth = window.innerWidth;
      const width = Math.min(PANEL_WIDTH, viewportWidth - PANEL_EDGE_GAP * 2);
      const anchorRect = anchorRef.current?.getBoundingClientRect();
      const anchorCenter = anchorRect
        ? anchorRect.left + anchorRect.width / 2
        : viewportWidth - ARROW_RIGHT_OFFSET;
      const arrowCenterOffset = width - ARROW_RIGHT_OFFSET + ARROW_SIZE / 2;
      const maxLeft = viewportWidth - width - PANEL_EDGE_GAP;
      const left = Math.max(
        PANEL_EDGE_GAP,
        Math.min(anchorCenter - arrowCenterOffset, maxLeft)
      );
      const arrowRight = Math.max(
        24,
        Math.min(width - 24, width - (anchorCenter - left) - ARROW_SIZE / 2)
      );

      setPosition({ arrowRight, left, width });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);

    return () => window.removeEventListener("resize", updatePosition);
  }, [anchorRef]);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (selectedEvent) return;
      if (anchorRef.current?.contains(e.target as Node)) return;
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [anchorRef, onClose, selectedEvent]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (selectedEvent) return;
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, selectedEvent]);

  if (typeof document === "undefined") return null;

  const style: DropdownStyle = {
    "--favorites-anchor-right": `${position.arrowRight}px`,
    left: position.left,
    width: position.width,
  };

  return createPortal(
    <>
      <div
        ref={ref}
        style={style}
        className="fixed top-[84px] z-[60] flex h-[min(720px,calc(100dvh-6rem))] max-w-[calc(100vw-2rem)] overflow-visible rounded-[28px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,251,246,0.98),rgba(246,236,223,0.96))] shadow-[0_24px_80px_rgba(36,23,15,0.16)] backdrop-blur-xl before:absolute before:-top-2 before:right-[var(--favorites-anchor-right)] before:h-4 before:w-4 before:rotate-45 before:border-l before:border-t before:border-white/60 before:bg-[rgba(255,251,246,0.98)] before:content-['']"
      >
        <div className="min-h-0 flex flex-1 overflow-hidden rounded-[28px]">
          <FavoritesPanelBody
            onNavigate={onClose}
            onEventOpen={setSelectedEvent}
            className="min-h-0 flex-1 pb-4 pt-4"
          />
        </div>
      </div>

      {selectedEvent ? (
        <FavoriteEventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      ) : null}
    </>,
    document.body
  );
}
