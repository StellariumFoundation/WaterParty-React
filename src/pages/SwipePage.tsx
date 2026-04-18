import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Waves } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../lib/Store';
import { getAssetUrl } from '../lib/constants';

export function SwipePage() {
  const { feed, sendSocketMessage, removeFromFeed } = useStore();
  const [leaveX, setLeaveX] = useState(0);
  const [leaveY, setLeaveY] = useState(0);

  useEffect(() => {
    if ('geolocation' in navigator) {
       navigator.geolocation.getCurrentPosition((pos) => {
           sendSocketMessage('GET_FEED', {
              Lat: pos.coords.latitude,
              Lon: pos.coords.longitude,
              RadiusKm: 50
           });
       }, (error) => {
           sendSocketMessage('GET_FEED', { Lat: 0, Lon: 0, RadiusKm: 50000 });
       });
    } else {
       sendSocketMessage('GET_FEED', { Lat: 0, Lon: 0, RadiusKm: 50000 });
    }
  }, []);

  const activeIndex = feed.length - 1;

  const handleSwipe = (dir: 'left' | 'right') => {
    if (feed.length === 0) return;
    const party = feed[activeIndex];

    setLeaveX(dir === 'right' ? 300 : -300);
    setLeaveY(Math.random() * 100 - 50);

    sendSocketMessage('SWIPE', {
        PartyID: party.ID,
        Direction: dir
    });

    setTimeout(() => {
      removeFromFeed(party.ID);
      setLeaveX(0);
      setLeaveY(0);
    }, 300);
  };

  return (
    <div className="relative h-full w-full flex flex-col bg-transparent overflow-hidden pb-24">
      {/* Header */}
      <header className="px-6 pt-8 pb-2 flex justify-between items-center shrink-0 z-10 w-full">
        <div className="text-2xl font-black bg-gradient-to-r from-brand-primary to-brand-secondary text-transparent bg-clip-text tracking-tighter">VibeCheck</div>
        <div className="bg-white/10 px-4 py-1.5 rounded-full text-xs font-bold text-white/70 tracking-wide">Nearby</div>
      </header>

      {/* Cards Container */}
      <div className="flex-1 relative flex items-center justify-center p-4">
        {feed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 animate-in fade-in zoom-in duration-500">
            <Waves size={48} className="text-brand-accent opacity-80" />
            <div className="text-center">
              <h2 className="text-lg tracking-[0.2em] font-light text-white/50 uppercase">Silence</h2>
              <p className="text-xs text-white/30 tracking-widest uppercase mt-1">No vibes nearby</p>
            </div>
          </div>
        ) : (
          <AnimatePresence>
            {feed.map((party, index) => {
              const isTop = index === activeIndex;
              const displayImage = party.PartyPhotos?.length > 0
                ? getAssetUrl(party.PartyPhotos[0])
                : party.Thumbnail ? getAssetUrl(party.Thumbnail) : "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000";
                
              // Use JS Date
              const date = party.StartTime ? new Date(party.StartTime) : new Date();
              const dateStr = `${date.getDate()}/${date.getMonth()+1} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
                
              return (
                <motion.div
                  key={party.ID}
                  className={cn(
                    "absolute w-full max-w-[90%] aspect-[3/4] sm:max-h-[70vh] rounded-[28px] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] bg-[#222]",
                    !isTop && "pointer-events-none"
                  )}
                  style={{ zIndex: index }}
                  initial={{ scale: 0.95, y: 20, opacity: 0 }}
                  animate={{
                    scale: isTop ? 1 : 0.95 - (feed.length - 1 - index) * 0.05,
                    y: isTop ? 0 : (feed.length - 1 - index) * 15,
                    opacity: 1
                  }}
                  exit={{
                    x: leaveX,
                    y: leaveY,
                    opacity: 0,
                    rotate: leaveX > 0 ? 15 : leaveX < 0 ? -15 : 0,
                    transition: { duration: 0.3, ease: 'easeOut' }
                  }}
                  drag={isTop ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={(e, { offset, velocity }) => {
                    const swipeThreshold = 100;
                    if (offset.x > swipeThreshold || velocity.x > 500) {
                      handleSwipe('right');
                    } else if (offset.x < -swipeThreshold || velocity.x < -500) {
                      handleSwipe('left');
                    }
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary to-brand-secondary">
                    <img src={displayImage} alt={party.Title} className="w-full h-full object-cover mix-blend-overlay opacity-80" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col justify-end pointer-events-none">
                     <div className="flex items-center space-x-2 mb-2">
                        <span className="px-3 py-1 bg-black/50 backdrop-blur-md rounded-full text-[10px] font-bold text-brand-accent border border-brand-accent/30 flex items-center shadow-[0_0_10px_rgba(0,210,255,0.2)]">
                           ⏳ {dateStr}
                        </span>
                        <span className="px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-medium text-white/80 border border-white/10 uppercase font-black">
                           {party.City || "Unknown"}
                        </span>
                     </div>
                    <h2 className="text-[28px] font-extrabold text-white leading-tight mb-1 drop-shadow-md">{party.Title}</h2>
                    <p className="text-white/80 text-sm mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#00FFA3] inline-block shadow-[0_0_8px_rgba(0,255,163,0.8)]" />
                        Host • <span className="font-bold">{party.HostID?.slice(0, 6)}</span>
                    </p>
                    
                    <div className="flex flex-wrap gap-2">
                       {party.VibeTags?.map((tag: string) => (
                          <span key={tag} className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[11px] font-bold text-white uppercase tracking-wide">
                             {tag}
                          </span>
                       ))}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-around items-center h-24 shrink-0 px-8 pb-4 w-full">
        <button 
          onClick={() => handleSwipe('left')}
          disabled={feed.length === 0}
          className="w-16 h-16 flex items-center justify-center rounded-full bg-white text-brand-primary active:scale-95 transition-transform disabled:opacity-50 shadow-[0_10px_20px_rgba(0,0,0,0.3)] border-none"
        >
          <X size={28} strokeWidth={3} className="text-current" />
        </button>
        <button 
          onClick={() => handleSwipe('right')}
          disabled={feed.length === 0}
          className="w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-br from-[#00FFA3] to-[#00D2FF] text-white active:scale-95 transition-transform disabled:opacity-50 shadow-[0_10px_20px_rgba(0,0,0,0.3)] border-none"
        >
          <Check size={28} strokeWidth={3} className="text-current" />
        </button>
      </div>
    </div>
  );
}
