import { X } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase-client';
import CVParsingSection from './CVParsingSection';

const toTitleCase = (value = '') =>
  String(value)
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

const normalizeDegreeRank = (degree = '') => {
  const normalized = String(degree || '').toLowerCase();
  if (!normalized) return 0;
  if (normalized.includes('phd') || normalized.includes('doctor')) return 3;
  if (normalized.includes('master') || normalized.includes('m.tech') || normalized.includes('mtech') || normalized.includes('mba') || normalized.includes('m.sc') || normalized.includes('msc') || normalized.includes('m.a') || normalized.includes('ma')) return 2;
  if (normalized.includes('bachelor') || normalized.includes('b.tech') || normalized.includes('btech') || normalized.includes('b.sc') || normalized.includes('bsc') || normalized.includes('b.a') || normalized.includes('ba')) return 1;
  return 0;
};

const firstNonEmpty = (...values) =>
  values
    .map((value) => (value === null || value === undefined ? '' : String(value).trim()))
    .find(Boolean) || '';

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

const getAdditionalEducation = (candidate) => {
  if (!candidate) return null;
  const education = getEducationObject(candidate);

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

  const dedupedByRank = Array.from(
    degrees
      .reduce((acc, degree) => {
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
      }, new Map())
      .values()
  );

  const resolvedHighestRank =
    highestRank || Math.max(...dedupedByRank.map((degree) => degree.rank));
  const nextLowerDegree = dedupedByRank
    .filter((degree) => degree.rank < resolvedHighestRank)
    .sort((a, b) => b.rank - a.rank)[0];

  return nextLowerDegree || null;
};

const computeExperienceFromArrays = (teaching = [], research = []) => {
  const parseDate = (value) => (value ? new Date(value) : null);
  const monthsBetween = (start, end) => {
    if (!start || !end) return 0;
    const startDate = parseDate(start);
    const endDate = parseDate(end);
    if (!startDate || !endDate || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
    let months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
    if (endDate.getDate() < startDate.getDate()) months -= 1;
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

const normalizeCandidateStatus = (status) =>
  String(status || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

const getStatusMeta = (status) => {
  const map = {
    submitted: { label: 'Submitted', color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-500' },
    cv_assigned: { label: 'CV Assigned', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
    cv_shortlisted: { label: 'CV Shortlisted', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
    interview_assigned: { label: 'Interview Assigned', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
    interview_completed: { label: 'Interview Completed', color: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
    final_shortlisted: { label: 'Final Shortlisted', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
    cv_rejected: { label: 'CV Rejected', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
    final_rejected: { label: 'Final Rejected', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  };
  return map[status] || { label: toTitleCase(status || 'Unknown'), color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-500' };
};

const getDocumentUrl = (path) => {
  if (!path) return '';
  return supabase.storage.from('application-reports').getPublicUrl(path).data.publicUrl || '';
};

export default function CandidateDetailsModal({
  isOpen,
  candidate,
  onClose,
  onShowEvaluation,
  evaluationLoading = false,
}) {
  if (!isOpen || !candidate) return null;

  const additionalEducation = getAdditionalEducation(candidate);
  const teachingExperiences = candidate.teachingExperiences || [];
  const researchExperiences = candidate.researchExperiences || [];
  const derivedExperience = candidate.experience || computeExperienceFromArrays(teachingExperiences, researchExperiences);
  const normalizedStatus = normalizeCandidateStatus(candidate.status);
  const statusMeta = getStatusMeta(normalizedStatus);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="flex items-start justify-between py-5 pr-6 pl-2 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="min-w-0">
            <h2 className="m-0 text-left text-2xl font-bold text-gray-900">{formatCandidateName(candidate)}</h2>
            <div className="flex items-center space-x-2 mt-1">
              <p className="text-sm text-gray-600">{toTitleCase(candidate.position)}</p>
              <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                {toTitleCase(candidate.department)}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex flex-col items-end gap-2">
              {onShowEvaluation && (
                <button
                  onClick={() => onShowEvaluation(candidate.id)}
                  disabled={evaluationLoading}
                  className="px-3 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
                >
                  {evaluationLoading ? 'Loading...' : 'Show Evaluation'}
                </button>
              )}

              {candidate.status && (
                <span className={`inline-flex items-center self-end px-2.5 py-1 rounded-full text-xs font-medium ${statusMeta.color}`}>
                  <span className={`w-2 h-2 rounded-full mr-1.5 ${statusMeta.dot}`} />
                  {statusMeta.label}
                </span>
              )}
            </div>

            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {candidate.loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4" />
                <p className="text-gray-600">Loading candidate details...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
              <div className="space-y-4">
                <div className="bg-white border rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 border-b pb-2">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Email</p>
                      <p className="text-sm text-gray-900">{candidate.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Phone</p>
                      <p className="text-sm text-gray-900">{candidate.phone || 'N/A'}</p>
                    </div>
                    {candidate.gender && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Gender</p>
                        <p className="text-sm text-gray-900">{candidate.gender}</p>
                      </div>
                    )}
                    {candidate.date_of_birth && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Date of Birth</p>
                        <p className="text-sm text-gray-900">{new Date(candidate.date_of_birth).toLocaleDateString()}</p>
                      </div>
                    )}
                    {candidate.nationality && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Nationality</p>
                        <p className="text-sm text-gray-900">{candidate.nationality}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Application Submitted</p>
                      <p className="text-sm text-gray-900">{formatSubmittedDate(candidate)}</p>
                    </div>
                    {candidate.address && (
                      <div className="col-span-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Address</p>
                        <p className="text-sm text-gray-900">{candidate.address}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white border rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 border-b pb-2">Education</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-indigo-50 rounded p-3">
                      <p className="text-xs font-semibold text-indigo-600 uppercase">Highest Qualification</p>
                      <p className="text-sm font-medium text-gray-900">{candidate.highest_degree || 'Not specified'}</p>
                      {candidate.university && <p className="text-xs text-gray-600">{candidate.university}</p>}
                      {candidate.graduation_year && <p className="text-xs text-gray-600">Graduated: {candidate.graduation_year}</p>}
                    </div>
                    <div className="bg-indigo-50 rounded p-3">
                      <p className="text-xs font-semibold text-indigo-600 uppercase">Additional Qualification</p>
                      <p className="text-sm font-medium text-gray-900">{additionalEducation?.degree || 'Not provided'}</p>
                      {additionalEducation?.institute && <p className="text-xs text-gray-600">{additionalEducation.institute}</p>}
                      {additionalEducation?.year && <p className="text-xs text-gray-600">Graduated: {additionalEducation.year}</p>}
                      {!additionalEducation && <p className="text-xs text-gray-600">No additional education details available.</p>}
                    </div>
                  </div>
                </div>

                <div className="bg-white border rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 border-b pb-2">Experience</h3>
                  <div className="bg-green-50 rounded p-3 mb-4">
                    <p className="text-xs font-semibold text-green-600 uppercase">Total Experience</p>
                    <p className="text-lg font-bold text-gray-900">{derivedExperience}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teachingExperiences.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-gray-700 uppercase mb-2">Teaching Experience</p>
                        {teachingExperiences.slice(0, 2).map((exp, index) => (
                          <div key={`teach-${index}`} className="border-l-4 border-blue-500 pl-3 mb-2">
                            <p className="text-sm font-medium text-gray-900">{exp.post || exp.position || exp.teachingPost || 'Position not specified'}</p>
                            <p className="text-xs text-gray-600">{exp.institution || exp.teachingInstitution || 'Institution not specified'}</p>
                            <p className="text-xs text-gray-500">
                              {exp.start_date || exp.teachingStartDate || 'N/A'} - {exp.end_date || exp.teachingEndDate || 'Present'}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {researchExperiences.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-gray-700 uppercase mb-2">Research Experience</p>
                        {researchExperiences.slice(0, 2).map((exp, index) => (
                          <div key={`research-${index}`} className="border-l-4 border-green-500 pl-3 mb-2">
                            <p className="text-sm font-medium text-gray-900">{exp.post || exp.position || exp.researchPost || 'Position not specified'}</p>
                            <p className="text-xs text-gray-600">{exp.institution || exp.researchInstitution || 'Institution not specified'}</p>
                            <p className="text-xs text-gray-500">
                              {exp.start_date || exp.researchStartDate || 'N/A'} - {exp.end_date || exp.researchEndDate || 'Present'}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white border rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 border-b pb-2">Research Identifiers</h3>
                  <div className="space-y-2">
                    {candidate.scopus_id && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Scopus ID</p>
                        <p className="text-sm text-gray-900">{candidate.scopus_id}</p>
                      </div>
                    )}
                    {candidate.google_scholar_id && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Google Scholar Link</p>
                        <a href={candidate.google_scholar_id} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">
                          {candidate.google_scholar_id}
                        </a>
                      </div>
                    )}
                    {candidate.orchid_id && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">ORCID</p>
                        <p className="text-sm text-gray-900">{candidate.orchid_id}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gradient-to-br from-purple-50 to-indigo-100 border-2 border-indigo-200 rounded-lg p-4 shadow-lg">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 text-center">Research Metrics</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-lg p-3 text-center shadow">
                      <p className="text-xs font-semibold text-purple-600 uppercase mb-1">Scopus</p>
                      <p className="text-3xl font-bold text-purple-700">{candidate.scopus_general_papers ?? 0}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center shadow">
                      <p className="text-xs font-semibold text-blue-600 uppercase mb-1">Conference</p>
                      <p className="text-3xl font-bold text-blue-700">{candidate.conference_papers ?? 0}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center shadow">
                      <p className="text-xs font-semibold text-green-600 uppercase mb-1">Books</p>
                      <p className="text-3xl font-bold text-green-700">{candidate.edited_books ?? 0}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border rounded-lg p-4 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Publications Distribution</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Scopus Papers', value: candidate.scopus_general_papers || 0, color: '#8b5cf6' },
                          { name: 'Conference Papers', value: candidate.conference_papers || 0, color: '#3b82f6' },
                          { name: 'Edited Books', value: candidate.edited_books || 0, color: '#10b981' },
                        ].filter((item) => item.value > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={70}
                        dataKey="value"
                      >
                        {[
                          { name: 'Scopus Papers', value: candidate.scopus_general_papers || 0, color: '#8b5cf6' },
                          { name: 'Conference Papers', value: candidate.conference_papers || 0, color: '#3b82f6' },
                          { name: 'Edited Books', value: candidate.edited_books || 0, color: '#10b981' },
                        ]
                          .filter((item) => item.value > 0)
                          .map((entry, index) => (
                            <Cell key={`pie-${index}`} fill={entry.color} />
                          ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white border rounded-lg p-4 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Documents</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-xs font-semibold text-gray-600">CV</p>
                      {candidate.cv_path ? (
                        <a href={getDocumentUrl(candidate.cv_path)} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                          Download
                        </a>
                      ) : (
                        <p className="text-xs text-gray-400">Not provided</p>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-xs font-semibold text-gray-600">Cover Letter</p>
                      {candidate.cover_letter_path ? (
                        <a href={getDocumentUrl(candidate.cover_letter_path)} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                          Download
                        </a>
                      ) : (
                        <p className="text-xs text-gray-400">Not provided</p>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-xs font-semibold text-gray-600">Teaching Statement</p>
                      {candidate.teaching_statement_path ? (
                        <a href={getDocumentUrl(candidate.teaching_statement_path)} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                          Download
                        </a>
                      ) : (
                        <p className="text-xs text-gray-400">Not provided</p>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-xs font-semibold text-gray-600">Research Statement</p>
                      {candidate.research_statement_path ? (
                        <a href={getDocumentUrl(candidate.research_statement_path)} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                          Download
                        </a>
                      ) : (
                        <p className="text-xs text-gray-400">Not provided</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* CV Parsing Section */}
                <CVParsingSection 
                  candidateId={candidate.id} 
                  isOpen={isOpen}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-5 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
