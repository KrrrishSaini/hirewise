import React, { useState } from 'react';
import DepartmentPositionManagement from './DepartmentPositionManagement.jsx';

const Settings = () => {
  const [profile, setProfile] = useState({
    name: 'Administrator',
    email: 'admin@example.com',
    password: ''
  });

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

  const handleProfileChange = (field, value) => {
    setProfile(prev => ({
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

  const handleUpdateProfile = () => {
    console.log('Updating profile:', profile);
  };

  const handleResetData = () => {
    if (window.confirm('Are you sure you want to reset all data? This action cannot be undone.')) {
      console.log('Resetting all data...');
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
              
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Change Password</label>
                <input 
                  type="password" 
                  value={profile.password}
                  onChange={(e) => handleProfileChange('password', e.target.value)}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  placeholder="Enter new password"
                />
              </div>
            </div>
            
            <div className="mt-8">
              <button 
                onClick={handleUpdateProfile}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                Update Profile
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
                    onChange={(e) => handleApplicationSettingChange('maxUploadSize', parseInt(e.target.value))}
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
                  onClick={() => console.log('Saving application settings:', applicationSettings)}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  Save Application Settings
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