import React, { useState, useEffect } from 'react';
import { Bell, Users, FileText, AlertTriangle, Clock, Send, X, CheckCircle } from 'lucide-react';

const BASE_URL = "https://hirewise-maxx-2.onrender.com"; // your backend on Render

const Notification = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [recipients, setRecipients] = useState('all');
  const [priority, setPriority] = useState('normal');
  const [alertType, setAlertType] = useState('general');
  const [notifications, setNotifications] = useState([]);
  const [adminAlerts, setAdminAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Mock data for admin alerts - replace with API calls
  useEffect(() => {
    // Empty alerts - no mock data
    const mockAlerts = [];
    
    setAdminAlerts(mockAlerts);
    setUnreadCount(mockAlerts.filter(alert => !alert.read).length);
  }, []);

  const handleSendNotification = async () => {
    // Backend integration point
    const notificationData = {
      title,
      message,
      recipients,
      priority,
      alertType,
      timestamp: new Date(),
      sentBy: 'admin' // Replace with actual admin ID from auth context
    };

    try {
      // Replace with actual API call
      // const response = await fetch(BASE_URL + '/api/notifications/send', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(notificationData)
      // });
      
      console.log('Sending notification:', notificationData);
      
      // Add to local notifications for display
      const newNotification = {
        id: Date.now(),
        ...notificationData,
        status: 'sent'
      };
      
      setNotifications(prev => [newNotification, ...prev]);
      
      // Reset form
      setTitle('');
      setMessage('');
      setRecipients('all');
      setPriority('normal');
      setAlertType('general');
      
      alert('Notification sent successfully!');
    } catch (error) {
      console.error('Failed to send notification:', error);
      alert('Failed to send notification. Please try again.');
    }
  };

  const markAsRead = (alertId) => {
    setAdminAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId ? { ...alert, read: true } : alert
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const dismissAlert = (alertId) => {
    setAdminAlerts(prev => prev.filter(alert => alert.id !== alertId));
    const alert = adminAlerts.find(a => a.id === alertId);
    if (alert && !alert.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'new_registration': return <Users className="w-5 h-5" />;
      case 'job_application': return <FileText className="w-5 h-5" />;
      case 'pending_approval': return <Clock className="w-5 h-5" />;
      case 'flagged_issue': return <AlertTriangle className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'normal': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  return (
    <div className="h-screen w-full bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-800">Admin Notifications</h1>
        <div className="flex items-center space-x-2">
          <Bell className="w-5 h-5 text-gray-600" />
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
              {unreadCount}
            </span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 p-4 min-h-0">
        {/* Admin Alerts Section - Takes up 2/3 of width */}
        <div className="flex-1 bg-white rounded-lg shadow-sm flex flex-col min-h-0">
          <div className="p-4 border-b flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-orange-500" />
              Admin Alerts
              {unreadCount > 0 && (
                <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </h2>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-3">
              {adminAlerts.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500 text-center">No admin alerts at this time</p>
                </div>
              ) : (
                adminAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border-l-4 ${getPriorityColor(alert.priority)} ${
                      !alert.read ? 'bg-opacity-75' : 'bg-opacity-50'
                    } transition-all`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-2 flex-1">
                        <div className="flex-shrink-0 mt-1">
                          {getAlertIcon(alert.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className={`font-semibold truncate ${!alert.read ? 'text-gray-900' : 'text-gray-700'}`}>
                              {alert.title}
                            </h3>
                            {!alert.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{alert.message}</p>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-gray-500">{formatTimeAgo(alert.timestamp)}</p>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                alert.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                alert.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {alert.priority}
                              </span>
                              {alert.actionRequired && (
                                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                                  Action Required
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                        {!alert.read && (
                          <button
                            onClick={() => markAsRead(alert.id)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                            title="Mark as read"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => dismissAlert(alert.id)}
                          className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                          title="Dismiss"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Takes up 1/3 of width */}
        <div className="w-80 flex flex-col gap-4 min-h-0">
          {/* Send New Notification Section */}
          <div className="bg-white rounded-lg shadow-sm flex flex-col">
            <div className="p-4 border-b flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <Send className="w-5 h-5 mr-2 text-blue-500" />
                Send New Notification
              </h2>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alert Type</label>
                <select 
                  value={alertType}
                  onChange={(e) => setAlertType(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="general">General Notification</option>
                  <option value="system">System Update</option>
                  <option value="urgent">Urgent Alert</option>
                  <option value="maintenance">Maintenance Notice</option>
                  <option value="feature">New Feature</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select 
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Enter notification title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea 
                  rows="3"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                  placeholder="Enter notification message"
                ></textarea>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipients</label>
                <select 
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="all">All Users</option>
                  <option value="candidates">All Candidates</option>
                  <option value="active">Active Candidates</option>
                  <option value="pending">Pending Candidates</option>
                  <option value="inactive">Inactive Candidates</option>
                  <option value="admins">Admin Users</option>
                </select>
              </div>
              
              <button 
                onClick={handleSendNotification}
                disabled={!title || !message}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-2.5 rounded-lg transition-colors flex items-center justify-center space-x-2 text-sm"
              >
                <Send className="w-4 h-4" />
                <span>Send Notification</span>
              </button>
            </div>
          </div>

          {/* Recent Sent Notifications */}
          {notifications.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm flex flex-col flex-1 min-h-0">
              <div className="p-4 border-b flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-800">Recently Sent</h2>
              </div>
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-3">
                  {notifications.slice(0, 10).map((notification) => (
                    <div key={notification.id} className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-800 text-sm truncate">{notification.title}</h3>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex flex-col space-y-1">
                              <p className="text-xs text-gray-500">
                                To: {notification.recipients}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatTimeAgo(notification.timestamp)}
                              </p>
                            </div>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex-shrink-0">
                              Sent
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notification;
