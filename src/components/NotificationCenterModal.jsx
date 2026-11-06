import React, { useState, useEffect } from 'react';
import { 
  X, 
  Bell, 
  CheckCheck, 
  AlertTriangle, 
  Headphones, 
  HelpCircle, 
  CreditCard, 
  FileText, 
  RotateCw, 
  ExternalLink,
  Clock
} from 'lucide-react';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '../services/api';

export default function NotificationCenterModal({ isOpen, onClose, onOpenInbox }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  async function loadNotifications() {
    try {
      setLoading(true);
      const res = await fetchNotifications({ limit: 40 });
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'handoff_request':
        return <Headphones className="w-4 h-4 text-amber-600" />;
      case 'unresolved_query':
        return <HelpCircle className="w-4 h-4 text-indigo-600" />;
      case 'quota_warning':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'subscription_event':
        return <CreditCard className="w-4 h-4 text-purple-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-purple-100 overflow-hidden my-6 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50/70 via-white to-indigo-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Notification Center</h2>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-500 text-white">
                    {unreadCount} New
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">Alerts for human requests, inquiries & account quotas</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1 transition"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark All Read</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200 flex items-center justify-center transition ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
          {loading ? (
            <div className="py-16 text-center space-y-2">
              <RotateCw className="w-6 h-6 animate-spin mx-auto text-purple-600" />
              <p className="text-xs text-slate-400">Loading alerts...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 space-y-1">
              <Clock className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-600">All caught up!</p>
              <p className="text-slate-400">You will be notified here when visitors request support or when quota thresholds are reached.</p>
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                onClick={() => !n.is_read && handleMarkRead(n.id)}
                className={`p-4 rounded-2xl border transition flex items-start justify-between gap-3 ${
                  n.is_read
                    ? 'bg-white border-slate-200 text-slate-600'
                    : 'bg-purple-50/60 border-purple-200 text-slate-900 shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center shrink-0 mt-0.5">
                    {getIcon(n.type)}
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900">{n.title}</h4>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-purple-600 inline-block" />
                      )}
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{n.message}</p>
                    <span className="text-[10px] text-slate-400 block">{formatDate(n.created_at)}</span>
                  </div>
                </div>

                {/* Action shortcut */}
                {n.conversation_id && onOpenInbox && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                      onOpenInbox(n.conversation_id);
                    }}
                    className="shrink-0 px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 shadow-xs"
                  >
                    <span>View</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
