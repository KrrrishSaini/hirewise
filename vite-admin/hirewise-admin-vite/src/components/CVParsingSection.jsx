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
          {/* 1. Teaching Contribution */}
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-xs font-semibold text-orange-600 uppercase mb-2">1. Teaching Contribution</p>
            <div className="space-y-1 text-xs">
              <div>
                <span className="font-medium text-gray-700">Courses Taught:</span>
                <p className="text-gray-900">{cvData.teaching_contribution?.courses_taught?.length > 0 ? cvData.teaching_contribution.courses_taught.join(', ') : 'N/A'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Level:</span>
                <span className="text-gray-900 ml-1">{cvData.teaching_contribution?.ug_pg_level || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Number of Courses:</span>
                <span className="text-gray-900 ml-1">{cvData.teaching_contribution?.number_of_courses || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* 2. Research Projects */}
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-xs font-semibold text-green-600 uppercase mb-2">2. Research Projects</p>
            {cvData.project_information?.length > 0 ? (
              <div className="space-y-2">
                {cvData.project_information.slice(0, 5).map((proj, i) => (
                  <div key={i} className="border-l-2 border-green-400 pl-2 text-xs">
                    <p className="font-medium text-gray-900">{proj.title || 'Untitled Project'}</p>
                    <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-600">
                      {proj.duration && <span>⏱ {proj.duration}</span>}
                      {proj.role && <span>👤 {proj.role}</span>}
                      {proj.funding_agency && <span>🏛 {proj.funding_agency}</span>}
                      {proj.funding_amount && <span>💰 {proj.funding_amount}</span>}
                    </div>
                  </div>
                ))}
                {cvData.project_information.length > 5 && (
                  <p className="text-xs text-gray-500 italic">+ {cvData.project_information.length - 5} more projects</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-500">No research projects information available</p>
            )}
          </div>

          {/* 3. Administrative Responsibilities */}
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-xs font-semibold text-red-600 uppercase mb-2">3. Administrative Responsibilities</p>
            {cvData.administrative_responsibilities?.length > 0 ? (
              <ul className="list-disc list-inside text-xs text-gray-900 space-y-1">
                {cvData.administrative_responsibilities.map((role, i) => (
                  <li key={i}>{role}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-500">No administrative responsibilities information available</p>
            )}
          </div>

          {/* 4. PhD Guidance */}
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-xs font-semibold text-purple-600 uppercase mb-2">4. PhD Guidance</p>
            <div className="space-y-1 text-xs">
              <div>
                <span className="font-medium text-gray-700">Total PhD Scholars:</span>
                <span className="text-gray-900 ml-1">{cvData.phd_guidance?.total_phd_scholars || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Ongoing Supervision:</span>
                <span className="text-gray-900 ml-1">{cvData.phd_guidance?.ongoing_supervision || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Completed Supervision:</span>
                <span className="text-gray-900 ml-1">{cvData.phd_guidance?.completed_supervision || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Details:</span>
                {cvData.phd_guidance?.scholar_details?.length > 0 ? (
                  <ul className="list-disc list-inside mt-1 text-gray-900">
                    {cvData.phd_guidance.scholar_details.map((detail, i) => (
                      <li key={i}>{detail}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 ml-1">N/A</p>
                )}
              </div>
            </div>
          </div>

          {/* 5. Intellectual Property */}
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-xs font-semibold text-indigo-600 uppercase mb-2">5. Intellectual Property</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="font-medium text-gray-700">Patents Filed:</span>
                <span className="text-gray-900 ml-1">{cvData.intellectual_property?.patents_filed || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Patents Granted:</span>
                <span className="text-gray-900 ml-1">{cvData.intellectual_property?.patents_granted || 'N/A'}</span>
              </div>
              <div className="col-span-2">
                <span className="font-medium text-gray-700">Copyrights:</span>
                <p className="text-gray-900">{cvData.intellectual_property?.copyrights?.length > 0 ? cvData.intellectual_property.copyrights.join(', ') : 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* 6. Consultancy and Startups */}
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-xs font-semibold text-teal-600 uppercase mb-2">6. Consultancy and Startups</p>
            <div className="space-y-1 text-xs">
              <div>
                <span className="font-medium text-gray-700">Consultancy Projects:</span>
                <p className="text-gray-900">{cvData.consultancy_startup?.consultancy_projects?.length > 0 ? cvData.consultancy_startup.consultancy_projects.join(', ') : 'N/A'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Industry Collaborations:</span>
                <p className="text-gray-900">{cvData.consultancy_startup?.industry_collaborations?.length > 0 ? cvData.consultancy_startup.industry_collaborations.join(', ') : 'N/A'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Startup Involvement:</span>
                <p className="text-gray-900">{cvData.consultancy_startup?.startup_involvement?.length > 0 ? cvData.consultancy_startup.startup_involvement.join(', ') : 'N/A'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Founder/Co-founder Roles:</span>
                <p className="text-gray-900">{cvData.consultancy_startup?.founder_cofounder_roles?.length > 0 ? cvData.consultancy_startup.founder_cofounder_roles.join(', ') : 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
