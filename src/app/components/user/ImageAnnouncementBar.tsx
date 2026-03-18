import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

export type AnnouncementSlide = {
  image: string;
  text: string;
  link: string;
};

interface ImageAnnouncementBarProps {
  items: AnnouncementSlide[];
  className?: string;
}

export default function ImageAnnouncementBar({ items, className = '' }: ImageAnnouncementBarProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [items.length]);

  if (!items.length) return null;

  return (
    <div className={`group relative h-[92px] w-full overflow-hidden rounded-lg border border-white/10 shadow-sm ${className}`}>
      <motion.div
        className="flex h-full"
        animate={{ x: `-${activeIndex * 100}%` }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        {items.map((item, index) => {
          const isExternal = /^https?:\/\//i.test(item.link);
          return (
            <a
              key={`${item.image}-${index}`}
              href={item.link}
              target={isExternal ? '_blank' : undefined}
              rel={isExternal ? 'noreferrer' : undefined}
              className="relative block h-full w-full shrink-0"
            >
              <img
                src={item.image}
                alt={item.text || `Announcement ${index + 1}`}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
            </a>
          );
        })}
      </motion.div>

      <div className="pointer-events-none absolute inset-x-0 bottom-2 flex items-center justify-center gap-1.5">
        {items.map((item, index) => (
          <button
            key={`${item.image}-indicator-${index}`}
            type="button"
            onClick={() => setActiveIndex(index)}
            aria-label={`Go to slide ${index + 1}`}
            className={`pointer-events-auto h-1.5 rounded-full transition-all ${
              index === activeIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/60'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
