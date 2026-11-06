import React, { useState } from 'react';
import { 
  X, 
  User, 
  Building, 
  Mail, 
  Shield, 
  Lock, 
  BarChart3, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Sparkles,
  Bot,
  Database,
  MessageSquare,
  Calendar,
  CreditCard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AccountSettingsModal({ isOpen, onClose, onOpenBilling }) {
  const { 
    user, 
    profile, 
    usage, 
    updateProfile, 
    changePassword, 
    deleteAccount, 
    logout 
  } = useAuth();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security' | 'usage' | 'danger'
  
  // Profile Form state
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [businessName, setBusinessName] = useState(user?.business_name || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ text: '', type: '' });

  // Security Form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ text: '', type: '' });

  // Danger Zone state
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  if (!isOpen || !user) return null;

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage({ text: '', type: '' });

    try {
      await updateProfile({
        fullName: fullName.trim(),
        businessName: businessName.trim()
      });
      setProfileMessage({ text: 'Profile successfully updated!', type: 'success' });
      setTimeout(() => setProfileMessage({ text: '', type: '' }), 3000);
    } catch (err) {
      setProfileMessage({ text: err.message || 'Failed to update profile', type: 'error' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage({ text: '', type: '' });

    if (newPassword.length < 6) {
      setPasswordMessage({ text: 'Password must be at least 6 characters long.', type: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ text: 'New password and confirmation do not match.', type: 'error' });
      return;
    }

    setPasswordSaving(true);
    try {
      await changePassword(newPassword);
      setPasswordMessage({ text: 'Password changed successfully!', type: 'success' });
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMessage({ text: '', type: '' }), 3000);
    } catch (err) {
      setPasswordMessage({ text: err.message || 'Failed to change password.', type: 'error' });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      setDeleteError('Please type DELETE in capital letters to confirm.');
      return;
    }

    setIsDeleting(true);
    setDeleteError('');
    try {
      await deleteAccount();
      onClose();
      alert('Your account and all associated chatbots have been permanently deleted.');
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete account.');
      setIsDeleting(false);
    }
  };

  const formattedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : 'Recent';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-purple-100 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-purple-800 via-indigo-800 to-purple-900 text-white flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/15 text-[11px] font-semibold backdrop-blur-sm mb-1.5">
              <Shield className="w-3.5 h-3.5 text-purple-200" />
              <span>Multi-Tenant Account Management</span>
            </div>
            <h3 className="text-xl font-extrabold text-white">Account Settings & Profile</h3>
            <p className="text-xs text-purple-200">
              Manage your business profile, security credentials, and view tenant resource usage.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-purple-200 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/60 px-6 overflow-x-auto">
          {[
            { id: 'profile', label: 'Profile & Business', icon: User },
            { id: 'security', label: 'Security & Password', icon: Lock },
            { id: 'usage', label: 'Usage & Quotas', icon: BarChart3 },
            { id: 'danger', label: 'Danger Zone', icon: Trash2, danger: true }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
                  isActive
                    ? tab.danger
                      ? 'border-red-600 text-red-600 bg-red-50/40'
                      : 'border-purple-600 text-purple-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? (tab.danger ? 'text-red-600' : 'text-purple-600') : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1">

          {/* TAB 1: Profile & Business */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {profileMessage.text && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    profileMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {profileMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  )}
                  <span>{profileMessage.text}</span>
                </div>
              )}

              {/* Account Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-100">
                  <span className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider block mb-1">
                    Subscription Tier
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-extrabold text-slate-800 capitalize">
                      {user.plan_tier || 'Free'} Plan
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                  <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider block mb-1">
                    Member Since
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-extrabold text-slate-800">
                      {formattedDate}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Tenant ID
                  </span>
                  <div className="text-xs font-mono font-bold text-slate-700 truncate" title={user.id}>
                    {user.id ? `${user.id.slice(0, 12)}...` : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Edit Form */}
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address (Account ID)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      disabled
                      value={user.email}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Verified through Supabase Authentication. Contact support to transfer ownership.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Dr. Jane Smith"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Business / Organization Name
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. MetroCare Clinic or Horizon University"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-purple-600/20 transition flex items-center gap-2 disabled:opacity-60"
                  >
                    {profileSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: Security & Password */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {passwordMessage.text && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    passwordMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {passwordMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  )}
                  <span>{passwordMessage.text}</span>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <h4 className="text-sm font-bold text-slate-800 mb-1">Update Password</h4>
                <p className="text-xs text-slate-500">
                  Ensure your account is using a long, random password to stay secure.
                </p>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      placeholder="Re-enter your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-purple-600/20 transition flex items-center gap-2 disabled:opacity-60"
                  >
                    {passwordSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Update Password</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: Usage & Quotas */}
          {activeTab === 'usage' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Tenant Resource Utilization</h4>
                  <p className="text-xs text-purple-700 mt-0.5">
                    Data strictly isolated to tenant <span className="font-mono font-bold">{user.id?.slice(0, 8)}</span>
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-purple-600 text-white text-xs font-bold capitalize">
                  {user.plan_tier || 'Free'} Plan
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto mb-2">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-800">{usage.totalChatbots || 0}</div>
                  <div className="text-xs font-semibold text-slate-500 mt-0.5">Chatbots</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                    <Database className="w-4 h-4" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-800">{usage.totalKnowledgeSources || 0}</div>
                  <div className="text-xs font-semibold text-slate-500 mt-0.5">Knowledge Docs</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-800">{usage.totalConversations || 0}</div>
                  <div className="text-xs font-semibold text-slate-500 mt-0.5">Conversations</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-2">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-800">{usage.totalMessages || 0}</div>
                  <div className="text-xs font-semibold text-slate-500 mt-0.5">Total Messages</div>
                </div>
              </div>

              {/* Tier Details */}
              <div className="p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
                <div className="flex items-center justify-between font-semibold">
                  <span>Chatbot Capacity:</span>
                  <span className="text-slate-800">{usage.totalChatbots || 0} / 5 Created</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all" 
                    style={{ width: `${Math.min(100, ((usage.totalChatbots || 0) / 5) * 100)}%` }} 
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Need more bots or custom SLA? Upgrade your account from the Pricing section.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onOpenBilling) onOpenBilling();
                    }}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-purple-600/20 transition"
                  >
                    <CreditCard className="w-4 h-4 text-purple-200" />
                    <span>Manage Subscription, Quotas & Invoices</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Danger Zone */}
          {activeTab === 'danger' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-red-900">Delete Account & Purge Tenant Data</h4>
                  <p className="text-xs text-red-700 mt-1">
                    Permanently deletes your account profile, all created AI chatbots, all uploaded documents, and all pgvector embeddings. This action cannot be undone.
                  </p>
                </div>
              </div>

              {deleteError && (
                <div className="p-3 rounded-xl bg-red-100 text-xs text-red-800 font-semibold border border-red-300">
                  {deleteError}
                </div>
              )}

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <label className="block text-xs font-semibold text-slate-700">
                  To confirm deletion, type <span className="font-mono font-bold text-red-600">DELETE</span> below:
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />

                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmation !== 'DELETE' || isDeleting}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-red-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Deleting Tenant Account...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Permanently Delete My Account</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Signed in as <strong className="text-slate-800">{user.email}</strong></span>
          <button
            onClick={() => { onClose(); logout(); }}
            className="text-xs text-red-600 hover:text-red-700 font-bold hover:underline"
          >
            Log Out
          </button>
        </div>

      </div>
    </div>
  );
}
