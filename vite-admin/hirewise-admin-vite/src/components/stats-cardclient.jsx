import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase-client'
import { API_BASE } from '../lib/config'
import { Users, CheckCircle, XCircle, Trash2, Star, Calendar, X } from 'lucide-react'
import CandidateDetailsModal from './CandidateDetailsModal'
import DateTimePickerModal from './DateTimePickerModal'
import CommunicationModal from './CommunicationModal'

// Helper function to capitalize first letter of a string
const capitalize = (str) => {
  if (!str) return '—'
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export default function StatsCardsClient({ selectedView = 'teaching' }) {
  const [stats, setStats] = useState({
    total: 0,
    shortlisted: 0,
    rejected: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Dropdown panel state
  const [activePanel, setActivePanel] = useState(null) // 'total' | 'shortlisted' | 'rejected' | null
  const [panelLoading, setPanelLoading] = useState(false)
  const [panelItems, setPanelItems] = useState([])
  const [panelError, setPanelError] = useState(null)

  // Evaluation modal state
  const [selectedEvaluation, setSelectedEvaluation] = useState(null)
  const [evaluationData, setEvaluationData] = useState(null)
  const [evaluationLoading, setEvaluationLoading] = useState(false)

  // Interview confirmation state
  const [confirmationStates, setConfirmationStates] = useState({})
  const [sendingConfirmation, setSendingConfirmation] = useState({})
  const [schedulingInterview, setSchedulingInterview] = useState({})

  // Enhanced scheduling modals
  const [dateTimeModalOpen, setDateTimeModalOpen] = useState(false)
  const [selectedCandidateForScheduling, setSelectedCandidateForScheduling] = useState(null)
  const [communicationModalOpen, setCommunicationModalOpen] = useState(false)
  const [selectedCandidateForCommunication, setSelectedCandidateForCommunication] = useState(null)

  // Candidate details modal
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [candidateDetails, setCandidateDetails] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [isPopupOpen, setIsPopupOpen] = useState(false)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        console.log('✅ StatsCards: Fetching from BACKEND API')
        setLoading(true)

        // Use backend API instead of direct Supabase (avoids browser timeout)
        const response = await fetch(`${API_BASE}/api/applications/stats`)
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }

        const allStats = await response.json()
        console.log('✅ StatsCards: API returned', allStats)

        // Filter for teaching/non-teaching in JavaScript
        const isTeaching = (pos) => {
          if (!pos) return false
          const lower = pos.toLowerCase()
          return lower.includes('professor') || lower === 'teaching'
        }

        // For now, return all stats (backend doesn't filter by position yet)
        // TODO: Add position filtering to backend endpoint if needed
        setStats(allStats)
      } catch (err) {
        console.error('❌ StatsCards: FAILED -', err.message)
        setError(err.message)
        // Set zeros on error so at least something displays
        setStats({ total: 0, shortlisted: 0, rejected: 0 })
      } finally {
        console.log('✅ StatsCards: DONE (loading = false)')
        setLoading(false)
      }
    }

    fetchStats()
  }, [selectedView])

  // Load all confirmation response states on mount and when activePanel changes
  useEffect(() => {
    const loadConfirmationStates = async () => {
      try {
        let query = supabase
          .from('faculty_applications')
          .select('id, confirmation_response, status, first_name, last_name, candidate_response_message')
          .eq('status', 'final_shortlisted'); // Only load for shortlisted candidates

        const { data, error } = await query;

        if (error) {
          console.error('❌ Error loading confirmation states:', error);
          return;
        }

        console.log('📊 Raw data from DB:', data);

        // Build confirmation states object - include ALL values including NULL, PENDING, ACCEPTED, REJECTED
        const states = {};
        if (Array.isArray(data)) {
          data.forEach(item => {
            // Log each item's confirmation response
            console.log(`ID ${item.id} (${item.first_name} ${item.last_name}):`, item.confirmation_response);
            // Set state for all items, regardless of confirmation_response value
            states[item.id] = item.confirmation_response;
          });
        }
        console.log('✅ Final confirmation states:', states);
        setConfirmationStates(states);
      } catch (err) {
        console.error('❌ Exception loading confirmation states:', err);
      }
    };

    loadConfirmationStates();
  }, [selectedView, activePanel]);

  const fetchList = async (kind) => {
    setPanelLoading(true)
    setPanelError(null)
    try {
      console.log('📋 Fetching list from BACKEND for:', kind)
      
      // Use backend API instead of direct Supabase
      const response = await fetch(`${API_BASE}/api/applications/stats/list/${kind}`)
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      console.log('📋 Got', data.length, 'items from backend')

      // Update confirmation states from fetched data
      if (Array.isArray(data)) {
        const confirmStates = {}
        data.forEach(item => {
          if (item.confirmation_response) {
            confirmStates[item.id] = item.confirmation_response
          }
        })
        setConfirmationStates(confirmStates)
      }

      setPanelItems(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('❌ Error fetching list:', e)
      setPanelError(e.message)
      setPanelItems([])
    } finally {
      setPanelLoading(false)
    }
  }

  const togglePanel = (key) => {
    if (activePanel === key) {
      setActivePanel(null)
      return
    }
    setActivePanel(key)
    fetchList(key)
  }

  const deleteAllRejected = async () => {
    if (!confirm('Are you sure you want to delete ALL rejected applications? This action cannot be undone.')) {
      return;
    }

    try {
      setPanelLoading(true);

      // Build query to delete rejected applications based on current view
      let query = supabase.from('faculty_applications').delete().eq('status', 'final_rejected');

      // Filter by teaching/non-teaching
      if (selectedView === 'teaching') {
        query = query.or('position.ilike.%professor%,position.eq.teaching');
      } else {
        query = query.not('position', 'ilike', '%professor%').neq('position', 'teaching');
      }

      const { error } = await query;

      if (error) throw error;

      alert('All rejected applications have been deleted successfully!');

      // Refresh the list and stats
      setPanelItems([]);
      setActivePanel(null);

      // Trigger a re-fetch of stats by toggling selectedView
      window.location.reload();
    } catch (err) {
      alert(`Error deleting applications: ${err.message}`);
      console.error('Delete error:', err);
    } finally {
      setPanelLoading(false);
    }
  }

  const deleteAllShortlisted = async () => {
    if (!confirm('Are you sure you want to delete ALL shortlisted applications? This action cannot be undone.')) {
      return;
    }

    try {
      setPanelLoading(true);

      // Build query to delete shortlisted applications based on current view
      let query = supabase.from('faculty_applications').delete().eq('status', 'final_shortlisted');

      // Filter by teaching/non-teaching
      if (selectedView === 'teaching') {
        query = query.or('position.ilike.%professor%,position.eq.teaching');
      } else {
        query = query.not('position', 'ilike', '%professor%').neq('position', 'teaching');
      }

      const { error } = await query;

      if (error) throw error;

      alert('All shortlisted applications have been deleted successfully!');

      // Refresh the list and stats
      setPanelItems([]);
      setActivePanel(null);

      // Trigger a re-fetch of stats
      window.location.reload();
    } catch (err) {
      alert(`Error deleting applications: ${err.message}`);
      console.error('Delete error:', err);
    } finally {
      setPanelLoading(false);
    }
  }

  const viewEvaluation = async (applicationId) => {
    setEvaluationLoading(true)
    setSelectedEvaluation(applicationId)

    try {
      const { data, error } = await supabase
        .from('faculty_evaluations')
        .select('*')
        .eq('application_id', applicationId)
        .order('evaluated_at', { ascending: false })
        .limit(1)
        .single()

      if (error) throw error
      setEvaluationData(data)
    } catch (err) {
      console.error('Error fetching evaluation:', err)
      alert('No evaluation found for this candidate or error loading evaluation.')
      setSelectedEvaluation(null)
    } finally {
      setEvaluationLoading(false)
    }
  }

  const closeEvaluationModal = () => {
    setSelectedEvaluation(null)
    setEvaluationData(null)
  }

  const openCandidateDetails = async (candidate) => {
    try {
      setSelectedCandidate({ ...candidate, loading: true })
      setIsPopupOpen(true)
      setLoadingDetails(true)

      const response = await fetch(`${API_BASE}/api/applications/${candidate.id}`)
      if (!response.ok) throw new Error('Failed to fetch details')
      const details = await response.json()
      setSelectedCandidate(prev => ({
        ...prev,
        ...details,
        loading: false
      }))
    } catch (err) {
      console.error('Error fetching candidate details:', err)
      alert('Failed to load candidate details: ' + err.message)
      setSelectedCandidate(prev => ({ ...prev, loading: false }))
    } finally {
      setLoadingDetails(false)
    }
  }

  const closeCandidatePopup = () => {
    setSelectedCandidate(null)
    setIsPopupOpen(false)
  }

  const getDepartmentColor = (department) => {
    switch (department) {
      case 'SOET': return 'bg-blue-100 text-blue-800';
      case 'SOL': return 'bg-purple-100 text-purple-800';
      case 'engineering': return 'bg-blue-100 text-blue-800';
      case 'law': return 'bg-purple-100 text-purple-800';
      case 'Research': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  // ========================================
  // 🆕 ENHANCED SCHEDULING FUNCTIONS
  // ========================================

  // Open date/time picker modal when admin clicks "Send Confirmation"
  const sendInterviewConfirmation = (candidate) => {
    setSelectedCandidateForScheduling(candidate);
    setDateTimeModalOpen(true);
  };

  // Handle date/time confirmation from modal
  const handleDateTimeConfirm = async ({ date, time, timezone }) => {
    const candidate = selectedCandidateForScheduling;
    if (!candidate) return;

    try {
      console.log('📧 Sending enhanced confirmation for candidate:', candidate.id, candidate.first_name);
      setSendingConfirmation(prev => ({ ...prev, [candidate.id]: true }));

      // Add timeout to fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const response = await fetch(`${API_BASE}/api/applications/send-confirmation-enhanced/${candidate.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, time, timezone }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send confirmation');
      }

      const result = await response.json();
      console.log('✅ Backend response:', result);

      setConfirmationStates(prev => {
        const newStates = { ...prev, [candidate.id]: 'PENDING' };
        console.log('📝 Local state updated to PENDING:', newStates);
        return newStates;
      });

      alert(`Interview confirmation sent to ${candidate.email} for ${date} at ${time} (${timezone})`);

      // Poll database to check for candidate response
      const pollInterval = setInterval(async () => {
        try {
          const { data, error } = await supabase
            .from('faculty_applications')
            .select('confirmation_response, candidate_response_message')
            .eq('id', candidate.id)
            .single();

          if (data && data.confirmation_response && data.confirmation_response !== 'PENDING') {
            setConfirmationStates(prev => ({ ...prev, [candidate.id]: data.confirmation_response }));
            clearInterval(pollInterval);
          } else if (data && data.candidate_response_message) {
            // Candidate has sent a message via "Prefer Another Time"
            setConfirmationStates(prev => ({ ...prev, [candidate.id]: 'PENDING' }));
          }
        } catch (err) {
          console.error('Error polling for response:', err);
        }
      }, 5000);

      // Stop polling after 1 hour
      setTimeout(() => clearInterval(pollInterval), 3600000);
    } catch (err) {
      console.error('Error sending confirmation:', err);
      alert('Failed to send confirmation: ' + err.message);
    } finally {
      setSendingConfirmation(prev => ({ ...prev, [candidate.id]: false }));
    }
  };

  // Open communication modal when admin clicks "Needs Communication"
  const openCommunicationModal = (candidate) => {
    setSelectedCandidateForCommunication(candidate);
    setCommunicationModalOpen(true);
  };

  // Original scheduleInterview function (kept for backward compatibility)
  const scheduleInterview = async (candidate) => {
    const startTime = new Date();
    startTime.setDate(startTime.getDate() + 7); // 1 week from now
    startTime.setHours(14, 0, 0, 0);

    const endTime = new Date(startTime);
    endTime.setHours(15, 0, 0, 0);

    // Include candidate email in the Google Calendar event
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Interview%20-%20${encodeURIComponent(candidate.first_name + ' ' + candidate.last_name)}&dates=${startTime.toISOString().split('.')[0].replace(/[-:]/g, '')}/${endTime.toISOString().split('.')[0].replace(/[-:]/g, '')}&details=Candidate%20Interview%20for%20${encodeURIComponent(candidate.position)}&add=${encodeURIComponent(candidate.email)}`;

    window.open(googleCalendarUrl, '_blank');
    setSchedulingInterview(prev => ({ ...prev, [candidate.id]: true }));
    setTimeout(() => setSchedulingInterview(prev => ({ ...prev, [candidate.id]: false })), 2000);
  };


  if (loading) return <div>Loading stats...</div>
  if (error) return <div>Error: {error}</div>

  const emptyMessage = (k) => {
    switch (k) {
      case 'shortlisted':
        return 'No applications shortlisted.'
      case 'rejected':
        return 'No applications rejected.'
      case 'total':
      default:
        return 'No applications found.'
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Applications */}
        <button
          type="button"
          onClick={() => togglePanel('total')}
          className={`text-left bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-100/50 cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 backdrop-blur-sm backdrop-filter bg-opacity-80 ${activePanel === 'total' ? 'ring-2 ring-blue-300' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Applications</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{stats.total}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-100/70 shadow-inner">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </button>

        {/* Shortlisted */}
        <button
          type="button"
          onClick={() => togglePanel('shortlisted')}
          className={`text-left bg-[#d4edda] rounded-xl p-6 border border-green-100/50 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 backdrop-blur-sm backdrop-filter bg-opacity-80 ${activePanel === 'shortlisted' ? 'ring-2 ring-green-300' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Shortlisted</p>
              <p className="text-2xl font-bold text-green-900 mt-1">{stats.shortlisted}</p>
            </div>
            <div className="p-3 rounded-lg bg-[#81C784]/70 shadow-inner">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </button>

        {/* Rejected */}
        <button
          type="button"
          onClick={() => togglePanel('rejected')}
          className={`text-left bg-[#f8d7da] rounded-xl p-6 border border-red-100/50 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 backdrop-blur-sm backdrop-filter bg-opacity-80 ${activePanel === 'rejected' ? 'ring-2 ring-red-300' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Rejected</p>
              <p className="text-2xl font-bold text-red-900 mt-1">{stats.rejected}</p>
            </div>
            <div className="p-3 rounded-lg bg-[#E57373]/70 shadow-inner">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </button>
      </div>

      {/* Slide-down panel */}
      {activePanel && (
        <div className="overflow-hidden transition-all duration-300">
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">
                {activePanel === 'total' && `All Applications${panelItems.length > 0 ? ` • ${capitalize((panelItems[0]?.position || 'All'))}` : ''}`}
                {activePanel === 'shortlisted' && `Applications • Shortlisted${panelItems.length > 0 ? ` • ${capitalize((panelItems[0]?.position || ''))}` : ''}`}
                {activePanel === 'rejected' && `Applications • Rejected${panelItems.length > 0 ? ` • ${capitalize((panelItems[0]?.position || ''))}` : ''}`}
              </h3>
              <div className="flex items-center gap-2">
                {activePanel === 'shortlisted' && panelItems.length > 0 && (
                  <button
                    onClick={deleteAllShortlisted}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                    title="Delete all shortlisted applications"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear All
                  </button>
                )}
                {activePanel === 'rejected' && panelItems.length > 0 && (
                  <button
                    onClick={deleteAllRejected}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                    title="Delete all rejected applications"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete All
                  </button>
                )}
                <button
                  onClick={() => setActivePanel(null)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Close
                </button>
              </div>
            </div>

            {panelLoading ? (
              <div className="p-4 text-sm text-gray-500">Loading...</div>
            ) : panelError ? (
              <div className="p-4 text-sm text-red-600">{panelError}</div>
            ) : panelItems.length === 0 ? (
              <div className="p-6 text-sm text-gray-600">{emptyMessage(activePanel)}</div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b">
                      <th className="px-4 py-2">Name</th>
                      <th className="px-4 py-2">Position</th>
                      <th className="px-4 py-2">Department</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2">Profile</th>
                      {activePanel === 'shortlisted' && (
                        <th className="px-4 py-2">Schedule</th>
                      )}
                      {(activePanel === 'shortlisted' || activePanel === 'rejected') && (
                        <th className="px-4 py-2">Evaluation</th>
                      )}
                      <th className="px-4 py-2">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {panelItems.map((a) => (
                      <tr key={a.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {a.title ? `${a.title} ` : ''}{`${a.first_name || ''} ${a.last_name || ''}`.trim() || 'N/A'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">{capitalize(a.position)}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{capitalize(a.department)}</td>
                        <td className="px-4 py-2 text-xs">
                          <span className={`inline-flex px-2 py-0.5 rounded-full font-medium ${a.status === 'final_shortlisted' ? 'bg-green-100 text-green-700' :
                            a.status === 'final_rejected' || a.status === 'cv_rejected' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                            {a.status === 'final_shortlisted' ? 'Shortlisted' :
                              a.status === 'final_rejected' ? 'Rejected' :
                                a.status === 'cv_rejected' ? 'CV Rejected' :
                                  'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => openCandidateDetails(a)}
                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors font-medium"
                          >
                            View Details
                          </button>
                        </td>
                        {activePanel === 'shortlisted' && (
                          <td className="px-4 py-2 text-sm">
                            {!confirmationStates[a.id] ? (
                              <button
                                onClick={() => sendInterviewConfirmation(a)}
                                disabled={sendingConfirmation[a.id]}
                                className="text-blue-600 hover:text-blue-800 text-xs font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {sendingConfirmation[a.id] ? 'Sending...' : 'Send Confirmation'}
                              </button>
                            ) : confirmationStates[a.id] === 'PENDING' && a.candidate_response_message ? (
                              <button
                                onClick={() => openCommunicationModal(a)}
                                className="text-blue-600 hover:text-blue-800 text-xs font-medium hover:underline flex items-center gap-1"
                              >
                                💬 Needs Communication
                              </button>
                            ) : confirmationStates[a.id] === 'PENDING' ? (
                              <span className="text-gray-500 text-xs font-medium">⏳ Pending</span>
                            ) : confirmationStates[a.id] === 'ACCEPTED' ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                ✓ Accepted
                              </span>
                            ) : confirmationStates[a.id] === 'REJECTED' ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                ✗ Rejected
                              </span>
                            ) : null}
                          </td>
                        )}
                        {(activePanel === 'shortlisted' || activePanel === 'rejected') && (
                          <td className="px-4 py-2 text-sm">
                            <button
                              onClick={() => viewEvaluation(a.id)}
                              className="text-blue-600 hover:text-blue-800 underline text-xs"
                            >
                              Check Evaluation
                            </button>
                          </td>
                        )}
                        <td className="px-4 py-2 text-sm text-gray-500">{a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}</td>
                      </tr>))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Evaluation Viewing Modal */}
      {selectedEvaluation && evaluationData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-2">
                  <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                  <h2 className="text-2xl font-bold text-gray-800">Faculty Evaluation</h2>
                </div>
                <button
                  onClick={closeEvaluationModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              {/* Faculty Info */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Evaluated by</p>
                <p className="text-lg font-semibold text-gray-800">
                  {evaluationData.faculty_name.startsWith('Dr.')
                    ? evaluationData.faculty_name
                    : `Dr. ${evaluationData.faculty_name}`}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(evaluationData.evaluated_at).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </p>
              </div>

              {/* Evaluation Scores */}
              <div className="space-y-4 mb-6">
                <h3 className="font-semibold text-gray-700 mb-3">Evaluation Scores</h3>

                {[
                  { label: 'Teaching Competence', value: evaluationData.teaching_competence },
                  { label: 'Research Potential', value: evaluationData.research_potential },
                  { label: 'Industry Experience', value: evaluationData.industry_experience },
                  { label: 'Communication Skills', value: evaluationData.communication_skills },
                  { label: 'Subject Knowledge', value: evaluationData.subject_knowledge },
                  { label: 'Overall Suitability', value: evaluationData.overall_suitability }
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700 font-medium">{item.label}</span>
                      <span className="text-gray-900 font-bold">{item.value}/10</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${item.value >= 8 ? 'bg-green-500' :
                          item.value >= 6 ? 'bg-blue-500' :
                            item.value >= 4 ? 'bg-yellow-500' :
                              'bg-red-500'
                          }`}
                        style={{ width: `${(item.value / 10) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Average Score */}
              <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-semibold">Average Score</span>
                  <span className="text-2xl font-bold text-purple-700">
                    {(
                      (evaluationData.teaching_competence +
                        evaluationData.research_potential +
                        evaluationData.industry_experience +
                        evaluationData.communication_skills +
                        evaluationData.subject_knowledge +
                        evaluationData.overall_suitability) / 6
                    ).toFixed(2)}/10
                  </span>
                </div>
              </div>

              {/* Remarks */}
              {evaluationData.remarks && (
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-700 mb-2">Remarks</h3>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-700 whitespace-pre-wrap">{evaluationData.remarks}</p>
                  </div>
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-end mt-6">
                <button
                  onClick={closeEvaluationModal}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Details Modal - Full Detailed View */}
      {isPopupOpen && selectedCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white ${(selectedCandidate.gender || '').toLowerCase() === 'female' ? 'bg-pink-500' : 'bg-blue-500'
                  }`}>
                  {selectedCandidate.first_name?.charAt(0) || '?'}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedCandidate.first_name
                      ? `${selectedCandidate.first_name}${selectedCandidate.middle_name ? ' ' + selectedCandidate.middle_name : ''}${selectedCandidate.last_name ? ' ' + selectedCandidate.last_name : ''}`
                      : 'N/A'
                    }
                  </h2>
                  <p className="text-sm text-gray-600">{selectedCandidate.email}</p>
                </div>
              </div>
              <button
                onClick={closeCandidatePopup}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedCandidate.loading ? (
                <div className="text-center py-8 text-gray-500">Loading details...</div>
              ) : (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="bg-white border rounded-lg p-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Basic Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Email</p>
                        <p className="text-sm text-gray-900">{selectedCandidate.email || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Position Applied</p>
                        <p className="text-sm text-gray-900">{selectedCandidate.position || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Department</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getDepartmentColor(selectedCandidate.department)}`}>
                          {selectedCandidate.department || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Phone</p>
                        <p className="text-sm text-gray-900">{selectedCandidate.phone || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Education */}
                  <div className="bg-white border rounded-lg p-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Education</h3>
                    <div className="space-y-3">
                      {selectedCandidate.highest_degree && (
                        <div className="bg-blue-50 rounded p-3">
                          <p className="text-xs font-semibold text-blue-600 uppercase">Highest Qualification</p>
                          <p className="text-sm text-gray-900">{selectedCandidate.highest_degree}</p>
                          <p className="text-xs text-gray-600">{selectedCandidate.university || 'N/A'}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Experience */}
                  <div className="bg-white border rounded-lg p-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Experience</h3>
                    <div className="bg-blue-50 rounded p-3">
                      <p className="text-xs font-semibold text-blue-600 uppercase">Total Experience</p>
                      <p className="text-lg font-bold text-gray-900">{selectedCandidate.total_experience || selectedCandidate.experience || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={closeCandidatePopup}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Details Modal */}
      <CandidateDetailsModal
        isOpen={isPopupOpen}
        candidate={selectedCandidate}
        onClose={closeCandidatePopup}
        getDepartmentColor={getDepartmentColor}
      />

      {/* Loading State */}
      {evaluationLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <p className="text-gray-700">Loading evaluation...</p>
          </div>
        </div>
      )}

      {/* Date/Time Picker Modal for Interview Scheduling */}
      <DateTimePickerModal
        isOpen={dateTimeModalOpen}
        onClose={() => {
          setDateTimeModalOpen(false);
          setSelectedCandidateForScheduling(null);
        }}
        onConfirm={handleDateTimeConfirm}
        candidateName={
          selectedCandidateForScheduling
            ? `${selectedCandidateForScheduling.first_name} ${selectedCandidateForScheduling.last_name}`
            : ''
        }
      />

      {/* Communication Modal for Admin-Candidate Messages */}
      <CommunicationModal
        isOpen={communicationModalOpen}
        onClose={() => {
          setCommunicationModalOpen(false);
          setSelectedCandidateForCommunication(null);
        }}
        applicationId={selectedCandidateForCommunication?.id}
        candidateName={
          selectedCandidateForCommunication
            ? `${selectedCandidateForCommunication.first_name} ${selectedCandidateForCommunication.last_name}`
            : ''
        }
      />
    </div>
  )
}
