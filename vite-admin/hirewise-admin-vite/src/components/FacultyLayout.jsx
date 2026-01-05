import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import FacultyDashboard from './FacultyDashboard';

const FacultyLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Get committee info from location state (passed during login)
  const committeeInfo = location.state?.committeeInfo || JSON.parse(localStorage.getItem('committeeInfo') || '{}');
  
  // If no committee info, redirect to login
  React.useEffect(() => {
    if (!committeeInfo?.code) {
      navigate('/faculty');
    } else {
      // Save to localStorage for persistence
      localStorage.setItem('committeeInfo', JSON.stringify(committeeInfo));
    }
  }, [committeeInfo, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('committeeInfo');
    navigate('/faculty');
  };

  const navItems = [
    {
      path: '/faculty-portal/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      label: 'My Candidates',
    },
  ];

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        } bg-gradient-to-b from-blue-900 to-blue-800 text-white transition-all duration-300 flex flex-col shadow-xl`}
      >
        {/* Logo Section */}
        <div className="p-4 border-b border-blue-700">
          <div className="flex items-center justify-between">
            {!isSidebarCollapsed && (
              <div>
                <h1 className="text-xl font-bold">Committee Portal</h1>
                <p className="text-xs text-blue-200 mt-1">{committeeInfo.name || committeeInfo.code}</p>
              </div>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg
                className={`w-5 h-5 transition-transform ${isSidebarCollapsed ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              state={{ committeeInfo }}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                location.pathname === item.path
                  ? 'bg-blue-700 shadow-lg'
                  : 'hover:bg-blue-700/50'
              }`}
            >
              {item.icon}
              {!isSidebarCollapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-blue-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold">
                {(committeeInfo.name || committeeInfo.code || 'C').charAt(0).toUpperCase()}
              </span>
            </div>
            {!isSidebarCollapsed && (
              <div className="flex-1">
                <p className="text-sm font-medium truncate">{committeeInfo.name || committeeInfo.code}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-3 flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!isSidebarCollapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="dashboard" element={<FacultyDashboard />} />
          <Route path="*" element={<FacultyDashboard />} />
        </Routes>
      </main>
    </div>
  );
};

export default FacultyLayout;
