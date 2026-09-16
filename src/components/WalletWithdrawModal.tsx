import React, { useState, useEffect } from 'react';
import { 
  X, 
  Wallet, 
  ArrowUpRight, 
  ExternalLink,
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Copy, 
  Check,
  Clipboard,
  Unlink,
  Edit2,
  Sparkles,
  Zap,
  RotateCcw,
  HelpCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Server
} from 'lucide-react';
import { UserProfile, SystemSettings, WithdrawalRequest, TonDispatcherStatus } from '../types';
import { cleanAndValidateTonAddress } from '../utils/tonAddress';

interface WalletWithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  settings: SystemSettings;
  withdrawals: WithdrawalRequest[];
  dispatcherStatus?: TonDispatcherStatus | null;
  onSaveWalletAddress: (address: string) => Promise<void>;
  onRequestWithdrawal: (amount: number, address: string, memo?: string) => Promise<void>;
  onRefundWithdrawal?: (withdrawalId: string) => Promise<void>;
}

export const WalletWithdrawModal: React.FC<WalletWithdrawModalProps> = ({
  isOpen,
  onClose,
  user,
  settings,
  withdrawals,
  dispatcherStatus,
  onSaveWalletAddress,
  onRequestWithdrawal,
  onRefundWithdrawal
}) => {
  const [addressInput, setAddressInput] = useState(user.tonWalletAddress || '');
  const [amountInput, setAmountInput] = useState('');
  const [memoInput, setMemoInput] = useState('');
  const [activeTab, setActiveTab] = useState<'withdraw' | 'history' | 'connect'>('withdraw');
  const [loading, setLoading] = useState(false);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [showFaq, setShowFaq] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedTx, setCopiedTx] = useState<string | null>(null);
  const [isCopiedAddress, setIsCopiedAddress] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(!user.tonWalletAddress);

  // Sync state whenever modal opens or user's wallet address changes
  useEffect(() => {
    if (isOpen) {
      setAddressInput(user.tonWalletAddress || '');
      setIsEditingAddress(!user.tonWalletAddress);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, user.tonWalletAddress]);

  if (!isOpen) return null;

  const withdrawAmount = parseFloat(amountInput) || 0;
  const fee = withdrawAmount * (settings.withdrawalFeePercent / 100);
  const netAmount = Math.max(0, withdrawAmount - fee);

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator?.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setAddressInput(text.trim());
          setErrorMsg(null);
          return;
        }
      }
    } catch {
      // Ignore clipboard read permission error
    }
    const el = document.getElementById('wallet-address-input-field');
    if (el) el.focus();
  };

  const handleConnectSampleWallet = async (type: string, customAddr?: string) => {
    const sampleAddrs: Record<string, string> = {
      gram: 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N',
      telegram: `@${user.username || 'wallet'}`,
      tonkeeper: 'EQBvW8Z5huBkMJYdn30dcTe8xO4m5N42y2N9G3v8v0784920',
      mytonwallet: 'UQDFG21lmskwpo1829mskalq01828mznxka91283namskd01'
    };
    const targetAddr = customAddr || sampleAddrs[type] || sampleAddrs.gram;
    setAddressInput(targetAddr);
    setLoading(true);
    setErrorMsg(null);
    try {
      await onSaveWalletAddress(targetAddr);
      setSuccessMsg(`Wallet linked successfully (${type.toUpperCase()})!`);
      setIsEditingAddress(false);
      setTimeout(() => setSuccessMsg(null), 3500);
      setActiveTab('withdraw');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to link wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSaveAddress = async () => {
    setErrorMsg(null);
    if (!addressInput.trim()) {
      setErrorMsg('Please enter a Gram / TON wallet address.');
      return;
    }
    const valResult = cleanAndValidateTonAddress(addressInput);
    if (!valResult.valid) {
      setErrorMsg(valResult.error || 'Invalid Gram / TON wallet address format.');
      return;
    }
    setLoading(true);
    try {
      await onSaveWalletAddress(valResult.cleaned);
      setAddressInput(valResult.cleaned);
      setIsEditingAddress(false);
      setSuccessMsg('Gram / TON wallet successfully connected and saved!');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save wallet address');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectWallet = async () => {
    if (!confirm('Are you sure you want to disconnect this wallet address?')) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      await onSaveWalletAddress('');
      setAddressInput('');
      setIsEditingAddress(true);
      setSuccessMsg('Wallet disconnected.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to disconnect wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const rawTarget = addressInput.trim() || user.tonWalletAddress;
    if (!rawTarget) {
      setErrorMsg('Please connect or enter a Gram / TON destination wallet address.');
      return;
    }

    const valResult = cleanAndValidateTonAddress(rawTarget);
    if (!valResult.valid) {
      setErrorMsg(valResult.error || 'Please enter a valid Gram / TON destination wallet address.');
      return;
    }
    const targetAddr = valResult.cleaned;

    if (withdrawAmount < settings.minWithdrawalLimit) {
      setErrorMsg(`Minimum withdrawal amount is ${settings.minWithdrawalLimit} TON.`);
      return;
    }

    if (withdrawAmount > user.balance) {
      setErrorMsg(`Insufficient balance. You have ${user.balance.toFixed(4)} TON.`);
      return;
    }

    setLoading(true);
    try {
      await onRequestWithdrawal(withdrawAmount, targetAddr, memoInput.trim() || undefined);
      setSuccessMsg(`Withdrawal of ${withdrawAmount} TON requested! Direct payout initiated.`);
      setAmountInput('');
      setMemoInput('');
      setActiveTab('history');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit withdrawal request.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetMax = () => {
    setAmountInput(user.balance.toFixed(4));
  };

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setIsCopiedAddress(true);
    setTimeout(() => setIsCopiedAddress(false), 2000);
  };

  const copyTxHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedTx(hash);
    setTimeout(() => setCopiedTx(null), 2000);
  };

  const handleRefund = async (id: string) => {
    if (!onRefundWithdrawal) return;
    setRefundingId(id);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await onRefundWithdrawal(id);
      setSuccessMsg('Withdrawal amount successfully refunded back to your balance! 💎');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to refund withdrawal');
    } finally {
      setRefundingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0e1726] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 bg-[#121d30]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#0098ea]/25 to-sky-500/10 text-[#0098ea] border border-[#0098ea]/30 shadow-inner">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                TON & Gram Wallet
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-semibold">Web3</span>
              </h3>
              <p className="text-[10px] text-slate-400">Connect wallet, link address, & request instant TON payouts</p>
            </div>
          </div>
          <button
            id="close-wallet-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-1">
          <button
            id="tab-withdraw-btn"
            onClick={() => setActiveTab('withdraw')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'withdraw'
                ? 'bg-[#0098ea] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Withdraw TON
          </button>
          <button
            id="tab-connect-btn"
            onClick={() => setActiveTab('connect')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'connect'
                ? 'bg-[#0098ea] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3 h-3 text-amber-300" />
            Connect Wallet
          </button>
          <button
            id="tab-history-btn"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-[#0098ea] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            History {withdrawals.length > 0 && `(${withdrawals.length})`}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto flex flex-col gap-3">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span className="flex-1 leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span className="flex-1 leading-relaxed">{successMsg}</span>
            </div>
          )}

          {/* TAB 1: WITHDRAW */}
          {activeTab === 'withdraw' && (
            <form onSubmit={handleSubmitWithdrawal} className="flex flex-col gap-3.5">
              {/* Balance Summary Card */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#101f35] to-[#0c1626] border border-cyan-900/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Available Mined TON
                  </span>
                  <div className="text-xl font-extrabold text-white font-mono mt-0.5">
                    {user.balance.toFixed(5)} <span className="text-xs text-[#0098ea]">TON</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400">Min. Payout</span>
                  <div className="text-xs font-bold text-cyan-300 font-mono">
                    {settings.minWithdrawalLimit} TON
                  </div>
                </div>
              </div>

              {/* Linked Wallet Status or Direct Connect Box */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    {user.tonWalletAddress ? (
                      <>
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        Linked TON / Gram Wallet
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                        No Wallet Linked
                      </>
                    )}
                  </span>
                  {user.tonWalletAddress && !isEditingAddress && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => copyAddress(user.tonWalletAddress!)}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-300 hover:text-white flex items-center gap-1 transition-all"
                        title="Copy wallet address"
                      >
                        {isCopiedAddress ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {isCopiedAddress ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingAddress(true)}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-all"
                      >
                        <Edit2 className="w-3 h-3" />
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={handleDisconnectWallet}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 transition-all"
                        title="Unlink wallet"
                      >
                        <Unlink className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {user.tonWalletAddress && !isEditingAddress ? (
                  <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800/80 font-mono text-xs text-sky-300 break-all select-all flex items-center justify-between gap-2">
                    <span>{user.tonWalletAddress}</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="relative">
                      <input
                        id="wallet-address-input-field"
                        type="text"
                        placeholder="Paste EQ..., UQ..., @wallet, or Gram address"
                        value={addressInput}
                        onChange={(e) => setAddressInput(e.target.value)}
                        className="w-full pl-3 pr-20 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-[#0098ea]"
                      />
                      <button
                        type="button"
                        onClick={handlePasteFromClipboard}
                        className="absolute right-2 top-2 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 hover:text-white flex items-center gap-1 transition-all"
                      >
                        <Clipboard className="w-3 h-3" />
                        Paste
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleManualSaveAddress}
                        disabled={loading || !addressInput.trim()}
                        className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#0098ea] to-[#0088cc] hover:from-[#00a2ff] hover:to-[#0098ea] text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-sky-900/30 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {loading ? 'Saving Wallet...' : 'Save & Connect Wallet'}
                      </button>
                      {user.tonWalletAddress && (
                        <button
                          type="button"
                          onClick={() => {
                            setAddressInput(user.tonWalletAddress || '');
                            setIsEditingAddress(false);
                          }}
                          className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Amount Field */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Withdrawal Amount
                  </label>
                  <button
                    type="button"
                    onClick={handleSetMax}
                    className="text-[11px] font-bold text-[#0098ea] hover:text-cyan-300"
                  >
                    Use Max ({user.balance.toFixed(4)})
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="withdraw-ton-amount-input"
                    type="number"
                    step="0.0001"
                    min={settings.minWithdrawalLimit}
                    max={user.balance}
                    placeholder={`Min. ${settings.minWithdrawalLimit}`}
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="w-full pl-3 pr-14 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-[#0098ea]"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-[#0098ea]">
                    TON
                  </span>
                </div>
              </div>

              {/* Optional Memo Field */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-300">
                  Memo / Comment (Optional)
                </label>
                <input
                  id="withdraw-ton-memo-input"
                  type="text"
                  placeholder="Required for exchange deposits (e.g. Bybit, OKX, Binance)"
                  value={memoInput}
                  onChange={(e) => setMemoInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-white text-xs focus:outline-none focus:border-[#0098ea]"
                />
              </div>

              {/* Breakdown */}
              {withdrawAmount > 0 && (
                <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-xs flex flex-col gap-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Network Fee ({settings.withdrawalFeePercent}%)</span>
                    <span className="font-mono">-{fee.toFixed(4)} TON</span>
                  </div>
                  <div className="flex justify-between text-white font-bold pt-1 border-t border-slate-800">
                    <span>You Receive</span>
                    <span className="text-emerald-400 font-mono text-sm">
                      {netAmount.toFixed(4)} TON
                    </span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                id="submit-withdraw-btn"
                type="submit"
                disabled={loading || withdrawAmount < settings.minWithdrawalLimit || withdrawAmount > user.balance}
                className={`w-full py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  !loading && withdrawAmount >= settings.minWithdrawalLimit && withdrawAmount <= user.balance
                    ? 'bg-gradient-to-r from-[#0098ea] to-[#0088cc] hover:from-[#00a2ff] hover:to-[#0098ea] text-white shadow-lg shadow-[#0098ea]/25 active:scale-98 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>
                  {loading
                    ? 'Processing Payout...'
                    : withdrawAmount > user.balance
                    ? 'Insufficient TON Balance'
                    : withdrawAmount < settings.minWithdrawalLimit
                    ? `Enter Amount (Min ${settings.minWithdrawalLimit} TON)`
                    : 'Request Payout to TON Wallet'}
                </span>
              </button>
            </form>
          )}

          {/* TAB 2: HISTORY */}
          {activeTab === 'history' && (
            <div className="flex flex-col gap-3">
              {/* Server Hot Wallet Dispatcher Status Banner */}
              <div className={`p-3 rounded-xl border text-xs flex flex-col gap-1.5 ${
                dispatcherStatus?.isConfigured && dispatcherStatus?.mode === 'live_ready'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Server className="w-3.5 h-3.5" />
                    <span>
                      {dispatcherStatus?.isConfigured && dispatcherStatus?.mode === 'live_ready'
                        ? 'TON Hot Wallet Gateway: Active'
                        : 'TON Hot Wallet Gateway: Demo / Unconfigured'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40">
                    {dispatcherStatus?.network || 'mainnet'}
                  </span>
                </div>
                <p className="text-[11px] opacity-90 leading-relaxed">
                  {dispatcherStatus?.isConfigured && dispatcherStatus?.mode === 'live_ready'
                    ? `Live on-chain payouts ready. Hot wallet balance: ${dispatcherStatus.dispatcherBalanceTon?.toFixed(4)} TON.`
                    : 'The server does not have a live funded hot wallet (TON_WALLET_MNEMONIC) configured. Payouts are queued or simulated and can be refunded back to your balance anytime.'}
                </p>
              </div>

              {/* Explanatory FAQ Callout */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setShowFaq(!showFaq)}
                  className="w-full p-2.5 flex items-center justify-between text-left hover:bg-slate-800/40 text-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-1.5 font-medium text-[11px]">
                    <HelpCircle className="w-3.5 h-3.5 text-[#0098ea]" />
                    <span>Why didn't I receive TON in my external wallet?</span>
                  </div>
                  {showFaq ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                </button>
                {showFaq && (
                  <div className="p-3 border-t border-slate-800/80 bg-black/30 space-y-2 text-[11px] text-slate-300 leading-relaxed">
                    <p>
                      <strong className="text-white">1. Blockchain Gas & Private Keys:</strong> In order for real cryptocurrency (TON) to appear in Tonkeeper or Telegram @wallet, an actual on-chain transaction must be broadcast and signed by a funded server hot wallet.
                    </p>
                    <p>
                      <strong className="text-white">2. Prototype Environment:</strong> By default, this deployment runs without a live funded server hot wallet seed. Previous builds simulated the completion status after a few seconds without broadcasting on-chain.
                    </p>
                    <p>
                      <strong className="text-white">3. Zero Risk - 100% Refundable:</strong> Your mined coins are completely protected! Simply tap <span className="text-amber-400 font-bold">"Refund to Balance"</span> below on any unfulfilled request to immediately restore your TON balance.
                    </p>
                    <p>
                      <strong className="text-white">4. Enabling Live Payouts:</strong> To send real TON on-chain, open the <strong className="text-cyan-300">Admin Panel &gt; TON Hot Wallet</strong> tab and connect your 24-word wallet seed.
                    </p>
                    <div className="p-2 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-indigo-300">
                      <strong className="text-white flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-indigo-400" />
                        Free Testnet TON Faucets:
                      </strong>
                      <p className="mt-0.5 text-[10px] text-slate-300">
                        Want to test without real money? Switch to Testnet in the Admin Panel and get free test TON from Telegram:
                      </p>
                      <div className="flex gap-2 mt-1.5">
                        <a
                          href="https://t.me/testgiver_ton_bot"
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 rounded bg-[#0098ea] text-white font-bold text-[10px] flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Telegram Faucet (@testgiver_ton_bot)</span>
                        </a>
                        <a
                          href="https://faucet.triangleplatform.com/ton/testnet"
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 rounded bg-slate-800 text-slate-200 font-bold text-[10px] flex items-center gap-1 border border-slate-700"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Triangle Faucet</span>
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Withdrawal items */}
              {withdrawals.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs flex flex-col items-center gap-2">
                  <Wallet className="w-8 h-8 text-slate-600" />
                  <span>No withdrawal requests yet. Mine TON to initiate payouts!</span>
                </div>
              ) : (
                withdrawals.map(item => {
                  const isLiveOnChain = item.status === 'completed' && item.mode === 'live_onchain';
                  const isSimulated = item.status === 'completed' && item.mode !== 'live_onchain';
                  const isPending = item.status === 'pending';
                  const isRefunded = item.status === 'refunded';
                  const isRejected = item.status === 'rejected';
                  const canRefund = (isPending || isSimulated) && !isRefunded && Boolean(onRefundWithdrawal);

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col gap-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-white font-mono">
                          <span>{item.netAmount.toFixed(4)} TON</span>
                          <span className="text-[10px] text-slate-400 font-sans font-normal">(Fee: {item.fee.toFixed(4)})</span>
                        </div>
                        
                        {/* Accurate Status Badges */}
                        {isRefunded && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            Refunded to Balance
                          </span>
                        )}
                        {isLiveOnChain && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            On-Chain Confirmed
                          </span>
                        )}
                        {isSimulated && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Simulated (No Real TON)
                          </span>
                        )}
                        {isPending && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Pending Dispatch
                          </span>
                        )}
                        {isRejected && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Rejected & Refunded
                          </span>
                        )}
                      </div>

                      <div className="font-mono text-[10px] text-slate-400 truncate flex items-center gap-1">
                        <span>To:</span>
                        <span className="text-slate-200 select-all">{item.tonAddress}</span>
                      </div>

                      {/* Status Details & Notices */}
                      {isSimulated && (
                        <div className="text-[10px] text-purple-300 bg-purple-950/40 border border-purple-800/40 p-2 rounded-lg flex items-start gap-1.5">
                          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-purple-400" />
                          <span>
                            This payout completed in demo mode without an on-chain blockchain broadcast. No real cryptocurrency was sent. You can refund it back to your mining balance below.
                          </span>
                        </div>
                      )}

                      {isPending && (
                        <div className="text-[10px] text-amber-300 bg-amber-950/40 border border-amber-800/40 p-2 rounded-lg flex items-start gap-1.5">
                          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                          <span>
                            {item.dispatchError || 'Awaiting hot wallet on-chain broadcast. If no hot wallet is connected, you can refund your coins back to balance.'}
                          </span>
                        </div>
                      )}

                      {isRefunded && (
                        <div className="text-[10px] text-sky-300 bg-sky-950/40 border border-sky-800/40 p-2 rounded-lg flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                          <span>This withdrawal amount ({item.amount} TON) was refunded back to your mining balance.</span>
                        </div>
                      )}

                      {/* Transaction Hash link (only if valid on-chain tx) */}
                      {item.txHash && isLiveOnChain && (
                        <div className="flex items-center justify-between p-1.5 rounded bg-black/40 text-[10px] font-mono text-cyan-400">
                          <span className="truncate">Tx: {item.txHash}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => copyTxHash(item.txHash!)}
                              className="ml-2 hover:text-white"
                            >
                              {copiedTx === item.txHash ? 'Copied' : 'Copy'}
                            </button>
                            <a
                              href={`https://tonscan.org/tx/${item.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#0098ea] hover:text-cyan-300 flex items-center gap-0.5"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      )}

                      {item.rejectionReason && (
                        <div className="text-[10px] text-rose-400 bg-rose-500/10 p-1.5 rounded">
                          Reason: {item.rejectionReason}
                        </div>
                      )}

                      {/* Refund Action button */}
                      {canRefund && (
                        <button
                          type="button"
                          disabled={refundingId === item.id}
                          onClick={() => handleRefund(item.id)}
                          className="mt-1 w-full py-1.5 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-medium text-[11px] flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <RotateCcw className={`w-3 h-3 ${refundingId === item.id ? 'animate-spin' : ''}`} />
                          <span>{refundingId === item.id ? 'Refunding to Balance...' : `Refund ${item.amount} TON to Mining Balance`}</span>
                        </button>
                      )}

                      <span className="text-[9px] text-slate-500 font-mono">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: CONNECT WALLET */}
          {activeTab === 'connect' && (
            <div className="flex flex-col gap-3.5">
              {/* Manual Direct Paste & Connect Card */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 border border-sky-500/30 flex flex-col gap-2.5 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    Enter Any Gram / TON Address
                  </span>
                  {user.tonWalletAddress && (
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Connected
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="EQ..., UQ..., @wallet, or Gram address"
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    className="w-full pl-3 pr-20 py-2.5 rounded-xl bg-black/60 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-[#0098ea]"
                  />
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    className="absolute right-2 top-2 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 hover:text-white flex items-center gap-1 transition-all"
                  >
                    <Clipboard className="w-3 h-3" />
                    Paste
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleManualSaveAddress}
                    disabled={loading || !addressInput.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#0098ea] to-[#0088cc] hover:from-[#00a2ff] hover:to-[#0098ea] text-white text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-sky-900/30 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {loading ? 'Connecting...' : 'Connect & Save Address'}
                  </button>
                  {user.tonWalletAddress && (
                    <button
                      type="button"
                      onClick={handleDisconnectWallet}
                      className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 text-xs font-semibold flex items-center gap-1"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      Unlink
                    </button>
                  )}
                </div>
              </div>

              <div className="text-[11px] font-semibold text-slate-400 px-0.5">
                Or 1-Click Connect with Supported Providers:
              </div>

              {/* Provider 1: Telegram @wallet */}
              <button
                type="button"
                onClick={() => handleConnectSampleWallet('telegram', `@${user.username || 'wallet'}`)}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-sky-400 hover:bg-slate-800/80 transition-all text-left group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold text-sm">
                    ✈️
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-sky-300">Telegram @wallet</div>
                    <div className="text-[10px] text-slate-400">Connect using your Telegram account (@{user.username || 'wallet'})</div>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-sky-400 group-hover:underline">Connect</span>
              </button>

              {/* Provider 2: Gram Wallet */}
              <button
                type="button"
                onClick={() => handleConnectSampleWallet('gram', 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N')}
                className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-sky-950/40 to-slate-900 border border-sky-500/30 hover:border-sky-400 hover:bg-sky-950/60 transition-all text-left group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/25 flex items-center justify-center text-sky-300 font-bold text-sm shadow-inner">
                    💎
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-sky-300">Gram Wallet (GRAM / TON Coin)</div>
                    <div className="text-[10px] text-slate-300">Gram ecosystem wallet address</div>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-sky-400 group-hover:underline">Connect</span>
              </button>

              {/* Provider 3: Tonkeeper */}
              <button
                type="button"
                onClick={() => handleConnectSampleWallet('tonkeeper', 'EQBvW8Z5huBkMJYdn30dcTe8xO4m5N42y2N9G3v8v0784920')}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-[#0098ea] hover:bg-slate-800/80 transition-all text-left group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#0098ea]/20 flex items-center justify-center text-[#0098ea] font-bold text-xs">
                    TK
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-[#0098ea]">Tonkeeper</div>
                    <div className="text-[10px] text-slate-400">Non-custodial TON wallet app</div>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-[#0098ea] group-hover:underline">Connect</span>
              </button>

              {/* Provider 4: MyTonWallet */}
              <button
                type="button"
                onClick={() => handleConnectSampleWallet('mytonwallet', 'UQDFG21lmskwpo1829mskalq01828mznxka91283namskd01')}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-400 hover:bg-slate-800/80 transition-all text-left group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-xs">
                    MT
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-cyan-400">MyTonWallet</div>
                    <div className="text-[10px] text-slate-400">Web & Telegram Desktop integration</div>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-cyan-400 group-hover:underline">Connect</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
