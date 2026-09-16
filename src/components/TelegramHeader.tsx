import React from 'react';
import { 
  Bell, 
  ShieldCheck, 
  ShieldAlert, 
  Wallet, 
  Sparkles,
  Smartphone,
  Layers
} from 'lucide-react';
import { UserProfile } from '../types';

interface TelegramHeaderProps {
  user: UserProfile;
  unreadNotifsCount: number;
  onOpenNotifications: () => void;
  onOpenWallet: () => void;
  onOpenAntiCheatStatus: () => void;
  isSimulatedTMA: boolean;
  onToggleTMAMode: () => void;
  effectiveMultiplier: number;
}

export const TelegramHeader: React.FC<TelegramHeaderProps> = ({
  user,
  unreadNotifsCount,
  onOpenNotifications,
  onOpenWallet,
  onOpenAntiCheatStatus,
  isSimulatedTMA,
  onToggleTMAMode,
  effectiveMultiplier,
}) => {
  return (
    <header className="w-full bg-[#0d1624]/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-30 px-3 py-2.5 transition-all">
      {/* Telegram Mini App Top Status / App Bar */}
      <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
        {/* Left: User Profile & Level */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#0088cc] via-[#00a2ff] to-[#40c4ff] p-[1.5px] shadow-sm shadow-[#0088cc]/30">
              <div className="w-full h-full rounded-full bg-[#132238] flex items-center justify-center text-white font-bold text-xs uppercase">
                {(user.username || 'TM').substring(0, 2)}
              </div>
            </div>
            {/* Level Badge */}
            <span className="absolute -bottom-1 -right-1 bg-[#0088cc] text-[9px] font-extrabold text-white px-1.5 py-0.2 rounded-full border border-[#0d1624]">
              Lv.{user.minerLevel || 1}
            </span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-white tracking-wide truncate max-w-[110px]">
                @{user.username || 'miner'}
              </span>
              {user.role === 'admin' && (
                <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                  ADMIN
                </span>
              )}
            </div>

            {/* Anti-cheat status pill */}
            <button
              id="anti-cheat-status-btn"
              onClick={onOpenAntiCheatStatus}
              className="flex items-center gap-1 text-[10px] text-left text-slate-400 hover:text-cyan-300 transition-colors"
            >
              {user.cheatScore > 30 ? (
                <>
                  <ShieldAlert className="w-3 h-3 text-amber-400" />
                  <span className="text-amber-400 font-medium">Anomaly Check ({user.cheatScore})</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span className="text-slate-400">Fair Play Shield</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Multiplier Badge, Wallet Connect Chip, Notifications */}
        <div className="flex items-center gap-1.5">
          {/* Active Multiplier Pill */}
          {effectiveMultiplier > 1.0 && (
            <div className="flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 px-2 py-1 rounded-full animate-pulse">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span className="text-[11px] font-bold text-amber-300">
                {effectiveMultiplier.toFixed(1)}x
              </span>
            </div>
          )}

          {/* TON Wallet Button */}
          <button
            id="header-wallet-btn"
            onClick={onOpenWallet}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              user.tonWalletAddress
                ? 'bg-[#0088cc]/15 text-[#00a2ff] border border-[#0088cc]/40 hover:bg-[#0088cc]/25'
                : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-[#0098ea]" />
            <span className="hidden sm:inline">
              {user.tonWalletAddress
                ? `${user.tonWalletAddress.substring(0, 4)}...${user.tonWalletAddress.substring(user.tonWalletAddress.length - 3)}`
                : 'Connect'}
            </span>
          </button>

          {/* Telegram Frame Toggle */}
          <button
            id="toggle-tma-frame-btn"
            onClick={onToggleTMAMode}
            title={isSimulatedTMA ? 'Switch to Full-Screen View' : 'Simulate Telegram App View'}
            className="p-1.5 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700/60"
          >
            {isSimulatedTMA ? <Smartphone className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
          </button>

          {/* Notification Bell */}
          <button
            id="header-notifications-btn"
            onClick={onOpenNotifications}
            className="relative p-1.5 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700/60"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce">
                {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
