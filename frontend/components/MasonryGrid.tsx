"use client";

import Image from "next/image";
import { useState } from "react";
import { Lightbox } from "@/components/Lightbox";

export interface MasonryItem {
  id: string;
  title: string;
  slug: string;
  orientation: "portrait" | "landscape";
  imageUrl: string;
}

// Enforces strict aspect ratios per orientation:
//   portrait  -> 2:3  (2160x3240)
//   landscape -> 3:2  (3240x2160)
export function MasonryGrid({ items }: { items: MasonryItem[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <>
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
        {items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => setActiveIndex(index)}
            className={`block w-full overflow-hidden rounded-md ${
              item.orientation === "portrait" ? "aspect-[2/3]" : "aspect-[3/2]"
            }`}
          >
            <Image
              src={item.imageUrl}
              alt={item.title}
              width={item.orientation === "portrait" ? 2160 : 3240}
              height={item.orientation === "portrait" ? 3240 : 2160}
              className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
            />
          </button>
        ))}
      </div>

      {activeIndex !== null && (
        <Lightbox
          items={items}
          activeIndex={activeIndex}
          onClose={() => setActiveIndex(null)}
          onNavigate={setActiveIndex}
        />
      )}
    </>
  );
}
