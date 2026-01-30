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
  { key: 'accepted', label: 'Accepted' },
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
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    position: 'all',
    minExperienceMonths: '',
    minScopus: '',
    minConference: '',
    minBooks: '',
    qualification: 'all',
    institute: '',
    hasCv: false,
    hasTeachingStmt: false,
    hasResearchStmt: false,
    hasScopusId: false,
    hasScholar: false,
    hasOrcid: false,
  });
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [candidateToAssign, setCandidateToAssign] = useState(null);
  const [assignType, setAssignType] = useState('cv');
  const [selectedCommittee, setSelectedCommittee] = useState('');
  // Status pill meta for consistent styling
  const getStatusMeta = (status) => {
    const map = {
      final_shortlisted: { label: 'Final Shortlisted', color: 'bg-green-100 text-green-700', dot: 'bg-green-600' },
      final_rejected: { label: 'Final Rejected', color: 'bg-red-100 text-red-700', dot: 'bg-red-600' },
      cv_rejected: { label: 'CV Rejected', color: 'bg-red-100 text-red-700', dot: 'bg-red-600' },
      interview_completed: { label: 'Interview Completed', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-600' },
      cv_shortlisted: { label: 'CV Shortlisted', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-600' },
      interview_assigned: { label: 'Interview Assigned', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
      cv_assigned: { label: 'CV Assigned', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
      submitted: { label: 'Submitted', color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-500' },
    };
    return map[status] || map.submitted;
  };

  const handleShowEvaluation = async () => {
    if (!selectedCandidate?.id) return;
    await loadEvaluation(selectedCandidate.id);
    setShowEvaluationModal(true);
  };

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

  const normalizeCandidateStatus = (status) => {
    const normalized = (status || '').toString().trim().toLowerCase();
    if (!normalized || normalized === 'pending' || normalized === 'new' || normalized === 'in_review') {
      return 'submitted';
    }
    if (normalized === 'shortlisted') return 'final_shortlisted';
    if (normalized === 'rejected') return 'final_rejected';
    return normalized;
  };

  const normalizeDegreeRank = (deg) => {
    if (!deg) return 0;
    const d = deg.toLowerCase();
    if (d.includes('phd') || d.includes('doctor')) return 3;
    if (d.includes('master')) return 2;
    if (d.includes('bachelor') || d.includes('b.tech')) return 1;
    return 0;
  };

  const getAdditionalEducation = (candidate) => {
    if (!candidate) return null;
    const degrees = [
      {
        rank: 3,
        degree: candidate.phd_degree_name || candidate.phdDegreeName || candidate.phdDegree || candidate.highest_degree,
        institute: candidate.phd_institute || candidate.phdInstitute,
        year: candidate.phd_year || candidate.phdYear,
      },
      {
        rank: 2,
        degree: candidate.master_degree_name || candidate.masterDegreeName || candidate.masterDegree,
        institute: candidate.master_institute || candidate.masterInstitute,
        year: candidate.master_year || candidate.masterYear,
      },
      {
        rank: 1,
        degree: candidate.bachelor_degree_name || candidate.bachelorDegreeName || candidate.bachelorDegree,
        institute: candidate.bachelor_institute || candidate.bachelorInstitute,
        year: candidate.bachelor_year || candidate.bachelorYear,
      },
    ].filter((d) => d.degree || d.institute || d.year);

    if (degrees.length === 0) return null;
    const sorted = degrees.sort((a, b) => b.rank - a.rank || normalizeDegreeRank(b.degree) - normalizeDegreeRank(a.degree));
    const highest = sorted[0];
    const next = sorted.find((d) => d.rank < highest.rank);
    return next || null;
  };

  const computeExperienceFromArrays = (teaching = [], research = []) => {
    const parseDate = (v) => (v ? new Date(v) : null);
    const monthsBetween = (start, end) => {
      if (!start || !end) return 0;
      const s = parseDate(start);
      const e = parseDate(end);
      if (!s || !e || isNaN(s) || isNaN(e)) return 0;
      let months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
      if (e.getDate() < s.getDate()) months -= 1;
      return Math.max(0, months);
    };

    const teachingMonths = teaching.reduce(
      (sum, exp) => sum + monthsBetween(exp.start_date || exp.teachingStartDate, exp.end_date || exp.teachingEndDate || new Date()),
      0
    );
    const researchMonths = research.reduce(
      (sum, exp) => sum + monthsBetween(exp.start_date || exp.researchStartDate, exp.end_date || exp.researchEndDate || new Date()),
      0
    );

    const totalMonths = teachingMonths + researchMonths;
    if (totalMonths <= 0) return 'N/A';
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    const parts = [];
    if (years > 0) parts.push(`${years} year${years !== 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} month${months !== 1 ? 's' : ''}`);
    return parts.join(' ') || '0 months';
  };

  const formatCandidateName = (candidate) => {
    if (!candidate) return '';
    const title = candidate.title ? `${toTitleCase(candidate.title)} ` : '';
    const middle = candidate.middle_name ? `${toTitleCase(candidate.middle_name)} ` : '';
    return `${title}${toTitleCase(candidate.first_name)} ${middle}${toTitleCase(candidate.last_name)}`.trim();
  };

  const extractEvaluationComments = (remarks) => {
    if (!remarks || typeof remarks !== 'string') return '';
    const marker = 'Comments:';
    const idx = remarks.indexOf(marker);
    if (idx === -1) return '';
    return remarks.slice(idx + marker.length).trim();
  };

  const parseEvaluationAverages = (remarks) => {
    if (!remarks || typeof remarks !== 'string') {
      return { teaching: null, research: null, general: null, total: null };
    }
    const avgMatch = (label) => {
      const re = new RegExp(`Average \\(${label}\\):\\s*([0-9]+(?:\\.[0-9]+)?)`, 'i');
      const match = remarks.match(re);
      return match ? Number(match[1]) : null;
    };
    const totalMatch = remarks.match(/Total Score \\(I \\+ II \\+ III\\):\\s*([0-9]+(?:\\.[0-9]+)?)/i);
    return {
      teaching: avgMatch('I'),
      research: avgMatch('II'),
      general: avgMatch('III'),
      total: totalMatch ? Number(totalMatch[1]) : null
    };
  };

  const matchesStage = (candidate, stage) => {
    const normalizedStatus = normalizeCandidateStatus(candidate.status);
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
        return normalizedStatus === 'interview_completed';
      case 'accepted':
        return normalizedStatus === 'final_shortlisted';
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
      
      const normalized = filteredData.map(candidate => ({
        ...candidate,
        status: normalizeCandidateStatus(candidate.status)
      }));
      setCandidates(normalized);
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
      const fullData = await candidatesApi.getById(candidate.id, { fresh: true });
      console.log('Full candidate data fetched:', fullData);
      
      // Flatten researchInfo fields to top level
      const candidateStatus = normalizeCandidateStatus(candidate.status);
      const fullStatus = normalizeCandidateStatus(fullData.status);
      const finalStatusSet = new Set(['final_shortlisted', 'final_rejected', 'cv_rejected']);
      const normalizedCandidateStatus = candidateStatus.toLowerCase();
      const normalizedFullStatus = fullStatus.toLowerCase();
      const resolvedStatus = (() => {
        if (finalStatusSet.has(normalizedFullStatus) && !finalStatusSet.has(normalizedCandidateStatus)) {
          return fullStatus;
        }
        if (normalizedFullStatus === 'interview_completed' && normalizedCandidateStatus !== 'interview_completed') {
          return fullStatus;
        }
        if (!candidateStatus) {
          return fullStatus || candidateStatus;
        }
        return candidateStatus;
      })();

      const flattened = {
        ...candidate,
        ...fullData,
        status: resolvedStatus,
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
    setShowEvaluationModal(false);
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

  const passesAdvancedFilters = (candidate) => {
    const norm = (v) => (v === null || v === undefined ? 0 : Number(v) || 0);
    const expMonths = norm(candidate.total_experience_months || candidate.totalMonths || candidate.experienceMonths);
    const scopus = norm(candidate.scopus_general_papers);
    const conf = norm(candidate.conference_papers);
    const books = norm(candidate.edited_books);
    const qualification = (candidate.highest_degree || candidate.highestQualification || '').toLowerCase();
    const institute = (candidate.university || candidate.masterInstitute || candidate.phdInstitute || candidate.bachelorInstitute || '').toLowerCase();

    if (filters.position !== 'all' && (candidate.position || '').toLowerCase() !== filters.position) return false;
    if (filters.minExperienceMonths && expMonths < Number(filters.minExperienceMonths)) return false;
    if (filters.minScopus && scopus < Number(filters.minScopus)) return false;
    if (filters.minConference && conf < Number(filters.minConference)) return false;
    if (filters.minBooks && books < Number(filters.minBooks)) return false;
    if (filters.qualification !== 'all' && !qualification.includes(filters.qualification)) return false;
    if (filters.institute && !institute.includes(filters.institute.toLowerCase())) return false;
    if (filters.hasCv && !candidate.cv_path) return false;
    if (filters.hasTeachingStmt && !candidate.teaching_statement_path) return false;
    if (filters.hasResearchStmt && !candidate.research_statement_path) return false;
    if (filters.hasScopusId && !candidate.scopus_id) return false;
    if (filters.hasScholar && !candidate.google_scholar_id) return false;
    if (filters.hasOrcid && !candidate.orchid_id && !candidate.orcid_id) return false;
    return true;
  };

  const stageFiltered = departmentFiltered.filter(candidate => matchesStage(candidate, selectedStage));
  const filteredCandidates = stageFiltered.filter(passesAdvancedFilters);

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

  const additionalEducation = selectedCandidate ? getAdditionalEducation(selectedCandidate) : null;
  const teachingExperiences = selectedCandidate?.teachingExperiences || [];
  const researchExperiences = selectedCandidate?.researchExperiences || [];
  const derivedExperience = selectedCandidate?.experience || computeExperienceFromArrays(teachingExperiences, researchExperiences);

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
            <button
              type="button"
              onClick={() => setShowFilters((s) => !s)}
              className="ml-2 px-3 py-1.5 rounded-full text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              {showFilters ? 'Hide Filters' : 'Filters'}
            </button>
            <button
              type="button"
              onClick={() => setFilters({
                position: 'all',
                minExperienceMonths: '',
                minScopus: '',
                minConference: '',
                minBooks: '',
                qualification: 'all',
                institute: '',
                hasCv: false,
                hasTeachingStmt: false,
                hasResearchStmt: false,
                hasScopusId: false,
                hasScholar: false,
                hasOrcid: false,
              })}
              className="px-3 py-1.5 rounded-full text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Clear
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Position</label>
                <select
                  value={filters.position}
                  onChange={(e) => setFilters({ ...filters, position: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">All</option>
                  <option value="teaching">Teaching</option>
                  <option value="non-teaching">Non-teaching</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Min Experience (months)</label>
                <input
                  type="number"
                  value={filters.minExperienceMonths}
                  onChange={(e) => setFilters({ ...filters, minExperienceMonths: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  min="0"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Highest Qualification</label>
                <select
                  value={filters.qualification}
                  onChange={(e) => setFilters({ ...filters, qualification: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">Any</option>
                  <option value="phd">PhD</option>
                  <option value="master">Master</option>
                  <option value="bachelor">Bachelor</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Min Scopus Papers</label>
                <input
                  type="number"
                  value={filters.minScopus}
                  onChange={(e) => setFilters({ ...filters, minScopus: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  min="0"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Min Conference Papers</label>
                <input
                  type="number"
                  value={filters.minConference}
                  onChange={(e) => setFilters({ ...filters, minConference: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  min="0"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Min Edited Books</label>
                <input
                  type="number"
                  value={filters.minBooks}
                  onChange={(e) => setFilters({ ...filters, minBooks: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  min="0"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Institute contains</label>
                <input
                  type="text"
                  value={filters.institute}
                  onChange={(e) => setFilters({ ...filters, institute: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="e.g., IIT, NIT, IIM"
                />
              </div>
              <div className="flex flex-wrap gap-2 md:col-span-3">
                {[
                  { key: 'hasCv', label: 'Has CV' },
                  { key: 'hasTeachingStmt', label: 'Has Teaching Statement' },
                  { key: 'hasResearchStmt', label: 'Has Research Statement' },
                  { key: 'hasScopusId', label: 'Has Scopus ID' },
                  { key: 'hasScholar', label: 'Has Scholar Link' },
                  { key: 'hasOrcid', label: 'Has ORCID' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilters({ ...filters, [item.key]: !filters[item.key] })}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${
                      filters[item.key]
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="divide-y divide-gray-200">
          {filteredCandidates.length > 0 ? (
            filteredCandidates.map((candidate, index) => (
              <div key={candidate.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-base font-semibold text-blue-600">{index + 1}</span>
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
              {selectedCandidate.status && (
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusMeta(normalizeCandidateStatus(selectedCandidate.status)).color}`}
                >
                  <span
                    className={`w-2 h-2 rounded-full mr-1.5 ${getStatusMeta(normalizeCandidateStatus(selectedCandidate.status)).dot}`}
                  />
                  {getStatusMeta(normalizeCandidateStatus(selectedCandidate.status)).label}
                </span>
              )}
            </div>
          </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleShowEvaluation}
                disabled={evaluationLoading}
                className="px-3 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
              >
                {evaluationLoading ? 'Loading...' : 'Show Evaluation'}
              </button>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                      <div className="bg-indigo-50 rounded p-3">
                        <p className="text-xs font-semibold text-indigo-600 uppercase">Additional Qualification</p>
                        <p className="text-sm font-medium text-gray-900">
                          {additionalEducation?.degree || 'Not provided'}
                        </p>
                        {additionalEducation?.institute && (
                          <p className="text-xs text-gray-600">{additionalEducation.institute}</p>
                        )}
                        {additionalEducation?.year && (
                          <p className="text-xs text-gray-600">Graduated: {additionalEducation.year}</p>
                        )}
                        {!additionalEducation && (
                          <p className="text-xs text-gray-600">No additional education details available.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Experience */}
                  <div className="bg-white border rounded-lg p-4 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-3 border-b pb-2">Experience</h3>
                    <div className="bg-green-50 rounded p-3 mb-4">
                      <p className="text-xs font-semibold text-green-600 uppercase">Total Experience</p>
                      <p className="text-lg font-bold text-gray-900">{derivedExperience}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Teaching Experience */}
                      {teachingExperiences.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-gray-700 uppercase mb-2">Teaching Experience</p>
                          {teachingExperiences.slice(0, 2).map((exp, index) => (
                            <div key={index} className="border-l-4 border-blue-500 pl-3 mb-2">
                              <p className="text-sm font-medium text-gray-900">
                                {exp.post || exp.position || exp.teachingPost || 'Position not specified'}
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
                      {researchExperiences.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-gray-700 uppercase mb-2">Research Experience</p>
                          {researchExperiences.slice(0, 2).map((exp, index) => (
                            <div key={index} className="border-l-4 border-green-500 pl-3 mb-2">
                              <p className="text-sm font-medium text-gray-900">
                                {exp.post || exp.position || exp.researchPost || 'Position not specified'}
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

      {showEvaluationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-lg font-bold text-gray-900">Interview Evaluation</h3>
              <button onClick={() => setShowEvaluationModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {evaluationLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : evaluationData ? (
                <div className="space-y-3 text-sm text-gray-700">
                  {(() => {
                    const parsed = parseEvaluationAverages(evaluationData.remarks);
                    const teaching = parsed.teaching ?? (typeof evaluationData.teaching_competence === 'number' ? evaluationData.teaching_competence / 2 : null);
                    const research = parsed.research ?? (typeof evaluationData.research_potential === 'number' ? evaluationData.research_potential / 2 : null);
                    const general = parsed.general ?? (typeof evaluationData.industry_experience === 'number' ? evaluationData.industry_experience / 2 : null);
                    const total = parsed.total ?? (teaching !== null && research !== null && general !== null ? teaching + research + general : null);
                    const formatScore = (value) => (value === null ? 'N/A' : value.toFixed(2));
                    return (
                      <>
                        <p><span className="font-semibold">Evaluation Committee:</span> {evaluationData.faculty_name || 'N/A'}</p>
                        <p><span className="font-semibold">I. Teaching:</span> {formatScore(teaching)}/5</p>
                        <p><span className="font-semibold">II. Research:</span> {formatScore(research)}/5</p>
                        <p><span className="font-semibold">III. General: Culture Alignment:</span> {formatScore(general)}/5</p>
                        <p><span className="font-semibold">Combined Score:</span> {formatScore(total)}/15</p>
                        <div>
                          <p className="font-semibold">Remarks</p>
                          <p className="text-xs text-gray-600 whitespace-pre-wrap">
                            {extractEvaluationComments(evaluationData.remarks) || 'No additional comments.'}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <p className="text-sm text-gray-600">No evaluation loaded.</p>
              )}
            </div>
            <div className="px-4 py-3 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowEvaluationModal(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-100"
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
