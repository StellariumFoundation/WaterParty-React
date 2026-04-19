import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, ChevronLeft, Info, Calendar, MapPin, Users, Clock, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useStore } from '../lib/Store';
import { getAssetUrl } from '../lib/constants';

// Since we don't have a real chat message event on server yet, 
// we'll mock the active chat experience but allow sending
export function ChatRoomPage() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { chats, user, sendSocketMessage, feed, registrations } = useStore();
  const [message, setMessage] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [showManagement, setShowManagement] = useState(false);
  
  const chat = chats.find(c => c.ID === chatId);
  const associatedParty = feed.find(p => p.ID === chat?.PartyID);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const isHost = associatedParty?.HostID === user?.ID;

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

  const handleDeleteParty = () => {
    if (!associatedParty) return;
    if (window.confirm("ARE YOU ABSOLUTELY SURE? This will permanently delete the party, clear all chat records, and dissolve the guest list. This action cannot be undone.")) {
       sendSocketMessage('DELETE_PARTY', { PartyID: associatedParty.ID });
       navigate('/messages');
    }
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
              src={chat.ImageUrl ? getAssetUrl(chat.ImageUrl) : "https://images.unsplash.com/photo-1542382103-6fdb3a652d8e?q=80&w=800&auto=format&fit=crop"} 
              className="w-10 h-10 rounded-full object-cover border border-white/10 group-hover:border-brand-accent transition-colors"
            />
            <div className="min-w-0">
               <h3 className="text-sm font-bold text-white truncate max-w-[150px] group-hover:text-brand-accent transition-colors">{chat.Title}</h3>
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
               <div key={idx} className={cn("flex flex-col mb-4", isMe ? "items-end" : "items-start")}>
                 <div className={cn(
                   "max-w-[85%] px-4 py-3 rounded-[24px] shadow-2xl relative",
                   isMe 
                     ? "bg-gradient-to-br from-[#FF3B5C] to-[#7042F8] text-white rounded-tr-none" 
                     : "bg-[#1A1A24] text-white/90 rounded-tl-none border border-white/5"
                 )}>
                   <p className="text-[14px] leading-relaxed tracking-tight">{msg.Content}</p>
                 </div>
                 <p className={cn("text-[8px] mt-1.5 font-black uppercase tracking-widest text-white/20 px-1")}>
                    {new Date(msg.Timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                 </p>
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
                {associatedParty?.PartyPhotos?.[0] && (
                   <div className="relative h-64 w-full overflow-hidden shrink-0">
                      <img src={getAssetUrl(associatedParty.PartyPhotos[0])} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0B14] via-transparent to-transparent" />
                      <button 
                        onClick={() => setShowInfo(false)}
                        className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-white transition-colors border border-white/10"
                      >
                        <X size={20} />
                      </button>
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

                   {associatedParty?.PartyPhotos && associatedParty.PartyPhotos.length > 1 && (
                      <div>
                         <h4 className="text-[10px] font-black text-white/20 tracking-[0.2em] uppercase mb-4">GALLERY</h4>
                         <div className="grid grid-cols-2 gap-3">
                            {associatedParty.PartyPhotos.slice(1).map((photo: string, i: number) => (
                               <img key={i} src={getAssetUrl(photo)} className="w-full aspect-square rounded-2xl object-cover border border-white/5" />
                            ))}
                         </div>
                      </div>
                   )}

                   {isHost && associatedParty && (
                      <div className="pt-8 border-t border-white/5 mt-6">
                         <button 
                           onClick={handleDeleteParty}
                           className="w-full py-5 rounded-[24px] bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-red-500/20"
                         >
                            <Trash2 size={16} />
                            Dissolve Party Hub
                         </button>
                      </div>
                   )}
                </div>
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
                              src={reg.UserThumbnail ? getAssetUrl(reg.UserThumbnail) : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200"} 
                              className="w-12 h-12 rounded-full object-cover border border-white/10" 
                            />
                            <div className="flex-1 min-w-0">
                               <p className="text-sm font-bold text-white truncate">{reg.RealName}</p>
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
