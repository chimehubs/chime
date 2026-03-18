import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Upload,
  Mail,
  Phone,
  User,
  Lock,
  Shield,
  Eye,
  EyeOff,
  LogOut,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  Save
} from 'lucide-react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { useAuthContext } from '../../../context/AuthProvider';
import { supabaseDbService } from '../../../services/supabaseDbService';
import { uploadFileToStorage } from '../../../services/supabaseClient';
import { updatePasswordSupabase } from '../../../services/supabaseAuthService';
import ImageAnnouncementBar from './ImageAnnouncementBar';
import { FLOW_ANNOUNCEMENT_SLIDES } from './announcementSlides';

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuthContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [darkMode, setDarkMode] = useState(false);
  const [profilePreferences, setProfilePreferences] = useState<Record<string, any>>({});

  // Profile state
  const [avatar, setAvatar] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  
  // Account details state
  const [accountType, setAccountType] = useState('Savings');
  const [accountNumber, setAccountNumber] = useState(user?.accountNumber || '');
  const [address, setAddress] = useState('');
  const [nationality, setNationality] = useState('');
  const [occupation, setOccupation] = useState('');
  const [salaryRange, setSalaryRange] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [currency, setCurrency] = useState('USD');

  const [twoFAEnabled, setTwoFAEnabled] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;
      const profile = await supabaseDbService.getProfile(user.id);
      const account = await supabaseDbService.getAccountByUser(user.id);
      const prefs = profile?.preferences || {};
      setProfilePreferences(prefs);
      if (prefs?.darkMode !== undefined) setDarkMode(!!prefs.darkMode);
      if (prefs?.twoFAEnabled !== undefined) setTwoFAEnabled(!!prefs.twoFAEnabled);
      setAvatar(profile?.avatar_url || user.avatar || '');
      setPhone(profile?.phone || user.phone || '');
      setFirstName(profile?.first_name || '');
      setLastName(profile?.last_name || '');
      setAddress(profile?.house_address || '');
      setNationality(profile?.nationality || '');
      setOccupation(profile?.occupation || '');
      setSalaryRange(profile?.salary_range || '');
      setDateOfBirth(profile?.date_of_birth || '');
      setGender(profile?.gender || '');
      setCurrency(profile?.currency || user.currency || 'USD');
      if (account) {
        setAccountNumber(account.account_number);
        setAccountType(account.account_type === 'CHECKING' ? 'Checking' : 'Savings');
      }
    };
    loadProfile();
  }, [user?.id]);
  
  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop() || 'png';
      if (user?.id) {
        uploadFileToStorage('avatars', `${user.id}/avatar-${Date.now()}.${ext}`, file).then((url) => {
          if (url) {
            setAvatar(url);
            supabaseDbService.updateProfile(user.id, { avatar_url: url });
            updateUser({ avatar: url });
            setProfileSaved(true);
            setTimeout(() => setProfileSaved(false), 2000);
          }
        });
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    await supabaseDbService.updateProfile(user.id, {
      phone,
      first_name: firstName,
      last_name: lastName,
      house_address: address,
      nationality,
      occupation,
      salary_range: salaryRange,
      date_of_birth: dateOfBirth,
      gender,
      currency,
      name: `${firstName} ${lastName}`.trim(),
    });
    updateUser({
      name: `${firstName} ${lastName}`.trim() || user.name,
      phone,
      currency,
    });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all password fields');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    const { error } = await updatePasswordSupabase(newPassword);
    if (error) {
      setPasswordError('Unable to change password. Please try again.');
      return;
    }
    setPasswordSuccess('Password changed successfully!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordSuccess(''), 2000);
  };

  const handleToggle2FA = () => {
    const next = !twoFAEnabled;
    setTwoFAEnabled(next);
    if (user?.id) {
      supabaseDbService.updateProfile(user.id, {
        preferences: { ...profilePreferences, twoFAEnabled: next }
      });
    }
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmText !== 'DELETE') {
      return;
    }

    if (user?.id) {
      supabaseDbService.updateProfile(user.id, { status: 'RESTRICTED' });
    }
    logout();
    navigate('/');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'dark bg-[#0d1117] text-white' : 'bg-background'} pb-24`}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`sticky top-0 z-10 ${darkMode ? 'bg-[#0d1117]/80 border-b border-[#21262d]' : 'bg-background border-b border-border'} backdrop-blur-lg px-6 py-4`}
      >
        <div className="flex items-center gap-4">
          <motion.button
            onClick={() => navigate('/dashboard')}
            whileHover={{ scale: 1.1, rotate: -10 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-md hover:shadow-lg"
            style={{ backgroundColor: '#FFE5E5' }}
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: '#FF6B6B' }} />
          </motion.button>
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ color: '#FFB93B' }}
              >
                <User className="w-6 h-6" />
              </motion.div>
              Profile & Settings
            </h1>
            <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="px-6 py-8 max-w-2xl mx-auto space-y-8">
        <ImageAnnouncementBar items={FLOW_ANNOUNCEMENT_SLIDES} className="h-[92px]" />
        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl font-semibold mb-6">Profile Information</h2>
          
          <Card className={`p-8 space-y-6 ${darkMode ? 'bg-[#161b22] border-[#21262d]' : ''}`}>
            {/* Avatar Upload */}
            <div className="flex flex-col items-center">
              <div
                onClick={handleAvatarClick}
                className="relative mb-6 cursor-pointer group"
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#00b388] to-[#00a99d] flex items-center justify-center overflow-hidden shadow-md">
                  {avatar ? (
                    <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-white" />
                  )}
                </div>
                <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Upload className="w-6 h-6 text-white" />
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                title="Upload avatar"
              />
              <p className="text-sm text-muted-foreground text-center">
                Click to upload avatar (JPG, PNG)
              </p>
            </div>

            {/* Profile Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="fullname" className="text-sm font-medium mb-2 block">Full Name</Label>
                <div className={`h-12 ${darkMode ? 'bg-[#161b22] text-[#e8eaed]' : 'bg-[#f0f0f0] text-gray-600'} border-0 rounded-lg px-3 text-sm shadow-sm flex items-center cursor-not-allowed`}>
                  {user?.name || 'Not set'}
                  <span className={`text-xs ${darkMode ? 'text-[#8b949e]' : 'text-muted-foreground'} ml-2`}>(Read-only)</span>
                </div>
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-medium mb-2 block">Email Address</Label>
                <div className={`flex items-start gap-2 min-h-12 ${darkMode ? 'bg-[#161b22]' : 'bg-[#f0f0f0]'} border-0 rounded-lg px-3 py-3 shadow-sm`}>
                  <Mail className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className={`flex-1 min-w-0 text-sm ${darkMode ? 'text-[#e8eaed]' : 'text-gray-600'} cursor-not-allowed break-all leading-tight`}>
                    {user?.email || 'Not set'}
                  </div>
                  <span className={`hidden sm:inline text-xs whitespace-nowrap ${darkMode ? 'text-[#8b949e]' : 'text-muted-foreground'}`}>(Read-only)</span>
                </div>
                <p className={`mt-1 text-xs sm:hidden ${darkMode ? 'text-[#8b949e]' : 'text-muted-foreground'}`}>(Read-only)</p>
              </div>

              <div>
                <Label htmlFor="phone" className="text-sm font-medium mb-2 block">Phone Number</Label>
                <div className={`flex items-center gap-2 h-12 ${darkMode ? 'bg-[#161b22]' : 'bg-[#f9fafb]'} border-0 rounded-lg px-3 shadow-sm`}>
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={`flex-1 bg-transparent text-sm focus:outline-none ${darkMode ? 'text-[#e8eaed] placeholder-[#8b949e]' : ''}`}
                  />
                </div>
              </div>
            </div>

            {profileSaved && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3"
              >
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-700">Profile updated successfully!</p>
              </motion.div>
            )}

            <Button
              onClick={handleSaveProfile}
              className="w-full h-12 bg-[#00b388] hover:bg-[#009670] text-white font-medium shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </Card>
        </motion.div>

        {/* Account Settings Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h2 className="text-2xl font-semibold mb-6">Account Settings</h2>

          <Card className={`p-8 space-y-6 ${darkMode ? 'bg-[#161b22] border-[#21262d]' : ''}`}>
            {/* Account Info */}
            {/* Account Info and Details */}
            <div className="space-y-4 pb-6 border-b border-border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">User ID</p>
                  <p className="text-xs text-muted-foreground mt-1">{user?.id || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-sm font-medium">Account Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <p className="text-xs text-green-700 capitalize">{user?.status || 'ACTIVE'}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium">Account Created</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Bank Account Details */}
            <div className="space-y-4 pb-6 border-b border-border">
              <h3 className="text-sm font-semibold">Bank Account Details</h3>
              
              <div>
                <Label htmlFor="accounttype" className="text-sm font-medium mb-2 block">Account Type</Label>
                <select
                  id="accounttype"
                  aria-label="Account Type"
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  className={`w-full h-12 ${darkMode ? 'bg-[#161b22] text-[#e8eaed]' : 'bg-[#f9fafb]'} border-0 rounded-lg px-3 text-sm shadow-sm focus:shadow-md appearance-none cursor-pointer`}
                >
                  <option value="Savings">Savings Account</option>
                  <option value="Checking">Checking Account</option>
                  <option value="Money Market">Money Market Account</option>
                </select>
              </div>

              <div>
                <Label htmlFor="accountnumber" className="text-sm font-medium mb-2 block">Account Number (Verified Users)</Label>
                <Input
                  id="accountnumber"
                  type="text"
                  placeholder="XXXX-XXXX-XXXX-1234"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className={`h-12 ${darkMode ? 'bg-[#161b22] text-[#e8eaed] border-[#21262d]' : 'bg-[#f9fafb] border-0'} rounded-lg px-3 text-sm shadow-sm focus:shadow-md`}
                  disabled={user?.status !== 'ACTIVE'}
                />
                {user?.status !== 'ACTIVE' && (
                  <p className="text-xs text-amber-600 mt-2">⚠ Account number available for verified users only</p>
                )}
              </div>

              <div>
                <Label htmlFor="address" className="text-sm font-medium mb-2 block">Address</Label>
                <Input
                  id="address"
                  type="text"
                  placeholder="123 Main Street, City, State 12345"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={`h-12 ${darkMode ? 'bg-[#161b22] text-[#e8eaed] border-[#21262d]' : 'bg-[#f9fafb] border-0'} rounded-lg px-3 text-sm shadow-sm focus:shadow-md`}
                />
              </div>

              <div>
                <Label htmlFor="nationality" className="text-sm font-medium mb-2 block">Nationality</Label>
                <Input
                  id="nationality"
                  type="text"
                  placeholder="United States"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className={`h-12 ${darkMode ? 'bg-[#161b22] text-[#e8eaed] border-[#21262d]' : 'bg-[#f9fafb] border-0'} rounded-lg px-3 text-sm shadow-sm focus:shadow-md`}
                />
              </div>
            </div>

            {/* Notification Preferences */}
            <div className="space-y-3 pb-6 border-b border-border">
              <p className="text-sm font-semibold">Notification Preferences</p>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className={`w-4 h-4 rounded ${darkMode ? 'border-[#21262d]' : 'border-gray-300'} cursor-pointer`}
                />
                <span className="text-sm">Email notifications for transactions</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className={`w-4 h-4 rounded ${darkMode ? 'border-[#21262d]' : 'border-gray-300'} cursor-pointer`}
                />
                <span className="text-sm">Push notifications for security alerts</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className={`w-4 h-4 rounded ${darkMode ? 'border-[#21262d]' : 'border-gray-300'} cursor-pointer`}
                />
                <span className="text-sm">Marketing and promotional emails</span>
              </label>
            </div>

            {/* Privacy Settings */}
            <div className="space-y-3">
              <p className="text-sm font-semibold">Privacy</p>
              <div className={`p-4 ${darkMode ? 'bg-[#161b22] border-[#21262d]' : 'bg-blue-50 border-blue-200'} border rounded-lg flex items-start gap-3`}>
                <Shield className={`w-4 h-4 ${darkMode ? 'text-[#00b388]' : 'text-blue-600'} flex-shrink-0 mt-0.5`} />
                <div>
                  <p className={`text-sm font-medium ${darkMode ? 'text-[#e8eaed]' : 'text-blue-900'}`}>Your data is secure</p>
                  <p className={`text-xs ${darkMode ? 'text-[#8b949e]' : 'text-blue-700'} mt-1`}>
                    We use 256-bit encryption to protect your information.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Security Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-2xl font-semibold mb-6">Security & Authentication</h2>

          <Card className={`p-8 space-y-6 ${darkMode ? 'bg-[#161b22] border-[#21262d]' : ''}`}>
            {/* Change Password */}
            <div className="space-y-4 pb-6 border-b border-border">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Change Password
              </h3>

              <div>
                <Label htmlFor="currentpwd" className="text-sm font-medium mb-2 block">Current Password</Label>
                <div className={`flex items-center gap-2 h-12 ${darkMode ? 'bg-[#161b22]' : 'bg-[#f9fafb]'} border-0 rounded-lg px-3 shadow-sm`}>
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  <input
                    id="currentpwd"
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={`flex-1 bg-transparent text-sm focus:outline-none ${darkMode ? 'text-[#e8eaed] placeholder-[#8b949e]' : ''}`}
                  />
                  <button
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className={`p-1 ${darkMode ? 'hover:bg-[#21262d]' : 'hover:bg-white/50'} rounded transition-colors`}
                    title="Toggle password visibility"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="newpwd" className="text-sm font-medium mb-2 block">New Password</Label>
                <div className={`flex items-center gap-2 h-12 ${darkMode ? 'bg-[#161b22]' : 'bg-[#f9fafb]'} border-0 rounded-lg px-3 shadow-sm`}>
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  <input
                    id="newpwd"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`flex-1 bg-transparent text-sm focus:outline-none ${darkMode ? 'text-[#e8eaed] placeholder-[#8b949e]' : ''}`}
                  />
                  <button
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className={`p-1 ${darkMode ? 'hover:bg-[#21262d]' : 'hover:bg-white/50'} rounded transition-colors`}
                    title="Toggle password visibility"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmpwd" className="text-sm font-medium mb-2 block">Confirm New Password</Label>
                <div className={`flex items-center gap-2 h-12 ${darkMode ? 'bg-[#161b22]' : 'bg-[#f9fafb]'} border-0 rounded-lg px-3 shadow-sm`}>
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  <input
                    id="confirmpwd"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`flex-1 bg-transparent text-sm focus:outline-none ${darkMode ? 'text-[#e8eaed] placeholder-[#8b949e]' : ''}`}
                  />
                  <button
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className={`p-1 ${darkMode ? 'hover:bg-[#21262d]' : 'hover:bg-white/50'} rounded transition-colors`}
                    title="Toggle password visibility"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              {passwordError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 ${darkMode ? 'bg-red-900/30 border-red-900/50' : 'bg-red-50 border-red-200'} border rounded-lg flex items-start gap-3`}
                >
                  <AlertTriangle className={`w-5 h-5 ${darkMode ? 'text-red-400' : 'text-red-600'} flex-shrink-0 mt-0.5`} />
                  <p className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-700'}`}>{passwordError}</p>
                </motion.div>
              )}

              {passwordSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3"
                >
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-700">{passwordSuccess}</p>
                </motion.div>
              )}

              <Button
                onClick={handleChangePassword}
                className="w-full h-12 bg-[#00b388] hover:bg-[#009670] text-white font-medium shadow-md hover:shadow-lg"
              >
                Update Password
              </Button>
            </div>

            {/* Two-Factor Authentication */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Two-Factor Authentication (2FA)
              </h3>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-900 font-medium mb-3">
                  {twoFAEnabled ? '✓ 2FA is enabled' : '2FA is disabled'}
                </p>
                <p className="text-xs text-amber-700 mb-4">
                  {twoFAEnabled
                    ? 'Your account is protected with two-factor authentication. You will need to enter a code from your authenticator app when logging in from a new device.'
                    : 'Enable two-factor authentication to add an extra layer of security to your account.'}
                </p>
                <Button
                  onClick={handleToggle2FA}
                  className={`w-full h-10 font-medium shadow-sm hover:shadow-md ${
                    twoFAEnabled
                      ? 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
                      : 'bg-[#00b388] hover:bg-[#009670] text-white'
                  }`}
                >
                  {twoFAEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h2 className="text-2xl font-semibold mb-6 text-red-600">Danger Zone</h2>

          <Card className={`p-8 space-y-6 ${darkMode ? 'bg-[#161b22] border-[#21262d]' : 'border border-red-200 bg-red-50'}`}>
            {/* Logout */}
            <div className="space-y-3 pb-6 border-b border-red-200">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
                <LogOut className="w-5 h-5" />
                Sign Out
              </h3>
              <p className="text-sm text-gray-700">
                Sign out from your account. You will be logged out from this device.
              </p>
              <Button
                onClick={handleLogout}
                className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-medium shadow-md hover:shadow-lg"
              >
                Logout
              </Button>
            </div>

            {/* Delete Account */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
                <Trash2 className="w-5 h-5" />
                Delete Account
              </h3>
              <p className="text-sm text-gray-700">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>

              {!showDeleteConfirm ? (
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-medium shadow-md hover:shadow-lg"
                >
                  Delete Account
                </Button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-white border-2 border-red-600 rounded-lg space-y-4"
                >
                  <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-700">
                      <p className="font-semibold">Warning: This action is permanent</p>
                      <p className="mt-1">
                        All your data, including balance, transactions, and settings, will be permanently deleted.
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="deleteconfirm" className="text-sm font-medium mb-2 block">
                      Type "DELETE" to confirm:
                    </Label>
                    <Input
                      id="deleteconfirm"
                      type="text"
                      placeholder="DELETE"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className="h-12 bg-[#f9fafb] border-0 rounded-lg px-3 text-sm shadow-sm focus:shadow-md"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText('');
                      }}
                      variant="outline"
                      className="flex-1 h-12 shadow-sm hover:shadow-md"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== 'DELETE'}
                      className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                    >
                      Permanently Delete
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
