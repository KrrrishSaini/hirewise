import React, { useState, useEffect } from 'react';
import { API_BASE } from '../lib/config.js';
import { toArrayPayload } from '../lib/normalize';

const DepartmentPositionManagement = () => {
  const [activeTab, setActiveTab] = useState('departments');
  const [activeSection, setActiveSection] = useState('TEACHING'); // TEACHING or NON_TEACHING
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data states
  const [departments, setDepartments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [positions, setPositions] = useState([]);

  // Form states
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [editingBranch, setEditingBranch] = useState(null);
  const [editingPosition, setEditingPosition] = useState(null);

  const [departmentForm, setDepartmentForm] = useState({
    name: '',
    type: 'TEACHING'
  });

  const [branchForm, setBranchForm] = useState({
    name: '',
    department_id: ''
  });

  const [positionForm, setPositionForm] = useState({
    name: '',
    type: 'TEACHING',
    department_id: '',
    branch_id: ''
  });

  // Recommendation setup states (shown after adding a new position)
  const [newlyCreatedPosition, setNewlyCreatedPosition] = useState(null);
  const [specializationInput, setSpecializationInput] = useState('');
  const [specializationKeywords, setSpecializationKeywords] = useState([]);
  const [savingSpecializations, setSavingSpecializations] = useState(false);
  const [generatingRecommendations, setGeneratingRecommendations] = useState(false);
  const [latestRecommendations, setLatestRecommendations] = useState([]);
  const [recommendationMeta, setRecommendationMeta] = useState(null);

  // Load data
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    await Promise.all([loadDepartments(), loadBranches(), loadPositions()]);
  };

  const loadDepartments = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/departments`);
      if (response.ok) {
        const payload = await response.json();
        setDepartments(toArrayPayload(payload));
      }
    } catch (error) {
      console.error('Error loading departments:', error);
      setDepartments([]);
    }
  };

  const loadBranches = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/branches`);
      if (response.ok) {
        const payload = await response.json();
        setBranches(toArrayPayload(payload));
      }
    } catch (error) {
      console.error('Error loading branches:', error);
      setBranches([]);
    }
  };

  const loadPositions = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/positions`);
      if (response.ok) {
        const payload = await response.json();
        setPositions(toArrayPayload(payload));
      }
    } catch (error) {
      console.error('Error loading positions:', error);
      setPositions([]);
    }
  };

  const showMessage = (message, type) => {
    if (type === 'success') {
      setSuccess(message);
      setError('');
    } else {
      setError(message);
      setSuccess('');
    }
    setTimeout(() => {
      setSuccess('');
      setError('');
    }, 3000);
  };

  // Department handlers
  const handleDepartmentSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingDepartment 
        ? `${API_BASE}/api/admin/departments/${editingDepartment.id}`
        : `${API_BASE}/api/admin/departments`;
      
      const method = editingDepartment ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...departmentForm, type: activeSection }),
      });

      if (response.ok) {
        showMessage(editingDepartment ? 'Department updated' : 'Department created', 'success');
        loadDepartments();
        resetDepartmentForm();
      } else {
        const errorData = await response.json();
        showMessage(errorData.error || 'Operation failed', 'error');
      }
    } catch (error) {
      showMessage('Network error', 'error');
    }

    setLoading(false);
  };

  const handleDepartmentEdit = (department) => {
    setEditingDepartment(department);
    setDepartmentForm({
      name: department.name,
      type: department.type
    });
  };

  const handleDepartmentStatusToggle = async (department) => {
    const newStatus = department.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    
    try {
      const response = await fetch(`${API_BASE}/api/admin/departments/${department.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        showMessage(`Department ${newStatus.toLowerCase()}`, 'success');
        loadDepartments();
      } else {
        const errorData = await response.json();
        showMessage(errorData.error || 'Status update failed', 'error');
      }
    } catch (error) {
      showMessage('Network error', 'error');
    }
  };

  const handleDepartmentDelete = async (department) => {
    if (!window.confirm(`⚠️ PERMANENT DELETE: "${department.name}"?\n\nThis will also delete:\n• All branches in this department\n• All positions linked to this department\n\nThis cannot be undone!`)) return;

    try {
      const response = await fetch(`${API_BASE}/api/admin/departments/${department.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showMessage('Department permanently deleted', 'success');
        loadAllData();
      } else {
        const errorData = await response.json();
        showMessage(errorData.error || 'Delete failed', 'error');
      }
    } catch (error) {
      showMessage('Network error', 'error');
    }
  };

  const resetDepartmentForm = () => {
    setEditingDepartment(null);
    setDepartmentForm({ name: '', type: activeSection });
  };

  // Branch handlers
  const handleBranchSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingBranch 
        ? `${API_BASE}/api/admin/branches/${editingBranch.id}`
        : `${API_BASE}/api/admin/branches`;
      
      const method = editingBranch ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branchForm),
      });

      if (response.ok) {
        showMessage(editingBranch ? 'Branch updated' : 'Branch created', 'success');
        loadBranches();
        resetBranchForm();
      } else {
        const errorData = await response.json();
        showMessage(errorData.error || 'Operation failed', 'error');
      }
    } catch (error) {
      showMessage('Network error', 'error');
    }

    setLoading(false);
  };

  const handleBranchEdit = (branch) => {
    setEditingBranch(branch);
    setBranchForm({
      name: branch.name,
      department_id: branch.department_id
    });
  };

  const handleBranchStatusToggle = async (branch) => {
    const newStatus = branch.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    
    try {
      const response = await fetch(`${API_BASE}/api/admin/branches/${branch.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        showMessage(`Branch ${newStatus.toLowerCase()}`, 'success');
        loadBranches();
      } else {
        const errorData = await response.json();
        showMessage(errorData.error || 'Status update failed', 'error');
      }
    } catch (error) {
      showMessage('Network error', 'error');
    }
  };

  const handleBranchDelete = async (branch) => {
    if (!window.confirm(`⚠️ PERMANENT DELETE: "${branch.name}"?\n\nThis will also delete all positions linked to this branch.\n\nThis cannot be undone!`)) return;

    try {
      const response = await fetch(`${API_BASE}/api/admin/branches/${branch.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showMessage('Branch permanently deleted', 'success');
        loadAllData();
      } else {
        const errorData = await response.json();
        showMessage(errorData.error || 'Delete failed', 'error');
      }
    } catch (error) {
      showMessage('Network error', 'error');
    }
  };

  const resetBranchForm = () => {
    setEditingBranch(null);
    setBranchForm({ name: '', department_id: '' });
  };

  // Position handlers
  const handlePositionSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!positionForm.department_id) {
      showMessage('Department is required', 'error');
      setLoading(false);
      return;
    }

    if (activeSection === 'TEACHING' && !positionForm.branch_id) {
      showMessage('Branch is mandatory for teaching positions', 'error');
      setLoading(false);
      return;
    }

    try {
      const url = editingPosition 
        ? `${API_BASE}/api/admin/positions/${editingPosition.id}`
        : `${API_BASE}/api/admin/positions`;
      
      const method = editingPosition ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...positionForm, type: activeSection }),
      });

      const payload = await response.json();

      if (response.ok) {
        showMessage(editingPosition ? 'Position updated' : 'Position created', 'success');
        loadPositions();

        if (!editingPosition && payload?.id) {
          setNewlyCreatedPosition(payload);
          setSpecializationInput('');
          setSpecializationKeywords([]);
          setLatestRecommendations([]);
          setRecommendationMeta(null);
        }

        resetPositionForm();
      } else {
        showMessage(payload.error || 'Operation failed', 'error');
      }
    } catch (error) {
      showMessage('Network error', 'error');
    }

    setLoading(false);
  };

  const handlePositionEdit = (position) => {
    setEditingPosition(position);
    setPositionForm({
      name: position.name,
      type: position.type,
      department_id: position.department_id || '',
      branch_id: position.branch_id || ''
    });
  };

  const handlePositionStatusToggle = async (position) => {
    const newStatus = position.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    
    try {
      const response = await fetch(`${API_BASE}/api/admin/positions/${position.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        showMessage(`Position ${newStatus.toLowerCase()}`, 'success');
        loadPositions();
      } else {
        const errorData = await response.json();
        showMessage(errorData.error || 'Status update failed', 'error');
      }
    } catch (error) {
      showMessage('Network error', 'error');
    }
  };

  const handlePositionDelete = async (position) => {
    if (!window.confirm(`⚠️ PERMANENT DELETE: "${position.name}"?\n\nThis cannot be undone!`)) return;

    try {
      const response = await fetch(`${API_BASE}/api/admin/positions/${position.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showMessage('Position permanently deleted', 'success');
        loadPositions();
      } else {
        const errorData = await response.json();
        showMessage(errorData.error || 'Delete failed', 'error');
      }
    } catch (error) {
      showMessage('Network error', 'error');
    }
  };

  const resetPositionForm = () => {
    setEditingPosition(null);
    setPositionForm({ name: '', type: activeSection, department_id: '', branch_id: '' });
  };

  const addSpecializationFromInput = () => {
    const merged = getEffectiveSpecializationKeywords();
    if (merged.length === specializationKeywords.length) return;
    setSpecializationKeywords(merged);
    setSpecializationInput('');
  };

  const getEffectiveSpecializationKeywords = () => {
    const incoming = specializationInput
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const merged = [...specializationKeywords];
    incoming.forEach((k) => {
      if (!merged.some((m) => m.toLowerCase() === k.toLowerCase())) {
        merged.push(k);
      }
    });

    return merged;
  };

  const removeSpecialization = (keyword) => {
    setSpecializationKeywords((prev) => prev.filter((k) => k !== keyword));
  };

  const handleSaveSpecializations = async () => {
    if (!newlyCreatedPosition?.id) return false;

    const effectiveKeywords = getEffectiveSpecializationKeywords();
    if (effectiveKeywords.length === 0) {
      showMessage('Add at least one specialization keyword', 'error');
      return false;
    }

    if (effectiveKeywords.length !== specializationKeywords.length || specializationInput.trim()) {
      setSpecializationKeywords(effectiveKeywords);
      setSpecializationInput('');
    }

    setSavingSpecializations(true);
    try {
      const response = await fetch(`${API_BASE}/api/admin/positions/${newlyCreatedPosition.id}/specializations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: effectiveKeywords,
          source: 'ADMIN_MANUAL'
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        showMessage(payload.error || 'Failed to save specializations', 'error');
        return false;
      }

      showMessage('Specialization keywords saved', 'success');
      return true;
    } catch (err) {
      showMessage('Failed to save specializations', 'error');
      return false;
    } finally {
      setSavingSpecializations(false);
    }
  };

  const handleGenerateRecommendations = async () => {
    if (!newlyCreatedPosition?.id) return;

    if (getEffectiveSpecializationKeywords().length === 0) {
      showMessage('Please add specialization keywords first', 'error');
      return;
    }

    const saved = await handleSaveSpecializations();
    if (!saved) return;

    setGeneratingRecommendations(true);
    try {
      const response = await fetch(`${API_BASE}/api/admin/positions/${newlyCreatedPosition.id}/recommendations/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topN: 10 }),
      });

      const payload = await response.json();
      if (!response.ok) {
        showMessage(payload.error || 'Failed to generate recommendations', 'error');
        return;
      }

      setLatestRecommendations(payload.recommendations || []);
      setRecommendationMeta(payload.meta || null);
      showMessage('Top CV recommendations generated', 'success');
    } catch (err) {
      showMessage('Failed to generate recommendations', 'error');
    } finally {
      setGeneratingRecommendations(false);
    }
  };

  // Filter data
  const getFilteredDepartments = () => departments.filter(d => d.type === activeSection);
  const getFilteredBranches = () => branches.filter(b => {
    const dept = departments.find(d => d.id === b.department_id);
    return dept && dept.type === activeSection;
  });
  const getFilteredPositions = () => positions.filter(p => p.type === activeSection);
  const getTeachingDepartments = () => departments.filter(d => d.type === 'TEACHING');

  // Get available branches for selected department
  const getAvailableBranches = () => {
    if (!positionForm.department_id) return [];
    return branches.filter(b => b.department_id === positionForm.department_id && b.status === 'ACTIVE');
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-8 py-6">
        <div className="flex items-center space-x-3">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h2 className="text-2xl font-bold text-white">Department & Position Management</h2>
        </div>
        <p className="text-indigo-100 mt-2">Manage departments, positions, and branches for faculty applications</p>
      </div>

      {/* Messages */}
      {(success || error) && (
        <div className="p-4">
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-800">
              {success}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800">
              {error}
            </div>
          )}
        </div>
      )}

      <div className="p-8">
        {/* Section Toggle (Teaching/Non-Teaching) */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
          <button
            onClick={() => {
              setActiveSection('TEACHING');
              setDepartmentForm({ ...departmentForm, type: 'TEACHING' });
              setPositionForm({ ...positionForm, type: 'TEACHING', department_id: '', branch_id: '' });
            }}
            className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-colors ${
              activeSection === 'TEACHING'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-600 hover:text-indigo-700'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>TEACHING</span>
            </div>
          </button>
          <button
            onClick={() => {
              setActiveSection('NON_TEACHING');
              setDepartmentForm({ ...departmentForm, type: 'NON_TEACHING' });
              setPositionForm({ ...positionForm, type: 'NON_TEACHING', department_id: '', branch_id: '' });
            }}
            className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-colors ${
              activeSection === 'NON_TEACHING'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-600 hover:text-indigo-700'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>NON-TEACHING</span>
            </div>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
          <button
            onClick={() => setActiveTab('departments')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'departments'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-600 hover:text-indigo-700'
            }`}
          >
            Departments
          </button>
          <button
            onClick={() => setActiveTab('positions')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'positions'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-600 hover:text-indigo-700'
            }`}
          >
            Positions
          </button>
          {activeSection === 'TEACHING' && (
            <button
              onClick={() => setActiveTab('branches')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'branches'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:text-indigo-700'
              }`}
            >
              Branches
            </button>
          )}
        </div>

        {/* Departments Tab */}
        {activeTab === 'departments' && (
          <div className="space-y-6">
            {/* Add/Edit Form */}
            <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {editingDepartment ? 'Edit Department' : 'Add New Department'}
              </h3>
              <form onSubmit={handleDepartmentSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department Name*
                  </label>
                  <input
                    type="text"
                    value={departmentForm.name}
                    onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
                    placeholder={activeSection === 'TEACHING' ? 'e.g., School of Engineering & Technology' : 'e.g., Administration'}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : editingDepartment ? 'Update Department' : 'Add Department'}
                  </button>
                  {editingDepartment && (
                    <button
                      type="button"
                      onClick={resetDepartmentForm}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Department List */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Existing Departments</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getFilteredDepartments().map((department) => (
                  <div key={department.id} className="bg-white border rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{department.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">ID: {department.id.substring(0, 8)}...</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        department.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {department.status}
                      </span>
                    </div>
                    <div className="flex space-x-2 mt-3">
                      <button
                        onClick={() => handleDepartmentEdit(department)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDepartmentStatusToggle(department)}
                        className={`${department.status === 'ACTIVE' ? 'text-orange-600 hover:text-orange-800' : 'text-green-600 hover:text-green-800'} p-1`}
                        title={department.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      >
                        {department.status === 'ACTIVE' ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => handleDepartmentDelete(department)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Delete Permanently"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Positions Tab */}
        {activeTab === 'positions' && (
          <div className="space-y-6">
            {/* Add/Edit Form */}
            <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {editingPosition ? 'Edit Position' : 'Add New Position'}
              </h3>
              <form onSubmit={handlePositionSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Position Name*
                    </label>
                    <input
                      type="text"
                      value={positionForm.name}
                      onChange={(e) => setPositionForm({ ...positionForm, name: e.target.value })}
                      placeholder={activeSection === 'TEACHING' ? 'e.g., Assistant Professor' : 'e.g., Administrative Officer'}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {activeSection === 'TEACHING' ? 'Department (School)*' : 'Department*'}
                    </label>
                    <select
                      value={positionForm.department_id}
                      onChange={(e) => setPositionForm({ ...positionForm, department_id: e.target.value, branch_id: '' })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
                      required
                    >
                      <option value="">Select Department</option>
                      {(activeSection === 'TEACHING' ? getTeachingDepartments() : getFilteredDepartments())
                        .filter(d => d.status === 'ACTIVE')
                        .map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  {activeSection === 'TEACHING' && positionForm.department_id && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Branch*
                      </label>
                      <select
                        value={positionForm.branch_id}
                        onChange={(e) => setPositionForm({ ...positionForm, branch_id: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
                        required
                      >
                        <option value="">Select Branch</option>
                        {getAvailableBranches().map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Branch is mandatory for teaching positions
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : editingPosition ? 'Update Position' : 'Add Position'}
                  </button>
                  {editingPosition && (
                    <button
                      type="button"
                      onClick={resetPositionForm}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {newlyCreatedPosition && (
              <div className="bg-indigo-50 rounded-xl p-6 border-2 border-indigo-200">
                <h3 className="text-lg font-semibold text-indigo-900 mb-2">
                  Recommendation Setup for: {newlyCreatedPosition.name}
                </h3>
                <p className="text-sm text-indigo-700 mb-4">
                  Add specialization keywords to improve automatic CV recommendation for this position.
                </p>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Specialization Keywords* (comma separated)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={specializationInput}
                      onChange={(e) => setSpecializationInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addSpecializationFromInput();
                        }
                      }}
                      placeholder="e.g., Machine Learning, Data Structures, Distributed Systems"
                      className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={addSpecializationFromInput}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium"
                    >
                      Add
                    </button>
                  </div>

                  {specializationKeywords.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {specializationKeywords.map((keyword) => (
                        <span
                          key={keyword}
                          className="inline-flex items-center gap-2 bg-white border border-indigo-200 text-indigo-700 px-3 py-1 rounded-full text-sm"
                        >
                          {keyword}
                          <button
                            type="button"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => removeSpecialization(keyword)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleSaveSpecializations}
                      disabled={savingSpecializations}
                      className="bg-white border border-indigo-300 text-indigo-700 hover:bg-indigo-100 px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                    >
                      {savingSpecializations ? 'Saving...' : 'Save Specializations'}
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateRecommendations}
                      disabled={generatingRecommendations}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                    >
                      {generatingRecommendations ? 'Generating...' : 'Generate Top 10 CV Recommendations'}
                    </button>
                  </div>

                  {recommendationMeta && (
                    <p className="text-xs text-indigo-700">
                      Pool: {recommendationMeta.poolSize} candidates • Generated: {recommendationMeta.generatedCount}
                      {recommendationMeta.debug ? (
                        <span>
                          {' '}• Active Records: {recommendationMeta.debug.activeAfterStatusFilter}
                        </span>
                      ) : null}
                    </p>
                  )}

                  {recommendationMeta && latestRecommendations.length === 0 && (
                    <div className="mt-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
                      No CV found for the selected position and specialization keywords.
                    </div>
                  )}

                  {latestRecommendations.length > 0 && (
                    <div className="mt-2 bg-white rounded-lg border border-indigo-100 overflow-hidden">
                      <div className="px-4 py-2 bg-indigo-100 text-indigo-900 font-semibold text-sm">
                        Recommended CVs (Top {latestRecommendations.length})
                      </div>
                      <div className="divide-y">
                        {latestRecommendations.map((row, idx) => (
                          <div key={row.application_id || idx} className="px-4 py-2 flex items-center justify-between text-sm">
                            <div>
                              <span className="font-medium text-gray-900">#{idx + 1}</span>{' '}
                              <span className="text-gray-700">{row.candidate_name || 'Candidate'}</span>
                            </div>
                            <span className="text-indigo-700 font-semibold">Score: {row.final_score}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Position List */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Existing Positions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getFilteredPositions().map((position) => (
                  <div key={position.id} className="bg-white border rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{position.name}</h4>
                        {position.departments && (
                          <p className="text-sm text-gray-600 mt-1">
                            📍 {position.departments.name}
                          </p>
                        )}
                        {position.branches && (
                          <p className="text-sm text-blue-600 mt-1">
                            🌿 {position.branches.name}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">ID: {position.id.substring(0, 8)}...</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        position.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {position.status}
                      </span>
                    </div>
                    <div className="flex space-x-2 mt-3">
                      <button
                        onClick={() => handlePositionEdit(position)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handlePositionStatusToggle(position)}
                        className={`${position.status === 'ACTIVE' ? 'text-orange-600 hover:text-orange-800' : 'text-green-600 hover:text-green-800'} p-1`}
                        title={position.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      >
                        {position.status === 'ACTIVE' ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => handlePositionDelete(position)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Delete Permanently"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Branches Tab (Teaching Only) */}
        {activeTab === 'branches' && activeSection === 'TEACHING' && (
          <div className="space-y-6">
            {/* Add/Edit Form */}
            <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {editingBranch ? 'Edit Branch' : 'Add New Branch'}
              </h3>
              <form onSubmit={handleBranchSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department (School)*
                    </label>
                    <select
                      value={branchForm.department_id}
                      onChange={(e) => setBranchForm({ ...branchForm, department_id: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
                      required
                    >
                      <option value="">Select Department</option>
                      {getTeachingDepartments()
                        .filter(d => d.status === 'ACTIVE')
                        .map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Branch Name*
                    </label>
                    <input
                      type="text"
                      value={branchForm.name}
                      onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                      placeholder="e.g., Computer Science & Engineering"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : editingBranch ? 'Update Branch' : 'Add Branch'}
                  </button>
                  {editingBranch && (
                    <button
                      type="button"
                      onClick={resetBranchForm}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Branch List */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Existing Branches</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getFilteredBranches().map((branch) => (
                  <div key={branch.id} className="bg-white border rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{branch.name}</h4>
                        {branch.departments && (
                          <p className="text-sm text-gray-600 mt-1">
                            📍 {branch.departments.name}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">ID: {branch.id.substring(0, 8)}...</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        branch.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {branch.status}
                      </span>
                    </div>
                    <div className="flex space-x-2 mt-3">
                      <button
                        onClick={() => handleBranchEdit(branch)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleBranchStatusToggle(branch)}
                        className={`${branch.status === 'ACTIVE' ? 'text-orange-600 hover:text-orange-800' : 'text-green-600 hover:text-green-800'} p-1`}
                        title={branch.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      >
                        {branch.status === 'ACTIVE' ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => handleBranchDelete(branch)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Delete Permanently"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartmentPositionManagement;
