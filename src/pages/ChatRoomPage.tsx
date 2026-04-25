import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, ChevronLeft, Info, Calendar, MapPin, Users, Clock, Trash2, X, Instagram, Twitter, ExternalLink, User as UserIcon, Briefcase, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useStore } from '../lib/Store';
import { getAssetUrl, API_BASE } from '../lib/constants';

// Since we don't have a real chat message event on server yet, 
// we'll mock the active chat experience but allow sending
export function ChatRoomPage() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { chats, user, sendSocketMessage, feed, registrations } = useStore();
  const [message, setMessage] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [showManagement, setShowManagement] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [otherUser, setOtherUser] = useState<any | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  const chat = chats.find(c => c.ID === chatId);
  const associatedParty = feed.find(p => p.ID === chat?.PartyID);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const isHost = associatedParty?.HostID === user?.ID;

  useEffect(() => {
    if (chat && !chat.IsGroup && user) {
      const otherId = chat.ParticipantIDs?.find(id => id !== user.ID);
      if (otherId) {
        fetch(`${API_BASE}/api/users/${otherId}`)
          .then(res => res.json())
          .then(data => setOtherUser(data))
          .catch(err => console.error("Other user fetch failed", err));
      }
    }
  }, [chat, user]);

  useEffect(() => {
    if (isHost && showManagement && associatedParty) {
      sendSocketMessage('GET_REGISTRATIONS', { PartyID: associatedParty.ID });
    }
  }, [showManagement, isHost, associatedParty?.ID]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat?.RecentMessages]);

  if (!chat) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <p className="text-white/40 mb-4 font-bold uppercase tracking-widest text-[#FF3B5C]">Session Signal Lost</p>
        <button 
          onClick={() => navigate('/messages')}
          className="px-6 py-3 bg-white/5 rounded-2xl text-xs font-black uppercase tracking-widest text-white hover:bg-white/10"
        >
          Return to Hub
        </button>
      </div>
    );
  }

  const handleSend = (e?: any) => {
    e?.preventDefault();
    if (!message.trim()) return;

    sendSocketMessage('SEND_MESSAGE', {
      ChatID: chat.ID,
      Content: message
    });
    setMessage('');
  };

  const handleUserClick = async (userId: string) => {
    if (userId === user?.ID) return;
    try {
      const res = await fetch(`${API_BASE}/api/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedUser(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDM = () => {
    if (!selectedUser) return;
    sendSocketMessage('CREATE_DM', { TargetUserID: selectedUser.ID });
    setSelectedUser(null);
  };

  const handleDeleteParty = () => {
    if (!associatedParty) return;
    sendSocketMessage('DELETE_PARTY', { PartyID: associatedParty.ID });
    navigate('/messages');
  };

  const getETA = () => {
    if (!chat.IsGroup) return 'DIRECT';
    if (!associatedParty?.StartTime) return 'ESTABLISHING...';
    
    const start = new Date(associatedParty.StartTime);
    const now = new Date();
    const diff = start.getTime() - now.getTime();
    
    // If party is in the future
    if (diff > 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours > 24) return `IN ${Math.floor(hours/24)}D ${hours%24}H`;
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `IN ${hours}H ${mins}M`;
    }
    
    // If party is currently happening (assuming 6h duration max)
    const end = new Date(start.getTime() + (associatedParty.DurationHours || 6) * 3600 * 1000);
    if (now < end) {
      const remainingDiff = end.getTime() - now.getTime();
      const remHours = Math.floor(remainingDiff / (1000 * 60 * 60));
      const remMins = Math.floor((remainingDiff % (1000 * 60 * 60)) / (1000 * 60));
      return `${remHours}H ${remMins}M LEFT`;
    }
    
    // If party ended, show how long ago it was
    const agoDiff = now.getTime() - end.getTime();
    const agoHours = Math.floor(agoDiff / (1000 * 60 * 60));
    if (agoHours > 24) return `${Math.floor(agoHours/24)}D AGO`;
    return `${agoHours}H AGO`;
  };

  return (
    <div className="h-full flex flex-col bg-[#0A0B14]">
      {/* Header - Clickable for full info */}
      <header className="px-4 py-4 flex items-center justify-between border-b border-white/5 bg-[#11131F] z-10 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/messages')}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-white/50 active:scale-95 transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <div 
            onClick={() => setShowInfo(true)}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <img 
              src={!chat.IsGroup && otherUser ? getAssetUrl(otherUser.Thumbnail || (otherUser.ProfilePhotos?.[0] || '')) : (chat.ImageUrl ? getAssetUrl(chat.ImageUrl) : "https://images.unsplash.com/photo-1542382103-6fdb3a652d8e?q=80&w=800&auto=format&fit=crop")} 
              className="w-10 h-10 rounded-full object-cover border border-white/10 group-hover:border-brand-accent transition-colors"
            />
            <div className="min-w-0">
               <h3 className="text-sm font-bold text-white truncate max-w-[150px] group-hover:text-brand-accent transition-colors">
                  {!chat.IsGroup && otherUser ? otherUser.RealName : chat.Title}
               </h3>
               <p className="text-[9px] font-black text-brand-accent uppercase tracking-widest">{getETA()}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isHost && (
            <button 
              onClick={() => setShowManagement(true)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-brand-accent hover:bg-white/10 active:scale-95 transition-all"
            >
              <Users size={20} />
            </button>
          )}
          <button 
            onClick={() => setShowInfo(!showInfo)}
            className={cn(
              "w-10 h-10 flex items-center justify-center rounded-xl transition-all",
              showInfo ? "bg-brand-accent text-[#0A0B14]" : "bg-white/5 text-white/50"
            )}
          >
            <Info size={20} />
          </button>
        </div>
      </header>

      <div className="flex-1 relative overflow-hidden flex flex-col">
        {/* Chat Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-hide pb-10">
          <div className="py-4" />

          {chat.RecentMessages?.map((msg: any, idx: number) => {
             const isMe = msg.SenderID === user?.ID;
             return (
               <div key={idx} className={cn("flex gap-3 mb-6", isMe ? "flex-row-reverse" : "flex-row")}>
                 {!isMe && (
                   <img 
                     src={!chat.IsGroup && otherUser && msg.SenderID === otherUser.ID 
                       ? getAssetUrl(otherUser.Thumbnail || (otherUser.ProfilePhotos?.[0] || '')) 
                       : (chat.ImageUrl ? getAssetUrl(chat.ImageUrl) : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100")} 
                     className="w-10 h-10 rounded-2xl object-cover border border-white/5 bg-white/5 shrink-0 cursor-pointer hover:border-brand-accent transition-all active:scale-95"
                     onClick={() => handleUserClick(msg.SenderID)}
                   />
                 )}
                 <div className={cn("flex flex-col max-w-[75%]", isMe ? "items-end" : "items-start")}>
                   <div 
                     onClick={() => !isMe && handleUserClick(msg.SenderID)}
                     className={cn(
                     "px-5 py-3.5 rounded-[28px] shadow-2xl relative",
                     isMe 
                       ? "bg-gradient-to-br from-[#FF3B5C] to-[#7042F8] text-white rounded-tr-none" 
                       : "bg-[#1A1A24] text-white/90 rounded-tl-none border border-white/5 cursor-pointer hover:bg-[#252533] transition-colors"
                   )}>
                     <p className="text-[14px] font-medium leading-relaxed tracking-tight">{msg.Content}</p>
                   </div>
                   <p className={cn("text-[8px] mt-2 font-black uppercase tracking-widest text-white/20 px-1")}>
                      {new Date(msg.Timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                   </p>
                 </div>
               </div>
             );
          })}
          
          {chat.RecentMessages?.length === 0 && (
             <div className="flex-1 flex flex-col items-center justify-center py-12">
                <p className="text-xs font-black text-white/10 uppercase tracking-[0.4em]">Establishing Signal...</p>
             </div>
          )}
        </div>

        {/* Info Sidebar Overlay - Now showing ALL Party Info */}
        <AnimatePresence>
           {showInfo && (
             <motion.div 
               initial={{ x: '100%' }}
               animate={{ x: 0 }}
               exit={{ x: '100%' }}
               transition={{ type: 'spring', damping: 30, stiffness: 250 }}
               className="absolute inset-0 bg-[#0A0B14] z-20 border-l border-white/5 flex flex-col overflow-y-auto scrollbar-hide"
             >
                {chat.IsGroup ? (
                   <>
                    {associatedParty?.PartyPhotos && associatedParty.PartyPhotos.length > 0 && (
                       <div className="relative h-72 w-full shrink-0 group">
                          <div 
                            className="w-full h-full flex overflow-x-auto snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                            onScroll={(e) => {
                              const idx = Math.round(e.currentTarget.scrollLeft / e.currentTarget.offsetWidth);
                              setCurrentPhotoIndex(idx);
                            }}
                          >
                             {associatedParty.PartyPhotos.map((photo: string, idx: number) => (
                                <div key={idx} className="w-full h-full flex-none snap-center relative">
                                   <img src={getAssetUrl(photo)} className="w-full h-full object-cover" />
                                   <div className="absolute inset-0 bg-gradient-to-t from-[#0A0B14] via-transparent to-transparent pointer-events-none" />
                                </div>
                             ))}
                          </div>

                          <button 
                            onClick={() => { setShowInfo(false); setCurrentPhotoIndex(0); }}
                            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-white transition-colors border border-white/10 z-10"
                          >
                            <X size={20} />
                          </button>

                          {associatedParty.PartyPhotos.length > 1 && (
                            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-1.5 z-10">
                              {associatedParty.PartyPhotos.map((_: any, idx: number) => (
                                 <div 
                                   key={idx}
                                   className={cn(
                                     "h-1.5 rounded-full transition-all duration-300",
                                     currentPhotoIndex === idx ? "w-4 bg-brand-accent shadow-[0_0_8px_rgba(33,212,253,0.5)]" : "w-1.5 bg-white/30"
                                   )}
                                 />
                              ))}
                            </div>
                          )}
                       </div>
                    )}

                    <div className="p-8 space-y-10">
                       <div>
                          <h2 className="text-3xl font-black text-white tracking-widest uppercase mb-2">
                            {associatedParty?.Title || chat.Title}
                          </h2>
                          <div className="flex items-center gap-2 mb-6">
                             <div className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
                             <p className="text-[10px] font-black text-brand-accent uppercase tracking-[0.2em]">{associatedParty?.PartyType || 'SESSION'}</p>
                          </div>
                          <p className="text-sm font-medium text-white/50 leading-relaxed uppercase tracking-tight">
                             {associatedParty?.Description || 'NO DATA RECEIVED'}
                          </p>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          <div className="bg-[#11131F] border border-white/5 rounded-3xl p-5">
                             <Calendar className="text-brand-accent mb-3" size={18} />
                             <p className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-1">Timeline</p>
                             <p className="text-xs font-bold text-white uppercase">
                                {associatedParty?.StartTime ? new Date(associatedParty.StartTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : 'TBD'}
                             </p>
                          </div>
                          <div className="bg-[#11131F] border border-white/5 rounded-3xl p-5">
                             <MapPin className="text-brand-accent mb-3" size={18} />
                             <p className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-1">Vibe City</p>
                             <p className="text-xs font-bold text-white uppercase">{associatedParty?.City || 'LOCATION TBD'}</p>
                          </div>
                          <div className="bg-[#11131F] border border-white/5 rounded-3xl p-5">
                             <Users className="text-brand-accent mb-3" size={18} />
                             <p className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-1">Sync count</p>
                             <p className="text-xs font-bold text-white uppercase tracking-tight">
                                {associatedParty?.CurrentGuestCount || 0} / {associatedParty?.MaxCapacity || 300} GUESTS
                             </p>
                          </div>
                          <div className="bg-[#11131F] border border-white/5 rounded-3xl p-5">
                             <Clock className="text-brand-accent mb-3" size={18} />
                             <p className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-1">Status</p>
                             <p className="text-xs font-bold text-white uppercase">{getETA()}</p>
                          </div>
                       </div>

                       <div className="bg-[#11131F] border border-white/5 rounded-[32px] p-6">
                          <h4 className="text-[10px] font-black text-white tracking-[0.2em] uppercase mb-4 flex items-center gap-2">
                             <MapPin size={12} className="text-brand-accent" /> EXACT COORDINATES
                          </h4>
                          <p className="text-[11px] font-bold text-white/40 leading-relaxed">
                             {associatedParty?.Address || 'Visible only to confirmed attendees'}
                          </p>
                       </div>

                       {isHost && associatedParty && (
                          <div className="pt-8 border-t border-white/5 mt-6">
                             {!isConfirmingDelete ? (
                               <button 
                                 onClick={() => setIsConfirmingDelete(true)}
                                 className="w-full py-5 rounded-[24px] bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-red-500/20"
                               >
                                  <Trash2 size={16} />
                                  Dissolve Party Hub
                               </button>
                             ) : (
                               <div className="flex flex-col gap-4">
                                 <p className="text-red-500 text-[10px] text-center font-bold tracking-widest uppercase">Are you absolutely sure? This cannot be undone.</p>
                                 <div className="flex gap-3">
                                   <button 
                                     onClick={handleDeleteParty}
                                     className="flex-1 py-4 rounded-[20px] bg-red-500 border border-red-500 text-white text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center active:scale-95 transition-all outline-none"
                                   >
                                      YES, DISSOLVE
                                   </button>
                                   <button 
                                     onClick={() => setIsConfirmingDelete(false)}
                                     className="className-1 py-4 rounded-[20px] bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center active:scale-95 transition-all hover:bg-white/10 outline-none"
                                   >
                                      CANCEL
                                   </button>
                                 </div>
                               </div>
                             )}
                          </div>
                       )}
                    </div>
                   </>
                ) : (
                   <div className="flex flex-col flex-1">
                      {otherUser ? (
                        <>
                          <div className="relative h-96 w-full shrink-0 group">
                             <div 
                               className="w-full h-full flex overflow-x-auto snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                               onScroll={(e) => {
                                 const idx = Math.round(e.currentTarget.scrollLeft / e.currentTarget.offsetWidth);
                                 setCurrentPhotoIndex(idx);
                               }}
                             >
                                {(otherUser.ProfilePhotos?.length > 0 ? otherUser.ProfilePhotos : [otherUser.Thumbnail || ""]).filter(Boolean).map((photo: string, idx: number) => (
                                   <div key={idx} className="w-full h-full flex-none snap-center relative">
                                      <img src={getAssetUrl(photo) || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=800"} className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0B14] via-[#0A0B14]/40 to-transparent pointer-events-none" />
                                   </div>
                                ))}
                             </div>

                             <button 
                               onClick={() => { setShowInfo(false); setCurrentPhotoIndex(0); }}
                               className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-white transition-colors border border-white/10 z-10"
                             >
                                <X size={20} />
                             </button>

                             <div className="absolute bottom-6 right-6 z-20">
                                 <div className="px-3 py-1.5 bg-black/80 backdrop-blur-md rounded-xl text-xs font-bold text-amber-400 flex items-center shadow-lg border border-white/5 uppercase">
                                    🛡️ {(otherUser.TrustScore || 100).toFixed(1)} TRUST
                                 </div>
                             </div>

                             <div className="absolute bottom-6 left-8 right-8 pointer-events-none z-10">
                                <h2 className="text-4xl font-black text-white tracking-widest uppercase mb-1 drop-shadow-lg">
                                  {otherUser.RealName}
                                </h2>
                                <div className="flex gap-4">
                                  {otherUser.Gender && <p className="text-sm font-bold text-brand-accent uppercase tracking-widest drop-shadow-md">{otherUser.Gender}</p>}
                                </div>
                             </div>

                             {otherUser.ProfilePhotos?.length > 1 && (
                               <div className="absolute top-6 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
                                 {otherUser.ProfilePhotos.map((_: any, idx: number) => (
                                    <div 
                                      key={idx}
                                      className={cn(
                                        "h-1.5 rounded-full transition-all duration-300",
                                        currentPhotoIndex === idx ? "w-4 bg-brand-accent shadow-[0_0_8px_rgba(33,212,253,0.5)]" : "w-1.5 bg-white/30"
                                      )}
                                    />
                                 ))}
                               </div>
                             )}
                          </div>

                          <div className="px-6 -mt-4 relative z-10 space-y-8 pb-32 pt-10">
                             {/* Name & Bio */}
                             <div>
                                <h1 className="text-4xl font-bold text-white mb-6 tracking-tight">{otherUser.RealName}</h1>
                                <h3 className="text-[10px] font-bold text-white/40 tracking-wider mb-2 uppercase">About Me</h3>
                                <p className="text-sm text-white/80 leading-relaxed">
                                  {otherUser.Bio || "No bio added yet."}
                                </p>
                             </div>

                             {/* Vibe Impact */}
                             <div className="bg-[#11131F] border border-white/5 rounded-3xl p-5">
                                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-4">Vibe Impact</p>
                                <div className="flex items-center justify-between">
                                   <div className="flex flex-col">
                                      <span className="text-xl font-black text-white uppercase tracking-tighter">
                                         {otherUser.HostedCount || 0}
                                      </span>
                                      <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-1">Hosted</span>
                                   </div>
                                   <div className="w-px h-8 bg-white/10 mx-2" />
                                   <div className="flex flex-col">
                                      <span className="text-xl font-black text-brand-accent uppercase tracking-tighter">
                                         {otherUser.HostingRating ? `${otherUser.HostingRating}%` : "0%"}
                                      </span>
                                      <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-1">Rating</span>
                                   </div>
                                   <div className="w-px h-8 bg-white/10 mx-2" />
                                   <div className="flex flex-col">
                                      <span className="text-xl font-black text-white uppercase tracking-tighter">
                                         {otherUser.Reach ? (otherUser.Reach >= 1000 ? `${(otherUser.Reach / 1000).toFixed(1)}K` : otherUser.Reach) : "0"}
                                      </span>
                                      <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-1">Reach</span>
                                   </div>
                                </div>
                             </div>

                             {/* Lifestyle */}
                             {(otherUser.Gender || otherUser.HeightCm > 0) && (
                               <section>
                                  <h3 className="text-[10px] font-bold text-white/40 tracking-wider mb-3 uppercase">Lifestyle</h3>
                                  <div className="space-y-3">
                                     {otherUser.Gender && (
                                       <div className="bg-[#11131F] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                                          <div className="flex flex-col">
                                             <span className="text-[10px] text-white/40 mb-1">Gender</span>
                                             <span className="text-sm text-white font-medium uppercase">{otherUser.Gender}</span>
                                          </div>
                                          <UserIcon size={16} className="text-white/20" />
                                       </div>
                                     )}

                                     {otherUser.HeightCm > 0 && (
                                       <div className="grid grid-cols-2 gap-3">
                                           <div className="bg-[#11131F] border border-white/5 rounded-2xl p-4 flex flex-col justify-center">
                                             <span className="text-sm text-white font-medium flex items-center gap-2"><span className="text-white/20">📏</span> {otherUser.HeightCm} cm</span>
                                          </div>
                                       </div>
                                     )}
                                  </div>
                               </section>
                             )}

                             {/* Work & Ed */}
                             {(otherUser.JobTitle || otherUser.School) && (
                               <section>
                                  <h3 className="text-[10px] font-bold text-white/40 tracking-wider mb-3 uppercase">Work & Education</h3>
                                  <div className="space-y-3">
                                     {otherUser.JobTitle && (
                                       <div className="bg-[#11131F] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                                          <Briefcase size={18} className="text-white/20 shrink-0" />
                                          <span className="text-sm text-white font-medium">{otherUser.JobTitle} {otherUser.Company && `at ${otherUser.Company}`}</span>
                                       </div>
                                     )}
                                     {otherUser.School && (
                                       <div className="bg-[#11131F] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                                          <GraduationCap size={18} className="text-white/20 shrink-0" />
                                          <span className="text-sm text-white font-medium">{otherUser.School} {otherUser.Degree && `- ${otherUser.Degree}`}</span>
                                       </div>
                                     )}
                                  </div>
                               </section>
                             )}

                             {/* Socials */}
                             {(otherUser.Instagram || otherUser.Twitter) && (
                               <section className="mb-4">
                                 <h3 className="text-[10px] font-bold text-white/40 tracking-wider mb-3 uppercase">Socials</h3>
                                 <div className="flex gap-3">
                                    {otherUser.Instagram && (
                                       <a 
                                         href={`https://instagram.com/${otherUser.Instagram}`} 
                                         target="_blank" 
                                         rel="noopener noreferrer"
                                         onClick={(e) => e.stopPropagation()}
                                         className="flex-1 bg-[#11131F] border border-white/5 rounded-2xl p-4 flex items-center gap-3 hover:bg-white/5 transition-colors group"
                                       >
                                          <Instagram size={18} className="text-pink-500 shrink-0 group-hover:scale-110 transition-transform" />
                                          <span className="text-sm text-white font-medium truncate group-hover:text-brand-primary transition-colors">@{otherUser.Instagram}</span>
                                       </a>
                                    )}
                                    {otherUser.Twitter && (
                                       <a 
                                         href={`https://x.com/${otherUser.Twitter}`} 
                                         target="_blank" 
                                         rel="noopener noreferrer"
                                         onClick={(e) => e.stopPropagation()}
                                         className="flex-1 bg-[#11131F] border border-white/5 rounded-2xl p-4 flex items-center gap-3 hover:bg-white/5 transition-colors group"
                                       >
                                          <Twitter size={18} className="text-blue-400 shrink-0 group-hover:scale-110 transition-transform" />
                                          <span className="text-sm text-white font-medium truncate group-hover:text-brand-primary transition-colors">@{otherUser.Twitter}</span>
                                       </a>
                                    )}
                                 </div>
                               </section>
                             )}

                             <div className="pt-6 border-t border-white/10 uppercase">
                                <button className="w-full py-4 text-xs font-black text-red-500 hover:text-red-400 transition-colors tracking-widest text-center">
                                   REPORT PROFILE
                                </button>
                             </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-10 opacity-20">
                           <p className="text-xs font-black uppercase tracking-[0.3em]">Syncing Profile...</p>
                        </div>
                      )}
                   </div>
                )}
             </motion.div>
           )}
        </AnimatePresence>

        {/* Management Overlay */}
        <AnimatePresence>
           {showManagement && (
             <motion.div 
               initial={{ y: '100%' }}
               animate={{ y: 0 }}
               exit={{ y: '100%' }}
               transition={{ type: 'spring', damping: 25, stiffness: 200 }}
               className="absolute inset-x-0 bottom-0 top-0 bg-[#0A0B14] z-30 flex flex-col"
             >
                <header className="px-6 py-6 border-b border-white/5 flex items-center justify-between shrink-0">
                   <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-widest">Guest Control</h3>
                      <p className="text-[9px] font-bold text-white/30 uppercase mt-1">Manage Signal Requests</p>
                   </div>
                   <button 
                      onClick={() => setShowManagement(false)}
                      className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/50"
                   >
                      <X size={20} />
                   </button>
                </header>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                   {registrations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full opacity-20 py-20">
                         <Users size={48} className="mb-4" />
                         <p className="text-xs font-black uppercase tracking-[0.3em]">No Pending Signals</p>
                      </div>
                   ) : (
                      registrations.map((reg: any) => (
                         <div key={reg.ID} className="bg-[#11131F] border border-white/5 rounded-[24px] p-4 flex items-center gap-4">
                            <img 
                              onClick={() => handleUserClick(reg.UserID)}
                              src={getAssetUrl(reg.UserThumbnail || reg.UserProfilePhotos?.[0] || '') || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200"} 
                              className="w-12 h-12 rounded-full object-cover border border-white/10 cursor-pointer hover:border-brand-accent transition-colors" 
                            />
                            <div className="flex-1 min-w-0" onClick={() => handleUserClick(reg.UserID)}>
                               <p className="text-sm font-bold text-white truncate cursor-pointer hover:text-brand-accent transition-colors">{reg.RealName}</p>
                               <div className="flex items-center gap-2 mt-1">
                                  <span className={cn(
                                    "text-[8px] font-black uppercase px-2 py-0.5 rounded-full border",
                                    reg.Status === 'PENDING' ? "text-yellow-500 border-yellow-500/20 bg-yellow-500/5" : "text-brand-accent border-brand-accent/20 bg-brand-accent/5"
                                  )}>
                                     {reg.Status}
                                  </span>
                                  <span className="text-[8px] font-bold text-white/20 uppercase">
                                     {new Date(reg.Timestamp).toLocaleDateString()}
                                  </span>
                                </div>
                            </div>
                            {reg.Status === 'PENDING' && (
                               <button 
                                 onClick={() => sendSocketMessage('APPROVE_JOIN_REQUEST', { RegistrationID: reg.ID })}
                                 className="px-4 py-2 bg-brand-accent text-[#0A0B14] text-[10px] font-black rounded-xl active:scale-95 transition-all shadow-lg shadow-brand-accent/20"
                               >
                                  APPROVE
                               </button>
                            )}
                         </div>
                      ))
                   )}
                </div>
             </motion.div>
           )}
         </AnimatePresence>

        {/* User Profile Overlay */}
        <AnimatePresence>
           {selectedUser && (
             <motion.div 
               initial={{ y: '100%' }}
               animate={{ y: 0 }}
               exit={{ y: '100%' }}
               transition={{ type: 'spring', damping: 30, stiffness: 250 }}
               className="absolute inset-0 bg-[#0A0B14] z-[60] flex flex-col overflow-y-auto scrollbar-hide"
             >
                <div className="relative h-96 w-full shrink-0 group">
                   <div 
                     className="w-full h-full flex overflow-x-auto snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                     onScroll={(e) => {
                       const idx = Math.round(e.currentTarget.scrollLeft / e.currentTarget.offsetWidth);
                       setCurrentPhotoIndex(idx);
                     }}
                   >
                      {(selectedUser.ProfilePhotos?.length > 0 ? selectedUser.ProfilePhotos : [selectedUser.Thumbnail || ""]).filter(Boolean).map((photo: string, idx: number) => (
                         <div key={idx} className="w-full h-full flex-none snap-center relative">
                            <img src={getAssetUrl(photo) || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=800"} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0B14] via-[#0A0B14]/40 to-transparent pointer-events-none" />
                         </div>
                      ))}
                   </div>

                   <button 
                     onClick={() => { setSelectedUser(null); setCurrentPhotoIndex(0); }}
                     className="absolute top-6 left-6 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-white transition-colors border border-white/10 z-10"
                   >
                     <ChevronLeft size={20} />
                   </button>

                   <div className="absolute bottom-6 right-6 z-20">
                       <div className="px-3 py-1.5 bg-black/80 backdrop-blur-md rounded-xl text-xs font-bold text-amber-400 flex items-center shadow-lg border border-white/5 uppercase">
                          🛡️ {(selectedUser.TrustScore || 100).toFixed(1)} TRUST
                       </div>
                   </div>

                   {selectedUser.ProfilePhotos?.length > 1 && (
                     <div className="absolute top-6 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
                       {selectedUser.ProfilePhotos.map((_: any, idx: number) => (
                          <div 
                            key={idx}
                            className={cn(
                              "h-1.5 rounded-full transition-all duration-300",
                              currentPhotoIndex === idx ? "w-4 bg-brand-accent shadow-[0_0_8px_rgba(33,212,253,0.5)]" : "w-1.5 bg-white/30"
                            )}
                          />
                       ))}
                     </div>
                   )}
                </div>

                <div className="px-6 -mt-4 relative z-10 space-y-8 pb-32 pt-10">
                   {/* Name & Bio */}
                   <div>
                      <h1 className="text-4xl font-bold text-white mb-6 tracking-tight">{selectedUser.RealName}</h1>
                      <h3 className="text-[10px] font-bold text-white/40 tracking-wider mb-2 uppercase">About Me</h3>
                      <p className="text-sm text-white/80 leading-relaxed">
                        {selectedUser.Bio || "No bio added yet."}
                      </p>
                   </div>

                   {/* Vibe Impact */}
                   <div className="bg-[#11131F] border border-white/5 rounded-3xl p-5">
                      <p className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-4">Vibe Impact</p>
                      <div className="flex items-center justify-between">
                         <div className="flex flex-col">
                            <span className="text-xl font-black text-white uppercase tracking-tighter">
                               {selectedUser.HostedCount || 0}
                            </span>
                            <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-1">Hosted</span>
                         </div>
                         <div className="w-px h-8 bg-white/10 mx-2" />
                         <div className="flex flex-col">
                            <span className="text-xl font-black text-brand-accent uppercase tracking-tighter">
                               {selectedUser.HostingRating ? `${selectedUser.HostingRating}%` : "0%"}
                            </span>
                            <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-1">Rating</span>
                         </div>
                         <div className="w-px h-8 bg-white/10 mx-2" />
                         <div className="flex flex-col">
                            <span className="text-xl font-black text-white uppercase tracking-tighter">
                               {selectedUser.Reach ? (selectedUser.Reach >= 1000 ? `${(selectedUser.Reach / 1000).toFixed(1)}K` : selectedUser.Reach) : "0"}
                            </span>
                            <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-1">Reach</span>
                         </div>
                      </div>
                   </div>

                   {/* Lifestyle */}
                   {(selectedUser.Gender || selectedUser.HeightCm > 0) && (
                     <section>
                        <h3 className="text-[10px] font-bold text-white/40 tracking-wider mb-3 uppercase">Lifestyle</h3>
                        <div className="space-y-3">
                           {selectedUser.Gender && (
                             <div className="bg-[#11131F] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                                <div className="flex flex-col">
                                   <span className="text-[10px] text-white/40 mb-1">Gender</span>
                                   <span className="text-sm text-white font-medium uppercase">{selectedUser.Gender}</span>
                                </div>
                                <UserIcon size={16} className="text-white/20" />
                             </div>
                           )}

                           {selectedUser.HeightCm > 0 && (
                             <div className="grid grid-cols-2 gap-3">
                                 <div className="bg-[#11131F] border border-white/5 rounded-2xl p-4 flex flex-col justify-center">
                                   <span className="text-sm text-white font-medium flex items-center gap-2"><span className="text-white/20">📏</span> {selectedUser.HeightCm} cm</span>
                                </div>
                             </div>
                           )}
                        </div>
                     </section>
                   )}

                   {/* Work & Ed */}
                   {(selectedUser.JobTitle || selectedUser.School) && (
                     <section>
                        <h3 className="text-[10px] font-bold text-white/40 tracking-wider mb-3 uppercase">Work & Education</h3>
                        <div className="space-y-3">
                           {selectedUser.JobTitle && (
                             <div className="bg-[#11131F] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                                <Briefcase size={18} className="text-white/20 shrink-0" />
                                <span className="text-sm text-white font-medium">{selectedUser.JobTitle} {selectedUser.Company && `at ${selectedUser.Company}`}</span>
                             </div>
                           )}
                           {selectedUser.School && (
                             <div className="bg-[#11131F] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                                <GraduationCap size={18} className="text-white/20 shrink-0" />
                                <span className="text-sm text-white font-medium">{selectedUser.School} {selectedUser.Degree && `- ${selectedUser.Degree}`}</span>
                             </div>
                           )}
                        </div>
                     </section>
                   )}

                   {/* Socials */}
                   {(selectedUser.Instagram || selectedUser.Twitter) && (
                     <section className="mb-4">
                       <h3 className="text-[10px] font-bold text-white/40 tracking-wider mb-3 uppercase">Socials</h3>
                       <div className="flex gap-3">
                          {selectedUser.Instagram && (
                             <a 
                               href={`https://instagram.com/${selectedUser.Instagram}`} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               onClick={(e) => e.stopPropagation()}
                               className="flex-1 bg-[#11131F] border border-white/5 rounded-2xl p-4 flex items-center gap-3 hover:bg-white/5 transition-colors group"
                             >
                                <Instagram size={18} className="text-pink-500 shrink-0 group-hover:scale-110 transition-transform" />
                                <span className="text-sm text-white font-medium truncate group-hover:text-brand-primary transition-colors">@{selectedUser.Instagram}</span>
                             </a>
                          )}
                          {selectedUser.Twitter && (
                             <a 
                               href={`https://x.com/${selectedUser.Twitter}`} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               onClick={(e) => e.stopPropagation()}
                               className="flex-1 bg-[#11131F] border border-white/5 rounded-2xl p-4 flex items-center gap-3 hover:bg-white/5 transition-colors group"
                             >
                                <Twitter size={18} className="text-blue-400 shrink-0 group-hover:scale-110 transition-transform" />
                                <span className="text-sm text-white font-medium truncate group-hover:text-brand-primary transition-colors">@{selectedUser.Twitter}</span>
                             </a>
                          )}
                       </div>
                     </section>
                   )}

                   <div className="pt-6 border-t border-white/10 uppercase">
                      <button className="w-full py-4 text-xs font-black text-red-500 hover:text-red-400 transition-colors tracking-widest text-center">
                         REPORT PROFILE
                      </button>
                   </div>

                   {chat.IsGroup && (
                       <div className="pt-4">
                          <button 
                            onClick={handleDM}
                            className="w-full py-5 rounded-[24px] bg-white text-black text-[12px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-white/90"
                          >
                             <Send size={16} />
                             Send Message
                          </button>
                       </div>
                   )}
                </div>
             </motion.div>
           )}
        </AnimatePresence>

      </div>

      {/* Input */}
      <div className="p-4 pt-2 shrink-0 bg-[#11131F] border-t border-white/5">
         <form onSubmit={handleSend} className="flex gap-2 bg-white/5 rounded-full p-1 border border-white/5 overflow-hidden">
            <input 
              type="text" 
              placeholder="SEND MESSAGE..." 
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="flex-1 bg-transparent px-4 py-3 outline-none text-sm text-white placeholder:text-white/20 font-bold uppercase tracking-tight"
            />
            <button 
              type="submit"
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                message.trim() ? "bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-lg shadow-brand-primary/20" : "bg-white/5 text-white/20"
              )}
            >
              <Send size={18} />
            </button>
         </form>
      </div>
    </div>
  );
}
