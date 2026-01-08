import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase-client';
import { candidatesApi } from '../lib/api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const COMMITTEES = [
  { code: 'soet', name: 'SOET Committee' },
  { code: 'sol', name: 'SOL Committee' },
  { code: 'som', name: 'SOM Committee' },
  { code: 'sols', name: 'SOLS Committee' }
];

const PIPELINE_STAGES = [
  { key: 'new', label: 'New Applications' },
  { key: 'cv_assigned', label: 'CV Review' },
  { key: 'cv_shortlisted', label: 'CV Shortlisted' },
  { key: 'interview_assigned', label: 'Interview Assigned' },
  { key: 'interview_completed', label: 'Interview Completed' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' }
];

const AllCandidates = () => {
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedStage, setSelectedStage] = useState('new');
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState({});
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [evaluationData, setEvaluationData] = useState(null);
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [candidateToAssign, setCandidateToAssign] = useState(null);
  const [assignType, setAssignType] = useState('cv');
  const [selectedCommittee, setSelectedCommittee] = useState('');

  const departments = ['All', 'law', 'liberal', 'engineering', 'management'];
  const branchLabels = {
    cse: 'Computer Science & Engineering',
    mech: 'Mechanical Engineering',
    ece: 'Electronics and Communication Engineering',
    criminal: 'Criminal Law',
    corporate: 'Corporate Law',
    civil: 'Civil Law',
    finance: 'Finance',
    marketing: 'Marketing',
    hr: 'Human Resources',
    english: 'English',
    history: 'History',
    sociology: 'Sociology'
  };

  const toTitleCase = (value) => {
    if (!value || typeof value !== 'string') return value || '';
    return value
      .split(/\s+/)
      .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
      .join(' ');
  };

  const formatCandidateName = (candidate) => {
    if (!candidate) return '';
    const title = candidate.title ? `${toTitleCase(candidate.title)} ` : '';
    const middle = candidate.middle_name ? `${toTitleCase(candidate.middle_name)} ` : '';
    return `${title}${toTitleCase(candidate.first_name)} ${middle}${toTitleCase(candidate.last_name)}`.trim();
  };

  const matchesStage = (candidate, stage) => {
    const rawStatus = (candidate.status || '').toString().trim().toLowerCase();
    const normalizedStatus = rawStatus === '' || rawStatus === 'pending' || rawStatus === 'new' || rawStatus === 'in_review'
      ? 'submitted'
      : rawStatus === 'shortlisted'
      ? 'final_shortlisted'
      : rawStatus === 'rejected'
      ? 'final_rejected'
      : rawStatus;
    switch (stage) {
      case 'new':
        return normalizedStatus === 'submitted';
      case 'cv_assigned':
        return normalizedStatus === 'cv_assigned';
      case 'cv_shortlisted':
        return normalizedStatus === 'cv_shortlisted';
      case 'interview_assigned':
        return normalizedStatus === 'interview_assigned';
      case 'interview_completed':
        return normalizedStatus === 'interview_completed' || normalizedStatus === 'final_shortlisted' || normalizedStatus === 'final_rejected';
      case 'rejected':
        return normalizedStatus === 'cv_rejected' || normalizedStatus === 'final_rejected';
      case 'all':
      default:
        return true;
    }
  };

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
      
      // Keep all active candidates (exclude deleted only)
      const filteredData = (data || []).filter(candidate => 
        candidate.status !== 'deleted' &&
        candidate.status !== 'Deleted'
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
        experience: fullData.total_experience || 'N/A',
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
    setEvaluationData(null);
    setEvaluationLoading(false);
  };

  const loadEvaluation = async (applicationId) => {
    if (!applicationId) return;
    try {
      setEvaluationLoading(true);
      const { data, error: evalErr } = await supabase
        .from('faculty_evaluations')
        .select('*')
        .eq('application_id', applicationId)
        .order('evaluated_at', { ascending: false })
        .limit(1)
        .single();
      if (evalErr) throw evalErr;
      setEvaluationData(data);
    } catch (err) {
      console.error('Error loading evaluation:', err);
      alert('No evaluation found yet.');
      setEvaluationData(null);
    } finally {
      setEvaluationLoading(false);
    }
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

  // Update application status: final decision (shortlisted or rejected)
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
      alert(`Application marked as ${nextStatus}.`);
      fetchCandidates();
    } catch (e) {
      console.error('Status update failed:', e);
      alert(e.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const departmentFiltered = selectedDepartment === 'All' 
    ? candidates 
    : candidates.filter(candidate => candidate.department === selectedDepartment);
  const filteredCandidates = departmentFiltered.filter(candidate => matchesStage(candidate, selectedStage));

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
            <div className="flex flex-wrap gap-2">
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
          <div className="mt-4 flex flex-wrap gap-2">
            {PIPELINE_STAGES.map((stage) => (
              <button
                key={stage.key}
                onClick={() => setSelectedStage(stage.key)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedStage === stage.key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {stage.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {filteredCandidates.length > 0 ? (
            filteredCandidates.map((candidate, index) => (
              <div key={candidate.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-base font-semibold text-blue-600">#{index + 1}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="mb-1">
                        <h3 className="text-base font-semibold text-gray-900">
                          {formatCandidateName(candidate)}
                        </h3>
                        <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                          {toTitleCase(candidate.department)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        {branchLabels[(candidate.branch || candidate.department || '').toLowerCase()]
                          || toTitleCase(candidate.branch || candidate.department || '')}
                      </p>
                      <p className="text-sm text-gray-500">{candidate.email}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-sm text-gray-600">{candidate.experience}</span>
                        <span className="text-sm text-gray-600">{toTitleCase(candidate.position)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex space-x-2">
                    <button
                      onClick={() => handleViewDetails(candidate)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                    >
                      View Details
                    </button>
                    {(candidate.status || 'submitted') === 'submitted' && (
                      <button
                        onClick={() => {
                          setCandidateToAssign(candidate);
                          setAssignType('cv');
                          setShowAssignModal(true);
                          setSelectedCommittee(candidate.assigned_committee_code || '');
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                      >
                        Assign Committee
                      </button>
                    )}
                    {(candidate.status || 'submitted') === 'cv_shortlisted' && (
                      <button
                        onClick={() => {
                          setCandidateToAssign(candidate);
                          setAssignType('interview');
                          setShowAssignModal(true);
                          setSelectedCommittee(candidate.assigned_committee_code || '');
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                      >
                        Assign Interview
                      </button>
                    )}
                    {['cv_assigned', 'interview_assigned'].includes(candidate.status) && (
                      <button
                        disabled
                        className="bg-gray-400 text-white px-4 py-2 rounded-lg cursor-not-allowed text-sm"
                      >
                        Assigned
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
              <h3 className="text-xl font-bold text-gray-900">
                {assignType === 'interview' ? 'Assign Interview Committee' : 'Assign Committee for CV Review'}
              </h3>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setCandidateToAssign(null);
                  setSelectedCommittee('');
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
                Assigning committee for: <span className="font-semibold">{formatCandidateName(candidateToAssign)}</span>
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-sm font-medium text-gray-700">Select Committee:</p>
              <select
                value={selectedCommittee}
                onChange={(e) => setSelectedCommittee(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose committee</option>
                {COMMITTEES.map((committee) => (
                  <option key={committee.code} value={committee.code}>
                    {committee.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={async () => {
                  if (selectedCommittee) {
                    const selectedCommitteeName = COMMITTEES.find(c => c.code === selectedCommittee)?.name;
                    const nextStatus = assignType === 'interview' ? 'interview_assigned' : 'cv_assigned';
                    
                    try {
                      // Save assignment to Supabase database
                      const { error } = await supabase
                        .from('faculty_applications')
                        .update({ 
                          assigned_committee_code: selectedCommittee,
                          status: nextStatus
                        })
                        .eq('id', candidateToAssign.id);
                      
                      if (error) throw error;
                      
                      alert(`Assigned ${formatCandidateName(candidateToAssign)} to: ${selectedCommitteeName || selectedCommittee}`);
                      setShowAssignModal(false);
                      setCandidateToAssign(null);
                      setSelectedCommittee('');
                      
                      // Refresh candidates list
                      fetchCandidates();
                    } catch (error) {
                      console.error('Error assigning committee:', error);
                      alert('Failed to assign committee. Please try again.');
                    }
                  } else {
                    alert('Please select a committee');
                  }
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                Assign
              </button>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setCandidateToAssign(null);
                  setSelectedCommittee('');
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
                  {formatCandidateName(selectedCandidate)}
                </h2>
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-sm text-gray-600">{toTitleCase(selectedCandidate.position)}</p>
                  <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                    {toTitleCase(selectedCandidate.department)}
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
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Email</p>
                        <p className="text-sm text-gray-900">{selectedCandidate.email}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Phone</p>
                        <p className="text-sm text-gray-900">{selectedCandidate.phone}</p>
                      </div>
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
                      {selectedCandidate.address && (
                        <div className="col-span-2">
                          <p className="text-xs font-semibold text-gray-500 uppercase">Address</p>
                          <p className="text-sm text-gray-900">{selectedCandidate.address}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Education */}
                  <div className="bg-white border rounded-lg p-4 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-3 border-b pb-2">Education</h3>
                    <div className="space-y-4">
                      {/* PhD */}
                      {selectedCandidate.phd_status && selectedCandidate.phd_status !== 'Not done' && (
                        <div className="border-l-4 border-indigo-500 pl-4">
                          <p className="text-xs font-semibold text-indigo-600 uppercase">PhD</p>
                          <p className="text-sm font-medium text-gray-900">{selectedCandidate.phd_institute || selectedCandidate.institution || 'N/A'}</p>
                          <p className="text-xs text-gray-600">
                            {selectedCandidate.phd_degree_name || 'N/A'} | Year: {selectedCandidate.phd_year || 'N/A'}
                          </p>
                          {selectedCandidate.phd_specialization && (
                            <p className="text-xs text-gray-600 mt-1">Specialization: {selectedCandidate.phd_specialization}</p>
                          )}
                          {(selectedCandidate.phd_cgpa || selectedCandidate.phd_percentage) && (
                            <p className="text-xs text-gray-600 mt-1">
                              {selectedCandidate.phd_cgpa && `CGPA: ${selectedCandidate.phd_cgpa}${selectedCandidate.phd_cgpa_scale ? ` (Out of ${selectedCandidate.phd_cgpa_scale})` : ''}`}
                              {selectedCandidate.phd_percentage && `${selectedCandidate.phd_cgpa ? ' | ' : ''}Percentage: ${selectedCandidate.phd_percentage}%`}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Master's */}
                      {selectedCandidate.master_institute && (
                        <div className="border-l-4 border-blue-500 pl-4">
                          <p className="text-xs font-semibold text-blue-600 uppercase">Master's Degree</p>
                          <p className="text-sm font-medium text-gray-900">{selectedCandidate.master_institute}</p>
                          <p className="text-xs text-gray-600">
                            {selectedCandidate.master_degree_name || 'N/A'} | Year: {selectedCandidate.master_year || 'N/A'}
                          </p>
                          {(selectedCandidate.master_cgpa || selectedCandidate.master_percentage) && (
                            <p className="text-xs text-gray-600 mt-1">
                              {selectedCandidate.master_cgpa && `CGPA: ${selectedCandidate.master_cgpa}${selectedCandidate.master_cgpa_scale ? ` (Out of ${selectedCandidate.master_cgpa_scale})` : ''}`}
                              {selectedCandidate.master_percentage && `${selectedCandidate.master_cgpa ? ' | ' : ''}Percentage: ${selectedCandidate.master_percentage}%`}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Bachelor's */}
                      {selectedCandidate.bachelor_institute && (
                        <div className="border-l-4 border-green-500 pl-4">
                          <p className="text-xs font-semibold text-green-600 uppercase">Bachelor's Degree</p>
                          <p className="text-sm font-medium text-gray-900">{selectedCandidate.bachelor_institute}</p>
                          <p className="text-xs text-gray-600">
                            {selectedCandidate.bachelor_degree_name || 'N/A'} | Year: {selectedCandidate.bachelor_year || 'N/A'}
                          </p>
                          {(selectedCandidate.bachelor_cgpa || selectedCandidate.bachelor_percentage) && (
                            <p className="text-xs text-gray-600 mt-1">
                              {selectedCandidate.bachelor_cgpa && `CGPA: ${selectedCandidate.bachelor_cgpa}${selectedCandidate.bachelor_cgpa_scale ? ` (Out of ${selectedCandidate.bachelor_cgpa_scale})` : ''}`}
                              {selectedCandidate.bachelor_percentage && `${selectedCandidate.bachelor_cgpa ? ' | ' : ''}Percentage: ${selectedCandidate.bachelor_percentage}%`}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Highest Qualification Summary */}
                      <div className="bg-gray-50 rounded p-3 mt-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Highest Qualification</p>
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
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        selectedCandidate.status === 'final_shortlisted' ? 'bg-green-100 text-green-700' :
                        selectedCandidate.status === 'final_rejected' || selectedCandidate.status === 'cv_rejected' ? 'bg-red-100 text-red-700' :
                        selectedCandidate.status === 'interview_completed' ? 'bg-blue-100 text-blue-700' :
                        selectedCandidate.status === 'cv_shortlisted' ? 'bg-emerald-100 text-emerald-700' :
                        selectedCandidate.status === 'interview_assigned' || selectedCandidate.status === 'cv_assigned' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {selectedCandidate.status === 'final_shortlisted' ? 'Final Shortlisted' :
                         selectedCandidate.status === 'final_rejected' ? 'Final Rejected' :
                         selectedCandidate.status === 'cv_rejected' ? 'CV Rejected' :
                         selectedCandidate.status === 'interview_completed' ? 'Interview Completed' :
                         selectedCandidate.status === 'cv_shortlisted' ? 'CV Shortlisted' :
                         selectedCandidate.status === 'interview_assigned' ? 'Interview Assigned' :
                         selectedCandidate.status === 'cv_assigned' ? 'CV Assigned' :
                         'Submitted'}
                      </span>
                      {selectedCandidate.status === 'interview_completed' && (
                        <>
                          <button
                            onClick={() => updateApplicationStatus('final_shortlisted')}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                            disabled={updatingStatus}
                          >
                            Final Shortlist
                          </button>
                          <button
                            onClick={() => updateApplicationStatus('final_rejected')}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                            disabled={updatingStatus}
                          >
                            Final Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {(selectedCandidate.status === 'interview_completed' || selectedCandidate.status === 'final_shortlisted') && (
                    <div className="bg-white border rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-gray-900">Interview Evaluation</h3>
                        <button
                          onClick={() => loadEvaluation(selectedCandidate.id)}
                          disabled={evaluationLoading}
                          className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
                        >
                          {evaluationLoading ? 'Loading...' : 'Load Evaluation'}
                        </button>
                      </div>
                      {evaluationData ? (
                        <div className="space-y-2 text-sm text-gray-700">
                          <p><span className="font-semibold">Faculty:</span> {evaluationData.faculty_name || 'N/A'}</p>
                          <p><span className="font-semibold">Teaching:</span> {evaluationData.teaching_competence}/10</p>
                          <p><span className="font-semibold">Research:</span> {evaluationData.research_potential}/10</p>
                          <p><span className="font-semibold">Industry:</span> {evaluationData.industry_experience}/10</p>
                          <p><span className="font-semibold">Communication:</span> {evaluationData.communication_skills}/10</p>
                          <p><span className="font-semibold">Subject Knowledge:</span> {evaluationData.subject_knowledge}/10</p>
                          <p><span className="font-semibold">Overall:</span> {evaluationData.overall_suitability}/10</p>
                          {evaluationData.remarks && (
                            <div>
                              <p className="font-semibold">Remarks</p>
                              <p className="text-xs text-gray-600 whitespace-pre-wrap">{evaluationData.remarks}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">No evaluation loaded.</p>
                      )}
                    </div>
                  )}
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
