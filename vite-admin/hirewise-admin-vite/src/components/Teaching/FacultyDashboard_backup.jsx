import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase-client';
import { candidatesApi } from '../../lib/api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AllCandidates = () => {
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState({});
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [candidateToAssign, setCandidateToAssign] = useState(null);
  const [selectedFaculty, setSelectedFaculty] = useState([]);
  const [assignments, setAssignments] = useState(() => {
    // Load assignments from localStorage on mount
    const saved = localStorage.getItem('facultyAssignments');
    return saved ? JSON.parse(saved) : {};
  });

  const departments = ['All', 'law', 'liberal', 'engineering', 'management'];
  
  const facultyMembers = [
    { id: 1, name: 'Dr. Kiran Sharma', email: 'kiran.sharma@bmu.edu.in' },
    { id: 2, name: 'Dr. Ziya Uddin', email: 'ziya.uddin@bmu.edu.in' }
  ];

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      
      // Direct Supabase query to get ALL fields including research data
      let query = supabase
        .from('faculty_applications')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (selectedDepartment !== 'All') {
        query = query.eq('department', selectedDepartment);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Filter out rejected, deleted, and shortlisted candidates in JavaScript
      const filteredData = (data || []).filter(candidate => 
        candidate.status !== 'rejected' && 
        candidate.status !== 'deleted' &&
        candidate.status !== 'Deleted' &&
        candidate.status !== 'shortlisted'
      );
      
      console.log('Fetched candidates:', data?.length, 'total, filtered to:', filteredData.length);
      console.log('All statuses in DB:', [...new Set(data?.map(c => c.status))]);
      console.log('First few candidates:', filteredData.slice(0, 5).map(c => ({ id: c.id, name: c.first_name, status: c.status })));
      
      setCandidates(filteredData);
    } catch (err) {
      console.error('Error fetching candidates:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [selectedDepartment]); // Re-fetch when department filter changes

  const handleViewDetails = async (candidate) => {
    console.log('Opening candidate details for ID:', candidate.id);
    
    // Show modal immediately with loading state
    setSelectedCandidate({ ...candidate, loading: true });
    
    try {
      // Fetch complete application details from API
      const fullData = await candidatesApi.getById(candidate.id);
      console.log('Full candidate data fetched:', fullData);
      
      // Flatten researchInfo fields to top level
      const flattened = {
        ...candidate,
        ...fullData,
        // Extract research info fields to top level
        scopus_general_papers: fullData.researchInfo?.scopus_general_papers || 0,
        conference_papers: fullData.researchInfo?.conference_papers || 0,
        edited_books: fullData.researchInfo?.edited_books || 0,
        scopus_id: fullData.researchInfo?.scopus_id || fullData.scopus_id,
        orchid_id: fullData.researchInfo?.orchid_id || fullData.orchid_id,
        google_scholar_id: fullData.researchInfo?.google_scholar_id,
        loading: false
      };
      
      console.log('Flattened candidate data:', flattened);
      setSelectedCandidate(flattened);
    } catch (error) {
      console.error('Error fetching candidate details:', error);
      // Fallback to existing data if fetch fails
      setSelectedCandidate({ ...candidate, loading: false });
    }
  };

  const closeModal = () => {
    setSelectedCandidate(null);
    setShowUpload(false);
    setFiles({});
  };
  const onFileChange = (e, key) => {
    const f = e.target.files?.[0];
    setFiles((prev) => ({ ...prev, [key]: f }));
  };

  const uploadDocuments = async () => {
    if (!selectedCandidate) return;
    try {
      setUploading(true);
      const fd = new FormData();
      if (files.coverLetter) fd.append('coverLetter', files.coverLetter, files.coverLetter.name);
      if (files.teachingStatement) fd.append('teachingStatement', files.teachingStatement, files.teachingStatement.name);
      if (files.researchStatement) fd.append('researchStatement', files.researchStatement, files.researchStatement.name);
      if (files.cv) fd.append('cv', files.cv, files.cv.name);
      if (files.otherPublications) fd.append('otherPublications', files.otherPublications, files.otherPublications.name);

      const res = await fetch(`${API_BASE}/api/documents/upload/${selectedCandidate.id}` ,{
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      // Update candidate in place with returned paths
      setSelectedCandidate((prev) => ({ ...prev, ...data.updated }));
      setShowUpload(false);
      setFiles({});
      alert('Documents uploaded successfully');
    } catch (err) {
      console.error('Upload error:', err);
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Update application status: 'in_review' (Accept) or 'rejected' (Reject)
  const updateApplicationStatus = async (nextStatus) => {
    if (!selectedCandidate?.id) return;
    try {
      setUpdatingStatus(true);
      const { error: updErr } = await supabase
        .from('faculty_applications')
        .update({ status: nextStatus })
        .eq('id', selectedCandidate.id);
      if (updErr) throw updErr;

      // Close modal first
      closeModal();
      
      // Immediately remove from local state if rejected, deleted, or shortlisted
      if (nextStatus === 'rejected' || nextStatus === 'deleted' || nextStatus === 'shortlisted') {
        setCandidates(prev => prev.filter(c => c.id !== selectedCandidate.id));
        alert(`Application ${nextStatus} and removed from list.`);
      } else {
        // Update status in local state
        setCandidates(prev => prev.map(c => 
          c.id === selectedCandidate.id ? { ...c, status: nextStatus } : c
        ));
        alert('Application moved to Waiting (In Review).');
      }
      
      // Force a full refetch to ensure sync
      setTimeout(() => {
        fetchCandidates();
      }, 500);
    } catch (e) {
      console.error('Status update failed:', e);
      alert(e.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const filteredCandidates = selectedDepartment === 'All' 
    ? candidates 
    : candidates.filter(candidate => candidate.department === selectedDepartment);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading candidates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-red-500">
          <p>Error loading candidates: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
       <div className="h-full overflow-y-auto">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">All Candidates</h2>
            <div className="flex space-x-2">
              {departments.map(dept => (
                <button
                  key={dept}
                  onClick={() => setSelectedDepartment(dept)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    selectedDepartment === dept
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {dept.charAt(0).toUpperCase() + dept.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {filteredCandidates.length > 0 ? (
            filteredCandidates.map((candidate, index) => (
              <div key={candidate.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-lg font-semibold text-blue-600">{index + 1}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {candidate.first_name} {candidate.last_name}
                        </h3>
                        <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                          {candidate.department}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{candidate.position}</p>
                      <p className="text-sm text-gray-500">{candidate.email}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="text-sm text-gray-600">{candidate.experience}</span>
                        <span className="text-sm text-gray-600">{candidate.publications} publications</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex space-x-2">
                    <button
                      onClick={() => handleViewDetails(candidate)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      View Details
                    </button>
                    {assignments[candidate.id] ? (
                      <button
                        onClick={() => {
                          const assignedFaculty = facultyMembers
                            .filter(f => assignments[candidate.id].includes(f.id))
                            .map(f => f.name)
                            .join(', ');
                          alert(`This candidate is assigned to: ${assignedFaculty}`);
                        }}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Assigned
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setCandidateToAssign(candidate);
                          setShowAssignModal(true);
                          setSelectedFaculty([]);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Assign Faculty
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-gray-500">
              No candidates found for the selected department.
            </div>
          )}
        </div>
      </div>

      {showAssignModal && candidateToAssign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Assign Faculty</h3>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setCandidateToAssign(null);
                  setSelectedFaculty([]);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Assigning faculty to review: <span className="font-semibold">{candidateToAssign.first_name} {candidateToAssign.last_name}</span>
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-sm font-medium text-gray-700">Select Faculty Members:</p>
              {facultyMembers.map((faculty) => (
                <label
                  key={faculty.id}
                  className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedFaculty.includes(faculty.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedFaculty([...selectedFaculty, faculty.id]);
                      } else {
                        setSelectedFaculty(selectedFaculty.filter(id => id !== faculty.id));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{faculty.name}</p>
                    <p className="text-xs text-gray-500">{faculty.email}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  if (selectedFaculty.length > 0) {
                    const selectedNames = facultyMembers
                      .filter(f => selectedFaculty.includes(f.id))
                      .map(f => f.name)
                      .join(', ');
                    
                    // Save assignment
                    const newAssignments = {
                      ...assignments,
                      [candidateToAssign.id]: selectedFaculty
                    };
                    setAssignments(newAssignments);
                    
                    // Persist to localStorage
                    localStorage.setItem('facultyAssignments', JSON.stringify(newAssignments));
                    
                    alert(`Assigned ${candidateToAssign.first_name} ${candidateToAssign.last_name} to: ${selectedNames}`);
                    setShowAssignModal(false);
                    setCandidateToAssign(null);
                    setSelectedFaculty([]);
                  } else {
                    alert('Please select at least one faculty member');
                  }
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                Assign Selected
              </button>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setCandidateToAssign(null);
                  setSelectedFaculty([]);
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedCandidate.first_name} {selectedCandidate.middle_name && `${selectedCandidate.middle_name} `}{selectedCandidate.last_name}
                </h2>
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-sm text-gray-600">{selectedCandidate.position}</p>
                  <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                    {selectedCandidate.department}
                  </span>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {selectedCandidate.loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading candidate details...</p>
                  </div>
                </div>
              ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                {/* Left Side - Detailed Information */}
                <div className="space-y-4">
                  {/* Basic Info */}
                  <div className="bg-white border rounded-lg p-4 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-3 border-b pb-2">Basic Information</h3>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase">Email</p>
                          <p className="text-sm text-gray-900">{selectedCandidate.email}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase">Phone</p>
                          <p className="text-sm text-gray-900">{selectedCandidate.phone}</p>
                        </div>
                      </div>
                      {selectedCandidate.address && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase">Address</p>
                          <p className="text-sm text-gray-900">{selectedCandidate.address}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-3 gap-4">
                        {selectedCandidate.gender && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Gender</p>
                            <p className="text-sm text-gray-900">{selectedCandidate.gender}</p>
                          </div>
                        )}
                        {selectedCandidate.date_of_birth && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Date of Birth</p>
                            <p className="text-sm text-gray-900">{new Date(selectedCandidate.date_of_birth).toLocaleDateString()}</p>
                          </div>
                        )}
                        {selectedCandidate.nationality && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Nationality</p>
                            <p className="text-sm text-gray-900">{selectedCandidate.nationality}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Education */}
                  <div className="bg-white border rounded-lg p-4 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-3 border-b pb-2">Education</h3>
                    <div className="bg-indigo-50 rounded p-3">
                      <p className="text-xs font-semibold text-indigo-600 uppercase">Highest Qualification</p>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedCandidate.highest_degree || 'Not specified'}
                      </p>
                      {selectedCandidate.university && (
                        <p className="text-xs text-gray-600">{selectedCandidate.university}</p>
                      )}
                      {selectedCandidate.graduation_year && (
                        <p className="text-xs text-gray-600">Graduated: {selectedCandidate.graduation_year}</p>
                      )}
                    </div>
                  </div>

                  {/* Experience */}
                  <div className="bg-white border rounded-lg p-4 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-3 border-b pb-2">Experience</h3>
                    <div className="bg-green-50 rounded p-3 mb-3">
                      <p className="text-xs font-semibold text-green-600 uppercase">Total Experience</p>
                      <p className="text-lg font-bold text-gray-900">{selectedCandidate.experience}</p>
                    </div>

                    {/* Teaching Experience */}
                    {selectedCandidate.teachingExperiences && selectedCandidate.teachingExperiences.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-bold text-gray-700 uppercase mb-2">Teaching Experience</p>
                        {selectedCandidate.teachingExperiences.slice(0, 2).map((exp, index) => (
                          <div key={index} className="border-l-4 border-blue-500 pl-3 mb-2">
                            <p className="text-sm font-medium text-gray-900">
                              {exp.position || exp.teachingPost || 'Position not specified'}
                            </p>
                            <p className="text-xs text-gray-600">
                              {exp.institution || exp.teachingInstitution || 'Institution not specified'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {exp.start_date || exp.teachingStartDate || 'N/A'} - {exp.end_date || exp.teachingEndDate || 'Present'}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Research Experience */}
                    {selectedCandidate.researchExperiences && selectedCandidate.researchExperiences.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-gray-700 uppercase mb-2">Research Experience</p>
                        {selectedCandidate.researchExperiences.slice(0, 2).map((exp, index) => (
                          <div key={index} className="border-l-4 border-green-500 pl-3 mb-2">
                            <p className="text-sm font-medium text-gray-900">
                              {exp.position || exp.researchPost || 'Position not specified'}
                            </p>
                            <p className="text-xs text-gray-600">
                              {exp.institution || exp.researchInstitution || 'Institution not specified'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {exp.start_date || exp.researchStartDate || 'N/A'} - {exp.end_date || exp.researchEndDate || 'Present'}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Research IDs */}
                  <div className="bg-white border rounded-lg p-4 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-3 border-b pb-2">Research Identifiers</h3>
                    <div className="space-y-2">
                      {selectedCandidate.scopus_id && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase">Scopus ID</p>
                          <p className="text-sm text-gray-900">{selectedCandidate.scopus_id}</p>
                        </div>
                      )}
                      {selectedCandidate.google_scholar_id && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase">Google Scholar Link</p>
                          <a href={selectedCandidate.google_scholar_id} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">{selectedCandidate.google_scholar_id}</a>
                        </div>
                      )}
                      {selectedCandidate.orchid_id && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase">ORCID</p>
                          <p className="text-sm text-gray-900">{selectedCandidate.orchid_id}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side - Visual Analytics */}
                <div className="space-y-4">
                  {/* Research Metrics Overview */}
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-100 border-2 border-indigo-200 rounded-lg p-4 shadow-lg">
                    <h3 className="text-lg font-bold text-gray-900 mb-3 text-center">Research Metrics</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white rounded-lg p-3 text-center shadow">
                        <p className="text-xs font-semibold text-purple-600 uppercase mb-1">Scopus</p>
                        <p className="text-3xl font-bold text-purple-700">{selectedCandidate.scopus_general_papers ?? 0}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center shadow">
                        <p className="text-xs font-semibold text-blue-600 uppercase mb-1">Conference</p>
                        <p className="text-3xl font-bold text-blue-700">{selectedCandidate.conference_papers ?? 0}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center shadow">
                        <p className="text-xs font-semibold text-green-600 uppercase mb-1">Books</p>
                        <p className="text-3xl font-bold text-green-700">{selectedCandidate.edited_books ?? 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* Publications Distribution Pie Chart */}
                  <div className="bg-white border rounded-lg p-4 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 mb-2">Publications Distribution</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Scopus Papers', value: selectedCandidate.scopus_general_papers || 0, color: '#8b5cf6' },
                            { name: 'Conference Papers', value: selectedCandidate.conference_papers || 0, color: '#3b82f6' },
                            { name: 'Edited Books', value: selectedCandidate.edited_books || 0, color: '#10b981' }
                          ].filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={70}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {[
                            { name: 'Scopus Papers', value: selectedCandidate.scopus_general_papers || 0, color: '#8b5cf6' },
                            { name: 'Conference Papers', value: selectedCandidate.conference_papers || 0, color: '#3b82f6' },
                            { name: 'Edited Books', value: selectedCandidate.edited_books || 0, color: '#10b981' }
                          ].filter(item => item.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Publications Bar Chart */}
                  <div className="bg-white border rounded-lg p-4 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 mb-2">Research Output</h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart
                        data={[
                          { name: 'Scopus', count: selectedCandidate.scopus_general_papers || 0, fill: '#8b5cf6' },
                          { name: 'Conference', count: selectedCandidate.conference_papers || 0, fill: '#3b82f6' },
                          { name: 'Books', count: selectedCandidate.edited_books || 0, fill: '#10b981' }
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                          {[
                            { name: 'Scopus', count: selectedCandidate.scopus_general_papers || 0, fill: '#8b5cf6' },
                            { name: 'Conference', count: selectedCandidate.conference_papers || 0, fill: '#3b82f6' },
                            { name: 'Books', count: selectedCandidate.edited_books || 0, fill: '#10b981' }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Documents */}
                  <div className="bg-white border rounded-lg p-4 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 mb-3">Documents</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs font-semibold text-gray-600">CV</p>
                        {selectedCandidate.cv_path ? (
                          <a
                            href={`${supabase.storage.from('application-reports').getPublicUrl(selectedCandidate.cv_path).data.publicUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Download
                          </a>
                        ) : (
                          <p className="text-xs text-gray-400">Not provided</p>
                        )}
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs font-semibold text-gray-600">Cover Letter</p>
                        {selectedCandidate.cover_letter_path ? (
                          <a
                            href={`${supabase.storage.from('application-reports').getPublicUrl(selectedCandidate.cover_letter_path).data.publicUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Download
                          </a>
                        ) : (
                          <p className="text-xs text-gray-400">Not provided</p>
                        )}
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs font-semibold text-gray-600">Teaching Statement</p>
                        {selectedCandidate.teaching_statement_path ? (
                          <a
                            href={`${supabase.storage.from('application-reports').getPublicUrl(selectedCandidate.teaching_statement_path).data.publicUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Download
                          </a>
                        ) : (
                          <p className="text-xs text-gray-400">Not provided</p>
                        )}
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs font-semibold text-gray-600">Research Statement</p>
                        {selectedCandidate.research_statement_path ? (
                          <a
                            href={`${supabase.storage.from('application-reports').getPublicUrl(selectedCandidate.research_statement_path).data.publicUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Download
                          </a>
                        ) : (
                          <p className="text-xs text-gray-400">Not provided</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Update Section */}
                  <div className="bg-white border rounded-lg p-4 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 mb-3">Application Status</h3>
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        selectedCandidate.status === 'shortlisted' ? 'bg-green-100 text-green-700' :
                        selectedCandidate.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {selectedCandidate.status === 'in_review' ? 'in_review' : selectedCandidate.status || 'in_review'}
                      </span>
                      <button
                        onClick={() => updateApplicationStatus('shortlisted')}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                        disabled={updatingStatus}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => updateApplicationStatus('rejected')}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                        disabled={updatingStatus}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
              <button
                onClick={closeModal}
                className="px-5 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AllCandidates;
