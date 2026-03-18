import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

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

  const current = items[activeIndex];
  const isExternal = /^https?:\/\//i.test(current.link);

  return (
    <div className={`relative h-14 w-full overflow-hidden rounded-xl border border-white/10 ${className}`}>
      <AnimatePresence mode="wait">
        <motion.a
          key={`${activeIndex}-${current.image}`}
          href={current.link}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noreferrer' : undefined}
          className="absolute inset-0 block"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <img src={current.image} alt={current.text} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />

          <div className="relative z-10 flex h-full items-center justify-between px-3 sm:px-4">
            <p className="truncate pr-3 text-xs font-semibold text-white sm:text-sm">{current.text}</p>
            <span className="shrink-0 text-[11px] font-medium text-white/90 sm:text-xs">Open</span>
          </div>
        </motion.a>
      </AnimatePresence>
    </div>
  );
}

