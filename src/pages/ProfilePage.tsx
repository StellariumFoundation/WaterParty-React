import { Briefcase, GraduationCap, User as UserIcon, Instagram, Twitter, Edit } from 'lucide-react';
import { useStore } from '../lib/Store';
import { getAssetUrl } from '../lib/constants';

export function ProfilePage() {
  const { user, logout } = useStore();

  if (!user) return null;

  const displayImage = user.ProfilePhotos?.length > 0 
      ? getAssetUrl(user.ProfilePhotos[0]) 
      : user.Thumbnail ? getAssetUrl(user.Thumbnail) : "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=800&auto=format&fit=crop";

  return (
    <div className="h-full w-full bg-transparent flex flex-col overflow-y-auto">
      
      {/* Hero Image Section */}
      <div className="relative h-80 w-full shrink-0">
         <img 
            src={displayImage} 
            alt="Profile" 
            className="w-full h-full object-cover mix-blend-overlay opacity-80"
         />
         <div className="absolute inset-0 bg-gradient-to-t from-brand-bg via-brand-bg/40 to-transparent" />
         
         <div className="absolute top-12 left-6 right-6 flex justify-between items-start">
            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
               <div className="w-1/3 h-full bg-white"></div>
            </div>
         </div>

         <div className="absolute bottom-6 right-6">
             <div className="px-3 py-1.5 bg-black/80 backdrop-blur-md rounded-xl text-xs font-bold text-amber-400 flex items-center shadow-lg border border-white/5 uppercase">
                🛡️ {(user.TrustScore || 100).toFixed(1)} TRUST
             </div>
         </div>
      </div>

      <div className="px-6 -mt-4 relative z-10 space-y-8 pb-24">
         
         {/* Name */}
         <div>
            <h1 className="text-4xl font-bold text-white mb-6 tracking-tight">{user.RealName}</h1>
            
            <h3 className="text-[10px] font-bold text-white/40 tracking-wider mb-2 uppercase">About Me</h3>
            <p className="text-sm text-white/80 leading-relaxed">
              {user.Bio || "No bio added yet."}
            </p>
         </div>

         {/* Lifestyle */}
         {(user.Gender || user.HeightCm > 0) && (
           <section>
              <h3 className="text-[10px] font-bold text-white/40 tracking-wider mb-3 uppercase">Lifestyle</h3>
              <div className="space-y-3">
                 
                 {user.Gender && (
                   <div className="bg-[#11131F] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex flex-col">
                         <span className="text-[10px] text-white/40 mb-1">Gender</span>
                         <span className="text-sm text-white font-medium uppercase">{user.Gender}</span>
                      </div>
                      <UserIcon size={16} className="text-white/20" />
                   </div>
                 )}

                 {user.HeightCm > 0 && (
                   <div className="grid grid-cols-2 gap-3">
                       <div className="bg-[#11131F] border border-white/5 rounded-2xl p-4 flex flex-col justify-center">
                         <span className="text-sm text-white font-medium flex items-center gap-2"><span className="text-white/20">📏</span> {user.HeightCm} cm</span>
                      </div>
                   </div>
                 )}

              </div>
           </section>
         )}

         {/* Work & Ed */}
         {(user.JobTitle || user.School) && (
           <section>
              <h3 className="text-[10px] font-bold text-white/40 tracking-wider mb-3 uppercase">Work & Education</h3>
              <div className="space-y-3">
                 {user.JobTitle && (
                   <div className="bg-[#11131F] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                      <Briefcase size={18} className="text-white/20 shrink-0" />
                      <span className="text-sm text-white font-medium">{user.JobTitle} {user.Company && `at ${user.Company}`}</span>
                   </div>
                 )}
                 {user.School && (
                   <div className="bg-[#11131F] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                      <GraduationCap size={18} className="text-white/20 shrink-0" />
                      <span className="text-sm text-white font-medium">{user.School} {user.Degree && `- ${user.Degree}`}</span>
                   </div>
                 )}
              </div>
           </section>
         )}

         {/* Buttons */}
         <div className="pt-4 space-y-4">
            <button className="w-full py-4 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-bold text-sm tracking-wide shadow-lg shadow-brand-secondary/20 active:scale-95 transition-transform flex items-center justify-center gap-2">
               <Edit size={16} /> EDIT PROFILE
            </button>
            <div className="flex gap-4">
               <button onClick={logout} className="flex-1 py-4 bg-[#11131F] border border-white/5 rounded-full text-white/60 text-xs font-bold tracking-wider hover:bg-white/5 transition-colors">
                  LOGOUT
               </button>
            </div>
         </div>

      </div>
    </div>
  );
}
