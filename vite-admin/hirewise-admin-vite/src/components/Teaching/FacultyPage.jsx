import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const COMMITTEES = [
  { code: 'soet', name: 'SOET Committee' },
  { code: 'sol', name: 'SOL Committee' },
  { code: 'som', name: 'SOM Committee' },
  { code: 'sols', name: 'SOLS Committee' },
];

const FacultyPage = () => {
  const [committeeCode, setCommitteeCode] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    const rawInput = committeeCode.trim().toLowerCase();
    const normalizedCode = rawInput.includes('@') ? rawInput.split('@')[0] : rawInput;
    const committee = COMMITTEES.find((c) => c.code === normalizedCode);
    
    if (committee) {
      // Navigate to committee portal with committee info
      navigate('/faculty-portal/dashboard', { state: { committeeInfo: committee } });
    } else {
      alert('Invalid committee. Please use: soet@bmu.edu.in, sol@bmu.edu.in, som@bmu.edu.in, sols@bmu.edu.in.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Committee Portal</h1>
          <p className="text-gray-600">Enter your committee code to access assigned candidates</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="committee-code" className="block text-sm font-medium text-gray-700 mb-2">
              Evaluation Committee
            </label>
            <input
              type="text"
              id="committee-code"
              value={committeeCode}
              onChange={(e) => setCommitteeCode(e.target.value)}
              placeholder="soet@bmu.edu.in"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
          >
            Access Portal
          </button>
        </form>
        
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 text-center">
            Committees: soet@bmu.edu.in, sol@bmu.edu.in, som@bmu.edu.in, sols@bmu.edu.in
          </p>
        </div>
      </div>
    </div>
  );
};

export default FacultyPage;
