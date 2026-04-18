import { useState } from 'react';
import { cn } from '../lib/utils';
import { MessageSquare } from 'lucide-react';
import { useStore } from '../lib/Store';
import { getAssetUrl } from '../lib/constants';

export function MessagesPage() {
  const [activeTab, setActiveTab] = useState<'party' | 'direct'>('party');
  const { chats } = useStore();

  const activeChats = chats.filter((c) => activeTab === 'party' ? c.IsGroup : !c.IsGroup);

  return (
    <div className="h-full w-full bg-transparent flex flex-col pt-12 pb-20">
      {/* Top Tabs */}
      <div className="px-6 flex items-center justify-center z-10 mb-8">
        <div className="bg-[#131522] rounded-full p-1 flex w-full max-w-sm">
          <button
            onClick={() => setActiveTab('party')}
            className={cn(
               "flex-1 py-3 text-xs font-bold rounded-full transition-colors",
               activeTab === 'party' ? "bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-lg" : "text-white/50"
            )}
          >
            PARTY CHATS
          </button>
          <button
            onClick={() => setActiveTab('direct')}
            className={cn(
               "flex-1 py-3 text-xs font-bold rounded-full transition-colors",
               activeTab === 'direct' ? "bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-lg" : "text-white/50"
            )}
          >
            DIRECT MESSAGES
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col p-6 relative overflow-y-auto">
         {activeChats.length === 0 ? (
           <div className="flex-1 flex flex-col items-center justify-center">
             <div className="w-24 h-24 rounded-full bg-[#11131F] border border-white/5 flex items-center justify-center mb-6">
                <MessageSquare size={40} className="text-white/20" />
             </div>
             <h2 className="text-xl font-bold text-white mb-2">
                {activeTab === 'party' ? 'No party chats yet' : 'No direct messages yet'}
             </h2>
             <p className="text-white/40 text-sm text-center">
                {activeTab === 'party' 
                   ? 'Host or join a party to start chatting!'
                   : 'Keep swiping to match and start chatting!'}
             </p>
           </div>
         ) : (
           <div className="flex flex-col space-y-4">
              {activeChats.map(chat => {
                 const displayImage = chat.ImageUrl ? getAssetUrl(chat.ImageUrl) : "https://images.unsplash.com/photo-1542382103-6fdb3a652d8e?q=80&w=800&auto=format&fit=crop";
                 return (
                    <div key={chat.ID} className="flex items-center gap-4 p-4 rounded-2xl bg-[#11131F] border border-white/5 cursor-pointer">
                       <img src={displayImage} className="w-14 h-14 rounded-full object-cover shrink-0" />
                       <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-white mb-1 truncate">{chat.Title}</h4>
                          <p className="text-xs text-white/50 truncate">
                            {chat.RecentMessages?.length > 0 ? chat.RecentMessages[chat.RecentMessages.length-1].Content : "No messages yet"}
                          </p>
                       </div>
                    </div>
                 );
              })}
           </div>
         )}
      </div>
    </div>
  );
}
