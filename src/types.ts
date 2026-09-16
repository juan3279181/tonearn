export interface Boost {
  id: string;
  title: string;
  multiplier: number;
  durationSeconds: number;
  startedAt: number;
  expiresAt: number;
  type: 'ad' | 'daily' | 'upgrade';
}

export interface UserProfile {
  id: string;
  telegramId: string;
  username: string;
  firstName: string;
  avatarUrl?: string;
  tonWalletAddress: string;
  balance: number;
  totalMined: number;
  energy: number;
  maxEnergy: number;
  energyRegenRate: number; // energy per second
  minerLevel: number;
  minerBaseRate: number; // TON per hour base
  activeBoosts: Boost[];
  lastActiveTimestamp: number;
  lastDailyClaim: number;
  dailyStreak: number;
  referralCode: string;
  referredBy?: string;
  referralsCount: number;
  referralEarnings: number;
  role: 'user' | 'admin';
  isBanned: boolean;
  cheatScore: number;
  botFlags: string[];
  adsWatchedCount: number;
  createdAt: number;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  username: string;
  amount: number;
  fee: number;
  netAmount: number;
  tonAddress: string;
  memo?: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected' | 'refunded';
  createdAt: number;
  processedAt?: number;
  txHash?: string;
  rejectionReason?: string;
  mode?: 'live_onchain' | 'simulated' | 'pending_hotwallet';
  dispatchError?: string;
  refundedAt?: number;
}

export interface TonDispatcherStatus {
  isConfigured: boolean;
  network: 'mainnet' | 'testnet';
  dispatcherAddress?: string;
  dispatcherBalanceTon?: number;
  mode: 'live_ready' | 'needs_hot_wallet' | 'insufficient_balance';
  message: string;
}

export interface ReferralFriend {
  id: string;
  username: string;
  joinedAt: number;
  minedTotal: number;
  commissionEarned: number;
  active: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl?: string;
  totalMined: number;
  referralsCount: number;
  minerLevel: number;
  isCurrentUser?: boolean;
}

export interface SystemSettings {
  baseMiningRatePerHour: number;
  tapRewardAmount: number;
  adBoostMultiplier: number;
  adBoostDurationMinutes: number;
  adRewardInstantTon: number;
  referralBonusTon: number;
  referralCommissionPercent: number;
  minWithdrawalLimit: number;
  withdrawalFeePercent: number;
  antiCheatMaxTapsPerSec: number;
  antiCheatSensitivity: 'low' | 'medium' | 'strict';
  maintenanceMode: boolean;
}

export interface TrafficMetric {
  id: string;
  timestamp: number;
  endpoint: string;
  method: string;
  userId?: string;
  ip: string;
  durationMs: number;
  isSuspicious: boolean;
  flagReason?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  type: 'mining' | 'boost' | 'payout' | 'referral' | 'system' | 'security';
  icon?: string;
}

export interface DailyBonusDay {
  day: number;
  tonReward: number;
  boostMultiplier: number;
  boostDurationMinutes: number;
  energyBonus: number;
  claimed: boolean;
  isToday: boolean;
  locked: boolean;
}
