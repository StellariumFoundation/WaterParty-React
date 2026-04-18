import { Link, useLocation } from 'react-router-dom';
import { Layers, MessageSquare, PartyPopper, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export function BottomNav() {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Layers, label: 'Cards' },
    { path: '/messages', icon: MessageSquare, label: 'Messages' },
    { path: '/create', icon: PartyPopper, label: 'Host', isNeon: true },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[88px] bg-transparent flex items-center justify-between px-8 z-50 max-w-md mx-auto border-t border-white/5 backdrop-blur-md pb-4 pt-2">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;

        return (
          <Link
            key={item.path}
            to={item.path}
            className="relative flex flex-col items-center justify-center w-16 h-full"
          >
            <div
              className={cn(
                'relative p-2 rounded-full transition-colors duration-300',
                isActive
                  ? 'text-brand-primary'
                  : 'text-white/40 hover:text-white/70'
              )}
            >
              {item.isNeon && isActive && (
                <motion.div
                  layoutId="neon-glow"
                  className="absolute inset-0 bg-brand-primary/20 rounded-full blur-[8px]"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <Icon
                size={isActive && item.isNeon ? 26 : 24}
                strokeWidth={isActive ? 2.5 : 2}
                className={cn('relative z-10', item.isNeon && !isActive && 'text-brand-primary/50', item.isNeon && isActive && 'drop-shadow-[0_0_8px_rgba(255,59,92,0.8)]')}
              />
            </div>
            {item.label === 'Profile' && isActive && (
               <span className="text-[10px] absolute bottom-1 font-medium text-white tracking-wider">Profile</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
