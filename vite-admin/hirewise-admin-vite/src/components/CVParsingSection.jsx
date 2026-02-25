import { useState, useEffect } from 'react'
import { API_BASE } from '../lib/config'

export default function CVParsingSection({ candidateId, isOpen }) {
  const [cvData, setCvData] = useState(null);
  const [cvLoading, setCvLoading] = useState(false);
  const [cvError, setCvError] = useState(null);

  // Fetch CV parsing results when component mounts or candidateId changes
  useEffect(() => {
    if (isOpen && candidateId) {
      fetchCVParsing();
    }
  }, [isOpen, candidateId]);

  const fetchCVParsing = async () => {
    setCvLoading(true);
    setCvError(null);
    try {
      const response = await fetch(`${API_BASE}/api/applications/parse-cv/${candidateId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to parse CV');
      }
      
      const result = await response.json();
      setCvData(result.data);
    } catch (error) {
      console.error('CV parsing error:', error);
      setCvError(error.message);
    } finally {
      setCvLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-5 shadow-md">
      <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
        CV Parsing
      </h3>
      
      {cvLoading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mb-3"></div>
          <p className="text-sm text-purple-700">Analyzing CV with AI...</p>
        </div>
      )}

      {cvError && (
        <div className="bg-red-100 border border-red-300 rounded-lg p-4">
          <p className="text-sm text-red-800 font-medium">❌ {cvError}</p>
          <button 
            onClick={fetchCVParsing}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {cvData && !cvLoading && !cvError && (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {/* Primary Specialization */}
          {cvData.primary_specialization && (
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <p className="text-xs font-semibold text-purple-600 uppercase mb-1">Primary Specialization</p>
              <p className="text-sm text-gray-900 font-medium">{cvData.primary_specialization}</p>
            </div>
          )}

          {/* Research Information */}
          {cvData.research_information && (
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <p className="text-xs font-semibold text-blue-600 uppercase mb-2">Research Profile</p>
              <div className="space-y-2 text-xs">
                {cvData.research_information.research_topics?.length > 0 && (
                  <div>
                    <span className="font-medium text-gray-700">Topics:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {cvData.research_information.research_topics.map((topic, i) => (
                        <span key={i} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {cvData.research_information.specializations?.length > 0 && (
                  <div>
                    <span className="font-medium text-gray-700">Specializations:</span>
                    <p className="text-gray-900 mt-1">{cvData.research_information.specializations.join(', ')}</p>
                  </div>
                )}
                {cvData.research_information.total_projects && (
                  <div>
                    <span className="font-medium text-gray-700">Total Projects:</span>
                    <span className="text-gray-900 ml-1">{cvData.research_information.total_projects}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Project Information */}
          {cvData.project_information?.length > 0 && (
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <p className="text-xs font-semibold text-green-600 uppercase mb-2">Projects ({cvData.project_information.length})</p>
              <div className="space-y-2">
                {cvData.project_information.slice(0, 3).map((proj, i) => (
                  <div key={i} className="border-l-2 border-green-400 pl-2 text-xs">
                    {proj.title && <p className="font-medium text-gray-900">{proj.title}</p>}
                    <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-600">
                      {proj.duration && <span>⏱ {proj.duration}</span>}
                      {proj.role && <span>👤 {proj.role}</span>}
                      {proj.funding_agency && <span>🏛 {proj.funding_agency}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Funding Information */}
          {cvData.funding_information && (
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <p className="text-xs font-semibold text-yellow-600 uppercase mb-2">Funding Details</p>
              <div className="space-y-1 text-xs">
                {cvData.funding_information.agencies?.length > 0 && (
                  <div>
                    <span className="font-medium text-gray-700">Agencies:</span>
                    <p className="text-gray-900">{cvData.funding_information.agencies.join(', ')}</p>
                  </div>
                )}
                {cvData.funding_information.total_funding && (
                  <div>
                    <span className="font-medium text-gray-700">Total Funding:</span>
                    <span className="text-gray-900 ml-1">{cvData.funding_information.total_funding}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Intellectual Property */}
          {cvData.intellectual_property && (
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <p className="text-xs font-semibold text-indigo-600 uppercase mb-2">Intellectual Property</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {cvData.intellectual_property.patents_filed && (
                  <div>
                    <span className="font-medium text-gray-700">Patents Filed:</span>
                    <span className="text-gray-900 ml-1">{cvData.intellectual_property.patents_filed}</span>
                  </div>
                )}
                {cvData.intellectual_property.patents_granted && (
                  <div>
                    <span className="font-medium text-gray-700">Patents Granted:</span>
                    <span className="text-gray-900 ml-1">{cvData.intellectual_property.patents_granted}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Teaching Contribution */}
          {cvData.teaching_contribution && (
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <p className="text-xs font-semibold text-orange-600 uppercase mb-2">Teaching Contribution</p>
              <div className="space-y-1 text-xs">
                {cvData.teaching_contribution.courses_taught?.length > 0 && (
                  <div>
                    <span className="font-medium text-gray-700">Courses:</span>
                    <p className="text-gray-900">{cvData.teaching_contribution.courses_taught.join(', ')}</p>
                  </div>
                )}
                {cvData.teaching_contribution.ug_pg_level && (
                  <div>
                    <span className="font-medium text-gray-700">Level:</span>
                    <span className="text-gray-900 ml-1">{cvData.teaching_contribution.ug_pg_level}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Administrative Responsibilities */}
          {cvData.administrative_responsibilities?.length > 0 && (
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <p className="text-xs font-semibold text-red-600 uppercase mb-2">Administrative Roles</p>
              <ul className="list-disc list-inside text-xs text-gray-900 space-y-1">
                {cvData.administrative_responsibilities.map((role, i) => (
                  <li key={i}>{role}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Consultancy & Startup */}
          {cvData.consultancy_startup && (
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <p className="text-xs font-semibold text-teal-600 uppercase mb-2">Consultancy & Startups</p>
              <div className="space-y-1 text-xs">
                {cvData.consultancy_startup.consultancy_projects?.length > 0 && (
                  <div>
                    <span className="font-medium text-gray-700">Consultancy:</span>
                    <p className="text-gray-900">{cvData.consultancy_startup.consultancy_projects.join(', ')}</p>
                  </div>
                )}
                {cvData.consultancy_startup.startup_involvement?.length > 0 && (
                  <div>
                    <span className="font-medium text-gray-700">Startups:</span>
                    <p className="text-gray-900">{cvData.consultancy_startup.startup_involvement.join(', ')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Technical Skills */}
          {cvData.technical_skills && (
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <p className="text-xs font-semibold text-pink-600 uppercase mb-2">Technical Skills</p>
              <div className="space-y-1 text-xs">
                {cvData.technical_skills.languages_frameworks?.length > 0 && (
                  <div>
                    <span className="font-medium text-gray-700">Languages & Frameworks:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {cvData.technical_skills.languages_frameworks.map((skill, i) => (
                        <span key={i} className="bg-pink-100 text-pink-800 px-2 py-0.5 rounded text-xs">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Publications */}
          {cvData.publications && (
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <p className="text-xs font-semibold text-gray-700 uppercase mb-1">Publications</p>
              <p className="text-2xl font-bold text-gray-900">{cvData.publications}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
