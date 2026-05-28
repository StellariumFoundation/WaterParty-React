import React, { useState, useRef, useEffect } from 'react';
import { Camera, Shield, Wallet, FileText, MapPin, Calendar, Clock, Hourglass, Check, X, Sparkles, Map as MapIcon, Globe, Loader2, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, compressImage } from '../lib/utils';
import { useStore } from '../lib/Store';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Geolocation } from '@capacitor/geolocation';

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
  const { sendSocketMessage, coords, refreshLocation } = useStore();
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
  const [mapPosition, setMapPosition] = useState<L.LatLng | null>(
    coords ? new L.LatLng(coords.lat, coords.lon) : null
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

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
        setCity(data.address.city || data.address.town || data.address.village || data.address.municipality || '');
        setAddress(data.display_name);
      }
    } catch (e) {
      console.error("Geocoding failed", e);
    }
  };

  const fetchCurrentLocation = async () => {
    setIsLocating(true);
    const fallbackToDefault = () => {
      if (coords) {
        setMapPosition(new L.LatLng(coords.lat, coords.lon));
      } else {
        // Fallback to New York if no coordinates are available
        setMapPosition(new L.LatLng(40.7128, -74.0060));
      }
      setIsLocating(false);
    };

    try {
      if (window.location.protocol !== 'file:' && !(window as any).Capacitor) {
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const newPos = new L.LatLng(pos.coords.latitude, pos.coords.longitude);
              setMapPosition(newPos);
              setIsLocating(false);
            },
            (err) => {
              console.warn("Browser geolocation disabled or blocked:", err);
              fallbackToDefault();
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
          );
        } else {
          fallbackToDefault();
        }
      } else {
        try {
          await Geolocation.requestPermissions();
          const pos = await Geolocation.getCurrentPosition();
          const newPos = new L.LatLng(pos.coords.latitude, pos.coords.longitude);
          setMapPosition(newPos);
          setIsLocating(false);
        } catch (mobileErr) {
          console.warn("Capacitor geolocation failed:", mobileErr);
          fallbackToDefault();
        }
      }
    } catch (e) {
      console.warn("Location permission denied or unavailable:", e);
      fallbackToDefault();
    }
  };

  const handleSearchLocation = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const newPos = new L.LatLng(parseFloat(item.lat), parseFloat(item.lon));
        setMapPosition(newPos);
        
        if (item.display_name) {
          setAddress(item.display_name);
          
          const addr = item.address || {};
          const parsedCity = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
          if (parsedCity) {
            setCity(parsedCity);
          } else {
            const parts = item.display_name.split(',');
            if (parts.length > 0) {
              setCity(parts[0].trim());
            }
          }
        }
      }
    } catch (e) {
      console.error("Geocoding query failed", e);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    fetchCurrentLocation();
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
      reader.onloadend = async () => {
        if (reader.result) {
          const compressed = await compressImage(reader.result as string);
          setPartyPhotos(prev => [...prev, compressed]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPartyPhotos(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="h-full w-full bg-transparent flex flex-col overflow-y-auto py-6 scrollbar-hide pb-28">
      <div className="w-full flex flex-col">
        
        {/* TILE HEADER */}
        <div className="mb-4">
        <div className="bg-[#11131F] border border-white/5 rounded-2xl p-4 relative overflow-hidden group shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 blur-[40px] -mr-16 -mt-16" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-xl flex items-center justify-center shrink-0 shadow-lg">
              <Sparkles className="text-white" size={18} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-widest uppercase mb-0.5">HOST PARTY</h2>
              <p className="text-[8px] font-bold text-white/30 tracking-[0.15em] uppercase">Set the frequency of the night</p>
            </div>
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          {errors.map((e, idx) => <p key={idx} className="text-[10px] text-red-500 font-bold uppercase tracking-wider mb-0.5">• {e}</p>)}
        </div>
      )}

      {success && (
        <div className="mb-4 bg-brand-accent/10 border border-brand-accent/20 rounded-xl p-4 text-center">
           <div className="w-10 h-10 bg-brand-accent rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg shadow-brand-accent/20">
              <Check className="text-[#0A0B14]" size={20} />
           </div>
           <p className="text-xs font-black text-white tracking-widest uppercase">Party Created!</p>
           <p className="text-[8px] font-bold text-white/40 uppercase mt-0.5">Redirecting to feed...</p>
        </div>
      )}

      <div className="space-y-4">

         {/* GALLERY AT THE TOP */}
         <section>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-2.5 bg-brand-accent rounded-full" />
                <h3 className="text-[9px] font-black text-white/40 tracking-[0.2em] uppercase">Gallery</h3>
              </div>
              <span className="text-[8px] font-black text-white/20 tracking-widest">{partyPhotos.length}/16</span>
            </div>
            
            <div className="grid grid-cols-5 gap-1.5">
              {partyPhotos.map((photo, index) => (
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   key={index} 
                   className="relative aspect-square rounded-lg overflow-hidden group shadow-sm border border-white/5"
                 >
                   <img src={photo} alt="" className="w-full h-full object-cover" />
                   <button 
                     type="button"
                     onClick={() => removePhoto(index)}
                     className="absolute top-0.5 right-0.5 bg-black/70 backdrop-blur-md w-4 h-4 rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                   >
                     <X size={8} />
                   </button>
                 </motion.div>
              ))}
              {partyPhotos.length < 16 && (
                 <button 
                   type="button"
                   onClick={() => fileInputRef.current?.click()}
                   className="aspect-square bg-[#11131F]/90 border border-dashed border-white/10 rounded-lg flex items-center justify-center flex-col gap-1 hover:bg-white/5 hover:border-brand-accent/20 transition-all group"
                 >
                   <div className="w-6 h-6 bg-white/5 rounded-md flex items-center justify-center group-hover:scale-105 transition-transform">
                     <Camera size={12} className="text-white/20 group-hover:text-brand-accent transition-colors" />
                   </div>
                   <span className="text-[7px] font-black text-white/20 uppercase tracking-widest">Add</span>
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
        
        {/* DETAILS SECTION */}
        <section>
          <div className="flex items-center gap-2 mb-2">
             <div className="w-1 h-3 bg-brand-accent rounded-full" />
             <h3 className="text-[10px] font-black text-white/40 tracking-[0.2em] uppercase">Core Details</h3>
          </div>
          <div className="bg-[#11131F] border border-white/5 rounded-2xl p-4 space-y-4">
             <div className="relative">
                <input 
                  type="text" 
                  placeholder="PARTY TITLE" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  className="w-full bg-transparent border-b border-white/5 py-1.5 outline-none text-base font-black text-white placeholder:text-white/10 tracking-tight focus:border-brand-accent transition-colors uppercase" 
                />
             </div>
             
             <div className="flex gap-3">
                <FileText size={16} className="text-brand-accent shrink-0 mt-0.5" />
                <textarea 
                  placeholder="WHAT IS THE VIBE? DESCRIBE THE NIGHT..." 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  className="w-full bg-transparent outline-none text-xs text-white/80 placeholder:text-white/10 min-h-[60px] resize-none leading-relaxed" 
                />
             </div>
          </div>
        </section>

        {/* LOGISTICS SECTION */}
        <section>
          <div className="flex items-center gap-2 mb-2">
             <div className="w-1 h-3 bg-brand-accent rounded-full" />
             <h3 className="text-[10px] font-black text-white/40 tracking-[0.2em] uppercase">Logistics</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-3">
             <div className="bg-[#11131F] border border-white/5 rounded-2xl p-3.5">
                <Calendar size={14} className="text-brand-accent mb-2" />
                <label className="text-[8px] font-bold text-white/20 uppercase tracking-widest block mb-0.5">Pick Date</label>
                <input 
                  type="date" 
                  value={partyDate} 
                  onChange={e => setPartyDate(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs font-bold text-white w-full uppercase [color-scheme:dark]" 
                />
             </div>
             <div className="bg-[#11131F] border border-white/5 rounded-2xl p-3.5">
                <Clock size={14} className="text-brand-accent mb-2" />
                <label className="text-[8px] font-bold text-white/20 uppercase tracking-widest block mb-0.5">Door Time</label>
                <input 
                  type="time" 
                  value={partyTime} 
                  onChange={e => setPartyTime(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs font-bold text-white w-full [color-scheme:dark]" 
                />
             </div>
          </div>

          <div className="bg-[#11131F] border border-white/5 rounded-2xl p-4 space-y-4">
             <div>
                <div className="flex justify-between items-center mb-2">
                   <div className="flex items-center gap-1.5">
                      <Hourglass size={14} className="text-brand-accent" />
                      <span className="text-[9px] font-black text-white uppercase tracking-widest">Duration: {duration} Hours</span>
                   </div>
                   <span className="text-[8px] font-bold text-white/20 uppercase">Max 6H</span>
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
                <div className="flex justify-between items-center mb-2">
                   <div className="flex items-center gap-1.5">
                      <Globe size={14} className="text-brand-accent" />
                      <span className="text-[9px] font-black text-white uppercase tracking-widest">Capacity: {guestLimit} People</span>
                   </div>
                   <span className="text-[8px] font-bold text-white/20 uppercase">Max 300</span>
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
           <div className="flex items-center gap-2 mb-2">
             <div className="w-1 h-3 bg-brand-accent rounded-full" />
             <h3 className="text-[10px] font-black text-white/40 tracking-[0.2em] uppercase">Map Picker</h3>
          </div>
          <div className="bg-[#11131F] border border-white/5 rounded-2xl p-3 space-y-3">
             {/* Map Search & Locate Me Buttons */}
             <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 border border-white/5 focus-within:border-brand-accent/40 transition-all">
                   <Search size={14} className="text-white/40 shrink-0" />
                   <input 
                     type="text" 
                     placeholder="SEARCH DESTINATION..." 
                     value={searchQuery}
                     onChange={e => setSearchQuery(e.target.value)}
                     onKeyDown={e => {
                       if (e.key === 'Enter') {
                         e.preventDefault();
                         handleSearchLocation();
                       }
                     }}
                     className="w-full bg-transparent border-none outline-none text-xs font-bold text-white placeholder:text-white/20 uppercase" 
                   />
                   {searchQuery && (
                     <button 
                       type="button" 
                       onClick={() => setSearchQuery('')}
                       className="text-white/30 hover:text-white/60"
                     >
                       <X size={12} />
                     </button>
                   )}
                </div>
                <button
                  type="button"
                  onClick={handleSearchLocation}
                  disabled={isSearching}
                  className="px-3 bg-brand-accent hover:opacity-90 disabled:opacity-50 text-[#0A0B14] rounded-xl flex items-center justify-center text-[10px] font-black tracking-widest uppercase transition-all"
                >
                  {isSearching ? <Loader2 size={14} className="animate-spin" /> : "FIND"}
                </button>
                <button
                  type="button"
                  onClick={fetchCurrentLocation}
                  disabled={isLocating}
                  title="Locate Me"
                  className="w-10 bg-white/5 hover:bg-white/10 text-brand-accent rounded-xl flex items-center justify-center border border-white/5 transition-all"
                >
                  {isLocating ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                </button>
             </div>

             <div className="h-[180px] w-full bg-[#f8f9fa] rounded-xl overflow-hidden shadow-inner border border-white/5 z-0 relative">
                {mapPosition ? (
                  <MapContainer center={[mapPosition.lat, mapPosition.lng]} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                     <TileLayer
                       url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                       attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                     />
                     <LocationMarker position={mapPosition} setPosition={setMapPosition} />
                  </MapContainer>
                ) : (
                  <div className="w-full h-full bg-[#11131F]/50 flex flex-col items-center justify-center gap-2">
                     <Loader2 className="text-brand-accent animate-spin" size={24} />
                     <span className="text-[10px] font-black tracking-widest text-white/40 uppercase">Acquiring Frequency...</span>
                  </div>
                )}
             </div>
             <p className="text-[8px] font-bold text-white/20 uppercase text-center px-4 tracking-wider">Tap on the map or type above to find the exact location</p>
             
             <div className="space-y-3 pt-3 border-t border-white/5">
                <div className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2 border border-white/5">
                   <MapIcon size={16} className="text-brand-accent shrink-0" />
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
                
                <div className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2 border border-white/5">
                   <Search size={16} className="text-brand-accent/60 shrink-0" />
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
          <div className="flex items-center gap-2 mb-2">
             <div className="w-1 h-3 bg-brand-accent rounded-full" />
             <h3 className="text-[10px] font-black text-white/40 tracking-[0.2em] uppercase">Funding</h3>
          </div>
          <button 
            type="button"
            onClick={() => setShowWalletInput(!showWalletInput)}
            className="w-full bg-[#11131F] border border-white/5 rounded-2xl p-4 flex items-center justify-between group active:scale-[0.98] transition-all"
          >
             <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors", showWalletInput ? "bg-brand-accent text-[#0A0B14]" : "bg-white/5 text-white/20")}>
                   <Wallet size={18} />
                </div>
                <div className="text-left">
                   <p className="text-xs font-black text-white tracking-widest uppercase">CROWDFUND PARTY</p>
                   <p className="text-[8px] font-bold text-white/20 uppercase">Request contributions from guests</p>
                </div>
             </div>
             <div className={cn("w-5 h-5 rounded-full border border-white/10 flex items-center justify-center transition-all", showWalletInput && "bg-brand-accent border-brand-accent")}>
                {showWalletInput && <Check size={10} className="text-[#0A0B14]" />}
             </div>
          </button>

          <AnimatePresence>
            {showWalletInput && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-brand-accent/5 border border-brand-accent/20 rounded-2xl p-4 flex items-center gap-3">
                   <span className="text-lg font-black text-brand-accent">$</span>
                   <input 
                     type="number" 
                     placeholder="TARGET AMOUNT (E.G. 500)" 
                     value={crowdfundTarget || ''} 
                     onChange={e => setCrowdfundTarget(Number(e.target.value))}
                     className="w-full bg-transparent border-none outline-none text-base font-black text-white placeholder:text-brand-accent/20"
                   />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* PARTY TYPE */}
        <section>
          <div className="flex items-center gap-2 mb-2">
             <div className="w-1 h-3 bg-brand-accent rounded-full" />
             <h3 className="text-[10px] font-black text-white/40 tracking-[0.2em] uppercase">Vibe Architecture</h3>
          </div>
          
          <div className="bg-[#11131F] border border-white/5 rounded-2xl p-4 space-y-4">
             <div className="grid grid-cols-2 gap-2">
                {['RAVE', 'HOUSE PARTY', 'ROOFTOP', 'CLUB', 'DINNER', 'OTHER'].map(type => (
                   <button 
                     key={type}
                     type="button"
                     onClick={() => setPartyType(type)}
                     className={cn(
                        "py-2.5 rounded-xl text-[9px] font-black tracking-widest border transition-all uppercase",
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
                 className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-brand-accent uppercase"
               />
             )}
          </div>
        </section>

         <div className="mt-6 flex justify-center w-full">
            <button 
              onClick={handlePublish} 
              disabled={isSubmitting}
              className={cn(
                "w-full py-4 rounded-2xl bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-black text-xs tracking-[0.2em] shadow-xl transition-all uppercase flex items-center justify-center gap-2",
                isSubmitting ? "opacity-70 cursor-not-allowed" : "shadow-brand-primary/40 active:scale-95 hover:brightness-110"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> LAUNCHING...
                </>
              ) : (
                <>
                  <Sparkles size={16} /> LAUNCH PARTY
                </>
              )}
            </button>
         </div>

      </div>
     </div>

    </div>
  );
}
