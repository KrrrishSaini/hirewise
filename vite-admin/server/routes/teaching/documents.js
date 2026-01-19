// server/routes/teaching/documents.js
import express from 'express';
import documentService from '../../services/documentService.js';
import multer from 'multer';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Multer for file uploads
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

// Supabase storage client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Helper: upload a file buffer to storage and return path
async function uploadToStorage(bucket, fileName, fileBuffer, contentType='application/octet-stream') {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, fileBuffer, { contentType, upsert: false });
  if (error) throw error;
  return data.path;
}

// Upload/attach documents to an existing application
router.post(
  '/upload/:applicationId',
  upload.fields([
    { name: 'coverLetter', maxCount: 1 },
    { name: 'teachingStatement', maxCount: 1 },
    { name: 'researchStatement', maxCount: 1 },
    { name: 'cv', maxCount: 1 },
    { name: 'otherPublications', maxCount: 1 },
    // Also accept client field names from initial submission for compatibility
    { name: 'coverLetterPath', maxCount: 1 },
    { name: 'cvPath', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const applicationId = parseInt(req.params.applicationId);
      if (!applicationId) return res.status(400).json({ error: 'Invalid application id' });

      // ensure app exists
      const { data: app, error: appErr } = await supabase
        .from('faculty_applications')
        .select('id')
        .eq('id', applicationId)
        .single();
      if (appErr || !app) return res.status(404).json({ error: 'Application not found' });

      const docPaths = {};
      const bucket = 'application-reports';

      async function handle(key, field) {
        if (req.files?.[key]?.[0]) {
          const file = req.files[key][0];
          const ext = path.extname(file.originalname).toLowerCase() || '.bin';
          const fileName = `${field}_${applicationId}_${Date.now()}${ext}`;
          const storagePath = await uploadToStorage(bucket, fileName, file.buffer, file.mimetype);
          docPaths[`${field}_path`] = storagePath;
        }
      }

      await handle('coverLetter', 'cover_letter');
      await handle('coverLetterPath', 'cover_letter');
      await handle('teachingStatement', 'teaching_statement');
      await handle('researchStatement', 'research_statement');
      await handle('cv', 'cv');
      await handle('cvPath', 'cv');
      await handle('otherPublications', 'other_publications');

      if (Object.keys(docPaths).length === 0) {
        return res.status(400).json({ error: 'No files were provided' });
      }

      const { error: updErr } = await supabase
        .from('faculty_applications')
        .update(docPaths)
        .eq('id', applicationId);
      if (updErr) throw updErr;

      return res.json({ success: true, updated: docPaths });
    } catch (error) {
      console.error('Upload documents error:', error);
      return res.status(500).json({ error: error.message || 'Failed to upload documents' });
    }
  }
);

// Draft uploads (for Save & Exit) - store in the same bucket so paths can be reused on final submit
router.post(
  '/drafts/upload',
  upload.fields([
    { name: 'coverLetterPath', maxCount: 1 },
    { name: 'teachingStatement', maxCount: 1 },
    { name: 'researchStatement', maxCount: 1 },
    { name: 'cvPath', maxCount: 1 },
    { name: 'otherPublications', maxCount: 3 }
  ]),
  async (req, res) => {
    try {
      const bucket = 'application-reports';
      const uploaded = {};

      async function handle(key, field) {
        if (req.files?.[key]?.[0]) {
          const files = req.files[key];
          if (key === 'otherPublications') {
            const paths = [];
            for (const file of files.slice(0, 3)) {
              const ext = path.extname(file.originalname).toLowerCase() || '.bin';
              const fileName = `draft_${field}_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
              const storagePath = await uploadToStorage(bucket, fileName, file.buffer, file.mimetype);
              paths.push(storagePath);
            }
            uploaded[`${field}_path`] = paths;
          } else {
            const file = files[0];
            const ext = path.extname(file.originalname).toLowerCase() || '.bin';
            const fileName = `draft_${field}_${Date.now()}${ext}`;
            const storagePath = await uploadToStorage(bucket, fileName, file.buffer, file.mimetype);
            uploaded[`${field}_path`] = storagePath;
          }
        }
      }

      await handle('coverLetterPath', 'cover_letter');
      await handle('teachingStatement', 'teaching_statement');
      await handle('researchStatement', 'research_statement');
      await handle('cvPath', 'cv');
      await handle('otherPublications', 'other_publications');

      if (Object.keys(uploaded).length === 0) {
        return res.status(400).json({ error: 'No files were provided' });
      }

      return res.json({ success: true, paths: uploaded });
    } catch (error) {
      console.error('Draft upload error:', error);
      return res.status(500).json({ error: error.message || 'Failed to upload drafts' });
    }
  }
);

// Generate application report
router.post('/generate/:applicationId', async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { format = 'pdf' } = req.body;

    if (!['pdf', 'docx'].includes(format.toLowerCase())) {
      return res.status(400).json({ 
        error: 'Invalid format. Use "pdf" or "docx"' 
      });
    }

    const report = await documentService.generateApplicationReport(
      parseInt(applicationId), 
      format
    );

    res.json({
      success: true,
      message: 'Report generated successfully',
      report: {
        fileName: report.fileName,
        url: report.url,
        format: report.format,
        applicationId: parseInt(applicationId)
      }
    });

  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate report' 
    });
  }
});

// Get all reports for an application
router.get('/reports/:applicationId', async (req, res) => {
  try {
    const { applicationId } = req.params;
    
    const reports = await documentService.getApplicationReports(
      parseInt(applicationId)
    );

    res.json({
      success: true,
      reports: reports.map(report => ({
        name: report.name,
        size: report.metadata?.size,
        lastModified: report.updated_at,
        url: `${process.env.SUPABASE_URL}/storage/v1/object/public/application-reports/${report.name}`
      }))
    });

  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch reports' 
    });
  }
});

// Delete a report
router.delete('/reports/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    
    await documentService.deleteReport(fileName);

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to delete report' 
    });
  }
});

// Download report content (for HTML/PDF conversion)
router.get('/content/:applicationId', async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { format = 'html' } = req.query;

    const report = await documentService.generateApplicationReport(
      parseInt(applicationId), 
      format
    );

    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html');
      res.send(report.content);
    } else {
      res.setHeader('Content-Type', 'text/plain');
      res.send(report.content);
    }

  } catch (error) {
    console.error('Error getting report content:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to get report content' 
    });
  }
});

export default router;
