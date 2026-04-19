import { useState } from 'react';
import { cn } from '../lib/utils';
import { MessageSquare, MapPin, Clock, ChevronRight } from 'lucide-react';
import { useStore } from '../lib/Store';
import { getAssetUrl } from '../lib/constants';
import { useNavigate } from 'react-router-dom';

export function MessagesPage() {
  const [activeTab, setActiveTab] = useState<'party' | 'direct'>('party');
  const { chats, feed } = useStore();
  const navigate = useNavigate();

  const activeChats = chats.filter((c) => activeTab === 'party' ? c.IsGroup : !c.IsGroup);

  return (
    <div className="h-full w-full bg-transparent flex flex-col pt-12 pb-24">
      {/* Top Tabs */}
      <div className="px-6 flex items-center justify-center z-10 mb-8 shrink-0">
        <div className="bg-[#131522] rounded-full p-1.5 flex w-full max-w-sm border border-white/5 shadow-2xl">
          <button
            onClick={() => setActiveTab('party')}
            className={cn(
               "flex-1 py-3 text-[10px] font-black tracking-widest rounded-full transition-all duration-300",
               activeTab === 'party' ? "bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-xl shadow-brand-primary/20" : "text-white/30"
            )}
          >
            PARTY CHATS
          </button>
          <button
            onClick={() => setActiveTab('direct')}
            className={cn(
               "flex-1 py-3 text-[10px] font-black tracking-widest rounded-full transition-all duration-300",
               activeTab === 'direct' ? "bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-xl shadow-brand-primary/20" : "text-white/30"
            )}
          >
            DIRECT MESSAGES
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col px-6 relative overflow-y-auto scrollbar-hide">
         {activeChats.length === 0 ? (
           <div className="flex-1 flex flex-col items-center justify-center py-20 px-10 text-center">
             <div className="w-24 h-24 rounded-[32px] bg-[#11131F] border border-white/5 flex items-center justify-center mb-8 shadow-2xl">
                <MessageSquare size={40} className="text-white/10" />
             </div>
             <h2 className="text-xl font-black text-white mb-2 uppercase tracking-tight">
                {activeTab === 'party' ? 'SILENCE DETECTED' : 'NO FREQUENCIES'}
             </h2>
             <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.2em] leading-relaxed">
                {activeTab === 'party' 
                   ? 'Host or join a session to activate the network'
                   : 'Keep swiping to sync with other users'}
             </p>
           </div>
         ) : (
           <div className="flex flex-col space-y-4 pb-10">
              {activeChats.map(chat => {
                  const displayImage = chat.ImageUrl ? getAssetUrl(chat.ImageUrl) : "https://images.unsplash.com/photo-1542382103-6fdb3a652d8e?q=80&w=800&auto=format&fit=crop";
                  
                  // Find associated party for extra details
                  const associatedParty = feed.find(p => p.ID === chat.PartyID);
                  
                  const getETA = () => {
                    if (!chat.IsGroup) return 'DIRECT';
                    if (!associatedParty?.StartTime) return 'TIME TBD';
                    
                    const start = new Date(associatedParty.StartTime);
                    const now = new Date();
                    const diff = start.getTime() - now.getTime();
                    
                    if (diff > 0) {
                      const hours = Math.floor(diff / (1000 * 60 * 60));
                      if (hours > 24) return `IN ${Math.floor(hours/24)}D ${hours%24}H`;
                      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                      return `IN ${hours}H ${mins}M`;
                    }
                    
                    const end = new Date(start.getTime() + (associatedParty.DurationHours || 6) * 3600 * 1000);
                    if (now < end) {
                      const remainingDiff = end.getTime() - now.getTime();
                      const remHours = Math.floor(remainingDiff / (1000 * 60 * 60));
                      const remMins = Math.floor((remainingDiff % (1000 * 60 * 60)) / (1000 * 60));
                      return `${remHours}H ${remMins}M LEFT`;
                    }
                    
                    const agoDiff = now.getTime() - end.getTime();
                    const agoHours = Math.floor(agoDiff / (1000 * 60 * 60));
                    if (agoHours > 24) return `${Math.floor(agoHours/24)}D AGO`;
                    return `${agoHours}H AGO`;
                  };

                  return (
                     <div 
                        key={chat.ID} 
                        onClick={() => navigate(`/chat/${chat.ID}`)}
                        className="group flex flex-col p-5 rounded-[32px] bg-[#11131F] border border-white/5 active:scale-[0.98] transition-all duration-200 hover:border-brand-accent/20 cursor-pointer shadow-xl shadow-black/20"
                     >
                        <div className="flex items-center gap-4 mb-4">
                           <div className="relative">
                              <img src={displayImage} className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-white/10" />
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-brand-accent border-2 border-[#11131F] shadow-[0_0_8px_rgba(0,210,255,0.6)]" />
                           </div>
                           <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-1">
                                 <h4 className="text-sm font-black text-white truncate max-w-[130px] uppercase tracking-wide group-hover:text-brand-accent transition-colors">
                                    {chat.Title}
                                 </h4>
                                 <span className="text-[9px] font-black text-brand-accent uppercase tracking-widest">{getETA()}</span>
                              </div>
                              <p className="text-[11px] font-medium text-white/40 truncate italic pr-4">
                                {chat.RecentMessages?.length > 0 
                                  ? `"${chat.RecentMessages[chat.RecentMessages.length-1].Content}"` 
                                  : "Frequency established. Awaiting signals..."}
                              </p>
                           </div>
                           <ChevronRight size={18} className="text-white/10 group-hover:text-brand-accent transition-colors translate-x-0 group-hover:translate-x-1 transition-transform" />
                        </div>
                        
                        {associatedParty && (activeTab === 'party') && (
                           <div className="flex items-center gap-2 pt-4 border-t border-white/[0.03]">
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
                                 <MapPin size={10} className="text-brand-accent" />
                                 <span className="text-[9px] font-black text-white/60 uppercase tracking-tighter truncate max-w-[80px]">
                                    {associatedParty.City || "LOCATION TBD"}
                                 </span>
                              </div>
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 ml-auto">
                                 <Clock size={10} className="text-brand-accent" />
                                 <span className="text-[9px] font-black text-white/60 uppercase tracking-tighter">
                                    {associatedParty.StartTime ? new Date(associatedParty.StartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "LIVE"}
                                 </span>
                              </div>
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-accent/10 border border-brand-accent/20">
                                 <span className="text-[9px] font-black text-brand-accent uppercase tracking-tighter">
                                    {associatedParty.CurrentGuestCount || 0}/{associatedParty.MaxCapacity || 0}
                                 </span>
                              </div>
                           </div>
                        )}
                     </div>
                  );
               })}
           </div>
         )}
      </div>
    </div>
  );
}
