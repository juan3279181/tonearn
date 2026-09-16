import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  Sliders, 
  CreditCard, 
  Activity, 
  Search, 
  Ban, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Save, 
  AlertTriangle, 
  Check, 
  ArrowUpRight, 
  Clock, 
  Filter,
  Wallet,
  ExternalLink,
  Copy,
  Lock,
  Server,
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { SystemSettings, WithdrawalRequest, TrafficMetric, UserProfile } from '../types';

interface AdminPanelProps {
  currentSettings: SystemSettings;
  onUpdateSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentSettings,
  onUpdateSettings,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'traffic' | 'users' | 'rates' | 'payouts' | 'hotwallet'>('traffic');
  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [payoutsList, setPayoutsList] = useState<WithdrawalRequest[]>([]);
  const [trafficLogs, setTrafficLogs] = useState<TrafficMetric[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'suspicious' | 'banned'>('all');
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Hot wallet configuration state
  const [hotWalletInfo, setHotWalletInfo] = useState<{
    isConfigured: boolean;
    address?: string;
    balanceTon?: number;
    network?: 'mainnet' | 'testnet';
    error?: string;
  } | null>(null);
  const [mnemonicInput, setMnemonicInput] = useState('');
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [walletNetwork, setWalletNetwork] = useState<'mainnet' | 'testnet'>('mainnet');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hotWalletLoading, setHotWalletLoading] = useState(false);
  const [hotWalletError, setHotWalletError] = useState<string | null>(null);
  const [hotWalletSuccess, setHotWalletSuccess] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [generatingWallet, setGeneratingWallet] = useState(false);
  const [generatedWords, setGeneratedWords] = useState<string[] | null>(null);
  const [copiedWords, setCopiedWords] = useState(false);

  // Settings form state
  const [formSettings, setFormSettings] = useState<SystemSettings>(currentSettings);

  // Balance adjustment modal state
  const [adjustingUser, setAdjustingUser] = useState<UserProfile | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Stats & Traffic
      const statsRes = await fetch('/api/admin/stats');
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
        setTrafficLogs(data.recentTraffic || []);
        if (data.settings) setFormSettings(data.settings);
      }

      // 2. Fetch Users
      const usersRes = await fetch(`/api/admin/users?search=${encodeURIComponent(userSearch)}&filter=${userFilter}`);
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsersList(data.users || []);
      }

      // 3. Fetch Payouts
      const payoutsRes = await fetch('/api/admin/payouts');
      if (payoutsRes.ok) {
        const data = await payoutsRes.json();
        setPayoutsList(data.withdrawals || []);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHotWalletInfo = async () => {
    try {
      const res = await fetch('/api/admin/hotwallet');
      if (res.ok) {
        const data = await res.json();
        setHotWalletInfo(data);
        if (data.network) setWalletNetwork(data.network);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchAdminData();
    fetchHotWalletInfo();
  }, [userFilter]);

  const handleConnectHotWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setHotWalletLoading(true);
    setHotWalletError(null);
    setHotWalletSuccess(null);

    try {
      const cleanMnemonic = mnemonicInput.trim();
      const words = cleanMnemonic.split(/\s+/).filter(Boolean);
      if (words.length !== 24 && words.length !== 12) {
        throw new Error(`Please enter exactly 24 (or 12) words separated by spaces. Got ${words.length} words.`);
      }

      const res = await fetch('/api/admin/hotwallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mnemonic: cleanMnemonic,
          network: walletNetwork,
          apiKey: apiKeyInput
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to connect TON hot wallet');
      }

      setHotWalletInfo(data.info);
      setHotWalletSuccess(`Successfully connected TON Hot Wallet (${data.info.address?.substring(0, 6)}...${data.info.address?.substring(data.info.address.length - 4)})!`);
      setMnemonicInput('');
      fetchAdminData();
    } catch (err: any) {
      setHotWalletError(err.message || 'Failed to connect hot wallet');
    } finally {
      setHotWalletLoading(false);
    }
  };

  const handleDisconnectHotWallet = async () => {
    if (!window.confirm('Are you sure you want to disconnect this hot wallet from the server? On-chain payouts will be paused until reconnected.')) {
      return;
    }
    setHotWalletLoading(true);
    try {
      const res = await fetch('/api/admin/hotwallet/disconnect', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setHotWalletInfo(data.info);
        setHotWalletSuccess('Hot wallet disconnected.');
        fetchAdminData();
      }
    } catch (err: any) {
      setHotWalletError(err.message || 'Failed to disconnect');
    } finally {
      setHotWalletLoading(false);
    }
  };

  const copyAddressToClipboard = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const copyWordsToClipboard = (phrase: string) => {
    navigator.clipboard.writeText(phrase);
    setCopiedWords(true);
    setTimeout(() => setCopiedWords(false), 2000);
  };

  const handleGenerateNewWallet = async () => {
    setGeneratingWallet(true);
    setHotWalletError(null);
    setHotWalletSuccess(null);
    try {
      const res = await fetch('/api/admin/hotwallet/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'user_demo'
        }
      });
      const data = await res.json().catch(() => ({ error: `Server returned status ${res.status}` }));
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Failed to generate wallet (Status ${res.status})`);
      }
      if (!data.words || data.words.length !== 24) {
        throw new Error('Server did not return a valid 24-word phrase');
      }

      setMnemonicInput(data.mnemonic || data.words.join(' '));
      setGeneratedWords(data.words);
      setShowMnemonic(true);
    } catch (err: any) {
      setHotWalletError(err.message || 'Failed to generate 24-word wallet');
    } finally {
      setGeneratingWallet(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAdminData();
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onUpdateSettings(formSettings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (targetUserId: string, action: string, value?: any) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, action, value })
      });
      if (res.ok) {
        setActionMsg(`User action '${action}' completed!`);
        setTimeout(() => setActionMsg(null), 3000);
        fetchAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setLoading(false);
      setAdjustingUser(null);
      setAdjustAmount('');
    }
  };

  const handleProcessPayout = async (withdrawalId: string, action: 'approve' | 'reject') => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/payouts/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawalId, action })
      });
      if (res.ok) {
        setActionMsg(`Payout successfully ${action}d!`);
        setTimeout(() => setActionMsg(null), 3000);
        fetchAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Processing payout failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchApprove = async () => {
    if (!confirm('Approve all pending withdrawals and simulate TON on-chain broadcast?')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/payouts/batch-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setActionMsg(`Batch approved ${data.approvedCount} pending payouts!`);
        setTimeout(() => setActionMsg(null), 3500);
        fetchAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Batch payout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto px-4 pb-20 select-none animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between my-3 py-2 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">TON Miner Master Admin Panel</h2>
              <span className="text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded">
                LIVE CONTROLLER
              </span>
            </div>
            <p className="text-xs text-slate-400">Manage users, custom reward rates, payouts & network traffic</p>
          </div>
        </div>

        <button
          id="refresh-admin-data-btn"
          onClick={fetchAdminData}
          disabled={loading}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          title="Refresh data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {actionMsg && (
        <div className="mb-3 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Top Stats Strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Users</span>
            <div className="text-lg font-black text-white font-mono mt-0.5">{stats.totalUsers}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Total TON Mined</span>
            <div className="text-lg font-black text-cyan-400 font-mono mt-0.5">{stats.totalMinedTon.toFixed(2)}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Pending Payouts</span>
            <div className="text-lg font-black text-amber-400 font-mono mt-0.5">{stats.totalPendingPayouts.toFixed(2)} TON</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Ads Watched</span>
            <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">{stats.totalAdsWatched}</div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-800 bg-slate-950/60 p-1 rounded-xl mb-4 gap-1 overflow-x-auto">
        <button
          id="admin-tab-traffic"
          onClick={() => setActiveTab('traffic')}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'traffic'
              ? 'bg-[#0098ea] text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Traffic Telemetry ({trafficLogs.length})</span>
        </button>

        <button
          id="admin-tab-users"
          onClick={() => setActiveTab('users')}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-[#0098ea] text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Manage Users ({usersList.length})</span>
        </button>

        <button
          id="admin-tab-payouts"
          onClick={() => setActiveTab('payouts')}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'payouts'
              ? 'bg-[#0098ea] text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Payouts & Withdrawals ({payoutsList.filter(p => p.status === 'pending').length} pending)</span>
        </button>

        <button
          id="admin-tab-rates"
          onClick={() => setActiveTab('rates')}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'rates'
              ? 'bg-[#0098ea] text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Custom Reward Rates</span>
        </button>

        <button
          id="admin-tab-hotwallet"
          onClick={() => setActiveTab('hotwallet')}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'hotwallet'
              ? 'bg-[#0098ea] text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>TON Hot Wallet</span>
          <span className={`w-2 h-2 rounded-full ${hotWalletInfo?.isConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
        </button>
      </div>

      {/* 1. TRAFFIC TELEMETRY TAB */}
      {activeTab === 'traffic' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Real-time requests and anomaly detection log</span>
            <span className="font-mono text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Monitoring Live
            </span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3">Time</th>
                    <th className="p-3">Method</th>
                    <th className="p-3">Endpoint</th>
                    <th className="p-3">IP Address</th>
                    <th className="p-3">Latency</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {trafficLogs.map(log => (
                    <tr key={log.id} className={log.isSuspicious ? 'bg-rose-500/10' : ''}>
                      <td className="p-3 text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</td>
                      <td className="p-3">
                        <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                          log.method === 'POST' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {log.method}
                        </span>
                      </td>
                      <td className="p-3 text-slate-200">{log.endpoint}</td>
                      <td className="p-3 text-slate-400">{log.ip}</td>
                      <td className="p-3 text-slate-300">{log.durationMs}ms</td>
                      <td className="p-3">
                        {log.isSuspicious ? (
                          <span className="text-rose-400 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Flagged
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-bold">200 OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. MANAGE USERS TAB */}
      {activeTab === 'users' && (
        <div className="flex flex-col gap-3">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-2">
            <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
              <input
                id="admin-search-users-input"
                type="text"
                placeholder="Search username, Telegram ID, or TON wallet..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-[#0098ea]"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#0098ea] hover:bg-[#00a2ff] text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>
            </form>

            <div className="flex gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setUserFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${userFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setUserFilter('suspicious')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${userFilter === 'suspicious' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400'}`}
              >
                Suspicious
              </button>
              <button
                type="button"
                onClick={() => setUserFilter('banned')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${userFilter === 'banned' ? 'bg-rose-500/20 text-rose-300' : 'text-slate-400'}`}
              >
                Banned
              </button>
            </div>
          </div>

          {/* User List Cards */}
          <div className="flex flex-col gap-2.5">
            {usersList.map(userItem => (
              <div
                key={userItem.id}
                className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white uppercase text-xs flex-shrink-0">
                    {userItem.username.substring(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-sm">@{userItem.username}</span>
                      {userItem.isBanned && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-bold">
                          BANNED
                        </span>
                      )}
                      {userItem.role === 'admin' && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      TG: {userItem.telegramId} • Wallet: {userItem.tonWalletAddress ? `${userItem.tonWalletAddress.substring(0, 8)}...` : 'Not linked'}
                    </div>
                    {userItem.botFlags.length > 0 && (
                      <div className="text-[10px] text-amber-400 mt-0.5">
                        ⚠️ Flags: {userItem.botFlags[userItem.botFlags.length - 1]}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                  <div className="text-right font-mono">
                    <div className="font-bold text-emerald-400">{userItem.balance.toFixed(4)} TON</div>
                    <div className="text-[10px] text-slate-400">Cheat Score: {userItem.cheatScore}/100</div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAdjustingUser(userItem)}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold"
                    >
                      +/- TON
                    </button>

                    {userItem.cheatScore > 0 && (
                      <button
                        type="button"
                        onClick={() => handleUserAction(userItem.id, 'reset_cheat_score')}
                        className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-semibold"
                        title="Clear Anti-Cheat Flags"
                      >
                        Reset Score
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleUserAction(userItem.id, 'toggle_ban')}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                        userItem.isBanned
                          ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                      }`}
                    >
                      {userItem.isBanned ? 'Unban' : 'Ban'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Adjust User Balance Modal */}
          {adjustingUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="w-full max-w-xs bg-slate-900 border border-slate-700 rounded-2xl p-4 flex flex-col gap-3">
                <h4 className="text-sm font-bold text-white">
                  Adjust TON for @{adjustingUser.username}
                </h4>
                <p className="text-xs text-slate-400">
                  Current Balance: {adjustingUser.balance.toFixed(4)} TON. Enter positive number to add, negative to deduct.
                </p>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 1.5 or -0.5"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-black/50 border border-slate-700 text-white font-mono text-xs"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustingUser(null)}
                    className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUserAction(adjustingUser.id, 'adjust_balance', adjustAmount)}
                    className="flex-1 py-2 rounded-xl bg-[#0098ea] hover:bg-[#00a2ff] text-white text-xs font-bold"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. PAYOUTS & WITHDRAWALS TAB */}
      {activeTab === 'payouts' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-300 font-semibold">
              Pending & Processed TON Withdrawals
            </span>
            <button
              type="button"
              onClick={handleBatchApprove}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1 shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Batch Approve All Pending</span>
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            {payoutsList.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No payout requests found.
              </div>
            ) : (
              payoutsList.map(item => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">@{item.username}</span>
                      <span className="font-mono font-black text-emerald-400">
                        {item.netAmount.toFixed(4)} TON
                      </span>
                      <span className="text-[10px] text-slate-500">(Gross: {item.amount} TON)</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono truncate max-w-sm mt-0.5">
                      Destination: {item.tonAddress}
                    </div>
                    {item.memo && (
                      <div className="text-[10px] text-cyan-300 font-mono mt-0.5">
                        Memo: {item.memo}
                      </div>
                    )}
                    {item.txHash && (
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Tx: {item.txHash.substring(0, 16)}...
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {item.status === 'pending' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleProcessPayout(item.id, 'approve')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve & Broadcast</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleProcessPayout(item.id, 'reject')}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject & Refund</span>
                        </button>
                      </>
                    ) : item.status === 'completed' ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold">
                        Completed
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 text-[11px] font-bold">
                        Rejected
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. CUSTOM REWARD RATES & SETTINGS TAB */}
      {activeTab === 'rates' && (
        <form onSubmit={handleSaveSettings} className="flex flex-col gap-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-3">
            <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
              Economy & Mining Rates
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Base Mining Rate (TON / hour)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={formSettings.baseMiningRatePerHour}
                  onChange={(e) => setFormSettings({ ...formSettings, baseMiningRatePerHour: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-white font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Tap Mining Reward (TON / tap)
                </label>
                <input
                  type="number"
                  step="0.00005"
                  value={formSettings.tapRewardAmount}
                  onChange={(e) => setFormSettings({ ...formSettings, tapRewardAmount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-white font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-3">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Ads & Boost Parameters
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Ad Speed Multiplier (e.g. 2.5x)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formSettings.adBoostMultiplier}
                  onChange={(e) => setFormSettings({ ...formSettings, adBoostMultiplier: parseFloat(e.target.value) || 1 })}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-white font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Ad Boost Duration (Minutes)
                </label>
                <input
                  type="number"
                  step="5"
                  value={formSettings.adBoostDurationMinutes}
                  onChange={(e) => setFormSettings({ ...formSettings, adBoostDurationMinutes: parseInt(e.target.value, 10) || 10 })}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-white font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Ad Instant TON Reward
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={formSettings.adRewardInstantTon}
                  onChange={(e) => setFormSettings({ ...formSettings, adRewardInstantTon: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-white font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-3">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Referrals & Payout Thresholds
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Referral Instant Bonus (TON)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formSettings.referralBonusTon}
                  onChange={(e) => setFormSettings({ ...formSettings, referralBonusTon: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-white font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Referral Lifetime Commission %
                </label>
                <input
                  type="number"
                  step="1"
                  value={formSettings.referralCommissionPercent}
                  onChange={(e) => setFormSettings({ ...formSettings, referralCommissionPercent: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-white font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Minimum Withdrawal Limit (TON)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={formSettings.minWithdrawalLimit}
                  onChange={(e) => setFormSettings({ ...formSettings, minWithdrawalLimit: parseFloat(e.target.value) || 0.1 })}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-white font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Withdrawal Network Fee %
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formSettings.withdrawalFeePercent}
                  onChange={(e) => setFormSettings({ ...formSettings, withdrawalFeePercent: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-white font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Anti-Cheat Max Taps / Sec
                </label>
                <input
                  type="number"
                  step="1"
                  value={formSettings.antiCheatMaxTapsPerSec}
                  onChange={(e) => setFormSettings({ ...formSettings, antiCheatMaxTapsPerSec: parseInt(e.target.value, 10) || 12 })}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-white font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <button
            id="save-admin-rates-btn"
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0098ea] to-[#0088cc] hover:from-[#00a2ff] hover:to-[#0098ea] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#0098ea]/25 active:scale-98 transition-all"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Custom Rates Applied Successfully!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{loading ? 'Saving Changes...' : 'Save & Update Reward Rates'}</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* 5. TON HOT WALLET & ON-CHAIN GATEWAY TAB */}
      {activeTab === 'hotwallet' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-150">
          {/* Header Card */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#0098ea]/15 text-[#0098ea]">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">TON Blockchain Hot Wallet Gateway</h3>
                  <p className="text-[11px] text-slate-400">
                    Direct on-chain payout dispatcher for automatic TON coin payouts
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={fetchHotWalletInfo}
                disabled={hotWalletLoading}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Refresh wallet status"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${hotWalletLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Feedback alerts */}
          {hotWalletSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{hotWalletSuccess}</span>
            </div>
          )}

          {hotWalletError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{hotWalletError}</span>
            </div>
          )}

          {/* If Configured: Display Active Status & Controls */}
          {hotWalletInfo?.isConfigured ? (
            <div className="flex flex-col gap-4">
              {/* Status Banner */}
              <div className={`p-4 rounded-2xl border ${
                (hotWalletInfo.balanceTon || 0) > 0.02
                  ? 'bg-emerald-950/30 border-emerald-500/30'
                  : 'bg-amber-950/30 border-amber-500/30'
              } flex flex-col gap-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      (hotWalletInfo.balanceTon || 0) > 0.02
                        ? 'bg-emerald-400 animate-pulse'
                        : 'bg-amber-400'
                    }`} />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      {(hotWalletInfo.balanceTon || 0) > 0.02 ? 'Gateway Active & Ready' : 'Low Gas Balance'}
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold uppercase">
                    {hotWalletInfo.network || 'mainnet'}
                  </span>
                </div>

                {/* Balance Display */}
                <div className="p-3 rounded-xl bg-black/40 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Hot Wallet On-Chain Balance
                    </span>
                    <span className="text-xl font-black font-mono text-cyan-400">
                      {(hotWalletInfo.balanceTon || 0).toFixed(4)} TON
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={fetchHotWalletInfo}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${hotWalletLoading ? 'animate-spin' : ''}`} />
                    <span>Check Balance</span>
                  </button>
                </div>

                {/* Public Address */}
                <div>
                  <span className="text-[11px] text-slate-300 font-semibold block mb-1">
                    Hot Wallet Public Address:
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="p-2.5 rounded-xl bg-black/60 border border-slate-700 text-white font-mono text-xs truncate flex-1 select-all">
                      {hotWalletInfo.address}
                    </div>
                    {hotWalletInfo.address && (
                      <button
                        type="button"
                        onClick={() => copyAddressToClipboard(hotWalletInfo.address!)}
                        className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200"
                        title="Copy address"
                      >
                        {copiedAddress ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    )}
                    {hotWalletInfo.address && (
                      <a
                        href={
                          hotWalletInfo.network === 'testnet'
                            ? `https://testnet.tonscan.org/address/${hotWalletInfo.address}`
                            : `https://tonscan.org/address/${hotWalletInfo.address}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-xl bg-[#0098ea] hover:bg-[#0088cc] text-white"
                        title="View on TON Explorer"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Free Testnet Faucet Assistant */}
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-slate-900 border border-indigo-500/30 text-xs text-slate-300 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-300 flex items-center gap-1.5 text-xs">
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                      Free Testnet TON Faucets (No Real Money Needed)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase font-mono">
                      100% Free
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Need free test coins for this hot wallet? Official TON testnet faucets distribute <strong>2 to 5 Testnet TON</strong> instantly to any address:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <a
                      href="https://t.me/testgiver_ton_bot"
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-xl bg-[#0098ea] hover:bg-[#0088cc] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#0098ea]/20"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Telegram Faucet (@testgiver_ton_bot)</span>
                    </a>

                    <a
                      href="https://faucet.triangleplatform.com/ton/testnet"
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all border border-slate-700"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Triangle Web Faucet</span>
                    </a>
                  </div>

                  <div className="p-2 rounded-lg bg-black/40 border border-indigo-900/40 text-[11px] text-slate-400">
                    <strong className="text-slate-200">How to claim in 10 seconds:</strong>
                    <ol className="list-decimal list-inside mt-1 space-y-0.5">
                      <li>Tap the <strong>Copy Address</strong> button above to copy your Hot Wallet address.</li>
                      <li>Click <strong>Telegram Faucet</strong> and send your copied address to the bot.</li>
                      <li>The bot sends free testnet TON in 5 seconds. Come back and click <strong>Check Balance</strong>!</li>
                    </ol>
                  </div>
                </div>

                {/* Deposit Instruction Card */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex flex-col gap-1.5">
                  <span className="font-bold text-amber-300 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    How to Fund On-Chain Payouts:
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    To send real TON coins to users, transfer a small amount (e.g. <strong>0.2 to 0.5 TON</strong>) to the Hot Wallet address above. 
                    Network transfer gas on the TON blockchain is only <strong>~0.005 TON</strong> per payout.
                  </p>
                </div>

                {/* Disconnect Action */}
                <div className="pt-2 border-t border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={handleDisconnectHotWallet}
                    disabled={hotWalletLoading}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Disconnect / Change Seed</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* If Not Configured: Connection Form */
            <form onSubmit={handleConnectHotWallet} className="flex flex-col gap-4">
              {/* 1-Click Generator Card */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/50 via-blue-950/40 to-slate-900 border border-cyan-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                <div>
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    Don't have 24 words yet? Generate them here!
                  </span>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    No need to install any apps first. Generate a brand new, genuine 24-word TON wallet in 1 second.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateNewWallet}
                  disabled={generatingWallet}
                  className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#0098ea] to-[#0088cc] hover:from-[#00a2ff] hover:to-[#0098ea] text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#0098ea]/30 active:scale-95 shrink-0 transition-all"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${generatingWallet ? 'animate-spin' : ''}`} />
                  <span>{generatingWallet ? 'Generating...' : 'Generate New 24 Words'}</span>
                </button>
              </div>

              {/* Display Generated Words Grid if generated */}
              {generatedWords && generatedWords.length === 24 && (
                <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/40 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Fresh 24-Word Recovery Phrase Generated!
                    </span>
                    <button
                      type="button"
                      onClick={() => copyWordsToClipboard(generatedWords.join(' '))}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1"
                    >
                      {copiedWords ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedWords ? 'Copied to Clipboard!' : 'Copy All 24 Words'}</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Save these words somewhere safe! You can also import these exact 24 words into Tonkeeper or SafePal anytime.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-2.5 rounded-xl bg-black/60 border border-slate-800">
                    {generatedWords.map((word, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-xs font-mono p-1 rounded bg-slate-900/60 border border-slate-800/80">
                        <span className="text-[10px] text-slate-500 font-bold w-4 text-right">{idx + 1}.</span>
                        <span className="text-cyan-300 font-semibold">{word}</span>
                      </div>
                    ))}
                  </div>

                  <span className="text-[11px] text-emerald-300 font-medium">
                    Words have been automatically placed into the form below. Choose your network and click <strong>Save & Connect</strong>!
                  </span>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200">
                    TON Wallet 24-Word Recovery Seed Phrase
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowMnemonic(!showMnemonic)}
                    className="text-[11px] text-[#0098ea] hover:underline flex items-center gap-1"
                  >
                    {showMnemonic ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showMnemonic ? 'Hide Words' : 'Show Words'}</span>
                  </button>
                </div>

                <div className="relative">
                  <textarea
                    rows={3}
                    value={mnemonicInput}
                    onChange={(e) => setMnemonicInput(e.target.value)}
                    placeholder="word1 word2 word3 ... word24 (separated by single spaces)"
                    className={`w-full p-3 rounded-xl bg-black/50 border border-slate-700 text-white font-mono text-xs focus:border-[#0098ea] focus:outline-none ${
                      !showMnemonic ? 'filter blur-[1.5px] hover:blur-none transition-all' : ''
                    }`}
                    required
                  />
                </div>

                {/* Word Counter */}
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">
                    Word count:
                  </span>
                  {(() => {
                    const count = mnemonicInput.trim().split(/\s+/).filter(Boolean).length;
                    return (
                      <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                        count === 24 || count === 12
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : count > 0
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'text-slate-500'
                      }`}>
                        {count} / 24 words
                      </span>
                    );
                  })()}
                </div>

                {/* Network Selection */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Network Target
                    </label>
                    <select
                      value={walletNetwork}
                      onChange={(e) => setWalletNetwork(e.target.value as 'mainnet' | 'testnet')}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-white font-bold text-xs"
                    >
                      <option value="mainnet">TON Mainnet (Real Cryptocurrency)</option>
                      <option value="testnet">TON Testnet (Free Testing Network)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Toncenter API Key (Optional)
                    </label>
                    <input
                      type="text"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="Optional (higher rate limits)"
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-white font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Security Note */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
                  <Lock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Security Notice:</strong> Your mnemonic is stored strictly server-side on the backend. 
                    It is used exclusively by the server to sign verified withdrawal requests and is never exposed to regular users or client-side code.
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={hotWalletLoading || !mnemonicInput.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0098ea] to-[#0088cc] hover:from-[#00a2ff] hover:to-[#0098ea] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#0098ea]/25 active:scale-98 transition-all disabled:opacity-50"
              >
                <Server className="w-4 h-4" />
                <span>{hotWalletLoading ? 'Connecting & Verifying...' : 'Save & Connect TON Hot Wallet'}</span>
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
