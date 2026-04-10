"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface FlyingHeart {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface FlyingHeartContextValue {
  /** Ref to attach to the header counter target */
  counterRef: React.RefObject<HTMLSpanElement | null>;
  /** Trigger a flying heart from (x, y) screen coords */
  triggerHeart: (x: number, y: number) => void;
}

const FlyingHeartContext = createContext<FlyingHeartContextValue | null>(null);

export function useFlyingHeart() {
  return useContext(FlyingHeartContext);
}

let heartId = 0;

export function FlyingHeartProvider({ children }: { children: React.ReactNode }) {
  const counterRef = useRef<HTMLSpanElement | null>(null);
  const [hearts, setHearts] = useState<FlyingHeart[]>([]);

  const triggerHeart = useCallback((x: number, y: number) => {
    const target = counterRef.current;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const endX = rect.left + rect.width / 2;
    const endY = rect.top + rect.height / 2;

    // Bump the counter badge after the heart arrives
    setTimeout(() => {
      if (counterRef.current) {
        counterRef.current.animate(
          [
            { transform: "scale(1)" },
            { transform: "scale(1.5)" },
            { transform: "scale(1)" },
          ],
          { duration: 300, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
        );
      }
    }, 950);

    const id = ++heartId;
    setHearts((prev) => [...prev, { id, startX: x, startY: y, endX, endY }]);
  }, []);

  const removeHeart = useCallback((id: number) => {
    setHearts((prev) => prev.filter((h) => h.id !== id));
  }, []);

  return (
    <FlyingHeartContext.Provider value={{ counterRef, triggerHeart }}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <>
            {hearts.map((heart) => (
              <AnimatedHeart key={heart.id} heart={heart} onDone={removeHeart} />
            ))}
          </>,
          document.body
        )}
    </FlyingHeartContext.Provider>
  );
}

function AnimatedHeart({ heart, onDone }: { heart: FlyingHeart; onDone: (id: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const dx = heart.endX - heart.startX;
    const dy = heart.endY - heart.startY;

    // Start position
    el.style.left = `${heart.startX}px`;
    el.style.top = `${heart.startY}px`;

    // Force reflow before animating
    el.getBoundingClientRect();

    // Animate to target
    el.style.transition = "transform 1000ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 400ms ease-in 600ms";
    el.style.transform = `translate(${dx}px, ${dy}px) scale(0.4)`;
    el.style.opacity = "0";

    const timer = setTimeout(() => onDone(heart.id), 1020);
    return () => clearTimeout(timer);
  }, [heart, onDone]);

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        zIndex: 9999,
        pointerEvents: "none",
        transform: "translate(0, 0) scale(1)",
        opacity: "1",
      }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="#eb5f3b"
        stroke="#eb5f3b"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </div>
  );
}
