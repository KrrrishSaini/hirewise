import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase-client'

import { Users, CheckCircle, XCircle, Trash2, Star } from 'lucide-react'

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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)

        // Fetch only the necessary fields for counting (much faster)
        let query = supabase
          .from('faculty_applications')
          .select('position, status', { count: 'exact', head: false });
        
        // Filter by teaching/non-teaching
        if (selectedView === 'teaching') {
          query = query.or('position.ilike.%professor%,position.eq.teaching');
        } else {
          query = query.not('position', 'ilike', '%professor%').neq('position', 'teaching');
        }

        const { data, error, count } = await query;
        
        if (error) throw error;

        // Calculate counts from the single query result
        const shortlisted = data?.filter(app => app.status === 'shortlisted').length || 0;
        const rejected = data?.filter(app => app.status === 'rejected').length || 0;

        setStats({
          total: count || 0,
          shortlisted,
          rejected
        })
      } catch (err) {
        setError(err.message)
        console.error('Error fetching stats:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [selectedView]) // Re-fetch when selectedView changes

  const fetchList = async (kind) => {
    setPanelLoading(true)
    setPanelError(null)
    try {
      let query = supabase
        .from('faculty_applications')
        .select('id, first_name, last_name, email, position, department, status, created_at')
        .order('created_at', { ascending: false })
        .limit(50)

      // Filter by teaching/non-teaching
      if (selectedView === 'teaching') {
        query = query.or('position.ilike.%professor%,position.eq.teaching');
      } else {
        query = query.not('position', 'ilike', '%professor%').neq('position', 'teaching');
      }

      if (kind === 'shortlisted' || kind === 'rejected') {
        query = query.eq('status', kind)
      }

      const { data, error: selErr } = await query
      if (selErr) throw selErr
      setPanelItems(Array.isArray(data) ? data : [])
    } catch (e) {
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
      let query = supabase.from('faculty_applications').delete().eq('status', 'rejected');
      
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
      let query = supabase.from('faculty_applications').delete().eq('status', 'shortlisted');
      
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
                {activePanel === 'total' && 'All Applications'}
                {activePanel === 'shortlisted' && 'Applications • Shortlisted'}
                {activePanel === 'rejected' && 'Applications • Rejected'}
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
                      {(activePanel === 'shortlisted' || activePanel === 'rejected') && (
                        <th className="px-4 py-2">Evaluation</th>
                      )}
                      <th className="px-4 py-2">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {panelItems.map((a) => (
                      <tr key={a.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">{`${a.first_name || ''} ${a.last_name || ''}`.trim() || 'N/A'}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{a.position || '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{a.department || '—'}</td>
                        <td className="px-4 py-2 text-xs">
                          <span className={`inline-flex px-2 py-0.5 rounded-full font-medium ${
                            a.status === 'shortlisted' ? 'bg-green-100 text-green-700' :
                            a.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {a.status === 'shortlisted' ? 'shortlisted' :
                             a.status === 'rejected' ? 'rejected' :
                             'pending'}
                          </span>
                        </td>
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
                      </tr>) )}
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
                        className={`h-2.5 rounded-full ${
                          item.value >= 8 ? 'bg-green-500' :
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

      {/* Loading State */}
      {evaluationLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <p className="text-gray-700">Loading evaluation...</p>
          </div>
        </div>
      )}
    </div>
  )
}
