import { supabaseServer } from '@/lib/supabase-server'

export default async function StatsCards() {
  const supabase = supabaseServer()

  // Fetch stats directly in server component
  const { count: total } = await supabase
    .from('faculty_applications')
    .select('*', { count: 'exact' })

  const { count: inReview } = await supabase
    .from('faculty_applications')
    .select('*', { count: 'exact' })
    .eq('status', 'submitted')

  const { count: shortlisted } = await supabase
    .from('faculty_applications')
    .select('*', { count: 'exact' })
    .eq('status', 'final_shortlisted')

  const { count: rejected } = await supabase
    .from('faculty_applications')
    .select('*', { count: 'exact' })
    .eq('status', 'final_rejected')

  const stats = {
    total: total || 0,
    inReview: inReview || 0,
    shortlisted: shortlisted || 0,
    rejected: rejected || 0
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Applications Card */}
      <div 
        className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-100 cursor-pointer 
        shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Total Applications</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">{stats.total}</p>
          </div>
          <div className="p-3 rounded-lg bg-blue-100 shadow-inner">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </div>

      {/* In Review Card */}
      <div 
        className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 border border-amber-100 cursor-pointer 
        shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-amber-600">In Review</p>
            <p className="text-2xl font-bold text-amber-900 mt-1">{stats.inReview}</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-100 shadow-inner">
            <Eye className="h-6 w-6 text-amber-600" />
          </div>
        </div>
      </div>

      {/* Shortlisted Card */}
      <div 
        className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-100 cursor-pointer 
        shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-green-600">Shortlisted</p>
            <p className="text-2xl font-bold text-green-900 mt-1">{stats.shortlisted}</p>
          </div>
          <div className="p-3 rounded-lg bg-green-100 shadow-inner">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
        </div>
      </div>

      {/* Rejected Card */}
      <div 
        className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-100 cursor-pointer 
        shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-red-600">Rejected</p>
            <p className="text-2xl font-bold text-red-900 mt-1">{stats.rejected}</p>
          </div>
          <div className="p-3 rounded-lg bg-red-100 shadow-inner">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
        </div>
      </div>
    </div>
  )
}
