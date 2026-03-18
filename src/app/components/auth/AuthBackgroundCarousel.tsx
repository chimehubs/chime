import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

const AUTH_BACKGROUND_IMAGES = [
  'https://professions.ng/wp-content/uploads/2023/08/Banking-Job-Opportunities-in-Nigeria-A-Comprehensive-Guide.jpg',
  'https://thedigitalbanker.com/wp-content/uploads/2025/05/Untitled-design-2025-05-15T103825.632.jpg',
  'https://s3.eu-west-2.amazonaws.com/growthcurve.site/media/blog/_1920x1080_crop_center-center_none/chime.jpeg',
];

export default function AuthBackgroundCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (AUTH_BACKGROUND_IMAGES.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % AUTH_BACKGROUND_IMAGES.length);
    }, 6500);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {AUTH_BACKGROUND_IMAGES.map((imageUrl, index) => (
        <motion.div
          key={imageUrl}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${imageUrl})`,
            filter: 'sepia(0.32) saturate(0.8) contrast(0.95) brightness(0.45)',
          }}
          initial={false}
          animate={{ opacity: activeIndex === index ? 1 : 0 }}
          transition={{ duration: 1.25, ease: 'easeInOut' }}
        />
      ))}

      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-[#050b0a]/65 to-black/78" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0%,rgba(0,0,0,0.35)_55%,rgba(0,0,0,0.72)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.06),rgba(255,255,255,0))]" />
    </div>
  );
}

