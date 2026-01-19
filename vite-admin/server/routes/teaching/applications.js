// server/routes/teaching/applications.js
import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import documentService from '../../services/documentService.js';
import scoringService from '../../services/scoringService.js';
import cache from '../../config/cache.js';

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
      if (!teachingPostMap.has(t.application_id)) {
        teachingPostMap.set(t.application_id, t.post);
      }
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
      
      const teachingPost = teachingPostMap.get(app.id);
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
        gender,
        date_of_birth,
        nationality,
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

      // Insert main application
      const { data: appData, error: appError } = await supabase
        .from('faculty_applications')
        .insert([{
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
          gender,
          date_of_birth,
          nationality,
          user_id,
          status: 'submitted'
        }])
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
      await uploadFile('researchStatement', 'application-reports', 'research_statement');
      await uploadFile('cvPath', 'application-reports', 'cv');
      await uploadFile('otherPublications', 'application-reports', 'other_publications', true);
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
        applicationId
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
      .neq('status', 'final_rejected');

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

export default router;
