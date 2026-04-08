import React, { useState, useEffect } from 'react';
import { API_BASE } from '../lib/config';
import DepartmentPositionManagement from './DepartmentPositionManagement.jsx';

const Settings = () => {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    password: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });

  const [systemSettings, setSystemSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    autoBackup: true,
    darkMode: false
  });

  const [applicationSettings, setApplicationSettings] = useState({
    multipleApplications: false,
    deadlineType: 'global',
    globalDeadline: '2024-12-31',
    maxUploadSize: 10,
    requiredDocuments: true
  });
  const [applicationSettingsSaving, setApplicationSettingsSaving] = useState(false);
  const APPLICATION_SETTINGS_STORAGE_KEY = 'hirewise:applicationSettings';

  // Load profile on mount
  useEffect(() => {
    loadProfile();
    loadApplicationSettings();
  }, []);

  const getAuthToken = () => {
    return localStorage.getItem('adminToken');
  };

  const loadProfile = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setMessage({ text: 'No authentication token found', type: 'error' });
        return;
      }

      const response = await fetch(`${API_BASE}/api/admin/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load profile');
      }

      const data = await response.json();
      setProfile({
        name: data.user.name || '',
        email: data.user.email || '',
        password: ''
      });
    } catch (err) {
      console.error('Load profile error:', err);
      setMessage({ text: 'Failed to load profile data', type: 'error' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleProfileChange = (field, value) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSystemSettingToggle = (setting) => {
    setSystemSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleApplicationSettingChange = (field, value) => {
    setApplicationSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleApplicationSettingToggle = (setting) => {
    setApplicationSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const loadApplicationSettings = () => {
    try {
      const raw = localStorage.getItem(APPLICATION_SETTINGS_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      setApplicationSettings((prev) => ({
        ...prev,
        multipleApplications: Boolean(parsed.multipleApplications),
        deadlineType: parsed.deadlineType === 'per_post' ? 'per_post' : 'global',
        globalDeadline: parsed.globalDeadline || prev.globalDeadline,
        maxUploadSize: Number.isFinite(Number(parsed.maxUploadSize)) ? Number(parsed.maxUploadSize) : prev.maxUploadSize,
        requiredDocuments: parsed.requiredDocuments !== undefined ? Boolean(parsed.requiredDocuments) : prev.requiredDocuments
      }));
    } catch (err) {
      console.error('Failed to load application settings:', err);
    }
  };

  const handleSaveApplicationSettings = async () => {
    setApplicationSettingsSaving(true);
    setMessage({ text: '', type: '' });

    try {
      const normalized = {
        ...applicationSettings,
        maxUploadSize: Math.max(1, Math.min(100, Number(applicationSettings.maxUploadSize) || 10)),
      };

      localStorage.setItem(APPLICATION_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
      setApplicationSettings(normalized);
      setMessage({ text: 'Application settings saved successfully!', type: 'success' });
    } catch (err) {
      console.error('Failed to save application settings:', err);
      setMessage({ text: 'Failed to save application settings', type: 'error' });
    } finally {
      setApplicationSettingsSaving(false);
    }
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${API_BASE}/api/admin/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profile.name,
          email: profile.email
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      console.log('Profile update response:', data);

      // Update localStorage
      localStorage.setItem('adminEmail', data.user.email);
      localStorage.setItem('adminName', data.user.name);

      console.log('Updated localStorage - Name:', data.user.name, 'Email:', data.user.email);

      // Dispatch custom event to notify AdminLayout
      window.dispatchEvent(new Event('adminProfileUpdated'));
      
      // Also trigger storage event for cross-tab updates
      window.dispatchEvent(new Event('storage'));

      setMessage({ text: 'Profile updated successfully! Changes will appear immediately.', type: 'success' });
    } catch (err) {
      console.error('Update profile error:', err);
      setMessage({ text: err.message || 'Failed to update profile', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setMessage({ text: '', type: '' });

    if (!passwordData.currentPassword || !passwordData.newPassword) {
      setMessage({ text: 'Please fill in all password fields', type: 'error' });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ text: 'New passwords do not match', type: 'error' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ text: 'New password must be at least 6 characters', type: 'error' });
      return;
    }

    setLoading(true);

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${API_BASE}/api/admin/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      setMessage({ text: 'Password changed successfully!', type: 'success' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      console.error('Change password error:', err);
      setMessage({ text: err.message || 'Failed to change password', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetData = () => {
    if (window.confirm('Are you sure you want to reset all data? This action cannot be undone.')) {
      console.log('Resetting all data...');
      setMessage({ text: 'This feature is not yet implemented', type: 'error' });
    }
  };

  // Custom Toggle Component
  const Toggle = ({ checked, onChange, label }) => (
    <div className="flex items-center justify-between py-4">
      <span className="text-gray-700 font-medium">{label}</span>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          checked ? 'bg-blue-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Settings
              </h1>
              <p className="text-gray-600 mt-1">Manage your account and application preferences</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* Message Display */}
        {message.text && (
          <div className={`p-4 rounded-xl border-2 ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            <p className="font-semibold">{message.text}</p>
          </div>
        )}

        {/* Profile Settings */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <div className="flex items-center space-x-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <h2 className="text-2xl font-bold text-white">Profile Settings</h2>
            </div>
          </div>
          
          <div className="p-8">
            {profileLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Admin Name</label>
                    <input 
                      type="text" 
                      value={profile.name}
                      onChange={(e) => handleProfileChange('name', e.target.value)}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                    <input 
                      type="email" 
                      value={profile.email}
                      onChange={(e) => handleProfileChange('email', e.target.value)}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>
                
                <div className="mt-8">
                  <button 
                    onClick={handleUpdateProfile}
                    disabled={loading}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Updating...' : 'Update Profile'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Change Password Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-8 py-6">
            <div className="flex items-center space-x-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h2 className="text-2xl font-bold text-white">Change Password</h2>
            </div>
          </div>
          
          <div className="p-8">
            <div className="grid grid-cols-1 gap-6 max-w-2xl">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Current Password</label>
                <input 
                  type="password" 
                  value={passwordData.currentPassword}
                  onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all"
                  placeholder="Enter current password"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                <input 
                  type="password" 
                  value={passwordData.newPassword}
                  onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all"
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm New Password</label>
                <input 
                  type="password" 
                  value={passwordData.confirmPassword}
                  onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all"
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            
            <div className="mt-8">
              <button 
                onClick={handleChangePassword}
                disabled={loading}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-8 py-6">
            <div className="flex items-center space-x-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h2 className="text-2xl font-bold text-white">System Settings</h2>
            </div>
          </div>
          
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Toggle
                  checked={systemSettings.emailNotifications}
                  onChange={() => handleSystemSettingToggle('emailNotifications')}
                  label="Email Notifications"
                />
                <Toggle
                  checked={systemSettings.smsNotifications}
                  onChange={() => handleSystemSettingToggle('smsNotifications')}
                  label="SMS Notifications"
                />
              </div>
              
              <div className="space-y-4">
                <Toggle
                  checked={systemSettings.autoBackup}
                  onChange={() => handleSystemSettingToggle('autoBackup')}
                  label="Auto-backup"
                />
                <Toggle
                  checked={systemSettings.darkMode}
                  onChange={() => handleSystemSettingToggle('darkMode')}
                  label="Dark Mode"
                />
              </div>
            </div>
            
            <div className="mt-12 pt-8 border-t-2 border-red-100">
              <div className="bg-red-50 rounded-xl p-6 border-2 border-red-200">
                <h3 className="text-xl font-bold text-red-800 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Danger Zone
                </h3>
                <p className="text-red-700 mb-4">This action will permanently delete all data and cannot be undone.</p>
                <button 
                  onClick={handleResetData}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  Reset All Data
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Application Settings */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-8 py-6">
            <div className="flex items-center space-x-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h2 className="text-2xl font-bold text-white">Application Settings</h2>
            </div>
          </div>
          
          <div className="p-8">
            <div className="space-y-8">
              <Toggle
                checked={applicationSettings.multipleApplications}
                onChange={() => handleApplicationSettingToggle('multipleApplications')}
                label="Allow Multiple Applications per User"
              />

              <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Application Deadline</h3>
                <div className="space-y-4">
                  <label className="flex items-center p-3 bg-white rounded-lg border-2 border-gray-200 hover:border-green-300 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="deadlineType"
                      value="global"
                      checked={applicationSettings.deadlineType === 'global'}
                      onChange={(e) => handleApplicationSettingChange('deadlineType', e.target.value)}
                      className="w-4 h-4 text-green-600 mr-3"
                    />
                    <span className="text-gray-700 font-medium">Set Global Date</span>
                  </label>
                  
                  <label className="flex items-center p-3 bg-white rounded-lg border-2 border-gray-200 hover:border-green-300 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="deadlineType"
                      value="per_post"
                      checked={applicationSettings.deadlineType === 'per_post'}
                      onChange={(e) => handleApplicationSettingChange('deadlineType', e.target.value)}
                      className="w-4 h-4 text-green-600 mr-3"
                    />
                    <span className="text-gray-700 font-medium">Per Post</span>
                  </label>
                  
                  {applicationSettings.deadlineType === 'global' && (
                    <div className="mt-4">
                      <input
                        type="date"
                        value={applicationSettings.globalDeadline}
                        onChange={(e) => handleApplicationSettingChange('globalDeadline', e.target.value)}
                        className="w-full p-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Max Upload Size (MB)
                  </label>
                  <input 
                    type="number" 
                    min="1"
                    max="100"
                    value={applicationSettings.maxUploadSize}
                    onChange={(e) => handleApplicationSettingChange('maxUploadSize', e.target.value)}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all"
                  />
                </div>
                
                <div className="flex items-end">
                  <div className="w-full">
                    <Toggle
                      checked={applicationSettings.requiredDocuments}
                      onChange={() => handleApplicationSettingToggle('requiredDocuments')}
                      label="Required Documents Toggle"
                    />
                  </div>
                </div>
              </div>
              
              <div className="pt-4">
                <button 
                  onClick={handleSaveApplicationSettings}
                  disabled={applicationSettingsSaving}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {applicationSettingsSaving ? 'Saving...' : 'Save Application Settings'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Department and Position Management */}
        <DepartmentPositionManagement />
        
      </div>
    </div>
  );
};

export default Settings;