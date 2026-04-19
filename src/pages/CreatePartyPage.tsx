import React, { useState, useRef, useEffect } from 'react';
import { Camera, Shield, Wallet, FileText, MapPin, Calendar, Clock, Hourglass, Check, X, Sparkles, Map as MapIcon, Globe, Loader2, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useStore } from '../lib/Store';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icon in leaflet
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function LocationMarker({ position, setPosition }: { position: L.LatLng | null, setPosition: (pos: L.LatLng) => void }) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  useEffect(() => {
    if (position) {
       map.flyTo(position, 14);
    }
  }, [position, map]);

  return position === null ? null : (
    <Marker position={position} />
  );
}

export function CreatePartyPage() {
  const { sendSocketMessage } = useStore();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [guestLimit, setGuestLimit] = useState(50);
  const [duration, setDuration] = useState(4);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [partyType, setPartyType] = useState('');
  const [customType, setCustomType] = useState('');
  const [partyPhotos, setPartyPhotos] = useState<string[]>([]);
  const [partyDate, setPartyDate] = useState('');
  const [partyTime, setPartyTime] = useState('');
  const [crowdfundTarget, setCrowdfundTarget] = useState(0);
  const [showWalletInput, setShowWalletInput] = useState(false);
  const [mapPosition, setMapPosition] = useState<L.LatLng | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const validate = () => {
    const errs: string[] = [];
    if (!title.trim() || title.length < 3) errs.push("Title must be at least 3 chars");
    if (!description.trim() || description.length < 10) errs.push("Description must be at least 10 chars");
    if (!partyDate) errs.push("Date is required");
    if (!partyTime) errs.push("Time is required");
    if (!city.trim()) errs.push("City is required");
    if (!address.trim()) errs.push("Full address is required");
    if (partyPhotos.length === 0) errs.push("At least one photo is required");
    if (!partyType.trim()) errs.push("Party vibe type is required");
    if (partyType === 'OTHER' && !customType.trim()) errs.push("Custom vibe type is required");
    if (duration > 6) errs.push("Max duration is 6 hours");
    if (!mapPosition) errs.push("Please pick a location on the map");
    
    setErrors(errs);
    return errs.length === 0;
  };

  const handlePublish = async () => {
     if (isSubmitting) return;
     if (!validate()) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
     }
     
     setIsSubmitting(true);
     setErrors([]);

     const finalPartyType = partyType === 'OTHER' ? customType : partyType;
     const startTime = new Date(`${partyDate}T${partyTime}`).toISOString();

     try {
       sendSocketMessage('CREATE_PARTY', {
           Title: title,
           Description: description,
           StartTime: startTime,
           DurationHours: Number(duration),
           Address: address,
           City: city,
           MaxCapacity: Number(guestLimit),
           PartyPhotos: partyPhotos,
           PartyType: finalPartyType,
           CrowdfundTarget: crowdfundTarget,
           GeoLat: mapPosition?.lat || 0,
           GeoLon: mapPosition?.lng || 0,
           ChatRoomID: `room_${Date.now()}`
       });
       
       setSuccess(true);
       setTimeout(() => {
          navigate('/');
       }, 1500);
     } catch (err) {
       setErrors(['Failed to create party. Please try again.']);
       setIsSubmitting(false);
     }
  };

  const handleReverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data.address) {
        if (!city) setCity(data.address.city || data.address.town || data.address.village || '');
        setAddress(data.display_name);
      }
    } catch (e) {
      console.error("Geocoding failed", e);
    }
  };

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setMapPosition(L.latLng(pos.coords.latitude, pos.coords.longitude));
      }, (err) => {
        console.warn("Geolocation disabled or blocked:", err);
      });
    }
  }, []);

  useEffect(() => {
    if (mapPosition) {
      handleReverseGeocode(mapPosition.lat, mapPosition.lng);
    }
  }, [mapPosition]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remainingSlots = 16 - partyPhotos.length;
    const filesToProcess = files.slice(0, remainingSlots) as File[];

    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPartyPhotos(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPartyPhotos(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="h-full w-full bg-transparent flex flex-col overflow-y-auto pb-[120px] pt-6 px-6 scrollbar-hide">
      
      {/* TILE HEADER */}
      <div className="mb-8">
        <div className="bg-[#11131F] border border-white/5 rounded-[32px] p-8 relative overflow-hidden group shadow-2xl shadow-brand-primary/10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 blur-[80px] -mr-32 -mt-32 transition-all group-hover:bg-brand-primary/20" />
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-3xl flex items-center justify-center mb-4 transform rotate-3 shadow-xl">
              <Sparkles className="text-white" size={32} />
            </div>
            <h2 className="text-3xl font-black text-white tracking-widest uppercase mb-1">HOST PARTY</h2>
            <p className="text-[10px] font-bold text-white/30 tracking-[0.2em] uppercase">Set the frequency of the night</p>
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
          {errors.map((e, idx) => <p key={idx} className="text-xs text-red-500 font-bold uppercase tracking-wider mb-1">• {e}</p>)}
        </div>
      )}

      {success && (
        <div className="mb-6 bg-brand-accent/10 border border-brand-accent/20 rounded-2xl p-6 text-center">
           <div className="w-12 h-12 bg-brand-accent rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-brand-accent/20">
              <Check className="text-[#0A0B14]" size={24} />
           </div>
           <p className="text-sm font-black text-white tracking-widest uppercase">Party Created!</p>
           <p className="text-[9px] font-bold text-white/40 uppercase mt-1">Redirecting to feed...</p>
        </div>
      )}

      <div className="space-y-10">
        
        {/* DETAILS SECTION */}
        <section>
          <div className="flex items-center gap-3 mb-4">
             <div className="w-1 h-3 bg-brand-accent rounded-full" />
             <h3 className="text-[10px] font-black text-white/40 tracking-[0.2em] uppercase">Core Details</h3>
          </div>
          <div className="bg-[#11131F] border border-white/5 rounded-[32px] p-6 space-y-8">
             <div className="relative">
                <input 
                  type="text" 
                  placeholder="PARTY TITLE" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  className="w-full bg-transparent border-b-2 border-white/5 py-3 outline-none text-xl font-black text-white placeholder:text-white/10 tracking-tight focus:border-brand-accent transition-colors uppercase" 
                />
             </div>
             
             <div className="flex gap-4">
                <FileText size={20} className="text-brand-accent shrink-0 mt-1" />
                <textarea 
                  placeholder="WHAT IS THE VIBE? DESCRIBE THE NIGHT..." 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  className="w-full bg-transparent outline-none text-sm text-white/80 placeholder:text-white/10 min-h-[100px] resize-none leading-relaxed" 
                />
             </div>
          </div>
        </section>

        {/* LOGISTICS SECTION */}
        <section>
          <div className="flex items-center gap-3 mb-4">
             <div className="w-1 h-3 bg-brand-accent rounded-full" />
             <h3 className="text-[10px] font-black text-white/40 tracking-[0.2em] uppercase">Logistics</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
             <div className="bg-[#11131F] border border-white/5 rounded-3xl p-5">
                <Calendar size={16} className="text-brand-accent mb-3" />
                <label className="text-[9px] font-bold text-white/20 uppercase tracking-widest block mb-1">Pick Date</label>
                <input 
                  type="date" 
                  value={partyDate} 
                  onChange={e => setPartyDate(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm font-bold text-white w-full uppercase [color-scheme:dark]" 
                />
             </div>
             <div className="bg-[#11131F] border border-white/5 rounded-3xl p-5">
                <Clock size={16} className="text-brand-accent mb-3" />
                <label className="text-[9px] font-bold text-white/20 uppercase tracking-widest block mb-1">Door Time</label>
                <input 
                  type="time" 
                  value={partyTime} 
                  onChange={e => setPartyTime(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm font-bold text-white w-full [color-scheme:dark]" 
                />
             </div>
          </div>

          <div className="bg-[#11131F] border border-white/5 rounded-[32px] p-6 space-y-6">
             <div>
                <div className="flex justify-between items-center mb-4">
                   <div className="flex items-center gap-2">
                      <Hourglass size={16} className="text-brand-accent" />
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Duration: {duration} Hours</span>
                   </div>
                   <span className="text-[10px] font-bold text-white/20 uppercase">Max 6H</span>
                </div>
                <input 
                  type="range" 
                  min="1" max="6" 
                  value={duration} 
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-brand-accent" 
                />
             </div>

             <div>
                <div className="flex justify-between items-center mb-4">
                   <div className="flex items-center gap-2">
                      <Globe size={16} className="text-brand-accent" />
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Capacity: {guestLimit} People</span>
                   </div>
                   <span className="text-[10px] font-bold text-white/20 uppercase">Max 300</span>
                </div>
                <input 
                  type="range" 
                  min="10" max="300" 
                  step="10"
                  value={guestLimit} 
                  onChange={(e) => setGuestLimit(Number(e.target.value))}
                  className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-brand-accent" 
                />
             </div>
          </div>
        </section>

        {/* MAP PICKER */}
        <section>
           <div className="flex items-center gap-3 mb-4">
             <div className="w-1 h-3 bg-brand-accent rounded-full" />
             <h3 className="text-[10px] font-black text-white/40 tracking-[0.2em] uppercase">Map Picker</h3>
          </div>
          <div className="bg-[#11131F] border border-white/5 rounded-[32px] p-4 space-y-4">
             <div className="h-[300px] w-full bg-[#f8f9fa] rounded-2xl overflow-hidden shadow-inner border border-white/5 z-0">
               <MapContainer center={[40.7128, -74.0060]} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  />
                  <LocationMarker position={mapPosition} setPosition={setMapPosition} />
               </MapContainer>
             </div>
             <p className="text-[9px] font-bold text-white/20 uppercase text-center px-4 tracking-wider">Tap on the map to drop the marker at the exact party location</p>
             
             <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-4 bg-white/5 rounded-2xl px-4 py-3 border border-white/5">
                   <MapIcon size={18} className="text-brand-accent shrink-0" />
                   <div className="w-full">
                      <label className="text-[8px] font-bold text-white/20 uppercase tracking-widest block mb-0.5">City (Visible)</label>
                      <input 
                        type="text" 
                        placeholder="CITY NAME" 
                        value={city} 
                        onChange={e => setCity(e.target.value)} 
                        className="w-full bg-transparent border-none outline-none text-xs font-bold text-white placeholder:text-white/10 uppercase" 
                      />
                   </div>
                </div>
                
                <div className="flex items-center gap-4 bg-white/5 rounded-2xl px-4 py-3 border border-white/5">
                   <Search size={18} className="text-brand-accent/60 shrink-0" />
                   <div className="w-full">
                      <label className="text-[8px] font-bold text-white/20 uppercase tracking-widest block mb-0.5">Full Address (Private)</label>
                      <input 
                        type="text" 
                        placeholder="HOUSE NUMBER, STREET, AREA..." 
                        value={address} 
                        onChange={e => setAddress(e.target.value)} 
                        className="w-full bg-transparent border-none outline-none text-xs font-medium text-white/70 placeholder:text-white/10" 
                      />
                   </div>
                </div>
             </div>
          </div>
        </section>

        {/* CROWDFUNDING */}
        <section>
          <div className="flex items-center gap-3 mb-4">
             <div className="w-1 h-3 bg-brand-accent rounded-full" />
             <h3 className="text-[10px] font-black text-white/40 tracking-[0.2em] uppercase">Funding</h3>
          </div>
          <button 
            type="button"
            onClick={() => setShowWalletInput(!showWalletInput)}
            className="w-full bg-[#11131F] border border-white/5 rounded-3xl p-6 flex items-center justify-between group active:scale-[0.98] transition-all"
          >
             <div className="flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-colors", showWalletInput ? "bg-brand-accent text-[#0A0B14]" : "bg-white/5 text-white/20")}>
                   <Wallet size={24} />
                </div>
                <div className="text-left">
                   <p className="text-sm font-black text-white tracking-widest uppercase">CROWDFUND PARTY</p>
                   <p className="text-[9px] font-bold text-white/20 uppercase">Request contributions from guests</p>
                </div>
             </div>
             <div className={cn("w-6 h-6 rounded-full border border-white/10 flex items-center justify-center transition-all", showWalletInput && "bg-brand-accent border-brand-accent")}>
                {showWalletInput && <Check size={12} className="text-[#0A0B14]" />}
             </div>
          </button>

          <AnimatePresence>
            {showWalletInput && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-brand-accent/5 border border-brand-accent/20 rounded-3xl p-6 flex items-center gap-4">
                   <span className="text-2xl font-black text-brand-accent">$</span>
                   <input 
                     type="number" 
                     placeholder="TARGET AMOUNT (E.G. 500)" 
                     value={crowdfundTarget || ''} 
                     onChange={e => setCrowdfundTarget(Number(e.target.value))}
                     className="w-full bg-transparent border-none outline-none text-xl font-black text-white placeholder:text-brand-accent/20"
                   />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* PARTY TYPE */}
        <section>
          <div className="flex items-center gap-3 mb-4">
             <div className="w-1 h-3 bg-brand-accent rounded-full" />
             <h3 className="text-[10px] font-black text-white/40 tracking-[0.2em] uppercase">Vibe Architecture</h3>
          </div>
          
          <div className="bg-[#11131F] border border-white/5 rounded-[32px] p-6 space-y-6">
             <div className="grid grid-cols-2 gap-2">
                {['RAVE', 'HOUSE PARTY', 'ROOFTOP', 'CLUB', 'DINNER', 'OTHER'].map(type => (
                   <button 
                     key={type}
                     type="button"
                     onClick={() => setPartyType(type)}
                     className={cn(
                        "py-4 rounded-2xl text-[10px] font-black tracking-widest border transition-all uppercase",
                        partyType === type ? "bg-brand-accent border-brand-accent text-[#0A0B14] shadow-lg shadow-brand-accent/20" : "bg-white/5 border-white/5 text-white/30"
                     )}
                   >
                     {type}
                   </button>
                ))}
             </div>

             {partyType === 'OTHER' && (
               <input 
                 type="text" 
                 placeholder="CUSTOM VIBE TYPE" 
                 value={customType}
                 onChange={e => setCustomType(e.target.value)}
                 className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-brand-accent uppercase"
               />
             )}
          </div>
        </section>

        {/* GALLERY */}
        <section>
           <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-3">
               <div className="w-1 h-3 bg-brand-accent rounded-full" />
               <h3 className="text-[10px] font-black text-white/40 tracking-[0.2em] uppercase">Gallery</h3>
             </div>
             <span className="text-[10px] font-black text-white/20 tracking-widest">{partyPhotos.length}/16</span>
           </div>
           
           <div className="grid grid-cols-4 gap-3">
             {partyPhotos.map((photo, index) => (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={index} 
                  className="relative aspect-[3/4] rounded-2xl overflow-hidden group shadow-xl"
                >
                  <img src={photo} alt="" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-2 right-2 bg-black/60 backdrop-blur-md w-7 h-7 rounded-full flex items-center justify-center text-white p-1 hover:bg-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
             ))}
             {partyPhotos.length < 16 && (
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-[3/4] bg-[#11131F] border-2 border-dashed border-white/5 rounded-2xl flex items-center justify-center flex-col gap-3 hover:bg-white/5 hover:border-brand-accent/20 transition-all group"
                >
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Camera size={24} className="text-white/20 group-hover:text-brand-accent transition-colors" />
                  </div>
                  <span className="text-[9px] font-black text-white/10 uppercase tracking-widest">Add Visuals</span>
                </button>
             )}
           </div>
           
           <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/*" 
              multiple
              className="hidden" 
              onChange={handleImageUpload} 
           />
        </section>

         <div className="mt-12 flex justify-center w-full">
            <button 
              onClick={handlePublish} 
              disabled={isSubmitting}
              className={cn(
                "w-full py-5 rounded-[24px] bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-black text-xs tracking-[0.2em] shadow-2xl transition-all uppercase flex items-center justify-center gap-3",
                isSubmitting ? "opacity-70 cursor-not-allowed" : "shadow-brand-primary/40 active:scale-95"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} /> LAUNCHING...
                </>
              ) : (
                <>
                  <Sparkles size={18} /> LAUNCH PARTY
                </>
              )}
            </button>
         </div>

      </div>

    </div>
  );
}
