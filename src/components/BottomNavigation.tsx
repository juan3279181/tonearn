import React from 'react';
import { 
  Pickaxe, 
  Tv, 
  Users, 
  Wallet, 
  Trophy, 
  Shield 
} from 'lucide-react';

export type TabType = 'mine' | 'boosts' | 'referrals' | 'wallet' | 'leaderboard' | 'admin';

interface BottomNavigationProps {
  currentTab: TabType;
  onChangeTab: (tab: TabType) => void;
  isAdmin: boolean;
  activeBoostsCount: number;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentTab,
  onChangeTab,
  isAdmin,
  activeBoostsCount
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0c1422]/95 backdrop-blur-md border-t border-slate-800/80 py-1 px-2">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {/* Mine Tab */}
        <button
          id="nav-mine-btn"
          onClick={() => onChangeTab('mine')}
          className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all ${
            currentTab === 'mine'
              ? 'text-[#0098ea] font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Pickaxe className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Mine</span>
        </button>

        {/* Boosts / Watch Ads Tab */}
        <button
          id="nav-boosts-btn"
          onClick={() => onChangeTab('boosts')}
          className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all relative ${
            currentTab === 'boosts'
              ? 'text-amber-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Tv className="w-5 h-5 mb-0.5" />
            {activeBoostsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </div>
          <span className="text-[10px] tracking-tight">Boosts</span>
        </button>

        {/* Referral Tab */}
        <button
          id="nav-referrals-btn"
          onClick={() => onChangeTab('referrals')}
          className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all ${
            currentTab === 'referrals'
              ? 'text-cyan-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Friends</span>
        </button>

        {/* Wallet Tab */}
        <button
          id="nav-wallet-btn"
          onClick={() => onChangeTab('wallet')}
          className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all ${
            currentTab === 'wallet'
              ? 'text-[#0098ea] font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wallet className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Payout</span>
        </button>

        {/* Leaderboard Tab */}
        <button
          id="nav-leaderboard-btn"
          onClick={() => onChangeTab('leaderboard')}
          className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all ${
            currentTab === 'leaderboard'
              ? 'text-yellow-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trophy className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Top</span>
        </button>

        {/* Admin Tab (if admin role) */}
        {isAdmin && (
          <button
            id="nav-admin-btn"
            onClick={() => onChangeTab('admin')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all ${
              currentTab === 'admin'
                ? 'text-rose-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Admin</span>
          </button>
        )}
      </div>
    </nav>
  );
};
