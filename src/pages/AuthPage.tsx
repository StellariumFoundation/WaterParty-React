import React, { useState } from 'react';
import { useStore } from '../lib/Store';
import { API_BASE } from '../lib/constants';
import { Waves, Mail, Lock, User as UserIcon, Camera, PenTool, Link2 } from 'lucide-react';
import { Geolocation } from '@capacitor/geolocation';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [bio, setBio] = useState('');
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');

  const { login } = useStore();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!isLogin && password.length < 8) {
       setError('Password must be at least 8 characters long');
       return;
    }

    setLoading(true);

    const endpoint = isLogin ? '/login' : '/register';
    const body = isLogin ? { email, password } : {
        password,
        user: { 
           RealName: name, 
           Email: email, 
           ProfilePhotos: photoUrl ? [photoUrl] : [],
           Thumbnail: photoUrl || '',
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
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-6 bg-[#090A10] text-white absolute inset-0 z-[100] overflow-y-auto">
      {/* Dynamic Background Premium Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-accent/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-secondary/20 blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-md my-8 flex flex-col items-center relative z-10">
        
        {/* Animated Custom Logo */}
        <div className="relative mb-6 group select-none">
          <div className="absolute inset-0 bg-gradient-to-tr from-brand-accent to-brand-secondary rounded-3xl blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-500 scale-110" />
          <div className="relative flex items-center justify-center w-20 h-20 rounded-[28px] bg-gradient-to-tr from-[#11131F] to-[#1D2138] border border-white/10 shadow-[0_8px_32px_rgba(33,212,253,0.15)]">
            <Waves size={36} className="text-brand-accent animate-pulse" />
          </div>
        </div>

        <h1 className="text-3xl font-black tracking-[0.2em] mb-2 uppercase bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
          WaterParty
        </h1>
        <p className="text-[10px] tracking-[0.3em] text-brand-accent mb-8 uppercase font-bold px-4 py-1.5 rounded-full border border-brand-accent/30 bg-brand-accent/5 backdrop-blur-md">
          Dive into matching parties
        </p>

        {/* Elegant Form Card */}
        <div className="w-full bg-[#11131F]/70 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 shadow-[0_24px_64px_rgba(0,0,0,0.4)]">
          <h2 className="text-xl font-black uppercase tracking-wider mb-6 text-center text-white/90">
            {isLogin ? "Welcome Back" : "Join the Wave"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
             {!isLogin && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Full Name Input */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <UserIcon size={18} className="text-white/20" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="FULL NAME"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold placeholder:text-white/30 outline-none focus:border-brand-accent focus:bg-white/[0.06] transition-all"
                      autoComplete="name"
                    />
                  </div>
                  
                  {/* Profile Photo Upload Selector */}
                  <div className="relative">
                    <div 
                       onClick={() => {
                         const fileInput = document.createElement('input');
                         fileInput.type = 'file';
                         fileInput.accept = 'image/*';
                         fileInput.onchange = (e: any) => {
                           const file = e.target.files?.[0];
                           if (file) {
                             const reader = new FileReader();
                             reader.onloadend = () => setPhotoUrl(reader.result as string);
                             reader.readAsDataURL(file);
                           }
                         };
                         fileInput.click();
                       }}
                       className="w-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-2xl p-4 text-sm font-bold text-white/50 cursor-pointer transition-colors flex items-center justify-between"
                    >
                       <div className="flex items-center gap-3">
                         {photoUrl ? (
                           <div className="w-10 h-10 rounded-full overflow-hidden border border-brand-accent/50 flex-shrink-0">
                             <img src={photoUrl} alt="Preview" className="w-full h-full object-cover animate-scaleUp" />
                           </div>
                         ) : <Camera size={18} className="text-white/25" />}
                         <span className={photoUrl ? "text-brand-accent text-xs tracking-wider" : "text-white/30 text-xs"}>
                           {photoUrl ? "PHOTO ATTACHED ✅" : "SELECT PROFILE PHOTO"}
                         </span>
                       </div>
                    </div>
                  </div>

                  {/* Bio Area */}
                  <div className="relative">
                    <div className="absolute top-4 left-4 pointer-events-none">
                      <PenTool size={16} className="text-white/20" />
                    </div>
                    <textarea
                      placeholder="BIO (Tell us about your party vibe)"
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      className="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold placeholder:text-white/30 outline-none focus:border-brand-accent focus:bg-white/[0.06] transition-all min-h-[90px] resize-none"
                    />
                  </div>
                  
                  {/* Instagram & Twitter Handles */}
                  <div className="flex gap-3">
                     <div className="relative flex-1">
                       <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/20 font-bold text-xs uppercase tracking-widest">
                         ig
                       </div>
                       <input
                         type="text"
                         placeholder="INSTAGRAM"
                         value={instagram}
                         onChange={e => setInstagram(e.target.value)}
                         className="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 rounded-2xl py-4 pl-10 pr-4 text-sm font-bold placeholder:text-white/30 outline-none focus:border-brand-accent transition-all"
                       />
                     </div>
                     
                     <div className="relative flex-1">
                       <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/20 font-bold text-xs uppercase tracking-widest">
                         x
                       </div>
                       <input
                         type="text"
                         placeholder="TWITTER"
                         value={twitter}
                         onChange={e => setTwitter(e.target.value)}
                         className="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 rounded-2xl py-4 pl-10 pr-4 text-sm font-bold placeholder:text-white/30 outline-none focus:border-brand-accent transition-all"
                       />
                     </div>
                  </div>
                </div>
             )}

             {/* Email/Username Input */}
             <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail size={18} className="text-white/20" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="EMAIL OR USERNAME"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold placeholder:text-white/30 outline-none focus:border-brand-accent focus:bg-white/[0.06] transition-all"
                  autoComplete="username"
                />
             </div>

             {/* Password Input */}
             <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={18} className="text-white/20" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="PASSWORD"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold placeholder:text-white/30 outline-none focus:border-brand-accent focus:bg-white/[0.06] transition-all"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
             </div>

             {error && (
                <p className="text-brand-primary text-xs font-bold text-center mt-4 bg-brand-primary/5 py-3 px-4 rounded-xl border border-brand-primary/20 animate-shake">
                  ⚠️ {error}
                </p>
             )}

             {/* Submit Button */}
             <button 
                disabled={loading} 
                type="submit" 
                className="w-full mt-6 py-4 rounded-2xl bg-gradient-to-r from-brand-accent to-brand-secondary text-white font-black tracking-widest text-xs uppercase shadow-[0_8px_24px_rgba(33,212,253,0.3)] active:scale-95 hover:shadow-[0_12px_32px_rgba(33,212,253,0.4)] hover:brightness-110 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none"
             >
               {loading ? 'PROCESSING...' : (isLogin ? 'ENTER THE PARTY' : 'CREATE ACCOUNT')}
             </button>
          </form>
        </div>

        {/* Form Toggle Link */}
        <button 
          onClick={() => { setIsLogin(!isLogin); setError(''); }} 
          className="mt-8 text-xs font-black tracking-widest text-white/40 uppercase hover:text-white hover:scale-105 transition-all duration-200"
        >
          {isLogin ? "NO ACCOUNT? " : "ALREADY ENROLLED? "}
          <span className="text-brand-accent">{isLogin ? "CREATE ONE" : "SIGN IN"}</span>
        </button>
        
      </div>
    </div>
  );
}
