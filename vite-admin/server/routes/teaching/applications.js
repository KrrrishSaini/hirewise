// server/routes/teaching/applications.js
import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import documentService from '../../services/documentService.js';
import scoringService from '../../services/scoringService.js';
import cache from '../../config/cache.js';
import emailService from '../../services/emailService.js';
import { parseCV } from '../../services/cvParsingService.js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Configure multer
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF and DOC/DOCX files are allowed'));
    }
  }
});

// Helper: Upload to Supabase Storage
const uploadToStorage = async (bucket, fileName, fileBuffer) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, fileBuffer, {
      contentType: 'application/octet-stream',
      upsert: false
    });
  if (error) throw error;
  return data.path;
};

const router = express.Router();

// Helper: reuse existing stored file paths (for draft uploads)
const applyExistingPaths = (req, docPaths) => {
  const map = [
    ['existingCoverLetterPath', 'cover_letter_path'],
    ['existingTeachingStatementPath', 'teaching_statement_path'],
    ['existingResearchStatementPath', 'research_statement_path'],
    ['existingCvPath', 'cv_path'],
    ['existingOtherPublicationsPath', 'other_publications_path']
  ];
  map.forEach(([reqKey, docKey]) => {
    if (req.body?.[reqKey]) {
      const val = req.body[reqKey];
      // Parse JSON arrays if sent as string
      if (docKey === 'other_publications_path') {
        try {
          docPaths[docKey] = Array.isArray(val) ? val : JSON.parse(val);
        } catch {
          docPaths[docKey] = Array.isArray(val) ? val : [val];
        }
      } else {
        docPaths[docKey] = val;
      }
    }
  });
};

// ⚡ OPTIMIZED: Get top ranked applications with caching (reduced to 30 seconds for faster updates)
router.get('/rankings/top', cache.middleware(30), async (req, res) => {
  try {
    const { department = null, position = null, limit = '10' } = req.query;
    const parsedLimit = Math.min(parseInt(limit) || 10, 100); // Cap at 100

    const top = await scoringService.getTopRankedApplications(
      department && department !== 'All' ? department : null,
      position && position !== 'All' ? position : null,
      parsedLimit
    );

    // ⚡ OPTIMIZATION: Batch fetch all related data in parallel
    if (!top || top.length === 0) {
      return res.json([]);
    }

    const appIds = top.map(a => a.id).filter(Boolean);
    
    // Fetch all teaching posts, research data, and teaching/research institutions in parallel
    const [teachingPostsData, researchData, researchExpData, teachingExpData] = await Promise.all([
      supabase
        .from('teaching_experiences')
        .select('application_id, post')
        .in('application_id', appIds)
        .order('start_date', { ascending: false }),
      supabase
        .from('research_info')
        .select('application_id, scopus_general_papers, conference_papers, scopus_id, orchid_id')
        .in('application_id', appIds),

      supabase
        .from('research_experiences')
        .select('application_id, institution')
        .in('application_id', appIds)
        .limit(1),

      supabase
        .from('teaching_experiences')
        .select('application_id, institution')
        .in('application_id', appIds)
        .limit(1)
    ]);

    // Create lookup maps for O(1) access
    const teachingPostMap = new Map();
    const researchMap = new Map();
    const researchInstMap = new Map();
    const teachingInstMap = new Map();

    (teachingPostsData.data || []).forEach(t => {
      teachingPostMap.set(t.application_id, t.post);
    });

    (researchData.data || []).forEach(r => {
      researchMap.set(r.application_id, {
        total_papers: (r.scopus_general_papers || 0) + (r.conference_papers || 0),
        scopus_papers: r.scopus_general_papers || 0,
        conference_papers: r.conference_papers || 0,
        scopus_id: r.scopus_id,
        orchid_id: r.orchid_id
      });
    });

    (researchExpData.data || []).forEach(r => {
      researchInstMap.set(r.application_id, r.institution);
    });

    (teachingExpData.data || []).forEach(t => {
      teachingInstMap.set(t.application_id, t.institution);
    });

    // ⚡ Enrich all applications in one pass
    const enriched = top.map(app => {
      const uniLower = (app.university || '').toLowerCase();
      let { nirf10, qs10 } = scoringService.getUniversityRankingScores(uniLower);
      
      // Support both new post_applied_for column and legacy teaching posts fetch
      const teachingPost = app.post_applied_for || teachingPostMap.get(app.id) || '';
      const research = researchMap.get(app.id);

      // Fallback to research or teaching institution if university not matched
      if ((nirf10 == null && qs10 == null)) {
        const rInst = researchInstMap.get(app.id);
        if (rInst) {
          const scores = scoringService.getUniversityRankingScores((rInst || '').toLowerCase());
          nirf10 = scores.nirf10;
          qs10 = scores.qs10;
        }
      }

      if ((nirf10 == null && qs10 == null)) {
        const tInst = teachingInstMap.get(app.id);
        if (tInst) {
          const scores = scoringService.getUniversityRankingScores((tInst || '').toLowerCase());
          nirf10 = scores.nirf10;
          qs10 = scores.qs10;
        }
      }

      // Calculate research score
      let researchScore10 = null;
      let totalPapers = 0;
      if (research) {
        totalPapers = research.total_papers;
        const paperScore = Math.min((totalPapers / 50) * 10, 10);
        researchScore10 = Math.min(Math.round(paperScore * 10) / 10, 10);
      }

      return {
        ...app,
        nirf10,
        qs10,
        teachingPost,
        researchScore10,
        totalPapers
      };
    });

    res.json(enriched);
  } catch (error) {
    console.error('Error fetching top rankings:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch top rankings' });
  }
});

// ⚡ Get available timezones (MUST be before /:id route!)
router.get('/timezones', async (req, res) => {
  try {
    const timezones = await googleCalendarService.getTimezones();
    res.json({ timezones });
  } catch (error) {
    console.error('Error fetching timezones:', error);
    // Fallback to basic timezones if Google Calendar fails
    const fallbackTimezones = [
      { id: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
      { id: 'America/New_York', label: 'Eastern Time (ET)' },
      { id: 'Europe/London', label: 'British Time (GMT/BST)' },
    ];
    res.json({ timezones: fallbackTimezones });
  }
});

// ⚡ OPTIMIZED: Get single application by ID with all details (with caching)
router.get('/:id', cache.middleware(300), async (req, res) => {
  try {
    const { id } = req.params;

    // ⚡ Fetch all data in parallel
    const [appResult, researchInfoResult, teachingExpResult, researchExpResult] = await Promise.all([
      supabase.from('faculty_applications').select('*').eq('id', id).single(),
      supabase.from('research_info').select('*').eq('application_id', id).single(),
      supabase.from('teaching_experiences').select('*').eq('application_id', id).order('start_date', { ascending: false }),
      supabase.from('research_experiences').select('*').eq('application_id', id).order('start_date', { ascending: false })
    ]);

    const app = appResult.data;
    if (appResult.error || !app) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const researchInfo = researchInfoResult.data;
    const teachingExp = teachingExpResult.data || [];
    const researchExp = researchExpResult.data || [];

    // Calculate research metrics
    let totalPapers = 0;
    let researchScore10 = null;
    if (researchInfo) {
      totalPapers = (researchInfo.scopus_general_papers || 0) + (researchInfo.conference_papers || 0);
      const paperScore = Math.min((totalPapers / 50) * 10, 10);
      researchScore10 = Math.min(Math.round(paperScore * 10) / 10, 10);
    }

    // Get university ranking scores
    const uniLower = (app.university || '').toLowerCase();
    const { nirf10, qs10 } = scoringService.getUniversityRankingScores(uniLower);

    // Calculate total experience from teaching and research experiences
    let totalExperience = 0;
    if (teachingExp && teachingExp.length > 0) {
      teachingExp.forEach(exp => {
        if (exp.start_date) {
          const start = new Date(exp.start_date);
          const end = exp.end_date ? new Date(exp.end_date) : new Date();
          const years = (end - start) / (1000 * 60 * 60 * 24 * 365.25);
          totalExperience += years;
        }
      });
    }
    if (researchExp && researchExp.length > 0) {
      researchExp.forEach(exp => {
        if (exp.start_date) {
          const start = new Date(exp.start_date);
          const end = exp.end_date ? new Date(exp.end_date) : new Date();
          const years = (end - start) / (1000 * 60 * 60 * 24 * 365.25);
          totalExperience += years;
        }
      });
    }
    const totalExpYears = totalExperience > 0 ? `${Math.floor(totalExperience)} years ${Math.round((totalExperience % 1) * 12)} months` : app.total_experience || 'N/A';

    // Combine all data
    const fullData = {
      ...app,
      researchInfo,
      teachingExperiences: teachingExp || [],
      researchExperiences: researchExp || [],
      totalPapers,
      researchScore10,
      nirf10,
      qs10,
      scopus_id: researchInfo?.scopus_id,
      orchid_id: researchInfo?.orchid_id,
      total_experience: totalExpYears
    };

    res.json(fullData);
  } catch (error) {
    console.error('Error fetching application details:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch application details' });
  }
});

router.post(
  '/',
  upload.fields([
    { name: 'coverLetterPath', maxCount: 1 },
    { name: 'teachingStatement', maxCount: 1 },
    { name: 'researchStatement', maxCount: 1 },
    { name: 'cvPath', maxCount: 1 },
    // Allow up to 3 files for best published papers
    { name: 'otherPublications', maxCount: 3 }
  ]),
  async (req, res) => {
    try {
      // Extract raw fields
      let {
        position,
        department,
        branch,
        title,
        first_name,
        middle_name,
        last_name,
        email,
        phone,
        address,
        highest_degree,
        university,
        graduation_year,
        previous_positions,
        years_of_experience,
        phd_status,
        phdStatus: phdStatusCamel,
        gender,
        date_of_birth,
        nationality,
        post_applied_for,
        teachingExperiences,
        researchExperiences,
        researchInfo,
        user_id
      } = req.body;

      // Handle JSON parsing for multipart/form-data submissions
      try {
        if (typeof teachingExperiences === 'string') {
          teachingExperiences = JSON.parse(teachingExperiences);
        }
      } catch (e) {
        console.warn('Failed to parse teachingExperiences JSON:', e.message);
        teachingExperiences = [];
      }
      try {
        if (typeof researchExperiences === 'string') {
          researchExperiences = JSON.parse(researchExperiences);
        }
      } catch (e) {
        console.warn('Failed to parse researchExperiences JSON:', e.message);
        researchExperiences = [];
      }
      try {
        if (typeof researchInfo === 'string') {
          researchInfo = JSON.parse(researchInfo);
        }
      } catch (e) {
        console.warn('Failed to parse researchInfo JSON:', e.message);
        researchInfo = {};
      }

      // Defaults if undefined
      teachingExperiences = teachingExperiences || [];
      researchExperiences = researchExperiences || [];
      researchInfo = researchInfo || {};

      // ✅ Authentication check moved inside route
      if (!user_id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!first_name || !email || !position || !department) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const normalizePhdStatus = (value) => {
        const normalized = (value || '').toString().trim().toLowerCase();
        if (!normalized) return '';
        if (normalized === 'not done' || normalized === 'not_done' || normalized === 'not-done') return 'Not done';
        if (normalized === 'pursuing') return 'Pursuing';
        if (normalized === 'submitted') return 'Submitted';
        if (normalized === 'awarded') return 'Awarded';
        return '';
      };

      const normalizedPostAppliedFor = position === 'teaching'
        ? (post_applied_for || '').toString().trim()
        : '';
      const normalizedHighestDegree = (highest_degree || '').toString().trim().toLowerCase();
      const inferredPhdStatus = (() => {
        if (!normalizedHighestDegree.includes('phd') && !normalizedHighestDegree.includes('doctor')) {
          return 'Not done';
        }
        const gradYearNum = Number(graduation_year);
        if (Number.isFinite(gradYearNum) && gradYearNum > new Date().getFullYear()) {
          return 'Pursuing';
        }
        return 'Awarded';
      })();
      const normalizedPhdStatus =
        normalizePhdStatus(phd_status) ||
        normalizePhdStatus(phdStatusCamel) ||
        inferredPhdStatus;

      // Idempotency/Duplicate guard: prevent multiple submissions for same user & role
      try {
        const { data: existing, error: existErr } = await supabase
          .from('faculty_applications')
          .select('id, created_at')
          .eq('user_id', user_id)
          .eq('position', position)
          .eq('department', department)
          .eq('branch', branch || '')
          .limit(1);
        if (!existErr && Array.isArray(existing) && existing.length > 0) {
          return res.status(409).json({
            error: 'You have already submitted an application for this position. Please wait or contact support if you believe this is a mistake.'
          });
        }
      } catch (dupCheckErr) {
        console.warn('Duplicate check warning:', dupCheckErr.message);
      }

      const submittedAt = new Date().toISOString();

      // Insert main application
      const insertPayload = {
        position,
        department,
        branch,
        title,
        first_name,
        middle_name,
        last_name,
        email,
        phone,
        address,
        highest_degree,
        university,
        graduation_year,
        previous_positions,
        years_of_experience,
        education: {
          phdStatus: normalizedPhdStatus
        },
        gender,
        date_of_birth,
        nationality,
        post_applied_for: normalizedPostAppliedFor || null,
        user_id,
        status: 'submitted',
        submitted_at: submittedAt
      };

      const { data: appData, error: appError } = await supabase
        .from('faculty_applications')
        .insert([insertPayload])
        .select()
        .single();

      if (appError) throw appError;

      const applicationId = appData.id;
      const docPaths = {};

      const uploadFile = async (fileKey, bucket, fieldName, allowMultiple = false) => {
        if (req.files?.[fileKey]?.[0]) {
          const files = req.files[fileKey];
          if (allowMultiple) {
            const paths = [];
            for (const file of files.slice(0, 3)) {
              const fileName = `${fieldName}_${applicationId}_${Date.now()}_${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`;
              const filePath = await uploadToStorage(bucket, fileName, file.buffer);
              paths.push(filePath);
            }
            docPaths[fieldName + '_path'] = JSON.stringify(paths);
          } else {
            const file = files[0];
            const fileName = `${fieldName}_${applicationId}_${Date.now()}${path.extname(file.originalname)}`;
            const filePath = await uploadToStorage(bucket, fileName, file.buffer);
            docPaths[fieldName + '_path'] = filePath;
          }
        }
      };

      await uploadFile('coverLetterPath', 'application-reports', 'cover_letter');
      await uploadFile('teachingStatement', 'application-reports', 'teaching_statement');
      // Research Statement only required for teaching candidates
      if (position === 'teaching') {
        await uploadFile('researchStatement', 'application-reports', 'research_statement');
      }
      await uploadFile('cvPath', 'application-reports', 'cv');
      // Published Papers only required for teaching candidates
      if (position === 'teaching') {
        await uploadFile('otherPublications', 'application-reports', 'other_publications', true);
      }
      // Apply any existing paths provided (from draft uploads)
      applyExistingPaths(req, docPaths);

      if (Object.keys(docPaths).length > 0) {
        const { error: updateError } = await supabase
          .from('faculty_applications')
          .update(docPaths)
          .eq('id', applicationId);
        if (updateError) console.warn('Document path update failed:', updateError);
      }

      // Insert teaching experiences
      if (Array.isArray(teachingExperiences) && teachingExperiences.length > 0) {
        const teachingData = teachingExperiences.map(exp => ({
          application_id: applicationId,
          post: exp.teachingPost,
          institution: exp.teachingInstitution,
          start_date: exp.teachingStartDate,
          end_date: exp.teachingEndDate,
          experience: exp.teachingExperience
        }));
        const { error: teachError } = await supabase
          .from('teaching_experiences')
          .insert(teachingData);
        if (teachError) console.warn('Teaching insert failed:', teachError);
      }

      // Insert research experiences (optional)
      if (Array.isArray(researchExperiences) && researchExperiences.length > 0) {
        const validResearch = researchExperiences.filter(exp =>
          exp.researchPost || exp.researchInstitution || exp.researchStartDate || exp.researchEndDate
        );
        if (validResearch.length > 0) {
          const researchData = validResearch.map(exp => ({
            application_id: applicationId,
            post: exp.researchPost,
            institution: exp.researchInstitution,
            start_date: exp.researchStartDate,
            end_date: exp.researchEndDate,
            experience: exp.researchExperience
          }));
          const { error: resError } = await supabase
            .from('research_experiences')
            .insert(researchData);
          if (resError) console.warn('Research insert failed:', resError);
        }
      }

      // Insert research info (always insert if research data exists)
      if (researchInfo && (
        researchInfo.scopus_id ||
        researchInfo.google_scholar_id ||
        researchInfo.orchid_id ||
        researchInfo.scopus_general_papers ||
        researchInfo.conference_papers ||
        researchInfo.edited_books
      )) {
        const { error: infoError } = await supabase
          .from('research_info')
          .insert({
            application_id: applicationId,
            scopus_id: researchInfo.scopus_id || null,
            orchid_id: researchInfo.orchid_id || null,
            google_scholar_id: researchInfo.google_scholar_id || null,
            scopus_general_papers: parseInt(researchInfo.scopus_general_papers) || 0,
            conference_papers: parseInt(researchInfo.conference_papers) || 0,
            edited_books: parseInt(researchInfo.edited_books) || 0
          });
        if (infoError) {
          console.error('Research info insert failed:', infoError);
        } else {
          console.log('✅ Research info saved:', researchInfo);
        }
      }

      // Trigger scoring and report asynchronously (don't block response)
      // Fire-and-forget: these operations can take 10-30 seconds with ML/AI services
      Promise.all([
        scoringService.submitApplication(applicationId),
        documentService.generateInitialReport(applicationId)
      ]).catch(err => {
        console.error('⚠️ Background scoring/report error for application', applicationId, ':', err.message);
        // Don't fail the submission - scoring/reports can be regenerated later
      });

      // ⚡ Invalidate relevant caches
      await cache.delPattern('req:/api/applications/rankings/*');
      await cache.delPattern('req:/api/applications*');

      // Respond immediately to user
      res.status(201).json({
        success: true,
        message: 'Application submitted successfully! Your application is being processed.',
        applicationId,
        submittedAt: appData?.submitted_at || submittedAt
      });
    } catch (error) {
      console.error('Application submission error:', error);
      res.status(500).json({
        error: error.message || 'Internal server error'
      });
    }
  }
);

// ⚡ NEW OPTIMIZED ENDPOINT: Get all candidates with complete details in ONE query
// This replaces the N+1 query problem in AllCandidates component
router.get('/all/detailed', cache.middleware(120), async (req, res) => {
  try {
    const { department } = req.query;

    // Build query with JOIN to fetch all related data in ONE query
    let query = supabase
      .from('faculty_applications')
      .select(`
        *,
        teaching_experiences (*),
        research_experiences (*),
        research_info (*)
      `)
      .neq('status', 'final_rejected')
      .order('created_at', { ascending: false });

    if (department && department !== 'All') {
      query = query.eq('department', department);
    }

    const { data: applications, error } = await query;

    if (error) throw error;

    // Format the data for frontend
    const formatted = (applications || []).map(app => ({
      ...app,
      teachingExperiences: app.teaching_experiences || [],
      researchExperiences: app.research_experiences || [],
      researchInfo: app.research_info?.[0] || {
        scopus_general_papers: 0,
        conference_papers: 0,
        edited_books: 0
      },
      department: app.department || 'other',
      experience: app.years_of_experience || 'Not specified',
      publications: app.research_info?.[0]?.scopus_general_papers || 0
    }));

    // Remove the nested arrays that Supabase returns
    formatted.forEach(app => {
      delete app.teaching_experiences;
      delete app.research_experiences;
      delete app.research_info;
    });

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching detailed applications:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch applications' });
  }
});

// ⚡ NEW: Send interview confirmation email to shortlisted candidate
router.post('/send-confirmation/:id', async (req, res) => {
  try {
    const applicationId = parseInt(req.params.id);

    // Get application details from database
    const { data: application, error: fetchError } = await supabase
      .from('faculty_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Check if email is available
    if (!application.email) {
      return res.status(400).json({ error: 'Candidate email not found' });
    }

    // Construct base URL from environment or use PORT variable
    const baseUrl = process.env.API_BASE_URL || (
      process.env.NODE_ENV === 'production'
        ? 'https://your-production-domain.com'
        : `http://localhost:${process.env.PORT || 5000}`
    );

    // Send the confirmation email
    const emailResult = await emailService.sendInterviewConfirmationEmail(
      applicationId,
      application.email,
      `${application.first_name} ${application.last_name}`,
      application.position || application.positionApplied || 'Faculty Position',
      application.department || 'Not specified',
      baseUrl
    );

    if (!emailResult.success) {
      return res.status(500).json({ error: emailResult.error || 'Failed to send email' });
    }

    // Update database to set confirmation_response = 'PENDING' after email is sent
    const { data: updateData, error: updateError } = await supabase
      .from('faculty_applications')
      .update({ confirmation_response: 'PENDING' })
      .eq('id', applicationId)
      .select();

    if (updateError) {
      console.error('Error updating confirmation status:', updateError);
      // Don't fail the request if update fails, email was sent
    } else {
      console.log('✅ Database updated to PENDING for application:', applicationId, updateData);
    }

    // Invalidate cache
    cache.delPattern(`req:/api/applications/*`).catch(console.error);

    res.json({
      success: true,
      message: 'Interview confirmation email sent successfully',
      messageId: emailResult.messageId
    });

  } catch (error) {
    console.error('Error sending confirmation email:', error);
    res.status(500).json({ error: error.message || 'Failed to send confirmation email' });
  }
});

// ⚡ NEW: Handle candidate response to interview confirmation (ACCEPT/REJECT)
// This endpoint is hit from email links: /api/applications/confirm-response/:id?response=ACCEPTED|REJECTED
// Supports both GET (from email links) and POST (from API)
router.get('/confirm-response/:id', async (req, res) => handleConfirmResponse(req, res));
router.post('/confirm-response/:id', async (req, res) => handleConfirmResponse(req, res));

const handleConfirmResponse = async (req, res) => {
  try {
    const applicationId = parseInt(req.params.id);
    const response = req.query.response || req.body.response; // Support both query and body

    console.log(`📧 Confirm-response endpoint hit: ID=${applicationId}, Response=${response}, Method=${req.method}`);

    if (!response || !['ACCEPTED', 'REJECTED'].includes(response)) {
      console.error('❌ Invalid response received:', response);
      return res.status(400).json({ error: 'Invalid response. Must be ACCEPTED or REJECTED.' });
    }

    // Get application details first
    const { data: application, error: fetchError } = await supabase
      .from('faculty_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      console.error('❌ Application not found:', applicationId);
      return res.status(404).json({ error: 'Application not found' });
    }

    // Update confirmation response in database
    const { data: updateData, error: updateError } = await supabase
      .from('faculty_applications')
      .update({
        confirmation_response: response
      })
      .eq('id', applicationId)
      .select();

    if (updateError) {
      console.error('❌ Error updating confirmation response:', updateError);
      return res.status(500).json({ error: 'Failed to update response' });
    }

    console.log('✅ Database updated to', response, 'for application:', applicationId, updateData);

    // Return user-friendly response
    // If this is from an email link (HTML request), return HTML page
    if (req.get('accept') && req.get('accept').includes('text/html')) {
      const htmlPage = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Interview Response Confirmed</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 500px;
        }
        .icon {
            font-size: 60px;
            margin-bottom: 20px;
        }
        h1 {
            color: #333;
            margin: 0 0 10px 0;
        }
        p {
            color: #666;
            line-height: 1.6;
        }
        .message {
            margin: 20px 0;
            padding: 15px;
            background-color: ${response === 'ACCEPTED' ? '#d4edda' : '#f8d7da'};
            border: 1px solid ${response === 'ACCEPTED' ? '#c3e6cb' : '#f5c6cb'};
            border-radius: 5px;
            color: ${response === 'ACCEPTED' ? '#155724' : '#721c24'};
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">${response === 'ACCEPTED' ? '✓' : '✗'}</div>
        <h1>${response === 'ACCEPTED' ? 'Response Confirmed!' : 'Response Recorded'}</h1>
        <div class="message">
            ${response === 'ACCEPTED'
          ? 'Thank you for confirming your availability. Our team will schedule your interview shortly and send you the details via email.'
          : 'Thank you for your response. We appreciate you letting us know.'}
        </div>
        <p>You can now close this page.</p>
    </div>
</body>
</html>
      `;
      res.set('Content-Type', 'text/html');
      res.send(htmlPage);
    } else {
      // JSON response for API calls
      res.json({
        success: true,
        message: `Response recorded: ${response}`,
        applicationId,
        response
      });
    }

  } catch (error) {
    console.error('Error updating confirmation response:', error);
    res.status(500).json({ error: error.message || 'Failed to update response' });
  }
};

// DEBUG: Check a specific application and see its confirmation_response value
router.get('/debug/check-confirmation/:id', async (req, res) => {
  try {
    const applicationId = parseInt(req.params.id);
    console.log('🔍 DEBUG: Checking application:', applicationId);

    const { data, error } = await supabase
      .from('faculty_applications')
      .select('id, first_name, last_name, confirmation_response')
      .eq('id', applicationId)
      .single();

    if (error) {
      console.error('❌ Error fetching application:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Application data:', data);
    res.json({
      success: true,
      application: data,
      confirmationResponse: data?.confirmation_response,
      isEmpty: data?.confirmation_response === null || data?.confirmation_response === undefined
    });
  } catch (err) {
    console.error('Error in debug endpoint:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// 🆕 ENHANCED SCHEDULING ENDPOINTS
// ========================================

// Import Google Calendar service
import googleCalendarService from '../../services/googleCalendarService.js';

// ⚡ NEW: Send interview confirmation with date/time/timezone
router.post('/send-confirmation-enhanced/:id', async (req, res) => {
  try {
    const applicationId = parseInt(req.params.id);
    const { date, time, timezone } = req.body;

    // Validate inputs
    if (!date || !time || !timezone) {
      return res.status(400).json({
        error: 'Date, time, and timezone are required'
      });
    }

    // Get application details (keep this - we need it for validation)
    const { data: application, error: fetchError } = await supabase
      .from('faculty_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (!application.email) {
      return res.status(400).json({ error: 'Candidate email not found' });
    }

    // ✅ RESPOND IMMEDIATELY - Don't wait for database update or email
    res.json({
      success: true,
      message: 'Interview confirmation is being processed',
      applicationId
    });

    // DO EVERYTHING ELSE ASYNC (fire-and-forget)
    const processAsync = async () => {
      try {
        console.log('💾 Updating database with interview details...');
        
        // Store interview details in database
        const { error: updateError } = await supabase
          .from('faculty_applications')
          .update({
            interview_date: date,
            interview_time: time,
            interview_timezone: timezone,
            confirmation_response: 'PENDING'
          })
          .eq('id', applicationId);

        if (updateError) {
          console.error('❌ Database update failed:', updateError);
          return;
        }

        console.log('✅ Database updated successfully');

        // Construct base URL
        const baseUrl = process.env.API_BASE_URL ||
          `http://localhost:${process.env.PORT || 5001}`;

        console.log('📧 Sending email in background...');
        const emailResult = await emailService.sendEnhancedInterviewConfirmationEmail(
          applicationId,
          application.email,
          `${application.first_name} ${application.last_name}`,
          application.position || application.positionApplied || 'Faculty Position',
          application.department || 'Not specified',
          date,
          time,
          timezone,
          baseUrl
        );

        if (emailResult.success) {
          console.log('✅ Email sent successfully:', emailResult.messageId);
        } else {
          console.error('❌ Email failed:', emailResult.error);
        }

        // Invalidate cache
        cache.delPattern(`req:/api/applications/*`).catch(console.error);

      } catch (error) {
        console.error('❌ Async processing error:', error);
      }
    };

    // Fire and forget - don't await
    processAsync();

  } catch (error) {
    console.error('Error sending enhanced confirmation:', error);
    res.status(500).json({ error: error.message || 'Failed to send confirmation' });
  }
});

// ⚡ NEW: Handle "I Can Attend" - Auto-create Google Calendar event
router.get('/confirm-accept/:id', async (req, res) => {
  try {
    const applicationId = parseInt(req.params.id);

    // Get application details with interview schedule
    const { data: application, error: fetchError } = await supabase
      .from('faculty_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Check if interview details exist
    if (!application.interview_date || !application.interview_time || !application.interview_timezone) {
      return res.status(400).json({
        error: 'Interview schedule not found. Please contact HR.'
      });
    }

    // Format date properly (Supabase returns YYYY-MM-DD format)
    let interviewDate = application.interview_date;
    if (interviewDate instanceof Date) {
      interviewDate = interviewDate.toISOString().split('T')[0];
    } else if (typeof interviewDate === 'string' && interviewDate.includes('T')) {
      interviewDate = interviewDate.split('T')[0];
    }

    // Format time properly (ensure HH:MM format)
    let interviewTime = application.interview_time;
    if (typeof interviewTime === 'string' && interviewTime.length > 5) {
      interviewTime = interviewTime.substring(0, 5); // Get HH:MM from HH:MM:SS
    }

    console.log('📅 Creating calendar event with:', {
      date: interviewDate,
      time: interviewTime,
      timezone: application.interview_timezone,
      email: application.email
    });

    // Create Google Calendar event automatically
    try {
      const calendarEvent = await googleCalendarService.createInterviewEvent({
        candidateEmail: application.email,
        candidateName: `${application.first_name} ${application.last_name}`,
        date: interviewDate,
        time: interviewTime,
        timezone: application.interview_timezone,
        position: application.position || application.positionApplied || 'Faculty Position'
      });

      // Update database with ACCEPTED status and calendar event ID
      const { error: updateError } = await supabase
        .from('faculty_applications')
        .update({
          confirmation_response: 'ACCEPTED',
          google_calendar_event_id: calendarEvent.eventId
        })
        .eq('id', applicationId);

      if (updateError) {
        console.error('Error updating to ACCEPTED:', updateError);
      }

      // Invalidate cache
      cache.delPattern(`req:/api/applications/*`).catch(console.error);

      // Return success HTML page
      const htmlPage = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Interview Confirmed</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 500px;
        }
        .icon { font-size: 60px; margin-bottom: 20px; }
        h1 { color: #10b981; margin-bottom: 10px; }
        p { color: #666; line-height: 1.6; }
        .meet-link {
            display: inline-block;
            margin-top: 20px;
            padding: 12px 24px;
            background: #10b981;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
        }
        .meet-link:hover { background: #059669; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">✅</div>
        <h1>Interview Confirmed!</h1>
        <p>Thank you for confirming your attendance. A Google Calendar invitation with the Google Meet link has been sent to your email.</p>
        <p><strong>Interview Details:</strong></p>
        <p>📅 ${application.interview_date}<br>
           🕒 ${application.interview_time} (${application.interview_timezone})</p>
        ${calendarEvent.meetLink ? `<a href="${calendarEvent.meetLink}" class="meet-link">Join Google Meet</a>` : ''}
        <p style="margin-top: 20px; font-size: 14px; color: #999;">You can close this window now.</p>
    </div>
</body>
</html>`;

      res.send(htmlPage);

    } catch (calendarError) {
      console.error('❌ Google Calendar error:', calendarError.message);
      console.error('❌ Full error:', JSON.stringify(calendarError.response?.data || calendarError, null, 2));

      // Still update to ACCEPTED even if calendar fails
      await supabase
        .from('faculty_applications')
        .update({ confirmation_response: 'ACCEPTED' })
        .eq('id', applicationId);

      return res.status(500).json({
        error: 'Interview confirmed but calendar event creation failed. HR will contact you.'
      });
    }

  } catch (error) {
    console.error('Error in confirm-accept:', error);
    res.status(500).json({ error: error.message });
  }
});

// ⚡ NEW: Handle "Prefer Another Time Slot" - Store candidate message
router.post('/prefer-another-time/:id', async (req, res) => {
  try {
    const applicationId = parseInt(req.params.id);
    const { message } = req.body;

    // Validate message (70 word limit)
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const wordCount = message.trim().split(/\s+/).length;
    if (wordCount > 70) {
      return res.status(400).json({
        error: `Message exceeds 70 word limit (${wordCount} words)`
      });
    }

    // Get current application
    const { data: application, error: fetchError } = await supabase
      .from('faculty_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Check negotiation limit (max 2 rounds)
    const currentCount = application.negotiation_count || 0;
    if (currentCount >= 2) {
      return res.status(400).json({
        error: 'Maximum negotiation limit reached. Please contact HR directly.'
      });
    }

    // Add message to communication history
    const history = application.communication_history || [];
    history.push({
      timestamp: new Date().toISOString(),
      sender: 'candidate',
      message: message.trim(),
      type: 'prefer_another_time'
    });

    // Update database
    const { error: updateError } = await supabase
      .from('faculty_applications')
      .update({
        candidate_response_message: message.trim(),
        communication_history: history,
        negotiation_count: currentCount + 1,
        confirmation_response: 'PENDING' // Keep as PENDING
      })
      .eq('id', applicationId);

    if (updateError) {
      console.error('Error storing candidate message:', updateError);
      return res.status(500).json({ error: 'Failed to store message' });
    }

    // Invalidate cache
    cache.delPattern(`req:/api/applications/*`).catch(console.error);

    // Return success HTML page
    const htmlPage = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Response Submitted</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 500px;
        }
        .icon { font-size: 60px; margin-bottom: 20px; }
        h1 { color: #3b82f6; margin-bottom: 10px; }
        p { color: #666; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">📨</div>
        <h1>Response Submitted!</h1>
        <p>Thank you for your response. Our HR team will review your message and get back to you shortly with an alternative time slot.</p>
        <p style="margin-top: 20px; font-size: 14px; color: #999;">You can close this window now.</p>
    </div>
</body>
</html>`;

    res.send(htmlPage);

  } catch (error) {
    console.error('Error in prefer-another-time:', error);
    res.status(500).json({ error: error.message });
  }
});

// ⚡ NEW: Admin reply to candidate's message
router.post('/admin-reply/:id', async (req, res) => {
  try {
    const applicationId = parseInt(req.params.id);
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Reply message is required' });
    }

    // Get current application
    const { data: application, error: fetchError } = await supabase
      .from('faculty_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Add admin reply to communication history
    const history = application.communication_history || [];
    history.push({
      timestamp: new Date().toISOString(),
      sender: 'admin',
      message: message.trim(),
      type: 'reply'
    });

    // Update database
    const { error: updateError } = await supabase
      .from('faculty_applications')
      .update({
        communication_history: history
      })
      .eq('id', applicationId);

    if (updateError) {
      console.error('Error storing admin reply:', updateError);
      return res.status(500).json({ error: 'Failed to store reply' });
    }

    // Send email to candidate
    const emailResult = await emailService.sendAdminReplyEmail(
      application.email,
      `${application.first_name} ${application.last_name}`,
      message.trim()
    );

    if (!emailResult.success) {
      console.error('Failed to send reply email:', emailResult.error);
      // Don't fail the request, message is stored in DB
    }

    // Invalidate cache
    cache.delPattern(`req:/api/applications/*`).catch(console.error);

    res.json({
      success: true,
      message: 'Reply sent to candidate'
    });

  } catch (error) {
    console.error('Error in admin-reply:', error);
    res.status(500).json({ error: error.message });
  }
});

// ⚡ NEW: Get communication history for an application
router.get('/communication-history/:id', async (req, res) => {
  try {
    const applicationId = parseInt(req.params.id);

    const { data: application, error } = await supabase
      .from('faculty_applications')
      .select('communication_history, candidate_response_message, negotiation_count')
      .eq('id', applicationId)
      .single();

    if (error || !application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({
      history: application.communication_history || [],
      latestMessage: application.candidate_response_message,
      negotiationCount: application.negotiation_count || 0
    });

  } catch (error) {
    console.error('Error fetching communication history:', error);
    res.status(500).json({ error: error.message });
  }
});

// ⚡ NEW: Serve HTML form for "Prefer Another Time Slot"
router.get('/prefer-another-time-form/:id', async (req, res) => {
  const applicationId = parseInt(req.params.id);

  const htmlForm = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Prefer Another Time Slot</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            max-width: 600px;
            width: 100%;
        }
        h1 {
            color: #3b82f6;
            margin-bottom: 10px;
            font-size: 28px;
        }
        p {
            color: #666;
            margin-bottom: 20px;
            line-height: 1.6;
        }
        label {
            display: block;
            color: #333;
            font-weight: 600;
            margin-bottom: 8px;
        }
        textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 15px;
            font-family: inherit;
            resize: vertical;
            min-height: 150px;
            transition: border-color 0.3s;
        }
        textarea:focus {
            outline: none;
            border-color: #3b82f6;
        }
        .word-count {
            text-align: right;
            color: #6b7280;
            font-size: 14px;
            margin-top: 5px;
        }
        .word-count.warning { color: #f59e0b; }
        .word-count.error { color: #ef4444; }
        button {
            width: 100%;
            padding: 14px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 20px;
            transition: background 0.3s;
        }
        button:hover { background: #2563eb; }
        button:disabled {
            background: #9ca3af;
            cursor: not-allowed;
        }
        .error-message {
            background: #fee2e2;
            color: #dc2626;
            padding: 12px;
            border-radius: 8px;
            margin-top: 15px;
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔄 Prefer Another Time Slot</h1>
        <p>Please let us know your preferred time or any constraints you have. Our HR team will review your message and get back to you with an alternative schedule.</p>
        
        <form id="preferForm">
            <label for="message">Your Message (Maximum 70 words):</label>
            <textarea 
                id="message" 
                name="message" 
                placeholder="Example: I'm not available on the proposed date due to prior commitments. I would prefer any time slot between March 15-20, preferably in the afternoon (IST)."
                required
            ></textarea>
            <div class="word-count" id="wordCount">0 / 70 words</div>
            
            <button type="submit" id="submitBtn">Submit Response</button>
            
            <div class="error-message" id="errorMessage"></div>
        </form>
    </div>
    
    <script>
        const textarea = document.getElementById('message');
        const wordCountEl = document.getElementById('wordCount');
        const submitBtn = document.getElementById('submitBtn');
        const errorMessage = document.getElementById('errorMessage');
        const form = document.getElementById('preferForm');
        
        // Word count tracker
        textarea.addEventListener('input', () => {
            const text = textarea.value.trim();
            const words = text.length > 0 ? text.split(/\\s+/).length : 0;
            
            wordCountEl.textContent = \`\${words} / 70 words\`;
            
            if (words > 70) {
                wordCountEl.classList.add('error');
                wordCountEl.classList.remove('warning');
                submitBtn.disabled = true;
            } else if (words > 60) {
                wordCountEl.classList.add('warning');
                wordCountEl.classList.remove('error');
                submitBtn.disabled = false;
            } else {
                wordCountEl.classList.remove('warning', 'error');
                submitBtn.disabled = false;
            }
        });
        
        // Form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const message = textarea.value.trim();
            const words = message.split(/\\s+/).length;
            
            if (words > 70) {
                errorMessage.textContent = \`Message exceeds 70 word limit (\${words} words). Please shorten your message.\`;
                errorMessage.style.display = 'block';
                return;
            }
            
            if (message.length === 0) {
                errorMessage.textContent = 'Please enter a message.';
                errorMessage.style.display = 'block';
                return;
            }
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';
            errorMessage.style.display = 'none';
            
            try {
                const response = await fetch('/api/applications/prefer-another-time/${applicationId}', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ message })
                });
                
                if (response.ok) {
                    // Success - the endpoint returns HTML
                    const html = await response.text();
                    document.body.innerHTML = html;
                } else {
                    const data = await response.json();
                    errorMessage.textContent = data.error || 'Failed to submit response';
                    errorMessage.style.display = 'block';
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Submit Response';
                }
            } catch (error) {
                errorMessage.textContent = 'Network error. Please try again.';
                errorMessage.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Response';
            }
        });
    </script>
</body>
</html>`;

  res.send(htmlForm);
});

// ── CV PARSING ROUTE ────────────────────────────────────
// POST /api/applications/parse-cv/:id
router.post('/parse-cv/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📄 CV parsing request for application ID: ${id}`);

    const result = await parseCV(id);

    if (!result.success) {
      return res.status(400).json({ 
        error: result.error || 'Failed to parse CV'
      });
    }

    res.json({
      success: true,
      data: result.data,
      candidateName: result.candidateName
    });

  } catch (error) {
    console.error('CV parsing route error:', error);
    res.status(500).json({ 
      error: 'Internal server error during CV parsing',
      details: error.message 
    });
  }
});

export default router;
