import React, { useState, useRef } from 'react';
import { useStore } from '../lib/Store';
import { API_BASE } from '../lib/constants';
import { Waves, Mail, Lock, User as UserIcon, Camera, PenTool, X, Plus } from 'lucide-react';
import { Geolocation } from '@capacitor/geolocation';
import { compressImage } from '../lib/utils';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [profilePhotos, setProfilePhotos] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');

  const { login } = useStore();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remainingSlots = 9 - profilePhotos.length;
    const filesToProcess = files.slice(0, remainingSlots) as File[];

    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (reader.result) {
          const compressed = await compressImage(reader.result as string);
          setProfilePhotos(prev => {
            if (prev.length >= 9) return prev;
            return [...prev, compressed];
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setProfilePhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!isLogin && password.length < 8) {
       setError('Password must be at least 8 characters long');
       return;
    }

    if (!isLogin && profilePhotos.length === 0) {
       setError('Please upload at least 1 profile photo');
       return;
    }

    setLoading(true);

    const endpoint = isLogin ? '/login' : '/register';
    const body = isLogin ? { email, password } : {
        password,
        user: { 
           RealName: name, 
           Email: email, 
           ProfilePhotos: profilePhotos,
           Thumbnail: profilePhotos[0] || '',
           Bio: bio,
           Instagram: instagram,
           Twitter: twitter
        }
    };

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(body)
      });
      
      const text = await res.text();
      let data;
      try {
         data = JSON.parse(text);
      } catch (err) {
         throw new Error(text || 'Request failed');
      }
      
      if (!res.ok) throw new Error(data?.error || data?.message || 'Request failed');
      
      // Request location using Capacitor plugin before finalizing login
      try {
        await Geolocation.requestPermissions();
        await Geolocation.getCurrentPosition();
      } catch (e) {
        console.warn("Location permission denied or unavailable, proceeding with default location.");
      }
      login(data);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-[#1e1b4b] to-[#0f172a] text-white absolute inset-0 z-[100] overflow-y-auto">
      {/* Background Premium Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-accent/15 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-secondary/15 blur-[120px] pointer-events-none animate-pulse" />
      
      <div className="w-full max-w-md my-8 flex flex-col items-center relative z-10">
        
        {/* Minimalized Logo & Header */}
        <div className="flex items-center gap-2 mb-4 select-none animate-fadeIn">
          <div className={`${isLogin ? 'w-8 h-8 rounded-xl' : 'w-10 h-10 rounded-2xl'} bg-gradient-to-tr from-brand-accent to-brand-secondary flex items-center justify-center shadow-lg transition-all`}>
            <Waves size={isLogin ? 16 : 20} className="text-white" />
          </div>
          <h1 className={`${isLogin ? 'text-lg' : 'text-2xl'} font-black tracking-[0.2em] uppercase bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent transition-all`}>
            WaterParty
          </h1>
        </div>

        {/* Elegant Form Card */}
        <div className={`w-full bg-[#11131F]/80 backdrop-blur-2xl border border-white/10 ${isLogin ? 'rounded-2xl p-4 shadow-[0_12px_32px_rgba(0,0,0,0.5)]' : 'rounded-2xl p-5 shadow-[0_16px_40px_rgba(0,0,0,0.5)]'} transition-all`}>
          <h2 className="text-[9px] font-black uppercase tracking-[0.25em] mb-4 text-center text-white/50">
            {isLogin ? "Sign In" : "Registration Hub"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3">
             {!isLogin && (
                <div className="space-y-3 animate-fadeIn">
                  
                  {/* Gallery Grid (Up to 9 Photos) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-black tracking-widest text-brand-accent uppercase">
                        GALLERY PHOTOS (UP TO 9)
                      </label>
                      <span className="text-[9px] font-bold text-white/30">{profilePhotos.length}/9</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-1.5">
                      {profilePhotos.map((photo, index) => (
                        <div key={index} className="relative aspect-[3/4] rounded-xl overflow-hidden border border-white/10 bg-[#16192E] group">
                          <img src={photo} alt="" className="w-full h-full object-cover animate-scaleUp" />
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute top-1 right-1 bg-black/80 w-4 h-4 rounded-full flex items-center justify-center text-white hover:bg-black p-1 transition-colors"
                          >
                            <X size={8} />
                          </button>
                          <div className="absolute bottom-1 left-1.5 bg-brand-accent/95 px-1 py-0.5 rounded-md text-[7px] font-black text-[#0A0B14] uppercase">
                            {index === 0 ? 'MAIN' : `#${index + 1}`}
                          </div>
                        </div>
                      ))}
                      
                      {profilePhotos.length < 9 && (
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="aspect-[3/4] rounded-xl border border-dashed border-brand-accent/30 bg-brand-accent/5 hover:bg-brand-accent/10 cursor-pointer text-brand-accent flex flex-col items-center justify-center transition-all active:scale-95"
                        >
                          <Plus size={16} className="animate-pulse" />
                          <span className="text-[7px] font-black tracking-widest uppercase mt-0.5">ADD PHOTO</span>
                        </div>
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
                  </div>

                  {/* Full Name Input */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserIcon size={14} className="text-white/20" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="FULL NAME"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 rounded-xl py-2 pl-9 pr-3 text-[10px] font-bold placeholder:text-white/30 outline-none focus:border-brand-accent focus:bg-white/[0.06] transition-all"
                      autoComplete="name"
                    />
                  </div>

                  {/* Bio Area */}
                  <div className="relative">
                    <div className="absolute top-2.5 left-3 pointer-events-none animate-fadeIn">
                      <PenTool size={12} className="text-white/20" />
                    </div>
                    <textarea
                      placeholder="BIO (Tell us about your party vibe)"
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      className="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 rounded-xl py-2 pl-9 pr-3 text-[10px] font-bold placeholder:text-white/30 outline-none focus:border-brand-accent focus:bg-white/[0.06] transition-all min-h-[50px] resize-none leading-normal"
                    />
                  </div>
                  
                  {/* Instagram & Twitter Handles */}
                  <div className="flex gap-2">
                     <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/25 font-black text-[8px] uppercase tracking-widest">
                          ig
                        </div>
                        <input
                          type="text"
                          placeholder="INSTAGRAM"
                          value={instagram}
                          onChange={e => setInstagram(e.target.value)}
                          className="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 rounded-xl py-2 pl-8 pr-2 text-[10px] font-bold placeholder:text-white/35 outline-none focus:border-brand-accent transition-all"
                        />
                     </div>
                     
                     <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/25 font-black text-[8px] uppercase tracking-widest">
                          x
                        </div>
                        <input
                          type="text"
                          placeholder="TWITTER"
                          value={twitter}
                          onChange={e => setTwitter(e.target.value)}
                          className="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 rounded-xl py-2 pl-8 pr-2 text-[10px] font-bold placeholder:text-white/35 outline-none focus:border-brand-accent transition-all"
                        />
                     </div>
                  </div>
                </div>
             )}

             {/* Email/Username Input */}
             <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={12} className="text-white/20" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="EMAIL OR USERNAME"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 rounded-xl py-2 text-[10px] font-bold pl-9 pr-3 placeholder:text-white/30 outline-none focus:border-brand-accent focus:bg-white/[0.06] transition-all"
                  autoComplete="username"
                />
             </div>

             {/* Password Input */}
             <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={12} className="text-white/20" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="PASSWORD"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 rounded-xl py-2 text-[10px] font-bold pl-9 pr-3 placeholder:text-white/30 outline-none focus:border-brand-accent focus:bg-white/[0.06] transition-all"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
             </div>

             {error && (
                <p className="text-brand-primary text-[9px] font-bold text-center mt-2 bg-brand-primary/5 py-1.5 px-2 rounded-lg border border-brand-primary/15 animate-shake">
                  ⚠️ {error}
                </p>
             )}

             {/* Submit Button */}
             <button 
                disabled={loading} 
                type="submit" 
                className="w-full mt-2 py-2 text-[10px] tracking-[0.15em] rounded-xl bg-gradient-to-r from-brand-accent to-brand-secondary text-white font-black uppercase shadow-md active:scale-95 hover:brightness-115 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none"
             >
               {loading ? 'PROCESSING...' : (isLogin ? 'ENTER' : 'REGISTER')}
             </button>
          </form>
        </div>

        {/* Form Toggle Link */}
        <button 
          onClick={() => { setIsLogin(!isLogin); setError(''); }} 
          className="mt-5 text-[9px] font-black tracking-widest text-white/45 uppercase hover:text-white transition-colors duration-200"
        >
          {isLogin ? "NO ACCOUNT? " : "ALREADY REGISTERED? "}
          <span className="text-brand-accent">{isLogin ? "CREATE ONE" : "SIGN IN"}</span>
        </button>
        
      </div>
    </div>
  );
}
