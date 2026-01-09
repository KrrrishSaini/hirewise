import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { candidatesApi } from '../lib/api';
import { supabase } from '../../lib/supabase-client';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Committee Dashboard - Evaluation System
const FacultyDashboard = () => {
  const location = useLocation();
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [cvPreviewCandidate, setCvPreviewCandidate] = useState(null);
  const [cvPreviewLoading, setCvPreviewLoading] = useState(false);
  const [cvPreviewUrl, setCvPreviewUrl] = useState('');
  const [cvPreviewError, setCvPreviewError] = useState('');
  const [evaluationCandidate, setEvaluationCandidate] = useState(null);
  const [evaluationScores, setEvaluationScores] = useState({});
  const [evaluationErrors, setEvaluationErrors] = useState({});
  const [evaluationPhase, setEvaluationPhase] = useState(1);
  const [selectedStage, setSelectedStage] = useState('all');
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [candidateEvaluation, setCandidateEvaluation] = useState(null);
  const [candidateEvaluationLoading, setCandidateEvaluationLoading] = useState(false);
  const [archivedIds, setArchivedIds] = useState(() => {
    try {
      const raw = localStorage.getItem('facultyArchivedIds');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('Failed to read archived ids', e);
      return [];
    }
  });

  const toTitleCase = (value) => {
    if (!value || typeof value !== 'string') return value || '';
    return value
      .split(/\s+/)
      .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
      .join(' ');
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
    // Build a ranked list from stored fields (highest to lower)
    const degrees = [
      {
        rank: 3,
        degree: candidate.phdDegreeName || candidate.phdDegree || candidate.highest_degree,
        institute: candidate.phdInstitute,
        year: candidate.phdYear,
      },
      {
        rank: 2,
        degree: candidate.masterDegreeName || candidate.masterDegree,
        institute: candidate.masterInstitute,
        year: candidate.masterYear,
      },
      {
        rank: 1,
        degree: candidate.bachelorDegreeName || candidate.bachelorDegree,
        institute: candidate.bachelorInstitute,
        year: candidate.bachelorYear,
      },
    ].filter(d => d.degree || d.institute || d.year);

    if (degrees.length === 0) return null;

    // Sort by rank descending and pick the top (highest) and the next one
    const sorted = degrees.sort((a, b) => b.rank - a.rank);
    const highest = sorted[0];
    const next = sorted.find(d => d.rank < highest.rank);
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

  const TEACHING_CRITERIA = [
    { key: 't1', label: 'Clarity on the objective of the presentation', group: 'Knowledge of Subject Matter' },
    { key: 't2', label: 'Theoretical and conceptual knowledge', group: 'Knowledge of Subject Matter' },
    { key: 't3', label: 'Domain and Interdisciplinary Knowledge', group: 'Knowledge of Subject Matter' },
    { key: 't4', label: 'Communication and articulation', group: 'Class Handling' },
    { key: 't5', label: 'Interaction and engagement with the audience', group: 'Class Handling' },
    { key: 't6', label: 'Effective use of real life and practical examples', group: 'Class Handling' },
    { key: 't7', label: 'Structure, sequence, and time management of the talk', group: 'Class Handling' },
    { key: 't8', label: 'Ability to answer questions', group: 'Class Handling' },
    { key: 't9', label: 'Ability to motivate Students', group: 'Class Handling' },
    { key: 't10', label: 'Knowledge on blended and flip classroom teaching', group: 'Class Handling' },
    { key: 't11', label: 'Personality', group: 'Class Handling' },
    { key: 't12', label: 'Aptitude, attitude, commitment towards teaching & mentoring', group: 'Class Handling' },
    { key: 't13', label: 'Experiential Learning', group: 'Innovation in Teaching' },
    { key: 't14', label: 'Innovative pedagogy', group: 'Innovation in Teaching' },
    { key: 't15', label: 'Assessment methods', group: 'Innovation in Teaching' },
  ];

  const RESEARCH_CRITERIA = [
    { key: 'r1', label: 'Research motivation and objective', group: 'Seminar' },
    { key: 'r2', label: 'Adequacy and clarity of research plan', group: 'Seminar' },
    { key: 'r3', label: 'Robustness of methodology', group: 'Seminar' },
    { key: 'r4', label: 'Interpretation of research results', group: 'Seminar' },
    { key: 'r5', label: 'Research contributions (Analytical/Design/Experimental/Others)', group: 'Seminar' },
    { key: 'r6', label: 'Orientation towards applied research', group: 'Seminar' },
    { key: 'r7', label: 'Three years research plan for BMU', group: 'Research Potential' },
    { key: 'r8', label: 'Quality of research publications and / or Patents filed / awarded', group: 'Research Potential' },
    { key: 'r9', label: 'Research guidance', group: 'Research Potential' },
    { key: 'r10', label: 'Sponsored Research and Industrial Consultancy (In term of research income)', group: 'Research Potential' },
  ];

  const GENERAL_CRITERIA = [
    { key: 'g1', label: 'Alignment with BMU Vision, Mission & Values' },
    { key: 'g2', label: 'Enthusiasm and energy' },
    { key: 'g3', label: 'Motivation' },
    { key: 'g4', label: 'Honesty and integrity' },
    { key: 'g5', label: 'Overall fitment with the role' },
  ];

  const buildSectionScores = (criteria) =>
    criteria.reduce((acc, item) => {
      acc[item.key] = '';
      return acc;
    }, {});

  const buildSectionErrors = (criteria) =>
    criteria.reduce((acc, item) => {
      acc[item.key] = '';
      return acc;
    }, {});

  const buildInitialScores = () => ({
    teaching: buildSectionScores(TEACHING_CRITERIA),
    research: buildSectionScores(RESEARCH_CRITERIA),
    general: buildSectionScores(GENERAL_CRITERIA),
    remarks: '',
  });

  const buildInitialErrors = () => ({
    teaching: buildSectionErrors(TEACHING_CRITERIA),
    research: buildSectionErrors(RESEARCH_CRITERIA),
    general: buildSectionErrors(GENERAL_CRITERIA),
  });

  const validateScore = (value) => {
    if (value === '') return '';
    const num = Number(value);
    if (Number.isNaN(num)) return 'Enter a number between 1 and 5.';
    if (num < 1 || num > 5) return 'Score must be between 1 and 5.';
    return '';
  };

  const isValidScore = (value) => validateScore(value) === '';

  const getSectionAverage = (scores) => {
    if (!scores) return null;
    const values = Object.values(scores);
    if (!values.every((v) => v !== '' && isValidScore(v))) return null;
    const numeric = values.map((v) => Number(v));
    const total = numeric.reduce((sum, value) => sum + value, 0);
    return total / numeric.length;
  };

  const allScoresFilled = (scores) =>
    Object.values(scores).every((value) => value !== '' && value !== null && value !== undefined && isValidScore(value));

  const formatScoreLines = (criteria, scores) =>
    criteria.map((item, index) => `${index + 1}. ${item.label}: ${scores[item.key]}`);

  const buildEvaluationNotes = (scores, averages, total) => {
    const lines = [
      'Evaluation Scores (1-5):',
      'I. Teaching',
      ...formatScoreLines(TEACHING_CRITERIA, scores.teaching),
      `Average (I): ${averages.teaching.toFixed(2)}`,
      '',
      'II. Research',
      ...formatScoreLines(RESEARCH_CRITERIA, scores.research),
      `Average (II): ${averages.research.toFixed(2)}`,
      '',
      'III. General: Culture Alignment',
      ...formatScoreLines(GENERAL_CRITERIA, scores.general),
      `Average (III): ${averages.general.toFixed(2)}`,
      '',
      `Total Score (I + II + III): ${total.toFixed(2)}`,
    ];

    const comment = (scores.remarks || '').trim();
    if (comment) {
      lines.push('', 'Comments:', comment);
    }

    return lines.join('\n');
  };

  const extractEvaluationComments = (remarks) => {
    if (!remarks || typeof remarks !== 'string') return '';
    const marker = 'Comments:';
    const idx = remarks.indexOf(marker);
    if (idx === -1) return '';
    return remarks.slice(idx + marker.length).trim();
  };

  const committeeInfo = location.state?.committeeInfo || JSON.parse(localStorage.getItem('committeeInfo') || '{}');
  const committeeCode = (committeeInfo.code || '').toLowerCase();
  const isArchivedView = location.pathname.includes('/faculty-portal/archived');

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      
      // Fetch candidates assigned to this committee from database
      let { data, error } = await supabase
        .from('faculty_applications')
        .select('*')
        .eq('assigned_committee_code', committeeCode)
        .order('created_at', { ascending: false });
      
      if (error) {
        const missingCommitteeColumn = typeof error.message === 'string' && error.message.toLowerCase().includes('assigned_committee_code');
        if (missingCommitteeColumn) {
          const fallback = await supabase
            .from('faculty_applications')
            .select('*')
            .or(`assigned_faculty_email.eq.${committeeCode},assigned_faculty_name.eq.${committeeCode}`)
            .order('created_at', { ascending: false });
          if (fallback.error) throw fallback.error;
          data = fallback.data;
        } else {
          throw error;
        }
      }
      
      // Keep all candidates assigned to this committee (exclude deleted)
      const validCandidates = (data || []).filter(c =>
        c.status !== 'deleted' && c.status !== 'Deleted'
      );
      
      setCandidates(validCandidates);
    } catch (err) {
      console.error('Error fetching candidates:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (committeeCode) {
      fetchCandidates();
    } else {
      setLoading(false);
    }
  }, [committeeCode]); // Re-fetch when committee changes

  useEffect(() => {
    if (isArchivedView) {
      setSelectedStage('all');
    }
  }, [isArchivedView]);

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
      if (isArchivedStatus(candidate.status) || candidate.status === 'interview_completed') {
        loadCandidateEvaluation(candidate.id);
      }
    } catch (error) {
      console.error('Error fetching candidate details:', error);
      // Fallback to existing data if fetch fails
      setSelectedCandidate({ ...candidate, loading: false });
      if (isArchivedStatus(candidate.status) || candidate.status === 'interview_completed') {
        loadCandidateEvaluation(candidate.id);
      }
    }
  };

  const handleViewCv = async (candidate) => {
    if (!candidate) return;
    setCvPreviewLoading(true);
    setCvPreviewCandidate({ ...candidate, loading: true });
    setCvPreviewError('');
    if (cvPreviewUrl && cvPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(cvPreviewUrl);
    }
    setCvPreviewUrl('');
    try {
      const fullData = await candidatesApi.getById(candidate.id);
      const flattened = {
        ...candidate,
        ...fullData,
        cv_path: fullData.cv_path || candidate.cv_path || null,
      };
      setCvPreviewCandidate({ ...flattened, loading: false });

      if (flattened.cv_path) {
        const { data: fileData, error: downloadErr } = await supabase
          .storage
          .from('application-reports')
          .download(flattened.cv_path);
        if (downloadErr || !fileData) {
          throw downloadErr || new Error('Failed to download CV');
        }
        const pdfBlob = fileData.type === 'application/pdf'
          ? fileData
          : new Blob([fileData], { type: 'application/pdf' });
        const objectUrl = URL.createObjectURL(pdfBlob);
        setCvPreviewUrl(objectUrl);
      } else {
        setCvPreviewError('CV not available for this candidate.');
      }
    } catch (error) {
      console.error('Error fetching CV details:', error);
      setCvPreviewCandidate({ ...candidate, loading: false });
      setCvPreviewError('Unable to preview CV. Please try again.');
    } finally {
      setCvPreviewLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedCandidate(null);
    setCandidateEvaluation(null);
    setCandidateEvaluationLoading(false);
  };

  const closeCvPreview = () => {
    setCvPreviewCandidate(null);
    setCvPreviewLoading(false);
    if (cvPreviewUrl && cvPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(cvPreviewUrl);
    }
    setCvPreviewUrl('');
    setCvPreviewError('');
  };

  const loadCandidateEvaluation = async (applicationId) => {
    if (!applicationId) return;
    try {
      setCandidateEvaluationLoading(true);
      const { data, error: evalErr } = await supabase
        .from('faculty_evaluations')
        .select('*')
        .eq('application_id', applicationId)
        .order('evaluated_at', { ascending: false })
        .limit(1)
        .single();
      if (evalErr) throw evalErr;
      setCandidateEvaluation(data);
    } catch (err) {
      console.error('Error loading evaluation:', err);
      setCandidateEvaluation(null);
    } finally {
      setCandidateEvaluationLoading(false);
    }
  };

  const handleEvaluate = (candidate) => {
    setEvaluationCandidate(candidate);
    setEvaluationScores(buildInitialScores());
    setEvaluationErrors(buildInitialErrors());
    setEvaluationPhase(1);
  };

  const closeEvaluationModal = () => {
    setEvaluationCandidate(null);
    setEvaluationScores({});
    setEvaluationErrors({});
    setEvaluationPhase(1);
  };

  const handleScoreChange = (section, field, value) => {
    const errorMessage = validateScore(value);
    setEvaluationScores((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
    setEvaluationErrors((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: errorMessage,
      },
    }));
  };

  const handleRemarksChange = (value) => {
    setEvaluationScores((prev) => ({ ...prev, remarks: value }));
  };

  const submitEvaluation = async () => {
    if (!evaluationCandidate?.id) return;
    
    // Validate all scores are filled
    const missingScores = !allScoresFilled(evaluationScores.teaching)
      || !allScoresFilled(evaluationScores.research)
      || !allScoresFilled(evaluationScores.general);

    if (missingScores) {
      alert('Please fill in all evaluation scores with values between 1 and 5.');
      return;
    }

    const teachingAvg = getSectionAverage(evaluationScores.teaching);
    const researchAvg = getSectionAverage(evaluationScores.research);
    const generalAvg = getSectionAverage(evaluationScores.general);
    const totalAvg = (teachingAvg + researchAvg + generalAvg) / 3;
    const toDbScore = (value) => Math.round(value * 2);
    const evaluationNotes = buildEvaluationNotes(
      evaluationScores,
      { teaching: teachingAvg, research: researchAvg, general: generalAvg },
      totalAvg
    );
    
    try {
      setUpdatingStatus(true);
      
      // Save evaluation to database
      const { error: evalErr } = await supabase
        .from('faculty_evaluations')
        .insert({
          application_id: evaluationCandidate.id,
          faculty_id: committeeCode,
          faculty_name: committeeInfo.name || committeeInfo.code,
          teaching_competence: toDbScore(teachingAvg),
          research_potential: toDbScore(researchAvg),
          industry_experience: toDbScore(generalAvg),
          communication_skills: toDbScore(generalAvg),
          subject_knowledge: toDbScore(teachingAvg),
          overall_suitability: toDbScore(totalAvg),
          remarks: evaluationNotes || null,
          evaluated_at: new Date().toISOString()
        });
      
      if (evalErr) throw evalErr;
      
      const { error: statusErr } = await supabase
        .from('faculty_applications')
        .update({ status: 'interview_completed' })
        .eq('id', evaluationCandidate.id);
      
      if (statusErr) throw statusErr;

      // Update local state
      setCandidates(prev => prev.map(c => c.id === evaluationCandidate.id ? { ...c, status: 'interview_completed' } : c));
      
      alert('Interview evaluation completed and sent to Admin.');
      closeEvaluationModal();
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      alert('Failed to submit evaluation. Please try again.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // CV screening decisions
  const updateCvStatus = async (candidate, nextStatus) => {
    if (!candidate?.id) return;
    
    const confirmMessage = nextStatus === 'cv_rejected'
      ? 'Reject this candidate based on CV review?'
      : 'Shortlist this candidate for interview?';
    
    if (!confirm(confirmMessage)) return;
    
    try {
      setUpdatingStatus(true);
      const { error: updErr } = await supabase
        .from('faculty_applications')
        .update({ status: nextStatus })
        .eq('id', candidate.id);
      if (updErr) throw updErr;

      // Close modal if open and remove from list
      if (selectedCandidate?.id === candidate.id) {
        closeModal();
      }
      
      setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, status: nextStatus } : c));
      
      const successMessage = nextStatus === 'cv_rejected'
        ? 'Candidate rejected at CV stage.'
        : 'Candidate shortlisted and sent to Admin for interview assignment.';
      
      alert(successMessage);
      
    } catch (e) {
      console.error('Status update failed:', e);
      alert(e.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
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

  const archivedStatusSet = new Set(['cv_rejected', 'final_rejected', 'final_shortlisted']);
  const isArchivedStatus = (status) => archivedStatusSet.has((status || '').toLowerCase());

  useEffect(() => {
    try {
      localStorage.setItem('facultyArchivedIds', JSON.stringify(archivedIds));
    } catch (e) {
      console.warn('Failed to persist archived ids', e);
    }
  }, [archivedIds]);

  const archivedIdSet = useMemo(() => new Set(archivedIds), [archivedIds]);

  const archiveCandidateFromAll = (candidate) => {
    if (!candidate || !isArchivedStatus(candidate.status)) return;
    setArchivedIds((prev) => (prev.includes(candidate.id) ? prev : [...prev, candidate.id]));
  };

  const cvCandidates = candidates.filter((candidate) => candidate.status === 'cv_assigned');
  const interviewCandidates = candidates.filter((candidate) => candidate.status === 'interview_assigned');
  const archivedCandidates = candidates.filter((candidate) => archivedIdSet.has(candidate.id));
  const allCandidates = candidates;
  const filteredCandidates = selectedStage === 'all'
    ? allCandidates.filter((candidate) => !archivedIdSet.has(candidate.id))
    : selectedStage === 'interview'
    ? interviewCandidates
    : cvCandidates;
  const visibleCandidates = isArchivedView ? archivedCandidates : filteredCandidates;
  const teachingAverage = getSectionAverage(evaluationScores.teaching);
  const researchAverage = getSectionAverage(evaluationScores.research);
  const generalAverage = getSectionAverage(evaluationScores.general);
  const totalScore = teachingAverage !== null && researchAverage !== null && generalAverage !== null
    ? teachingAverage + researchAverage + generalAverage
    : null;

  const renderCriteriaRows = (criteria, scores, sectionKey) => {
    const rows = [];
    let lastGroup = null;

    criteria.forEach((item, index) => {
      if (item.group && item.group !== lastGroup) {
        rows.push(
          <div
            key={`${sectionKey}-${item.group}`}
            className="bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700"
          >
            {item.group}
          </div>
        );
        lastGroup = item.group;
      }

      rows.push(
        <div
          key={`${sectionKey}-${item.key}`}
          className="grid grid-cols-1 md:grid-cols-[40px_1fr_120px] gap-3 px-4 py-3 items-center border-t border-gray-200"
        >
          <div className="text-sm font-semibold text-gray-600">{index + 1}.</div>
          <div className="text-sm text-gray-800">{item.label}</div>
          <div>
            <input
              type="number"
              min="1"
              max="5"
              step="0.1"
              value={scores?.[item.key] ?? ''}
              onChange={(e) => handleScoreChange(sectionKey, item.key, e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                evaluationErrors?.[sectionKey]?.[item.key] ? 'border-red-400' : 'border-gray-300'
              }`}
              placeholder="1-5"
            />
            {evaluationErrors?.[sectionKey]?.[item.key] && (
              <div className="mt-1 text-xs text-red-600">
                {evaluationErrors[sectionKey][item.key]}
              </div>
            )}
          </div>
        </div>
      );
    });

    return rows;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
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
  const formatCandidateName = (candidate) => {
    if (!candidate) return '';
    const title = candidate.title ? `${toTitleCase(candidate.title)} ` : '';
    const middle = candidate.middle_name ? `${toTitleCase(candidate.middle_name)} ` : '';
    return `${title}${toTitleCase(candidate.first_name)} ${middle}${toTitleCase(candidate.last_name)}`.trim();
  };

  const getProgressMeta = (status) => {
    const normalized = (status || '').toLowerCase();
    if (normalized === 'final_rejected' || normalized === 'cv_rejected') {
      return { percent: 100, color: 'bg-red-500', label: 'Rejected' };
    }
    if (normalized === 'final_shortlisted') {
      return { percent: 100, color: 'bg-green-600', label: 'Selected' };
    }
    if (normalized === 'interview_assigned' || normalized === 'interview_completed') {
      return { percent: 66, color: 'bg-green-500', label: 'Interview Stage' };
    }
    if (normalized === 'cv_shortlisted') {
      return { percent: 50, color: 'bg-green-500', label: 'CV Shortlisted' };
    }
    if (normalized === 'cv_assigned') {
      return { percent: 33, color: 'bg-green-500', label: 'CV Review' };
    }
    return { percent: 10, color: 'bg-gray-300', label: 'Pending' };
  };

  const showAllProgress = !isArchivedView && selectedStage === 'all';
  const showDetailActions = !isArchivedView && selectedStage !== 'all';

  return (
    <>
       <div className="h-full overflow-y-auto">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">
                {isArchivedView ? 'Archived Applicants' : 'My Assigned Candidates'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {isArchivedView
                  ? `${archivedCandidates.length} candidate${archivedCandidates.length !== 1 ? 's' : ''} archived`
                  : `${filteredCandidates.length} candidate${filteredCandidates.length !== 1 ? 's' : ''} in ${selectedStage === 'interview' ? 'Interview Evaluation' : selectedStage === 'all' ? 'All' : 'CV Review'}`}
              </p>
            </div>
          </div>
          {!isArchivedView && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedStage('all')}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                  selectedStage === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({filteredCandidates.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedStage('cv')}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                  selectedStage === 'cv'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                CV Review ({cvCandidates.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedStage('interview')}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                  selectedStage === 'interview'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Interview Evaluation ({interviewCandidates.length})
              </button>
            </div>
          )}
        </div>
        
        <div className="divide-y divide-gray-200">
          {visibleCandidates.length > 0 ? (
            visibleCandidates.map((candidate, index) => {
              const progress = showAllProgress ? getProgressMeta(candidate.status) : null;
              const showAllActions = showAllProgress;
              return (
                <div key={candidate.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-lg font-semibold text-blue-600">#{index + 1}</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {formatCandidateName(candidate)}
                          </h3>
                          <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                            {toTitleCase(candidate.department)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          {branchLabels[candidate.branch] || toTitleCase(candidate.branch || candidate.department || '')}
                        </p>
                        <p className="text-sm text-gray-500">{candidate.email}</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-sm text-gray-600">{candidate.experience}</span>
                        </div>
                      </div>
                    </div>

                    {showAllProgress && (
                      <div className="flex-1 max-w-md px-4">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                          <span>CV Review</span>
                          <span>Interview</span>
                          <span>Final</span>
                        </div>
                        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-2 ${progress.color} rounded-full transition-all`}
                            style={{ width: `${progress.percent}%` }}
                          />
                        </div>
                        <div className="mt-2 text-xs font-semibold text-gray-600">{progress.label}</div>
                      </div>
                    )}

                    <div className={`flex-shrink-0 ${showAllActions ? 'flex flex-col items-end gap-2' : 'flex space-x-3'}`}>
                      {showAllActions || isArchivedView ? (
                        <button
                          onClick={() => handleViewDetails(candidate)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium shadow-md hover:shadow-lg"
                        >
                          View Details
                        </button>
                      ) : candidate.status === 'cv_assigned' ? (
                        <button
                          onClick={() => handleViewCv(candidate)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium shadow-md hover:shadow-lg"
                        >
                          View CV
                        </button>
                      ) : (
                        <button
                          onClick={() => handleViewDetails(candidate)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium shadow-md hover:shadow-lg"
                        >
                          View Details
                        </button>
                      )}
                      {showAllActions && isArchivedStatus(candidate.status) && !archivedIdSet.has(candidate.id) && (
                        <button
                          onClick={() => archiveCandidateFromAll(candidate)}
                          className="text-xs font-semibold text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md px-3 py-1 bg-white"
                        >
                          Archive
                        </button>
                      )}
                    {!isArchivedView && !showAllActions && candidate.status === 'cv_assigned' && (
                      <>
                        <button
                            onClick={() => updateCvStatus(candidate, 'cv_shortlisted')}
                            disabled={updatingStatus}
                            className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-lg transition-colors font-medium shadow-md hover:shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
                          >
                            Shortlist
                          </button>
                          <button
                            onClick={() => updateCvStatus(candidate, 'cv_rejected')}
                            disabled={updatingStatus}
                            className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-lg transition-colors font-medium shadow-md hover:shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {!isArchivedView && !showAllActions && candidate.status === 'interview_assigned' && (
                        <button
                          onClick={() => handleEvaluate(candidate)}
                          disabled={updatingStatus}
                          className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-lg transition-colors font-medium shadow-md hover:shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          Evaluate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center text-gray-500">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {isArchivedView ? 'No Archived Applicants' : 'No Assigned Candidates'}
              </h3>
              <p className="text-gray-600">
                {isArchivedView
                  ? 'No rejected or accepted candidates yet.'
                  : 'You don\'t have any candidates assigned to review yet.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {cvPreviewCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div>
                <h2 className="text-lg font-bold text-gray-900">CV Preview</h2>
                <p className="text-xs text-gray-600">{formatCandidateName(cvPreviewCandidate)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    closeCvPreview();
                    handleViewDetails(cvPreviewCandidate);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold bg-white border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50"
                >
                  View More Details
                </button>
                <button
                  onClick={closeCvPreview}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-50">
              {cvPreviewCandidate.loading || cvPreviewLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto mb-3"></div>
                    <p className="text-gray-600 text-sm">Loading CV...</p>
                  </div>
                </div>
              ) : cvPreviewUrl ? (
                <iframe
                  title="CV Preview"
                  src={cvPreviewUrl}
                  className="w-full h-full min-h-[70vh]"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-600 text-sm">{cvPreviewError || 'CV not available for this candidate.'}</p>
                </div>
              )}
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
                    <div className="bg-green-50 rounded p-3 mb-3">
                      <p className="text-xs font-semibold text-green-600 uppercase">Total Experience</p>
                      <p className="text-lg font-bold text-gray-900">{derivedExperience}</p>
                    </div>

                    {/* Teaching Experience */}
                    {teachingExperiences.length > 0 && (
                      <div className="mb-3">
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
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          selectedCandidate.status === 'cv_shortlisted' ? 'bg-green-100 text-green-700' :
                          selectedCandidate.status === 'cv_rejected' ? 'bg-red-100 text-red-700' :
                          selectedCandidate.status === 'interview_assigned' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {selectedCandidate.status === 'cv_shortlisted' ? 'CV Shortlisted' :
                           selectedCandidate.status === 'cv_rejected' ? 'CV Rejected' :
                           selectedCandidate.status === 'interview_assigned' ? 'Interview Assigned' :
                           'CV Assigned'}
                        </span>
                      </div>
                      
                      {showDetailActions && selectedCandidate.status === 'cv_assigned' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateCvStatus(selectedCandidate, 'cv_shortlisted')}
                            disabled={updatingStatus}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                          >
                            Shortlist for Interview
                          </button>
                          <button
                            onClick={() => updateCvStatus(selectedCandidate, 'cv_rejected')}
                            disabled={updatingStatus}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                          >
                            Reject CV
                          </button>
                        </div>
                      )}

                      {showDetailActions && selectedCandidate.status === 'interview_assigned' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEvaluate(selectedCandidate)}
                            disabled={updatingStatus}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                          >
                            Start Interview Evaluation
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {(isArchivedStatus(selectedCandidate.status) || selectedCandidate.status === 'interview_completed') && (
                    <div className="bg-white border rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-gray-900">Interview Evaluation</h3>
                        <button
                          onClick={() => loadCandidateEvaluation(selectedCandidate.id)}
                          disabled={candidateEvaluationLoading}
                          className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
                        >
                          {candidateEvaluationLoading ? 'Loading...' : 'Refresh'}
                        </button>
                      </div>
                      {candidateEvaluation ? (
                        <div className="space-y-3 text-sm text-gray-700">
                          <p><span className="font-semibold">Evaluation Committee:</span> {candidateEvaluation.faculty_name || 'N/A'}</p>
                          <p><span className="font-semibold">I. Teaching:</span> {candidateEvaluation.teaching_competence ?? 'N/A'}/10</p>
                          <p><span className="font-semibold">II. Research:</span> {candidateEvaluation.research_potential ?? 'N/A'}/10</p>
                          <p><span className="font-semibold">III. General: Culture Alignment:</span> {candidateEvaluation.industry_experience ?? 'N/A'}/10</p>
                          <p><span className="font-semibold">Combined Score:</span> {candidateEvaluation.overall_suitability ?? 'N/A'}/10</p>
                          <div>
                            <p className="font-semibold">Remarks</p>
                            <p className="text-xs text-gray-600 whitespace-pre-wrap">
                              {extractEvaluationComments(candidateEvaluation.remarks) || 'No additional comments.'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">No evaluation found.</p>
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

      {/* Evaluation Modal */}
      {evaluationCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Interview Evaluation Required
                </h2>
                <p className="text-sm text-gray-600 mt-1">Please complete the interview evaluation to send scores to Admin.</p>
              </div>
              <button
                onClick={closeEvaluationModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Auto-filled Information */}
            <div className="p-6 bg-blue-50 border-b">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Name of the Applicant</label>
                  <p className="text-base font-medium text-gray-900">
                    {formatCandidateName(evaluationCandidate)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Subject Area</label>
                  <p className="text-base font-medium text-gray-900">
                    {branchLabels[(evaluationCandidate.branch || evaluationCandidate.department || '').toLowerCase()]
                      || toTitleCase(evaluationCandidate.branch || evaluationCandidate.department)
                      || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Post Applied For</label>
                  <p className="text-base font-medium text-gray-900">{toTitleCase(evaluationCandidate.position) || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Evaluation Form */}
            <div className="p-6 space-y-6">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 1, label: 'I. Teaching' },
                  { id: 2, label: 'II. Research' },
                  { id: 3, label: 'III. General: Culture Alignment' }
                ].map((phase) => (
                  <button
                    key={phase.id}
                    type="button"
                    onClick={() => setEvaluationPhase(phase.id)}
                    className={`px-3 py-1.5 text-sm font-semibold rounded-full border ${
                      evaluationPhase === phase.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    {phase.label}
                  </button>
                ))}
              </div>

              {evaluationPhase === 1 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900">I. Teaching</h3>
                    <span className="text-xs font-semibold text-gray-600">Ratings (1 to 5)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-[40px_1fr_120px] gap-3 px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                    <span>Sl. No.</span>
                    <span>Evaluation Parameters</span>
                    <span>Rating</span>
                  </div>
                  <div className="border-t border-gray-200">
                    {renderCriteriaRows(TEACHING_CRITERIA, evaluationScores.teaching, 'teaching')}
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
                    <span className="text-sm font-semibold text-gray-700">Average Score (I)</span>
                    <span className="text-sm font-bold text-gray-900">
                      {teachingAverage !== null ? teachingAverage.toFixed(2) : 'N/A'}
                    </span>
                  </div>
                </div>
              )}

              {evaluationPhase === 2 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900">II. Research</h3>
                    <span className="text-xs font-semibold text-gray-600">Ratings (1 to 5)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-[40px_1fr_120px] gap-3 px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                    <span>Sl. No.</span>
                    <span>Evaluation Parameters</span>
                    <span>Rating</span>
                  </div>
                  <div className="border-t border-gray-200">
                    {renderCriteriaRows(RESEARCH_CRITERIA, evaluationScores.research, 'research')}
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
                    <span className="text-sm font-semibold text-gray-700">Average Score (II)</span>
                    <span className="text-sm font-bold text-gray-900">
                      {researchAverage !== null ? researchAverage.toFixed(2) : 'N/A'}
                    </span>
                  </div>
                </div>
              )}

              {evaluationPhase === 3 && (
                <>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900">III. General: Culture Alignment</h3>
                      <span className="text-xs font-semibold text-gray-600">Ratings (1 to 5)</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-[40px_1fr_120px] gap-3 px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                      <span>Sl. No.</span>
                      <span>Evaluation Parameters</span>
                      <span>Rating</span>
                    </div>
                    <div className="border-t border-gray-200">
                      {renderCriteriaRows(GENERAL_CRITERIA, evaluationScores.general, 'general')}
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
                      <span className="text-sm font-semibold text-gray-700">Average Score (III)</span>
                      <span className="text-sm font-bold text-gray-900">
                        {generalAverage !== null ? generalAverage.toFixed(2) : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-sm font-semibold text-blue-800">Total Score (I + II + III)</span>
                    <span className="text-sm font-bold text-blue-900">
                      {totalScore !== null ? totalScore.toFixed(2) : 'N/A'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Comments</label>
                    <textarea
                      value={evaluationScores.remarks}
                      onChange={(e) => handleRemarksChange(e.target.value)}
                      rows="4"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Enter any additional remarks or observations..."
                    />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
              <button
                onClick={closeEvaluationModal}
                className="px-5 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium"
                disabled={updatingStatus}
              >
                Cancel
              </button>
              {evaluationPhase > 1 && (
                <button
                  type="button"
                  onClick={() => setEvaluationPhase((p) => Math.max(1, p - 1))}
                  className="px-5 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium"
                  disabled={updatingStatus}
                >
                  Previous Phase
                </button>
              )}
              {evaluationPhase < 3 ? (
                <button
                  type="button"
                  onClick={() => setEvaluationPhase((p) => Math.min(3, p + 1))}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={updatingStatus}
                >
                  Next Phase
                </button>
              ) : (
                <button
                  onClick={submitEvaluation}
                  disabled={updatingStatus}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updatingStatus ? 'Submitting...' : 'Submit Evaluation'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FacultyDashboard;

