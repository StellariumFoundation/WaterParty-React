import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Briefcase, GraduationCap, User as UserIcon, Instagram, Twitter, Edit, Save, Camera, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../lib/Store';
import { getAssetUrl } from '../lib/constants';

export function ProfilePage() {
  const { user, logout, sendSocketMessage } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [editData, setEditData] = useState({
    RealName: '',
    Bio: '',
    Thumbnail: '',
    ProfilePhotos: [] as string[],
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
      ProfilePhotos: user.ProfilePhotos || [],
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
    // Basic validation for social handles
    const cleanHandle = (handle: string) => {
      if (!handle) return '';
      // Remove @ if exists, remove whitespace
      let h = handle.trim().replace(/^@/, '');
      // If full URL, try to extract handle
      if (h.includes('instagram.com/')) h = h.split('instagram.com/')[1].split('/')[0].split('?')[0];
      if (h.includes('twitter.com/')) h = h.split('twitter.com/')[1].split('/')[0].split('?')[0];
      if (h.includes('x.com/')) h = h.split('x.com/')[1].split('/')[0].split('?')[0];
      return h;
    };

    const validatedData = {
      ...editData,
      Instagram: cleanHandle(editData.Instagram),
      Twitter: cleanHandle(editData.Twitter),
      Thumbnail: editData.ProfilePhotos.length > 0 ? editData.ProfilePhotos[0] : ''
    };

    sendSocketMessage('UPDATE_PROFILE', validatedData);
    setIsEditing(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remainingSlots = 8 - editData.ProfilePhotos.length;
    const filesToProcess = files.slice(0, remainingSlots) as File[];

    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditData(prev => ({
          ...prev,
          ProfilePhotos: [...prev.ProfilePhotos, reader.result as string]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setEditData(prev => ({
      ...prev,
      ProfilePhotos: prev.ProfilePhotos.filter((_, i) => i !== index)
    }));
    if (currentPhotoIndex >= editData.ProfilePhotos.length - 1) {
      setCurrentPhotoIndex(0);
    }
  };

  const activePhotos = isEditing ? editData.ProfilePhotos : (user.ProfilePhotos || []);
  
  const nextPhoto = () => {
    if (activePhotos.length <= 1) return;
    setCurrentPhotoIndex((prev) => (prev + 1) % activePhotos.length);
  };

  const prevPhoto = () => {
    if (activePhotos.length <= 1) return;
    setCurrentPhotoIndex((prev) => (prev - 1 + activePhotos.length) % activePhotos.length);
  };

  return (
    <div className="h-full w-full bg-transparent flex flex-col overflow-y-auto">
      
      {/* Hero Carousel Section */}
      <div className="relative h-[550px] w-full shrink-0 bg-[#0A0B14] flex items-center justify-center overflow-hidden">
         <AnimatePresence mode="wait">
            {activePhotos.length > 0 ? (
              <motion.img 
                 key={activePhotos[currentPhotoIndex]}
                 src={getAssetUrl(activePhotos[currentPhotoIndex])} 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 transition={{ duration: 0.4 }}
                 alt="Profile" 
                 className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-4"
              >
                <UserIcon size={64} className="text-white/10" />
                <p className="text-[10px] text-white/20 tracking-widest uppercase">No Photos</p>
              </motion.div>
            )}
         </AnimatePresence>

         <div className="absolute inset-0 bg-gradient-to-t from-brand-bg via-transparent to-brand-bg/20" />
         
         {/* Carousel Controls */}
         {activePhotos.length > 1 && (
           <>
              <button 
                onClick={prevPhoto}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white/50 hover:text-white hover:bg-black/40 transition-all z-20"
              >
                <ChevronLeft size={24} />
              </button>
              <button 
                onClick={nextPhoto}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white/50 hover:text-white hover:bg-black/40 transition-all z-20"
              >
                <ChevronRight size={24} />
              </button>

              {/* Indicators */}
              <div className="absolute top-12 left-6 right-6 flex gap-1 z-20">
                {activePhotos.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${idx === currentPhotoIndex ? 'bg-white' : 'bg-white/20'}`}
                  />
                ))}
              </div>
           </>
         )}

         <div className="absolute bottom-6 right-6 z-20">
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

                 {/* Photo Gallery Editor */}
                 <div>
                   <div className="flex items-center justify-between mb-2">
                     <label className="text-[10px] font-bold text-white/40 tracking-wider uppercase block">Manage Gallery</label>
                     <span className="text-[10px] font-bold text-white/20">{editData.ProfilePhotos.length}/8</span>
                   </div>
                   <div className="grid grid-cols-4 gap-2">
                     {editData.ProfilePhotos.map((photo, index) => (
                       <div key={index} className="relative aspect-[3/4] rounded-xl overflow-hidden group">
                         <img src={getAssetUrl(photo)} alt="" className="w-full h-full object-cover" />
                         <button 
                           onClick={() => removePhoto(index)}
                           className="absolute top-1 right-1 bg-black/60 w-6 h-6 rounded-full flex items-center justify-center text-white p-1 hover:bg-black"
                         >
                           <X size={14} />
                         </button>
                       </div>
                     ))}
                     {editData.ProfilePhotos.length < 8 && (
                       <button 
                         onClick={() => fileInputRef.current?.click()}
                         className="aspect-[3/4] rounded-xl border border-dashed border-white/20 bg-[#11131F] flex items-center justify-center hover:bg-white/5 transition-colors"
                       >
                         <Camera size={20} className="text-white/20" />
                       </button>
                     )}
                     <input 
                        type="file" 
                        ref={fileInputRef} 
                        accept="image/*" 
                        multiple
                        className="hidden" 
                        onChange={handleImageUpload} 
                     />
                   </div>
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
                       <label className="text-[10px] font-bold text-white/40 tracking-wider mb-2 uppercase block">Gender</label>
                       <select 
                         value={editData.Gender}
                         onChange={(e) => setEditData({...editData, Gender: e.target.value})}
                         className="w-full bg-[#11131F] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-primary outline-none transition-colors appearance-none"
                       >
                         <option value="">Select...</option>
                         <option value="Male">Male</option>
                         <option value="Female">Female</option>
                         <option value="Other">Other</option>
                       </select>
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
                           <a 
                             href={`https://instagram.com/${user.Instagram}`} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="flex-1 bg-[#11131F] border border-white/5 rounded-2xl p-4 flex items-center gap-3 hover:bg-white/5 transition-colors group"
                           >
                              <Instagram size={18} className="text-pink-500 shrink-0 group-hover:scale-110 transition-transform" />
                              <span className="text-sm text-white font-medium truncate group-hover:text-brand-primary transition-colors">@{user.Instagram}</span>
                           </a>
                        )}
                        {user.Twitter && (
                           <a 
                             href={`https://x.com/${user.Twitter}`} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="flex-1 bg-[#11131F] border border-white/5 rounded-2xl p-4 flex items-center gap-3 hover:bg-white/5 transition-colors group"
                           >
                              <Twitter size={18} className="text-blue-400 shrink-0 group-hover:scale-110 transition-transform" />
                              <span className="text-sm text-white font-medium truncate group-hover:text-brand-primary transition-colors">@{user.Twitter}</span>
                           </a>
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
