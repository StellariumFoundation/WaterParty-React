import { useState } from 'react';
import { Camera, Shield, Wallet, FileText, MapPin, Calendar, Clock, Hourglass, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../lib/Store';
import { useNavigate } from 'react-router-dom';

export function CreatePartyPage() {
  const { sendSocketMessage } = useStore();
  const navigate = useNavigate();

  const [guestLimit, setGuestLimit] = useState(10);
  const [duration, setDuration] = useState(6);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handlePublish = () => {
     if (!title || !city) return;
     sendSocketMessage('CREATE_PARTY', {
         Title: title,
         Description: description,
         StartTime: new Date(Date.now() + 24*60*60*1000).toISOString(),
         DurationHours: Number(duration) || 6,
         Address: address,
         City: city,
         MaxCapacity: Number(guestLimit) || 10,
         PartyPhotos: [],
         VibeTags: selectedTags,
         ChatRoomID: `room_${Date.now()}`
     });
     navigate('/');
  };

  const handleTagToggle = (tag: string) => {
     if (selectedTags.includes(tag)) setSelectedTags(prev => prev.filter(t => t !== tag));
     else if (selectedTags.length < 3) setSelectedTags(prev => [...prev, tag]);
  };

  return (
    <div className="h-full w-full bg-transparent flex flex-col overflow-y-auto pb-24 pt-12 px-6">
      
      {/* Header aligned with Host button */}
      <div className="flex items-center justify-between mb-8 sticky top-0 z-20 bg-[#0F0F13]/80 backdrop-blur-md py-4 -mx-6 px-6 border-b border-white/5">
        <h2 className="text-2xl font-black bg-gradient-to-r from-brand-primary to-brand-secondary text-transparent bg-clip-text tracking-tighter">HOST VIBES</h2>
        <button onClick={handlePublish} className="bg-brand-primary text-white text-[10px] font-bold px-4 py-2 rounded-full tracking-wider uppercase flex items-center gap-1 shadow-lg shadow-brand-primary/20">
           <Check size={12} /> Publish
        </button>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        
        {/* BASIC RULES */}
        <section>
          <h3 className="text-[10px] font-bold text-white/40 tracking-wider mb-3 uppercase">Basic Rules</h3>
          <div className="flex gap-4">
             <div className="flex-1 bg-[#11131F] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
                <Shield size={20} className="text-brand-accent" />
                <input type="text" placeholder="ADD PROTOCOL..." className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-white/20" />
             </div>
             <button className="w-14 h-14 shrink-0 rounded-2xl bg-[#11131F] border border-white/5 flex items-center justify-center">
                <span className="text-2xl text-brand-accent leading-none">+</span>
             </button>
          </div>
        </section>

        {/* CAPACITY & FUNDING */}
        <section>
          <h3 className="text-[10px] font-bold text-white/40 tracking-wider mb-3 uppercase">Capacity & Funding</h3>
          <div className="bg-[#11131F] border border-white/5 rounded-3xl p-5 mb-3">
             <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-bold text-white">Guest Limit: {guestLimit}</span>
             </div>
             <input 
               type="range" 
               min="1" max="100" 
               value={guestLimit} 
               onChange={(e) => setGuestLimit(Number(e.target.value))}
               className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-accent" 
             />
             <p className="text-[10px] font-bold text-brand-accent mt-4 text-center">AUTO-LOCK WHEN FULL</p>
          </div>
          
          <div className="bg-[#11131F] border border-white/5 rounded-2xl p-5 flex items-center gap-4">
            <Wallet size={20} className="text-white/20" />
            <span className="text-sm font-medium text-white/40">ENABLE CROWD-FUND WITH WALLET</span>
          </div>
        </section>

        {/* DETAILS */}
        <section>
          <h3 className="text-[10px] font-bold text-white/40 tracking-wider mb-3 uppercase">Details</h3>
          <div className="bg-[#11131F] border border-white/5 rounded-3xl p-5 space-y-6">
             <div className="flex items-start gap-4">
                <span className="text-brand-accent font-bold mt-1">⚡</span>
                <input type="text" placeholder="PARTY TITLE (REQUIRED)" value={title} onChange={e => setTitle(e.target.value)} className="bg-transparent border-b border-white/10 pb-2 outline-none text-base font-bold text-white w-full placeholder:text-white/20 uppercase" />
             </div>
             <div className="flex items-start gap-4">
                <FileText size={18} className="text-brand-accent mt-1" />
                <textarea placeholder="DESCRIPTION (REQUIRED)" value={description} onChange={e => setDescription(e.target.value)} className="bg-transparent border-b border-white/10 pb-2 outline-none text-sm text-white w-full placeholder:text-white/20 min-h-[60px] resize-none" />
             </div>
          </div>
        </section>

        {/* GALLERY */}
        <section>
           <div className="flex items-center justify-between mb-3">
             <h3 className="text-[10px] font-bold text-white/40 tracking-wider uppercase">Gallery</h3>
             <span className="text-[10px] font-bold text-white/20">0/16</span>
           </div>
           <div className="w-24 h-24 bg-[#11131F] border border-white/5 rounded-3xl flex items-center justify-center flex-col gap-2">
              <Camera size={24} className="text-white/20" />
           </div>
           <p className="text-[10px] text-white/20 mt-2">ADD AT LEAST ONE PHOTO TO DEFINE THE VIBE</p>
        </section>

         {/* LOGISTICS */}
         <section>
          <h3 className="text-[10px] font-bold text-white/40 tracking-wider mb-3 uppercase">Logistics</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
             <div className="bg-[#11131F] border border-white/5 rounded-2xl p-4 flex items-center justify-center gap-3">
                <Calendar size={18} className="text-brand-accent" />
                <span className="text-sm font-medium text-white">18/4</span>
             </div>
             <div className="bg-[#11131F] border border-white/5 rounded-2xl p-4 flex items-center justify-center gap-3">
                <Clock size={18} className="text-brand-accent" />
                <span className="text-sm font-medium text-white">10:00 PM</span>
             </div>
          </div>
          
          <div className="bg-[#11131F] border border-white/5 rounded-2xl p-5 mb-3 flex items-center gap-4">
             <Hourglass size={18} className="text-brand-accent" />
             <span className="text-sm font-medium text-white shrink-0">DURATION: {duration}H</span>
             <input 
               type="range" 
               min="1" max="12" 
               value={duration} 
               onChange={(e) => setDuration(Number(e.target.value))}
               className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-accent ml-2" 
             />
          </div>

          <div className="grid grid-cols-[1fr,auto] gap-3">
              <div className="bg-[#11131F] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
                <MapPin size={18} className="text-brand-accent shrink-0" />
                <input type="text" placeholder="CITY (REQUIRED)" value={city} onChange={e=>setCity(e.target.value)} className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-white/20" />
             </div>
             <button className="w-14 h-14 shrink-0 rounded-2xl bg-brand-accent/10 flex items-center justify-center">
                <MapPin size={20} className="text-brand-accent" />
             </button>
             
             <div className="bg-[#11131F] border border-white/5 rounded-2xl p-4 flex items-center gap-3 col-span-2">
                <MapPin size={18} className="text-brand-accent shrink-0 opacity-50" />
                <input type="text" placeholder="FULL ADDRESS (HIDDEN)" value={address} onChange={e=>setAddress(e.target.value)} className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-white/20" />
             </div>
          </div>
        </section>

        {/* ATMOSPHERE */}
        <section>
          <h3 className="text-[10px] font-bold text-white/40 tracking-wider mb-3 uppercase">Atmosphere</h3>
          <div className="bg-[#11131F] border border-brand-accent/20 rounded-2xl p-4 mb-4 flex items-start gap-3">
             <div className="text-brand-accent shrink-0 mt-0.5">ⓘ</div>
             <p className="text-xs text-white/60 leading-relaxed font-medium">Define the nature of your event. Is it a cozy house party, a wild rooftop rave, or a sophisticated dinner?</p>
          </div>
          
          <h4 className="text-[10px] font-bold text-white/40 tracking-wider mb-3 uppercase">Kind Of Party</h4>
          <div className="flex gap-2 flex-wrap pb-2">
              {['HOUSE PARTY', 'RAVE', 'ROOFTOP', 'DINNER', 'PREGAME'].map((type) => {
                  const isSelected = selectedTags.includes(type);
                  return (
                     <button 
                       key={type}
                       onClick={() => handleTagToggle(type)}
                       className={cn(
                          "px-4 py-2.5 rounded-full text-[10px] font-bold border transition-colors whitespace-nowrap",
                          isSelected ? "bg-brand-accent/10 border-brand-accent text-brand-accent" : "bg-[#11131F] border-white/5 text-white/40 uppercase"
                       )}
                     >
                       {type}
                     </button>
                  );
              })}
          </div>
        </section>

      </div>

      <div className="mt-12 mb-8">
        <button onClick={handlePublish} className="w-full py-4 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-bold text-sm tracking-wide shadow-lg shadow-brand-secondary/20 active:scale-95 transition-transform">
          PUBLISH PARTY
        </button>
      </div>

    </div>
  );
}
