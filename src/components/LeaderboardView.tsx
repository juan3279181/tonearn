import React, { useState } from 'react';
import { 
  Trophy, 
  Users, 
  Pickaxe, 
  Crown, 
  Medal, 
  Coins, 
  Sparkles 
} from 'lucide-react';
import { LeaderboardEntry } from '../types';

interface LeaderboardViewProps {
  topMiners: LeaderboardEntry[];
  topReferrers: LeaderboardEntry[];
  currentUserId: string;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  topMiners,
  topReferrers,
  currentUserId
}) => {
  const [activeTab, setActiveTab] = useState<'miners' | 'referrers'>('miners');

  const list = activeTab === 'miners' ? topMiners : topReferrers;
  const userRankEntry = list.find(e => e.userId === currentUserId || e.isCurrentUser);

  return (
    <div className="flex flex-col w-full max-w-md mx-auto px-4 pb-20 select-none animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="w-full flex items-center justify-between my-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Global Leaderboard</h2>
            <p className="text-xs text-slate-400">Top TON miners & ecosystem builders</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800 mb-3">
        <button
          id="leaderboard-tab-miners"
          onClick={() => setActiveTab('miners')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'miners'
              ? 'bg-[#0098ea] text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Pickaxe className="w-3.5 h-3.5" />
          <span>Top Miners</span>
        </button>

        <button
          id="leaderboard-tab-referrers"
          onClick={() => setActiveTab('referrers')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'referrers'
              ? 'bg-[#0098ea] text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Top Referrers</span>
        </button>
      </div>

      {/* Current User Rank Strip */}
      {userRankEntry && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-[#0098ea]/20 to-cyan-500/10 border border-[#0098ea]/40 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0098ea] text-white font-black text-xs flex items-center justify-center font-mono">
              #{userRankEntry.rank}
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1">
                <span>Your Ranking</span>
                <span className="text-[10px] bg-[#0098ea]/30 text-cyan-200 px-1.5 py-0.2 rounded font-mono">
                  Lv.{userRankEntry.minerLevel}
                </span>
              </div>
              <div className="text-[10px] text-slate-300">
                Keep mining to climb the global leaderboard!
              </div>
            </div>
          </div>
          <div className="text-right font-mono text-xs font-bold text-emerald-400">
            {activeTab === 'miners' ? (
              <span>{userRankEntry.totalMined.toFixed(4)} TON</span>
            ) : (
              <span>{userRankEntry.referralsCount} Invites</span>
            )}
          </div>
        </div>
      )}

      {/* Podium Top 3 */}
      {list.length >= 3 && (
        <div className="grid grid-cols-3 gap-2 my-2 items-end">
          {/* 2nd Place */}
          <div className="flex flex-col items-center p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="w-10 h-10 rounded-full bg-slate-700/60 border-2 border-slate-400 flex items-center justify-center text-slate-300 font-bold text-xs mb-1">
              2
            </div>
            <span className="text-[11px] font-bold text-white truncate max-w-[80px]">
              @{list[1].username}
            </span>
            <span className="text-[10px] font-mono text-cyan-300">
              {activeTab === 'miners' ? `${list[1].totalMined.toFixed(2)} TON` : `${list[1].referralsCount} refs`}
            </span>
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center p-3 rounded-2xl bg-gradient-to-b from-amber-500/20 to-slate-900 border border-amber-500/40 shadow-lg shadow-amber-500/10">
            <Crown className="w-5 h-5 text-amber-400 mb-0.5" />
            <div className="w-12 h-12 rounded-full bg-amber-500/30 border-2 border-amber-400 flex items-center justify-center text-amber-300 font-black text-sm mb-1">
              1
            </div>
            <span className="text-xs font-black text-white truncate max-w-[90px]">
              @{list[0].username}
            </span>
            <span className="text-[11px] font-mono font-bold text-amber-400">
              {activeTab === 'miners' ? `${list[0].totalMined.toFixed(2)} TON` : `${list[0].referralsCount} refs`}
            </span>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="w-10 h-10 rounded-full bg-amber-700/40 border-2 border-amber-600 flex items-center justify-center text-amber-400 font-bold text-xs mb-1">
              3
            </div>
            <span className="text-[11px] font-bold text-white truncate max-w-[80px]">
              @{list[2].username}
            </span>
            <span className="text-[10px] font-mono text-cyan-300">
              {activeTab === 'miners' ? `${list[2].totalMined.toFixed(2)} TON` : `${list[2].referralsCount} refs`}
            </span>
          </div>
        </div>
      )}

      {/* Ranks 4+ List */}
      <div className="flex flex-col gap-2 mt-2">
        {list.slice(3).map(entry => (
          <div
            key={entry.userId}
            className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
              entry.userId === currentUserId || entry.isCurrentUser
                ? 'bg-[#0098ea]/15 border-[#0098ea]/40'
                : 'bg-slate-900/60 border-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="w-6 font-mono font-bold text-slate-400 text-center">
                #{entry.rank}
              </span>
              <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300 text-[11px]">
                {entry.username.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <span className="font-bold text-white">@{entry.username}</span>
                <span className="ml-1 text-[9px] text-slate-400 font-mono">Lv.{entry.minerLevel}</span>
              </div>
            </div>

            <div className="font-mono font-bold text-right">
              {activeTab === 'miners' ? (
                <span className="text-emerald-400">+{entry.totalMined.toFixed(4)} TON</span>
              ) : (
                <span className="text-cyan-400">{entry.referralsCount} friends</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
