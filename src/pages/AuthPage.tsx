import React, { useState } from 'react';
import { useStore } from '../lib/Store';
import { API_BASE } from '../lib/constants';
import { Waves, Mail, Lock } from 'lucide-react';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('demo@example.com');
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
      
      // Request location before finalizing login so SwipePage has it immediately
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          login(data);
        },
        (error) => {
          console.warn("Location permission denied during auth, proceeding with default location.");
          login(data);
        }
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col items-center justify-center p-8 bg-gradient-to-b from-[#1A1A24] to-[#0F0F13] text-white absolute inset-0 z-[100]">
      <Waves size={64} className="text-brand-accent mb-6" />
      <h1 className="text-3xl font-black tracking-[0.2em] mb-2 uppercase">WaterParty</h1>
      <p className="text-xs tracking-[0.3em] text-brand-primary mb-12 uppercase font-bold px-4 py-2 rounded-full border border-brand-primary/30 bg-brand-primary/10">Find Your Party</p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 relative z-10">
         {!isLogin && (
            <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-white/20 text-lg">👤</span>
              </div>
              <input
                type="text"
                required
                placeholder="FULL NAME"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold placeholder:text-white/20 outline-none focus:border-brand-accent transition-colors"
                autoComplete="name"
              />
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-white/20 text-lg">📷</span>
              </div>
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
                 className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white/50 cursor-pointer hover:bg-white/10 transition-colors flex items-center justify-between overflow-hidden"
              >
                 <div className="flex items-center gap-3">
                   {photoUrl ? (
                     <div className="w-10 h-10 rounded-full overflow-hidden border border-brand-accent/30 flex-shrink-0">
                       <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                     </div>
                   ) : <span className="text-white/20 text-lg">📷</span>}
                   <span className={photoUrl ? "text-brand-accent" : ""}>
                     {photoUrl ? "PHOTO ATTACHED ✅" : "UPLOAD PROFILE PHOTO"}
                   </span>
                 </div>
              </div>
            </div>

            <div className="relative">
              <textarea
                placeholder="BIO (Tell us about yourself)"
                value={bio}
                onChange={e => setBio(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-sm font-bold placeholder:text-white/20 outline-none focus:border-brand-accent transition-colors min-h-[80px]"
              />
            </div>
            
            <div className="flex gap-2">
               <div className="relative flex-1">
                 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                   <span className="text-white/20">ig</span>
                 </div>
                 <input
                   type="text"
                   placeholder="INSTAGRAM"
                   value={instagram}
                   onChange={e => setInstagram(e.target.value)}
                   className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-10 pr-4 text-sm font-bold placeholder:text-white/20 outline-none focus:border-brand-accent transition-colors"
                 />
               </div>
               
               <div className="relative flex-1">
                 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                   <span className="text-white/20">x</span>
                 </div>
                 <input
                   type="text"
                   placeholder="TWITTER"
                   value={twitter}
                   onChange={e => setTwitter(e.target.value)}
                   className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-10 pr-4 text-sm font-bold placeholder:text-white/20 outline-none focus:border-brand-accent transition-colors"
                 />
               </div>
            </div>
            </div>
         )}
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
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold placeholder:text-white/20 outline-none focus:border-brand-accent transition-colors"
              autoComplete="username"
            />
         </div>
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
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold placeholder:text-white/20 outline-none focus:border-brand-accent transition-colors"
              autoComplete="current-password"
            />
         </div>

         {error && <p className="text-brand-primary text-xs font-bold text-center mt-4 bg-brand-primary/10 py-2 rounded-lg border border-brand-primary/20">{error}</p>}

         <button disabled={loading} type="submit" className="w-full mt-10 py-4 rounded-xl bg-gradient-to-r from-brand-accent to-brand-secondary text-white font-black tracking-widest text-sm shadow-[0_10px_30px_rgba(0,210,255,0.3)] active:scale-95 transition-all disabled:opacity-50">
           {loading ? 'PROCESSING...' : (isLogin ? 'LOGIN' : 'SIGN UP')}
         </button>
      </form>

      <button onClick={() => {setIsLogin(!isLogin); setError('')}} className="mt-8 text-xs font-bold tracking-widest text-white/40 uppercase hover:text-white transition-colors">
        {isLogin ? "NO ACCOUNT? " : "ALREADY ENROLLED? "}
        <span className="text-brand-accent">{isLogin ? "CREATE ONE" : "SIGN IN"}</span>
      </button>
    </div>
  );
}
