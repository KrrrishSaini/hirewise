import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase-client';
import { candidatesApi } from '../lib/api';
import { toArrayPayload } from '../lib/normalize';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import CVParsingSection from './CVParsingSection';

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

const POST_APPLIED_OPTIONS = [
  { value: 'assistant professor', label: 'Assistant Professor' },
  { value: 'associate professor', label: 'Associate Professor' },
  { value: 'professor', label: 'Professor' },
  { value: 'professor of practice', label: 'Professor of Practice' },
  { value: 'lecturer', label: 'Lecturer' }
];

const PHD_STATUS_OPTIONS = [
  { value: 'not done', label: 'Not done' },
  { value: 'pursuing', label: 'Pursuing' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'awarded', label: 'Awarded' }
];

const DEFAULT_FILTERS = {
  postApplied: [],
  minExperienceMonths: '',
  phdStatus: [],
  colleges: [],
  submittedDateFrom: '',
  submittedDateTo: '',
};

const AllCandidates = () => {
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedStage, setSelectedStage] = useState('all');
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
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
  const [collegeSearch, setCollegeSearch] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [candidateToAssign, setCandidateToAssign] = useState(null);
  const [assignType, setAssignType] = useState('cv');
  const [selectedCommittee, setSelectedCommittee] = useState('');
  const [selectedFinalDecision, setSelectedFinalDecision] = useState('');
  const [multiAssignMode, setMultiAssignMode] = useState(false);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);
  const [bulkAssigning, setBulkAssigning] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10); // 10 candidates per page
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

  const departments = ['All', 'law', 'liberal', 'engineering', 'management']; // All is first now
  
  const toTitleCase = (value) => {
    if (!value || typeof value !== 'string') return value || '';
    return value
      .split(/\s+/)
      .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
      .join(' ');
  };

  // Reset to page 1 when department or stage changes
  const handleDepartmentChange = (department) => {
    setSelectedDepartment(department);
    setCurrentPage(1);
  };

  const handleStageChange = (stage) => {
    setSelectedStage(stage);
    setCurrentPage(1);
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

  const mapDecisionFromStatus = (status) => {
    const normalized = normalizeCandidateStatus(status);
    if (normalized === 'final_shortlisted') return 'accept';
    if (normalized === 'final_rejected' || normalized === 'cv_rejected') return 'reject';
    return '';
  };

  // const getGenderRowBackground = (gender) => {
  //   const normalized = normalizeFilterValue(gender);
  //   if (normalized === 'female') return '#fcd1ff';
  //   if (normalized === 'male') return '#d1e9ff';
  //   return 'transparent';
  // };

  const normalizeDegreeRank = (deg) => {
    if (!deg) return 0;
    const d = deg.toLowerCase();
    if (d.includes('phd') || d.includes('doctor')) return 3;
    if (d.includes('master')) return 2;
    if (d.includes('bachelor') || d.includes('b.tech')) return 1;
    return 0;
  };

  const parseExperienceMonths = (value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, value);

    const text = String(value).toLowerCase().trim();
    if (!text || text === 'n/a' || text === 'not specified') return 0;

    let months = 0;
    const yearsMatch = text.match(/(\d+(?:\.\d+)?)\s*(year|yr)/);
    const monthsMatch = text.match(/(\d+(?:\.\d+)?)\s*(month|mo)/);

    if (yearsMatch) months += Math.round(Number(yearsMatch[1]) * 12);
    if (monthsMatch) months += Math.round(Number(monthsMatch[1]));

    if (months === 0) {
      const numeric = Number(text);
      if (Number.isFinite(numeric)) months = numeric;
    }

    return Math.max(0, months);
  };

  const normalizeFilterValue = (value) =>
    String(value || '')
      .toLowerCase()
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const getEducationObject = (candidate) => {
    const education = candidate?.education;
    if (!education) return {};
    if (typeof education === 'object' && !Array.isArray(education)) return education;
    if (typeof education === 'string') {
      const trimmed = education.trim();
      if (!trimmed) return {};
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
      } catch (_error) {
        return {};
      }
    }
    return {};
  };

  const derivePhdStatus = (candidate) => {
    const normalize = (value) => normalizeFilterValue(value);
    const education = getEducationObject(candidate);

    const direct =
      candidate?.phd_status ||
      candidate?.phdStatus ||
      education?.phdStatus ||
      education?.phd_status;

    if (direct) return normalize(direct);

    const highestDegree = normalize(
      candidate?.highest_degree ||
      education?.highestDegree ||
      education?.highest_degree
    );
    if (highestDegree.includes('phd') || highestDegree.includes('doctor')) {
      const gradYear = Number(
        candidate?.graduation_year ||
        education?.phdYear ||
        education?.phd_year
      );
      if (Number.isFinite(gradYear) && gradYear > 0 && gradYear <= new Date().getFullYear()) {
        return 'awarded';
      }
      return 'pursuing';
    }

    return 'not done';
  };

  const getAdditionalEducation = (candidate) => {
    if (!candidate) return null;
    const education = getEducationObject(candidate);
    const firstNonEmpty = (...values) =>
      values
        .map((value) => (value === null || value === undefined ? '' : String(value).trim()))
        .find(Boolean) || '';

    const highestDegree = firstNonEmpty(
      candidate.highest_degree,
      candidate.highestDegree,
      education?.highest_degree,
      education?.highestDegree
    );
    const highestRank = normalizeDegreeRank(highestDegree);
    const highestGradYear = firstNonEmpty(
      candidate.graduation_year,
      candidate.graduationYear,
      education?.graduation_year,
      education?.graduationYear
    );

    const additionalLegacyDegree = firstNonEmpty(
      candidate.additional_qualification,
      candidate.additionalQualification,
      education?.additional_qualification,
      education?.additionalQualification
    );
    const additionalLegacyInstitute = firstNonEmpty(
      candidate.additional_university,
      candidate.additionalUniversity,
      education?.additional_university,
      education?.additionalUniversity
    );
    const additionalLegacyYear = firstNonEmpty(
      candidate.additional_graduation_year,
      candidate.additionalGraduationYear,
      education?.additional_graduation_year,
      education?.additionalGraduationYear
    );
    const additionalLegacyRank =
      normalizeDegreeRank(additionalLegacyDegree) || (highestRank > 1 ? highestRank - 1 : 0);

    const degrees = [
      {
        rank: 3,
        degree: firstNonEmpty(
          candidate.phd_degree_name,
          candidate.phdDegreeName,
          candidate.phdDegree,
          education?.phd_degree_name,
          education?.phdDegreeName,
          education?.phdDegree,
          highestRank === 3 ? highestDegree : ''
        ),
        institute: firstNonEmpty(
          candidate.phd_institute,
          candidate.phdInstitute,
          education?.phd_institute,
          education?.phdInstitute
        ),
        year: firstNonEmpty(
          candidate.phd_year,
          candidate.phdYear,
          education?.phd_year,
          education?.phdYear,
          highestRank === 3 ? highestGradYear : ''
        ),
      },
      {
        rank: 2,
        degree: firstNonEmpty(
          candidate.master_degree_name,
          candidate.masterDegreeName,
          candidate.masterDegree,
          education?.master_degree_name,
          education?.masterDegreeName,
          education?.masters_degree_name,
          education?.mastersDegreeName,
          education?.mastersDegree,
          highestRank === 2 ? highestDegree : ''
        ),
        institute: firstNonEmpty(
          candidate.master_institute,
          candidate.masterInstitute,
          education?.master_institute,
          education?.masterInstitute,
          education?.masters_institute,
          education?.mastersInstitute
        ),
        year: firstNonEmpty(
          candidate.master_year,
          candidate.masterYear,
          education?.master_year,
          education?.masterYear,
          education?.masters_year,
          education?.mastersYear,
          highestRank === 2 ? highestGradYear : ''
        ),
      },
      {
        rank: 1,
        degree: firstNonEmpty(
          candidate.bachelor_degree_name,
          candidate.bachelorDegreeName,
          candidate.bachelorDegree,
          education?.bachelor_degree_name,
          education?.bachelorDegreeName,
          education?.bachelors_degree_name,
          education?.bachelorsDegreeName,
          education?.bachelorsDegree,
          highestRank === 1 ? highestDegree : ''
        ),
        institute: firstNonEmpty(
          candidate.bachelor_institute,
          candidate.bachelorInstitute,
          education?.bachelor_institute,
          education?.bachelorInstitute,
          education?.bachelors_institute,
          education?.bachelorsInstitute
        ),
        year: firstNonEmpty(
          candidate.bachelor_year,
          candidate.bachelorYear,
          education?.bachelor_year,
          education?.bachelorYear,
          education?.bachelors_year,
          education?.bachelorsYear,
          highestRank === 1 ? highestGradYear : ''
        ),
      },
      {
        rank: additionalLegacyRank,
        degree: additionalLegacyDegree,
        institute: additionalLegacyInstitute,
        year: additionalLegacyYear,
      },
    ].filter((d) => d.degree || d.institute || d.year);

    if (degrees.length === 0) return null;

    // If duplicate degree ranks exist across payload shapes, keep the richest merged record.
    const dedupedByRank = Array.from(
      degrees.reduce((acc, degree) => {
        if (!degree.rank) return acc;
        const existing = acc.get(degree.rank);
        if (!existing) {
          acc.set(degree.rank, degree);
          return acc;
        }

        acc.set(degree.rank, {
          rank: degree.rank,
          degree: firstNonEmpty(existing.degree, degree.degree),
          institute: firstNonEmpty(existing.institute, degree.institute),
          year: firstNonEmpty(existing.year, degree.year),
        });
        return acc;
      }, new Map()).values()
    );

    const resolvedHighestRank =
      highestRank || Math.max(...dedupedByRank.map((degree) => degree.rank));
    const nextLowerDegree = dedupedByRank
      .filter((degree) => degree.rank < resolvedHighestRank)
      .sort((a, b) => b.rank - a.rank)[0];

    return nextLowerDegree || null;
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

  const formatPostAppliedFor = (candidate) => {
    const raw =
      candidate?.post_applied_for ||
      candidate?.postAppliedFor ||
      candidate?.previous_positions ||
      candidate?.position ||
      '';
    if (!raw) return 'Not specified';
    return toTitleCase(String(raw).replace(/[_-]/g, ' '));
  };

  const formatSubmittedDate = (candidate) => {
    const rawValue =
      candidate?.submitted_at ||
      candidate?.submittedAt ||
      candidate?.created_at ||
      candidate?.createdAt;
    if (!rawValue) return 'Not available';

    const parsed = new Date(rawValue);
    if (Number.isNaN(parsed.getTime())) return 'Not available';
    return parsed.toLocaleDateString('en-GB');
  };

  const getCandidateSubmittedTimestamp = (candidate) => {
    const rawValue =
      candidate?.submitted_at ||
      candidate?.submittedAt ||
      candidate?.created_at ||
      candidate?.createdAt;
    if (!rawValue) return 0;

    const parsed = new Date(rawValue);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  };

  const getHighestDegreeInstitution = (candidate) => {
    const firstNonEmpty = (...values) =>
      values
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .find(Boolean) || '';

    const highestDegree = normalizeFilterValue(
      candidate?.highest_degree ||
      candidate?.education?.highestDegree ||
      candidate?.education?.highest_degree
    );
    const phdInstitute = firstNonEmpty(
      candidate?.phd_institute,
      candidate?.phdInstitute,
      candidate?.education?.phdInstitute,
      candidate?.education?.phd_institute
    );
    const masterInstitute = firstNonEmpty(
      candidate?.master_institute,
      candidate?.masterInstitute,
      candidate?.education?.masterInstitute,
      candidate?.education?.master_institute
    );
    const bachelorInstitute = firstNonEmpty(
      candidate?.bachelor_institute,
      candidate?.bachelorInstitute,
      candidate?.education?.bachelorInstitute,
      candidate?.education?.bachelor_institute
    );
    const fallbackInstitute = firstNonEmpty(candidate?.university, candidate?.education?.university);

    if (highestDegree.includes('phd') || highestDegree.includes('doctor')) {
      return phdInstitute || fallbackInstitute || masterInstitute || bachelorInstitute;
    }
    if (highestDegree.includes('master')) {
      return masterInstitute || fallbackInstitute || phdInstitute || bachelorInstitute;
    }
    if (
      highestDegree.includes('bachelor') ||
      highestDegree.includes('b.tech') ||
      highestDegree.includes('b tech')
    ) {
      return bachelorInstitute || fallbackInstitute || masterInstitute || phdInstitute;
    }

    return fallbackInstitute || phdInstitute || masterInstitute || bachelorInstitute;
  };

  const getAssignableType = (candidateStatus) => {
    const normalized = normalizeCandidateStatus(candidateStatus);
    if (normalized === 'submitted') return 'cv';
    if (normalized === 'cv_shortlisted') return 'interview';
    return null;
  };

  const toggleCheckboxFilter = (key, value) => {
    const normalizedValue = normalizeFilterValue(value);
    setFilters((prev) => {
      const current = Array.isArray(prev[key]) ? prev[key] : [];
      const exists = current.includes(normalizedValue);
      return {
        ...prev,
        [key]: exists
          ? current.filter((item) => item !== normalizedValue)
          : [...current, normalizedValue]
      };
    });
  };

  const resetFilters = () => {
    setFilters({ ...DEFAULT_FILTERS });
    setCollegeSearch('');
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
      setError(null); // Clear any previous errors
      console.log('AllCandidates: Starting to fetch candidates for department:', selectedDepartment);

      let data = [];
      let usedFallback = false;

      try {
        console.log('AllCandidates: Fetching candidates from backend detailed endpoint...');
        data = await candidatesApi.getAllDetailed(selectedDepartment, { fresh: true });
        console.log('AllCandidates: Backend response:', data?.length, 'records');
      } catch (apiErr) {
        usedFallback = true;
        console.warn('AllCandidates: Backend fetch failed, falling back to direct Supabase query:', apiErr?.message || apiErr);

        // Fallback to direct Supabase only if backend fetch fails
        let query = supabase
          .from('faculty_applications')
          .select('*')
          .order('created_at', { ascending: false });

        if (selectedDepartment !== 'All') {
          query = query.eq('department', selectedDepartment);
        }

        console.log('AllCandidates: Executing fallback Supabase query...');
        const { data: supabaseData, error: supabaseError } = await query;

        if (supabaseError) {
          console.error('AllCandidates: Fallback Supabase query error:', supabaseError);
          throw new Error(
            `Backend fetch failed (${apiErr?.message || 'unknown'}). Fallback query failed (${supabaseError.message || 'unknown'}).`
          );
        }

        data = supabaseData || [];
      }

      const normalizedData = toArrayPayload(data);

      // Keep all active candidates (exclude deleted only)
      const filteredData = normalizedData.filter(candidate => 
        candidate.status !== 'deleted' &&
        candidate.status !== 'Deleted'
      );

      console.log(
        `AllCandidates: Loaded ${normalizedData.length || 0} candidates (${usedFallback ? 'fallback Supabase' : 'backend API'}), filtered to ${filteredData.length} active records`
      );
      console.log('All statuses in DB:', [...new Set(normalizedData.map(c => c.status))]);
      console.log('First few candidates:', filteredData.slice(0, 5).map(c => ({ id: c.id, name: c.first_name, status: c.status })));
      
      const normalized = filteredData.map(candidate => ({
        ...candidate,
        status: normalizeCandidateStatus(candidate.status)
      }));
      console.log('AllCandidates: Setting candidates:', normalized.length);
      setCandidates(normalized);
    } catch (err) {
      console.error('AllCandidates: Error fetching candidates:', err);
      console.error('AllCandidates: Error details:', {
        message: err.message,
        code: err.code,
        details: err.details,
        stack: err.stack
      });
      setError(err.message);
    } finally {
      console.log('AllCandidates: Setting loading to false');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
    
    // Fallback: Force stop loading after 10 seconds no matter what
    const fallbackTimeout = setTimeout(() => {
      console.warn('AllCandidates: Force stopping loading after 10 seconds');
      setLoading(false);
    }, 10000);
    
    return () => {
      clearTimeout(fallbackTimeout);
    };
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
      setSelectedFinalDecision(mapDecisionFromStatus(resolvedStatus));
    } catch (error) {
      console.error('Error fetching candidate details:', error);
      // Fallback to existing data if fetch fails
      setSelectedCandidate({ ...candidate, loading: false });
      setSelectedFinalDecision(mapDecisionFromStatus(candidate.status));
    }
  };

  const closeModal = () => {
    setSelectedCandidate(null);
    setSelectedFinalDecision('');
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

  const applyFinalDecision = () => {
    if (!selectedFinalDecision) {
      alert('Please choose a final decision first.');
      return;
    }
    const nextStatus = selectedFinalDecision === 'accept' ? 'final_shortlisted' : 'final_rejected';
    updateApplicationStatus(nextStatus);
  };

  const departmentFiltered = selectedDepartment === 'All' 
    ? candidates 
    : candidates.filter(candidate => candidate.department === selectedDepartment);

  const collegeOptionMap = new Map();
  candidates.forEach((candidate) => {
    const college = getHighestDegreeInstitution(candidate);
    const value = normalizeFilterValue(college);
    if (!value || collegeOptionMap.has(value)) return;
    collegeOptionMap.set(value, college.trim());
  });
  const collegeOptions = Array.from(collegeOptionMap.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const normalizedCollegeSearch = normalizeFilterValue(collegeSearch);
  const filteredCollegeOptions = collegeOptions.filter((option) =>
    normalizeFilterValue(option.label).includes(normalizedCollegeSearch)
  );
  const activeFilterCount =
    (filters.postApplied?.length || 0) +
    (filters.phdStatus?.length || 0) +
    (filters.colleges?.length || 0) +
    (filters.minExperienceMonths ? 1 : 0) +
    (filters.submittedDateFrom || filters.submittedDateTo ? 1 : 0);

  const passesAdvancedFilters = (candidate) => {
    const norm = (v) => (v === null || v === undefined ? 0 : Number(v) || 0);
    const numericMonths = norm(candidate.total_experience_months || candidate.totalMonths || candidate.experienceMonths);
    const expMonths = numericMonths > 0
      ? numericMonths
      : parseExperienceMonths(candidate.years_of_experience || candidate.experience || candidate.total_experience);
    const submittedTimestamp = getCandidateSubmittedTimestamp(candidate);
    const phdStatus = derivePhdStatus(candidate);
    const highestDegreeCollege = normalizeFilterValue(getHighestDegreeInstitution(candidate));
    const appliedPost = normalizeFilterValue(
      candidate.post_applied_for ||
      candidate.postAppliedFor ||
      ''
    );
    const normalizedPhdFilters = (Array.isArray(filters.phdStatus) ? filters.phdStatus : [filters.phdStatus])
      .map(normalizeFilterValue)
      .filter((value) => value && value !== 'all' && value !== 'any');
    const normalizedPostFilters = (Array.isArray(filters.postApplied) ? filters.postApplied : [filters.postApplied])
      .map(normalizeFilterValue)
      .filter((value) => value && value !== 'all' && value !== 'any');
    const normalizedCollegeFilters = (Array.isArray(filters.colleges) ? filters.colleges : [filters.colleges])
      .map(normalizeFilterValue)
      .filter(Boolean);

    if (filters.minExperienceMonths && expMonths < Number(filters.minExperienceMonths)) return false;
    if (filters.submittedDateFrom) {
      const fromTimestamp = new Date(`${filters.submittedDateFrom}T00:00:00`).getTime();
      if (!Number.isNaN(fromTimestamp) && submittedTimestamp < fromTimestamp) return false;
    }
    if (filters.submittedDateTo) {
      const toTimestamp = new Date(`${filters.submittedDateTo}T23:59:59.999`).getTime();
      if (!Number.isNaN(toTimestamp) && submittedTimestamp > toTimestamp) return false;
    }
    if (normalizedPhdFilters.length > 0 && !normalizedPhdFilters.includes(phdStatus)) return false;
    if (normalizedPostFilters.length > 0 && !normalizedPostFilters.includes(appliedPost)) return false;
    if (normalizedCollegeFilters.length > 0 && !normalizedCollegeFilters.includes(highestDegreeCollege)) return false;
    return true;
  };

  const stageFiltered = departmentFiltered.filter(candidate => matchesStage(candidate, selectedStage));
  const filteredCandidates = stageFiltered
    .filter(passesAdvancedFilters)
    .sort((a, b) => {
      const timestampDiff = getCandidateSubmittedTimestamp(b) - getCandidateSubmittedTimestamp(a);
      if (timestampDiff !== 0) return timestampDiff;
      return (Number(b?.id) || 0) - (Number(a?.id) || 0);
    });
  
  // Pagination logic
  const totalCandidates = filteredCandidates.length;
  const totalPages = Math.ceil(totalCandidates / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedCandidates = filteredCandidates.slice(startIndex, endIndex);
  
  // Pagination controls
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  // Reset to page 1 if current page exceeds total pages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);
  
  const assignableVisibleCandidates = paginatedCandidates.filter((candidate) => getAssignableType(candidate.status));
  const areAllAssignableSelected =
    assignableVisibleCandidates.length > 0 &&
    assignableVisibleCandidates.every((candidate) => selectedCandidateIds.includes(candidate.id));

  useEffect(() => {
    if (!multiAssignMode) return;
    const visibleIds = new Set(filteredCandidates.map((candidate) => candidate.id));
    setSelectedCandidateIds((prev) => {
      const next = prev.filter((id) => visibleIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [multiAssignMode, filteredCandidates]);

  const toggleCandidateSelection = (candidateId) => {
    setSelectedCandidateIds((prev) =>
      prev.includes(candidateId)
        ? prev.filter((id) => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const toggleSelectAllAssignable = () => {
    if (areAllAssignableSelected) {
      setSelectedCandidateIds([]);
      return;
    }
    setSelectedCandidateIds(assignableVisibleCandidates.map((candidate) => candidate.id));
  };

  const resetAssignModalState = () => {
    setShowAssignModal(false);
    setCandidateToAssign(null);
    setSelectedCommittee('');
    setAssignType('cv');
  };

  const openBulkAssignModal = () => {
    if (selectedCandidateIds.length === 0) {
      alert('Please select at least one candidate.');
      return;
    }
    setCandidateToAssign(null);
    setSelectedCommittee('');
    setShowAssignModal(true);
  };

  const handleConfirmAssignment = async () => {
    if (!selectedCommittee) {
      alert('Please select a committee');
      return;
    }

    if (candidateToAssign) {
      const selectedCommitteeName = COMMITTEES.find((c) => c.code === selectedCommittee)?.name;
      const nextStatus = assignType === 'interview' ? 'interview_assigned' : 'cv_assigned';
      try {
        const { error } = await supabase
          .from('faculty_applications')
          .update({
            assigned_committee_code: selectedCommittee,
            status: nextStatus
          })
          .eq('id', candidateToAssign.id);

        if (error) throw error;

        alert(`Assigned ${formatCandidateName(candidateToAssign)} to: ${selectedCommitteeName || selectedCommittee}`);
        resetAssignModalState();
        fetchCandidates();
      } catch (error) {
        console.error('Error assigning committee:', error);
        alert('Failed to assign committee. Please try again.');
      }
      return;
    }

    try {
      setBulkAssigning(true);
      const selectedCandidates = filteredCandidates.filter((candidate) => selectedCandidateIds.includes(candidate.id));
      const assignments = selectedCandidates
        .map((candidate) => {
          const type = getAssignableType(candidate.status);
          if (!type) return null;
          return {
            id: candidate.id,
            nextStatus: type === 'interview' ? 'interview_assigned' : 'cv_assigned'
          };
        })
        .filter(Boolean);

      if (assignments.length === 0) {
        alert('None of the selected candidates are eligible for assignment in this stage.');
        return;
      }

      const updates = await Promise.all(
        assignments.map((item) =>
          supabase
            .from('faculty_applications')
            .update({
              assigned_committee_code: selectedCommittee,
              status: item.nextStatus
            })
            .eq('id', item.id)
        )
      );

      const failed = updates.filter((result) => result.error);
      if (failed.length > 0) {
        console.error('Bulk assignment errors:', failed.map((f) => f.error));
        alert(`Assigned ${assignments.length - failed.length} candidate(s), ${failed.length} failed. Please retry.`);
      } else {
        alert(`Assigned ${assignments.length} candidate(s) successfully.`);
      }

      resetAssignModalState();
      setSelectedCandidateIds([]);
      setMultiAssignMode(false);
      fetchCandidates();
    } catch (error) {
      console.error('Bulk assignment error:', error);
      alert('Bulk assignment failed. Please try again.');
    } finally {
      setBulkAssigning(false);
    }
  };

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
  const selectedCandidateStatus = selectedCandidate ? normalizeCandidateStatus(selectedCandidate.status) : '';

  return (
    <>
       <div className="h-full overflow-y-auto">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">All Candidates</h2>
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">Select Department</label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[180px]"
                >
                  {departments.map(dept => (
                    <option key={dept} value={dept}>
                      {dept.charAt(0).toUpperCase() + dept.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1">
            {PIPELINE_STAGES.map((stage) => (
              <button
                key={stage.key}
                onClick={() => handleStageChange(stage.key)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
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
              className="ml-2 shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              <span>{showFilters ? 'Hide Filters' : 'Filters'}</span>
              {activeFilterCount > 0 && (
                <>
                  <span className="h-4 w-px bg-gray-300" />
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      resetFilters();
                    }}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    Clear
                  </span>
                </>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 flex max-h-[55vh] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:max-h-[58vh]">
              <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Advanced Filters</h3>
                  <p className="text-xs text-slate-500">
                    {activeFilterCount === 0
                      ? 'No filters applied'
                      : `${activeFilterCount} active filter${activeFilterCount === 1 ? '' : 's'}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    {filteredCandidates.length} match{filteredCandidates.length === 1 ? '' : 'es'}
                  </span>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>

              <div className="space-y-4 overflow-y-auto overscroll-contain p-4 pb-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-sm font-semibold text-slate-700">Post Applied For</label>
                      <span className="text-xs text-slate-500">{filters.postApplied.length} selected</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {POST_APPLIED_OPTIONS.map((option) => {
                        const checked = filters.postApplied.includes(option.value);
                        return (
                          <label
                            key={option.value}
                            className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm font-medium cursor-pointer transition-colors ${
                              checked
                                ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCheckboxFilter('postApplied', option.value)}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>{option.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <label className="text-sm font-semibold text-slate-700">Min Experience (months)</label>
                    <div className="relative mt-2">
                      <input
                        type="number"
                        value={filters.minExperienceMonths}
                        onChange={(e) => setFilters({ ...filters, minExperienceMonths: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-16 text-sm text-slate-700 focus:border-indigo-500 focus:ring-indigo-500"
                        min="0"
                        placeholder="e.g. 24"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-slate-400">
                        months
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-sm font-semibold text-slate-700">PhD Status</label>
                      <span className="text-xs text-slate-500">{filters.phdStatus.length} selected</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {PHD_STATUS_OPTIONS.map((option) => {
                        const checked = filters.phdStatus.includes(option.value);
                        return (
                          <label
                            key={option.value}
                            className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm font-medium cursor-pointer transition-colors ${
                              checked
                                ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCheckboxFilter('phdStatus', option.value)}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>{option.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-sm font-semibold text-slate-700">Submitted Date Range</label>
                      <span className="text-xs text-slate-500">
                        {filters.submittedDateFrom || filters.submittedDateTo ? 'Active' : 'Any'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500">From</label>
                        <input
                          type="date"
                          value={filters.submittedDateFrom}
                          onChange={(e) => setFilters({ ...filters, submittedDateFrom: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500">To</label>
                        <input
                          type="date"
                          value={filters.submittedDateTo}
                          onChange={(e) => setFilters({ ...filters, submittedDateTo: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <label className="text-sm font-semibold text-slate-700">College (Highest Degree)</label>
                    <span className="text-xs text-slate-500">
                      {filters.colleges.length} selected of {collegeOptions.length}
                    </span>
                  </div>
                  <div className="mb-3">
                    <input
                      type="text"
                      value={collegeSearch}
                      onChange={(e) => setCollegeSearch(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="Search colleges..."
                    />
                  </div>
                  <div className="pr-1">
                    {filteredCollegeOptions.length === 0 ? (
                      <span className="text-sm text-slate-500">
                        {collegeOptions.length === 0
                          ? 'No colleges found in current applicant pool.'
                          : 'No colleges match your search.'}
                      </span>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                        {filteredCollegeOptions.map((option) => {
                          const checked = filters.colleges.includes(option.value);
                          return (
                            <label
                              key={option.value}
                              className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm font-medium cursor-pointer transition-colors ${
                                checked
                                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleCheckboxFilter('colleges', option.value)}
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="truncate">{option.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="pt-4">
          {filteredCandidates.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="min-w-[920px] px-4 pb-4">
                <div className={`grid ${multiAssignMode ? 'grid-cols-[54px_90px_1.9fr_1.4fr_1.2fr_2fr]' : 'grid-cols-[90px_1.9fr_1.4fr_1.2fr_2fr]'} items-start gap-4 border-b border-gray-200 px-3 pb-3 text-base font-semibold text-gray-700`}>
                  {multiAssignMode && <div>Select</div>}
                  <div>Rank</div>
                  <div>Name</div>
                  <div>Position Applied</div>
                  <div>Department</div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span>Actions</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (multiAssignMode) {
                            setMultiAssignMode(false);
                            setSelectedCandidateIds([]);
                            return;
                          }
                          setMultiAssignMode(true);
                        }}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          multiAssignMode
                            ? 'bg-gray-700 text-white border-gray-700'
                            : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                        }`}
                      >
                        {multiAssignMode ? 'Cancel Multi Assign' : 'Multi Assign'}
                      </button>
                    </div>
                    {multiAssignMode && (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={toggleSelectAllAssignable}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-300 text-gray-700 hover:bg-gray-100"
                        >
                          {areAllAssignableSelected ? 'Deselect All' : 'Select All'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedCandidateIds([])}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-300 text-gray-700 hover:bg-gray-100"
                        >
                          Clear Selection
                        </button>
                        <button
                          type="button"
                          onClick={openBulkAssignModal}
                          disabled={selectedCandidateIds.length === 0}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                            selectedCandidateIds.length === 0
                              ? 'bg-gray-200 text-gray-500 border-gray-200 cursor-not-allowed'
                              : 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                          }`}
                        >
                          Assign Selected ({selectedCandidateIds.length})
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {paginatedCandidates.map((candidate, index) => {
                  const globalIndex = startIndex + index; // Calculate global position
                  return (
                    <div
                    key={candidate.id}
                    // style={{ backgroundColor: getGenderRowBackground(candidate.gender) }}
                    className={`grid ${multiAssignMode ? 'grid-cols-[54px_90px_1.9fr_1.4fr_1.2fr_2fr]' : 'grid-cols-[90px_1.9fr_1.4fr_1.2fr_2fr]'} items-center gap-4 border-b border-gray-100 px-3 py-3 transition-colors`}
                  >
                    {multiAssignMode && (
                      <div>
                        <input
                          type="checkbox"
                          checked={selectedCandidateIds.includes(candidate.id)}
                          onChange={() => toggleCandidateSelection(candidate.id)}
                          disabled={!getAssignableType(candidate.status)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                        />
                      </div>
                    )}
                    <div>
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
                        {globalIndex + 1}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-[16px] font-semibold text-gray-900">{formatCandidateName(candidate)}</p>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-medium text-gray-800">{formatPostAppliedFor(candidate)}</p>
                    </div>

                    <div>
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                        {toTitleCase(candidate.department)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleViewDetails(candidate)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-xs font-semibold"
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
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-xs font-semibold"
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
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-xs font-semibold"
                        >
                          Assign Interview
                        </button>
                      )}
                      {['cv_assigned', 'interview_assigned'].includes(candidate.status) && (
                        <button
                          disabled
                          className="bg-gray-400 text-white px-4 py-2 rounded-lg cursor-not-allowed text-xs font-semibold"
                        >
                          Assigned
                        </button>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                  <div className="flex items-center text-sm text-gray-700">
                    Showing {startIndex + 1} to {Math.min(endIndex, totalCandidates)} of {totalCandidates} candidates
                    (Page {currentPage} of {totalPages})
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handlePrevPage}
                      disabled={currentPage === 1}
                      className={`px-3 py-2 rounded-lg border font-medium text-sm ${
                        currentPage === 1
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      ← Previous
                    </button>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-2 rounded-lg border font-medium text-sm ${
                        currentPage === totalPages
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              No candidates found for the selected department.
            </div>
          )}
        </div>
      </div>

      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {candidateToAssign
                  ? (assignType === 'interview' ? 'Assign Interview Committee' : 'Assign Committee for CV Review')
                  : 'Assign Committee to Selected Candidates'}
              </h3>
              <button
                onClick={resetAssignModalState}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                {candidateToAssign ? (
                  <>
                    Assigning committee for: <span className="font-semibold">{formatCandidateName(candidateToAssign)}</span>
                  </>
                ) : (
                  <>
                    Assigning committee for <span className="font-semibold">{selectedCandidateIds.length}</span> selected candidate(s)
                  </>
                )}
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
                onClick={handleConfirmAssignment}
                disabled={bulkAssigning}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                {bulkAssigning ? 'Assigning...' : 'Assign'}
              </button>
              <button
                onClick={resetAssignModalState}
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
            <div className="flex items-start justify-between py-5 pr-6 pl-2 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="min-w-0">
                <h2 className="m-0 text-left text-2xl font-bold text-gray-900">
                  {formatCandidateName(selectedCandidate)}
                </h2>
            <div className="flex items-center space-x-2 mt-1">
              <p className="text-sm text-gray-600">{toTitleCase(selectedCandidate.position)}</p>
              <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                {toTitleCase(selectedCandidate.department)}
              </span>
            </div>
          </div>
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={handleShowEvaluation}
                  disabled={evaluationLoading}
                  className="px-3 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
                >
                  {evaluationLoading ? 'Loading...' : 'Show Evaluation'}
                </button>

                {selectedCandidate.status && (
                  <span
                    className={`inline-flex items-center self-end px-2.5 py-1 rounded-full text-xs font-medium ${getStatusMeta(normalizeCandidateStatus(selectedCandidate.status)).color}`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full mr-1.5 ${getStatusMeta(normalizeCandidateStatus(selectedCandidate.status)).dot}`}
                    />
                    {getStatusMeta(normalizeCandidateStatus(selectedCandidate.status)).label}
                  </span>
                )}

                {selectedCandidateStatus === 'interview_completed' && (
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedFinalDecision}
                      onChange={(e) => setSelectedFinalDecision(e.target.value)}
                      className="min-w-[170px] rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Final Decision</option>
                      <option value="accept">Accept</option>
                      <option value="reject">Reject</option>
                    </select>
                    <button
                      type="button"
                      onClick={applyFinalDecision}
                      disabled={!selectedFinalDecision || updatingStatus}
                      className="px-3 py-1.5 rounded-md text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300"
                    >
                      {updatingStatus ? 'Saving...' : 'Apply'}
                    </button>
                  </div>
                )}
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
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Application Submitted</p>
                        <p className="text-sm text-gray-900">{formatSubmittedDate(selectedCandidate)}</p>
                      </div>
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

                  <CVParsingSection
                    candidateId={selectedCandidate.id}
                    isOpen={Boolean(selectedCandidate?.id)}
                  />

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
