import { X, Star } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function CandidateDetailsModal({ 
  isOpen, 
  candidate, 
  onClose, 
  getDepartmentColor 
}) {
  if (!isOpen || !candidate) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white ${
              (candidate.gender || '').toLowerCase() === 'female' ? 'bg-pink-500' : 'bg-blue-500'
            }`}>
              {candidate.listRank || 1}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {candidate.first_name 
                  ? `${candidate.first_name}${candidate.middle_name ? ' ' + candidate.middle_name : ''}${candidate.last_name ? ' ' + candidate.last_name : ''}`
                  : 'N/A'
                }
              </h2>
              <p className="text-sm text-gray-600">{candidate.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Left Side - Detailed Information */}
            <div className="space-y-6">
              {candidate.loading ? (
                <div className="text-center py-8 text-gray-500">Loading details...</div>
              ) : (
                <>
                  {/* Basic Info */}
                  <div className="bg-white border rounded-lg p-4 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Basic Information</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Email</p>
                        <p className="text-sm text-gray-900">{candidate.email || 'N/A'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase">Position Applied</p>
                          <p className="text-sm text-gray-900">{candidate.positionApplied || candidate.position || candidate.teachingPost || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase">Department</p>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getDepartmentColor(candidate.department)}`}>
                            {candidate.department || 'N/A'}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase">Date of Birth</p>
                          <p className="text-sm text-gray-900">{candidate.date_of_birth ? new Date(candidate.date_of_birth).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase">Nationality</p>
                          <p className="text-sm text-gray-900">{candidate.nationality || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase">Phone</p>
                          <p className="text-sm text-gray-900">{candidate.phone || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase">Gender</p>
                          <p className="text-sm text-gray-900">{candidate.gender || 'N/A'}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Address</p>
                        <p className="text-sm text-gray-900">{candidate.address || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Education */}
                  <div className="bg-white border rounded-lg p-4 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Education</h3>
                    <div className="space-y-4">
                      {/* PhD */}
                      {candidate.phd_status && candidate.phd_status !== 'Not done' && (
                        <div className="border-l-4 border-indigo-500 pl-4">
                          <p className="text-xs font-semibold text-indigo-600 uppercase">PhD</p>
                          <p className="text-sm font-medium text-gray-900">{candidate.phd_institute || candidate.institution || 'N/A'}</p>
                          <p className="text-xs text-gray-600">
                            {candidate.phd_degree_name || 'N/A'} | Year: {candidate.phd_year || 'N/A'}
                          </p>
                          {candidate.phd_specialization && (
                            <p className="text-xs text-gray-600 mt-1">Specialization: {candidate.phd_specialization}</p>
                          )}
                          {(candidate.phd_cgpa || candidate.phd_percentage) && (
                            <p className="text-xs text-gray-600 mt-1">
                              {candidate.phd_cgpa && `CGPA: ${candidate.phd_cgpa}${candidate.phd_cgpa_scale ? ` (Out of ${candidate.phd_cgpa_scale})` : ''}`}
                              {candidate.phd_percentage && `${candidate.phd_cgpa ? ' | ' : ''}Percentage: ${candidate.phd_percentage}%`}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Master's */}
                      {candidate.master_institute && (
                        <div className="border-l-4 border-blue-500 pl-4">
                          <p className="text-xs font-semibold text-blue-600 uppercase">Master's Degree</p>
                          <p className="text-sm font-medium text-gray-900">{candidate.master_institute}</p>
                          <p className="text-xs text-gray-600">
                            {candidate.master_degree_name || 'N/A'} | Year: {candidate.master_year || 'N/A'}
                          </p>
                          {(candidate.master_cgpa || candidate.master_percentage) && (
                            <p className="text-xs text-gray-600 mt-1">
                              {candidate.master_cgpa && `CGPA: ${candidate.master_cgpa}${candidate.master_cgpa_scale ? ` (Out of ${candidate.master_cgpa_scale})` : ''}`}
                              {candidate.master_percentage && `${candidate.master_cgpa ? ' | ' : ''}Percentage: ${candidate.master_percentage}%`}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Bachelor's */}
                      {candidate.bachelor_institute && (
                        <div className="border-l-4 border-green-500 pl-4">
                          <p className="text-xs font-semibold text-green-600 uppercase">Bachelor's Degree</p>
                          <p className="text-sm font-medium text-gray-900">{candidate.bachelor_institute}</p>
                          <p className="text-xs text-gray-600">
                            {candidate.bachelor_degree_name || 'N/A'} | Year: {candidate.bachelor_year || 'N/A'}
                          </p>
                          {(candidate.bachelor_cgpa || candidate.bachelor_percentage) && (
                            <p className="text-xs text-gray-600 mt-1">
                              {candidate.bachelor_cgpa && `CGPA: ${candidate.bachelor_cgpa}${candidate.bachelor_cgpa_scale ? ` (Out of ${candidate.bachelor_cgpa_scale})` : ''}`}
                              {candidate.bachelor_percentage && `${candidate.bachelor_cgpa ? ' | ' : ''}Percentage: ${candidate.bachelor_percentage}%`}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Highest Degree Summary */}
                      <div className="bg-gray-50 rounded p-3 mt-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Highest Qualification</p>
                        <p className="text-sm text-gray-900">{candidate.highest_degree || candidate.qualification || 'N/A'}</p>
                        <p className="text-xs text-gray-600">
                          {candidate.university || 'N/A'} | Graduated: {candidate.graduation_year || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Experience */}
                  <div className="bg-white border rounded-lg p-4 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Experience</h3>
                    <div className="space-y-3">
                      <div className="bg-blue-50 rounded p-3">
                        <p className="text-xs font-semibold text-blue-600 uppercase">Total Experience</p>
                        <p className="text-lg font-bold text-gray-900">{candidate.total_experience || candidate.experience || 'N/A'}</p>
                      </div>
                      
                      {/* Teaching Experiences */}
                      {candidate.teachingExperiences && candidate.teachingExperiences.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-gray-700 uppercase mb-2">Teaching Experience</p>
                          {candidate.teachingExperiences.slice(0, 3).map((exp, idx) => (
                            <div key={idx} className="border-l-4 border-blue-500 pl-3 mb-2">
                              <p className="text-sm font-medium text-gray-900">{exp.post || 'N/A'}</p>
                              <p className="text-xs text-gray-600">{exp.institution || 'N/A'}</p>
                              <p className="text-xs text-gray-500">
                                {exp.start_date ? new Date(exp.start_date).getFullYear() : 'N/A'} - {exp.end_date ? new Date(exp.end_date).getFullYear() : 'Present'}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Research Experiences */}
                      {candidate.researchExperiences && candidate.researchExperiences.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-gray-700 uppercase mb-2">Research Experience</p>
                          {candidate.researchExperiences.slice(0, 3).map((exp, idx) => (
                            <div key={idx} className="border-l-4 border-green-500 pl-3 mb-2">
                              <p className="text-sm font-medium text-gray-900">{exp.post || 'Researcher'}</p>
                              <p className="text-xs text-gray-600">{exp.institution || 'N/A'}</p>
                              <p className="text-xs text-gray-500">
                                {exp.start_date ? new Date(exp.start_date).getFullYear() : 'N/A'} - {exp.end_date ? new Date(exp.end_date).getFullYear() : 'Present'}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Research & Publications */}
                  <div className="bg-white border rounded-lg p-4 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Research & Publications</h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase">Total Papers</p>
                          <p className="text-2xl font-bold text-indigo-600">{candidate.totalPapers || 0}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase">Research Score</p>
                          <p className="text-2xl font-bold text-green-600">{candidate.researchScore10 || 'N/A'}/10</p>
                        </div>
                      </div>
                      {candidate.scopus_id && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase">Scopus ID</p>
                          <p className="text-sm text-gray-900">{candidate.scopus_id}</p>
                        </div>
                      )}
                      {candidate.orchid_id && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase">ORCID</p>
                          <p className="text-sm text-gray-900">{candidate.orchid_id}</p>
                        </div>
                      )}
                      {candidate.specialization && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase">Specialization</p>
                          <p className="text-sm text-gray-900">{candidate.specialization}</p>
                        </div>
                      )}
                      {candidate.publications && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase">Publications</p>
                          <p className="text-sm text-gray-900 whitespace-pre-wrap">{candidate.publications}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Info */}
                  {candidate.certifications && (
                    <div className="bg-white border rounded-lg p-4 shadow-sm">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Certifications</h3>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{candidate.certifications}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right Side - Visual Representation */}
            <div className="space-y-4">
              {!candidate.loading && (
                <>
                  {/* Score Overview Card - Compact */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-indigo-200 rounded-lg p-4 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Overall Ranking</p>
                        <p className="text-3xl font-bold text-indigo-600">{candidate.total_score?.toFixed(1) || 'N/A'}</p>
                      </div>
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white ${
                        (candidate.gender || '').toLowerCase() === 'female' ? 'bg-pink-500' : 'bg-blue-500'
                      } shadow-xl`}>
                        {candidate.listRank || 1}
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                      <p className="text-xs font-semibold text-blue-600 uppercase mb-1">QS Score</p>
                      <p className="text-2xl font-bold text-blue-700">{candidate.qs10 || 0}</p>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                      <p className="text-xs font-semibold text-orange-600 uppercase mb-1">NIRF Score</p>
                      <p className="text-2xl font-bold text-orange-700">{candidate.nirf10 || 0}</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <p className="text-xs font-semibold text-green-600 uppercase mb-1">Research</p>
                      <p className="text-2xl font-bold text-green-700">{candidate.researchScore10 || 0}</p>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
                      <p className="text-xs font-semibold text-purple-600 uppercase mb-1">Papers</p>
                      <p className="text-2xl font-bold text-purple-700">{candidate.totalPapers || 0}</p>
                    </div>
                  </div>

                  {/* Score Breakdown - Progress Bars */}
                  <div className="bg-white border rounded-lg p-4 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 mb-3">Score Breakdown</h3>
                    <div className="space-y-3">
                      {/* QS Score Bar */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-semibold text-gray-700">QS Ranking</span>
                          <span className="text-sm font-bold text-blue-600">{candidate.qs10 || 0}/10</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${((candidate.qs10 || 0) / 10) * 100}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* NIRF Score Bar */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-semibold text-gray-700">NIRF Ranking</span>
                          <span className="text-sm font-bold text-orange-600">{candidate.nirf10 || 0}/10</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-orange-400 to-orange-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${((candidate.nirf10 || 0) / 10) * 100}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Research Score Bar */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-semibold text-gray-700">Research Score</span>
                          <span className="text-sm font-bold text-green-600">{candidate.researchScore10 || 0}/10</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-green-400 to-green-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${((candidate.researchScore10 || 0) / 10) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Score Distribution Pie Chart */}
                  <div className="bg-white border rounded-lg p-4 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 mb-2">Score Distribution</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'University', value: Math.max(candidate.qs10 || 0, candidate.nirf10 || 0), color: '#3b82f6' },
                            { name: 'Research', value: candidate.researchScore10 || 0, color: '#10b981' },
                            { name: 'Other', value: Math.max(0, (candidate.total_score || 0) - (Math.max(candidate.qs10 || 0, candidate.nirf10 || 0) + (candidate.researchScore10 || 0))), color: '#f59e0b' }
                          ].filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value.toFixed(1)}`}
                          outerRadius={70}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {[
                            { name: 'University', value: Math.max(candidate.qs10 || 0, candidate.nirf10 || 0), color: '#3b82f6' },
                            { name: 'Research', value: candidate.researchScore10 || 0, color: '#10b981' },
                            { name: 'Other', value: Math.max(0, (candidate.total_score || 0) - (Math.max(candidate.qs10 || 0, candidate.nirf10 || 0) + (candidate.researchScore10 || 0))), color: '#f59e0b' }
                          ].filter(item => item.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Research Metrics Bar Chart */}
                  <div className="bg-white border rounded-lg p-4 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 mb-2">Research Metrics</h3>
                    <ResponsiveContainer width="100%" height={150}>
                      <BarChart
                        data={[
                          { 
                            name: 'Publications', 
                            count: candidate.totalPapers || 0 
                          }
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8b5cf6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Performance Overview - Horizontal Bars */}
                  <div className="bg-white border rounded-lg p-4 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 mb-3">Performance Overview</h3>
                    <div className="space-y-3">
                      {/* QS Bar */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-semibold text-blue-600">QS Ranking</span>
                          <span className="text-sm font-bold text-blue-700">{candidate.qs10 || 0}/10</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full flex items-center justify-center text-xs font-bold text-white transition-all duration-500"
                            style={{ width: `${((candidate.qs10 || 0) / 10) * 100}%`, minWidth: '30px' }}
                          >
                            {candidate.qs10 || 0}
                          </div>
                        </div>
                      </div>

                      {/* NIRF Bar */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-semibold text-orange-600">NIRF Ranking</span>
                          <span className="text-sm font-bold text-orange-700">{candidate.nirf10 || 0}/10</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-orange-400 to-orange-600 h-full rounded-full flex items-center justify-center text-xs font-bold text-white transition-all duration-500"
                            style={{ width: `${((candidate.nirf10 || 0) / 10) * 100}%`, minWidth: '30px' }}
                          >
                            {candidate.nirf10 || 0}
                          </div>
                        </div>
                      </div>

                      {/* Research Bar */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-semibold text-green-600">Research Score</span>
                          <span className="text-sm font-bold text-green-700">{candidate.researchScore10 || 0}/10</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-green-400 to-green-600 h-full rounded-full flex items-center justify-center text-xs font-bold text-white transition-all duration-500"
                            style={{ width: `${((candidate.researchScore10 || 0) / 10) * 100}%`, minWidth: '30px' }}
                          >
                            {candidate.researchScore10 || 0}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Institution Details */}
                  <div className="bg-white border rounded-lg p-4 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 mb-3">Institution Details</h3>
                    <div className="space-y-2 text-xs">
                      <div>
                        <p className="font-semibold text-gray-500 uppercase">University</p>
                        <p className="text-sm text-gray-900">{candidate.university || candidate.phd_institute || candidate.institution || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-500 uppercase">Graduation Year</p>
                        <p className="text-sm text-gray-900">{candidate.graduation_year || candidate.phd_year || 'N/A'}</p>
                      </div>
                      {candidate.phd_status && candidate.phd_status !== 'Not done' && (
                        <div>
                          <p className="font-semibold text-gray-500 uppercase">PhD Status</p>
                          <p className="text-sm text-gray-900">{candidate.phd_status}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
