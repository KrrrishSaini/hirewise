// Restores a single Roma application with minimal fields and triggers scoring
import supabase from '../config/db.js';
import scoringService from '../services/scoringService.js';

async function run() {
  const email = 'roma420@gmail.com';
  console.log('Restoring Roma application for', email);

  // Clean up any existing rows for this email to avoid duplicates
  const { data: existing } = await supabase
    .from('faculty_applications')
    .select('id')
    .eq('email', email);
  if (existing && existing.length) {
    for (const row of existing) {
      await supabase.from('teaching_experiences').delete().eq('application_id', row.id);
      await supabase.from('research_experiences').delete().eq('application_id', row.id);
      await supabase.from('research_info').delete().eq('application_id', row.id);
      await supabase.from('application_scores').delete().eq('application_id', row.id);
      await supabase.from('faculty_applications').delete().eq('id', row.id);
    }
  }

  // Insert main application
  const { data: app, error: appErr } = await supabase
    .from('faculty_applications')
    .insert([{
      position: 'teaching',
      department: 'engineering',
      branch: 'cse',
      first_name: 'roma',
      last_name: 'saini',
      email,
      phone: '8528528522',
      address: null,
      highest_degree: 'PhD',
      university: 'IIT Delhi',
      graduation_year: '2022',
      previous_positions: null,
      years_of_experience: 'Not specified',
      gender: 'Female',
      date_of_birth: '2000-02-02',
      nationality: 'Indian',
      status: 'submitted'
    }])
    .select()
    .single();

  if (appErr) {
    console.error('Failed to insert application:', appErr.message);
    process.exit(1);
  }

  // Insert minimal research info
  const { error: infoErr } = await supabase
    .from('research_info')
    .insert({
      application_id: app.id,
      scopus_general_papers: 7,
      conference_papers: 0,
      edited_books: 0
    });
  if (infoErr) console.warn('research_info insert warning:', infoErr.message);

  // Trigger scoring to set a non-null score (needed by rankings endpoint)
  try {
    await scoringService.submitApplication(app.id);
  } catch (e) {
    console.warn('Scoring warning:', e.message);
  }

  console.log('Restored Roma application with id:', app.id);
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
