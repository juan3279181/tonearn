import React from 'react';
import { 
  X, 
  Bell, 
  Check, 
  Sparkles, 
  Gift, 
  Coins, 
  ShieldCheck, 
  Info, 
  CheckCheck 
} from 'lucide-react';
import { AppNotification } from '../types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAllAsRead: () => void;
  onRequestPushPermission: () => Promise<void>;
  pushPermissionState: NotificationPermission | 'unsupported';
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onRequestPushPermission,
  pushPermissionState
}) => {
  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'boost':
        return <Sparkles className="w-4 h-4 text-amber-400" />;
      case 'payout':
        return <Coins className="w-4 h-4 text-emerald-400" />;
      case 'referral':
        return <Gift className="w-4 h-4 text-cyan-400" />;
      case 'security':
        return <ShieldCheck className="w-4 h-4 text-rose-400" />;
      default:
        return <Info className="w-4 h-4 text-[#0098ea]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm h-full bg-[#0d1624] border-l border-slate-800 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#121d30]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#0098ea]/15 text-[#0098ea]">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Notifications</h3>
              <p className="text-[10px] text-slate-400">Real-time alerts & rewards updates</p>
            </div>
          </div>
          <button
            id="close-notifications-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Web Push Permission Banner */}
        {pushPermissionState !== 'granted' && pushPermissionState !== 'unsupported' && (
          <div className="p-3 mx-3 my-2 rounded-xl bg-gradient-to-r from-[#0098ea]/20 to-blue-600/10 border border-[#0098ea]/30 flex items-center justify-between gap-2">
            <div className="text-[11px] text-slate-200">
              <span className="font-bold text-white block">Enable Push Notifications</span>
              Get notified when mining pools fill and boosts expire!
            </div>
            <button
              id="enable-push-perm-btn"
              type="button"
              onClick={onRequestPushPermission}
              className="px-2.5 py-1.5 rounded-lg bg-[#0098ea] hover:bg-[#00a2ff] text-white font-bold text-[11px] whitespace-nowrap shadow-sm"
            >
              Enable
            </button>
          </div>
        )}

        {/* Controls */}
        <div className="px-4 py-2 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/30 text-xs">
          <span className="text-slate-400 text-[11px]">
            {notifications.filter(n => !n.read).length} unread
          </span>
          <button
            id="mark-all-read-btn"
            onClick={onMarkAllAsRead}
            className="text-[11px] font-semibold text-[#0098ea] hover:text-cyan-300 flex items-center gap-1"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all as read</span>
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-xs text-slate-500">
              <Bell className="w-8 h-8 text-slate-700 mb-2" />
              <span>No notifications yet</span>
            </div>
          ) : (
            notifications.map(item => (
              <div
                key={item.id}
                className={`p-3 rounded-xl border transition-all text-xs flex gap-2.5 ${
                  !item.read
                    ? 'bg-[#102138] border-[#0098ea]/40 shadow-sm'
                    : 'bg-slate-900/60 border-slate-800/80 opacity-80'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                  {getIcon(item.type)}
                </div>

                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-[12px]">{item.title}</span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                    {item.message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
