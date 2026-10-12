"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  id?: string;
  name?: string;
  options: readonly SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

/** Même menu accessible pour les formulaires publics et l'administration. */
export function Select({
  id,
  name,
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder = "Choisir",
  required,
  disabled,
  className,
  ...accessibleName
}: SelectProps) {
  return (
    <SelectPrimitive.Root
      id={id}
      name={name}
      items={options}
      value={value === undefined ? undefined : value || null}
      defaultValue={defaultValue || null}
      onValueChange={(nextValue) => onValueChange?.(nextValue ?? "")}
      required={required}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        {...accessibleName}
        className={cn(
          "group flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-foreground/14 bg-white/80 px-3.5 py-2.5 text-left text-sm text-foreground outline-none transition-colors hover:border-coral/35 hover:bg-white focus-visible:border-orange/50 focus-visible:ring-2 focus-visible:ring-orange/25 data-[popup-open]:border-coral/40 data-[popup-open]:bg-white disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} className="min-w-0 flex-1 truncate data-[placeholder]:text-foreground/60" />
        <SelectPrimitive.Icon className="flex size-5 shrink-0 items-center justify-center text-foreground/55 transition-transform duration-150 group-data-[popup-open]:rotate-180 group-data-[popup-open]:text-coral-dark motion-reduce:transition-none">
          <ChevronDown className="size-4" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner sideOffset={6} alignItemWithTrigger={false} className="z-[70] outline-none">
          <SelectPrimitive.Popup className="w-[var(--anchor-width)] max-w-[calc(100vw-2rem)] origin-[var(--transform-origin)] overflow-hidden rounded-[var(--radius-sm)] bg-[#fffaf4] p-1.5 text-foreground shadow-[var(--shadow-lg)] outline-none transition-[transform,opacity] duration-150 data-[starting-style]:translate-y-1 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 motion-reduce:transition-none">
            <SelectPrimitive.List className="max-h-[min(18rem,var(--available-height))] overflow-y-auto overscroll-contain [scrollbar-color:var(--sand-dark)_transparent] [scrollbar-width:thin]">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className="grid min-h-11 cursor-default grid-cols-[1fr_1rem] items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm outline-none transition-colors data-[highlighted]:bg-coral/10 data-[highlighted]:text-coral-dark data-[selected]:bg-coral/8 data-[selected]:font-semibold data-[selected]:text-coral-dark data-[disabled]:opacity-40 motion-reduce:transition-none"
                >
                  <SelectPrimitive.ItemText className="min-w-0 break-words">{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="text-coral-dark">
                    <Check className="size-4" strokeWidth={2.5} />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
