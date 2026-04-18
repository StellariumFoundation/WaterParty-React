import { useState, useRef } from 'react';
import { Briefcase, GraduationCap, User as UserIcon, Instagram, Twitter, Edit, Save, Camera, X } from 'lucide-react';
import { useStore } from '../lib/Store';
import { getAssetUrl } from '../lib/constants';

export function ProfilePage() {
  const { user, logout, sendSocketMessage } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [editData, setEditData] = useState({
    RealName: '',
    Bio: '',
    Thumbnail: '',
    Instagram: '',
    Twitter: '',
    Gender: '',
    HeightCm: 0,
    JobTitle: '',
    Company: '',
    School: '',
    Degree: ''
  });

  if (!user) return null;

  const handleEditClick = () => {
    setEditData({
      RealName: user.RealName || '',
      Bio: user.Bio || '',
      Thumbnail: user.Thumbnail || (user.ProfilePhotos?.length > 0 ? user.ProfilePhotos[0] : ''),
      Instagram: user.Instagram || '',
      Twitter: user.Twitter || '',
      Gender: user.Gender || '',
      HeightCm: user.HeightCm || 0,
      JobTitle: user.JobTitle || '',
      Company: user.Company || '',
      School: user.School || '',
      Degree: user.Degree || ''
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    sendSocketMessage('UPDATE_PROFILE', {
      ...editData,
      ProfilePhotos: editData.Thumbnail ? [editData.Thumbnail] : []
    });
    setIsEditing(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditData({ ...editData, Thumbnail: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const displayImage = user.ProfilePhotos?.length > 0 
      ? getAssetUrl(user.ProfilePhotos[0]) 
      : user.Thumbnail ? getAssetUrl(user.Thumbnail) : "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=800&auto=format&fit=crop";

  return (
    <div className="h-full w-full bg-transparent flex flex-col overflow-y-auto">
      
      {/* Hero Image Section */}
      <div className="relative h-80 w-full shrink-0">
         <img 
            src={isEditing && editData.Thumbnail ? editData.Thumbnail : displayImage} 
            alt="Profile" 
            className="w-full h-full object-cover mix-blend-overlay opacity-80"
         />
         <div className="absolute inset-0 bg-gradient-to-t from-brand-bg via-brand-bg/40 to-transparent" />
         
         {isEditing && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
               <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-brand-primary p-4 rounded-full text-white shadow-xl hover:scale-105 active:scale-95 transition-all"
               >
                  <Camera size={28} />
               </button>
               <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageUpload} 
               />
            </div>
         )}
         
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
         
         {/* Name & Bio */}
         <div>
            {isEditing ? (
              <div className="space-y-4 mb-6">
                 <div>
                   <label className="text-[10px] font-bold text-white/40 tracking-wider mb-2 uppercase block">Full Name</label>
                   <input 
                     type="text" 
                     value={editData.RealName}
                     onChange={(e) => setEditData({...editData, RealName: e.target.value})}
                     className="w-full bg-[#11131F] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-primary outline-none transition-colors"
                   />
                 </div>
                 <div>
                   <label className="text-[10px] font-bold text-white/40 tracking-wider mb-2 uppercase block">Bio</label>
                   <textarea 
                     value={editData.Bio}
                     onChange={(e) => setEditData({...editData, Bio: e.target.value})}
                     className="w-full bg-[#11131F] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-primary outline-none transition-colors min-h-[100px]"
                   />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="text-[10px] font-bold text-white/40 tracking-wider mb-2 uppercase block">Instagram</label>
                       <input 
                         type="text" 
                         value={editData.Instagram}
                         onChange={(e) => setEditData({...editData, Instagram: e.target.value})}
                         className="w-full bg-[#11131F] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-primary outline-none transition-colors"
                       />
                     </div>
                     <div>
                       <label className="text-[10px] font-bold text-white/40 tracking-wider mb-2 uppercase block">Twitter</label>
                       <input 
                         type="text" 
                         value={editData.Twitter}
                         onChange={(e) => setEditData({...editData, Twitter: e.target.value})}
                         className="w-full bg-[#11131F] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-primary outline-none transition-colors"
                       />
                     </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="text-[10px] font-bold text-white/40 tracking-wider mb-2 uppercase block">Gender</label>
                       <input 
                         type="text" 
                         value={editData.Gender}
                         onChange={(e) => setEditData({...editData, Gender: e.target.value})}
                         className="w-full bg-[#11131F] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-primary outline-none transition-colors"
                       />
                     </div>
                     <div>
                       <label className="text-[10px] font-bold text-white/40 tracking-wider mb-2 uppercase block">Height (cm)</label>
                       <input 
                         type="number" 
                         value={editData.HeightCm}
                         onChange={(e) => setEditData({...editData, HeightCm: Number(e.target.value)})}
                         className="w-full bg-[#11131F] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-primary outline-none transition-colors"
                       />
                     </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="text-[10px] font-bold text-white/40 tracking-wider mb-2 uppercase block">Job Title</label>
                       <input 
                         type="text" 
                         value={editData.JobTitle}
                         onChange={(e) => setEditData({...editData, JobTitle: e.target.value})}
                         className="w-full bg-[#11131F] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-primary outline-none transition-colors"
                       />
                     </div>
                     <div>
                       <label className="text-[10px] font-bold text-white/40 tracking-wider mb-2 uppercase block">Company</label>
                       <input 
                         type="text" 
                         value={editData.Company}
                         onChange={(e) => setEditData({...editData, Company: e.target.value})}
                         className="w-full bg-[#11131F] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-primary outline-none transition-colors"
                       />
                     </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="text-[10px] font-bold text-white/40 tracking-wider mb-2 uppercase block">School</label>
                       <input 
                         type="text" 
                         value={editData.School}
                         onChange={(e) => setEditData({...editData, School: e.target.value})}
                         className="w-full bg-[#11131F] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-primary outline-none transition-colors"
                       />
                     </div>
                     <div>
                       <label className="text-[10px] font-bold text-white/40 tracking-wider mb-2 uppercase block">Degree</label>
                       <input 
                         type="text" 
                         value={editData.Degree}
                         onChange={(e) => setEditData({...editData, Degree: e.target.value})}
                         className="w-full bg-[#11131F] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-primary outline-none transition-colors"
                       />
                     </div>
                 </div>

              </div>
            ) : (
              <>
                 <h1 className="text-4xl font-bold text-white mb-6 tracking-tight">{user.RealName}</h1>
                 
                 <h3 className="text-[10px] font-bold text-white/40 tracking-wider mb-2 uppercase">About Me</h3>
                 <p className="text-sm text-white/80 leading-relaxed">
                   {user.Bio || "No bio added yet."}
                 </p>
              </>
            )}
         </div>

         {/* Lifestyle */}
         {!isEditing && (user.Gender || user.HeightCm > 0) && (
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
         {!isEditing && (user.JobTitle || user.School) && (
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
            {isEditing ? (
              <div className="flex gap-4">
                <button onClick={() => setIsEditing(false)} className="flex-[0.3] py-4 bg-white/5 border border-white/10 rounded-full text-white font-bold text-sm tracking-wide active:scale-95 transition-transform flex items-center justify-center">
                   <X size={20} />
                </button>
                <button onClick={handleSave} className="flex-1 py-4 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-bold text-sm tracking-wide shadow-lg shadow-brand-secondary/20 active:scale-95 transition-transform flex items-center justify-center gap-2">
                   <Save size={18} /> SAVE CHANGES
                </button>
              </div>
            ) : (
              <>
                 {(user.Instagram || user.Twitter) && (
                   <section className="mb-4">
                     <h3 className="text-[10px] font-bold text-white/40 tracking-wider mb-3 uppercase">Socials</h3>
                     <div className="flex gap-3">
                        {user.Instagram && (
                           <div className="flex-1 bg-[#11131F] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
                              <Instagram size={18} className="text-pink-500 shrink-0" />
                              <span className="text-sm text-white font-medium truncate">{user.Instagram}</span>
                           </div>
                        )}
                        {user.Twitter && (
                           <div className="flex-1 bg-[#11131F] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
                              <Twitter size={18} className="text-blue-400 shrink-0" />
                              <span className="text-sm text-white font-medium truncate">{user.Twitter}</span>
                           </div>
                        )}
                     </div>
                   </section>
                 )}
                 
                 <button onClick={handleEditClick} className="w-full py-4 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-bold text-sm tracking-wide shadow-lg shadow-brand-secondary/20 active:scale-95 transition-transform flex items-center justify-center gap-2">
                    <Edit size={16} /> EDIT PROFILE
                 </button>
                 <div className="flex gap-4">
                    <button onClick={logout} className="flex-1 py-4 bg-[#11131F] border border-white/5 rounded-full text-brand-primary text-xs font-bold tracking-wider hover:bg-white/5 transition-colors">
                       LOGOUT
                    </button>
                 </div>
              </>
            )}
         </div>

      </div>
    </div>
  );
}
