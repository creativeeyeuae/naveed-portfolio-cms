"use client";

import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { MasonryItem } from "@/components/MasonryGrid";

export function Lightbox({
  items,
  activeIndex,
  onClose,
  onNavigate,
}: {
  items: MasonryItem[];
  activeIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const item = items[activeIndex];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/95">
      <button onClick={onClose} className="absolute right-6 top-6 text-white/80 hover:text-gold">
        <X size={28} />
      </button>

      <div className="flex flex-1 items-center justify-center px-16">
        <button
          onClick={() => onNavigate((activeIndex - 1 + items.length) % items.length)}
          className="absolute left-6 text-white/60 hover:text-gold"
        >
          <ChevronLeft size={36} />
        </button>

        <Image
          src={item.imageUrl}
          alt={item.title}
          width={item.orientation === "portrait" ? 2160 : 3240}
          height={item.orientation === "portrait" ? 3240 : 2160}
          className="max-h-[80vh] w-auto object-contain"
        />

        <button
          onClick={() => onNavigate((activeIndex + 1) % items.length)}
          className="absolute right-20 text-white/60 hover:text-gold"
        >
          <ChevronRight size={36} />
        </button>
      </div>

      <div className="flex justify-center gap-2 overflow-x-auto p-4">
        {items.map((thumb, i) => (
          <button
            key={thumb.id}
            onClick={() => onNavigate(i)}
            className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded ${
              i === activeIndex ? "ring-2 ring-gold" : "opacity-60"
            }`}
          >
            <Image src={thumb.imageUrl} alt={thumb.title} width={64} height={64} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
