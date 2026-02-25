// services/cvParsingService.js
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Groq API Key from environment variable
const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!GROQ_API_KEY) {
    console.warn('⚠️ GROQ_API_KEY not configured. CV parsing will not work.');
}
const groq = new Groq({ apiKey: GROQ_API_KEY || '' });

// ── Text Extraction Functions ──────────────────────────
async function extractTextFromPDF(buffer) {
    try {
        const data = await pdfParse(buffer);
        return data.text;
    } catch (error) {
        console.error('PDF extraction error:', error);
        throw new Error('Failed to extract text from PDF');
    }
}

async function extractTextFromDOCX(buffer) {
    try {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    } catch (error) {
        console.error('DOCX extraction error:', error);
        throw new Error('Failed to extract text from DOCX');
    }
}

function extractTextFromTXT(buffer) {
    return buffer.toString('utf-8');
}

async function extractCVText(buffer, filename) {
    const ext = filename.split('.').pop().toLowerCase();
    
    switch (ext) {
        case 'pdf':
            return await extractTextFromPDF(buffer);
        case 'docx':
        case 'doc':
            return await extractTextFromDOCX(buffer);
        case 'txt':
            return extractTextFromTXT(buffer);
        default:
            throw new Error(`Unsupported file format: ${ext}`);
    }
}

// ── Groq AI Prompts ─────────────────────────────────────
const SYSTEM_MESSAGE = `You are an expert CV/Resume analyzer for academic faculty positions.
Extract comprehensive academic and professional information from CVs.
Always respond with ONLY valid JSON — no markdown, no explanation, no extra text.
Only include fields where you find REAL data. Skip empty ones.`;

const USER_PROMPT = `Analyze this CV and extract a comprehensive academic and professional profile.
Extract ONLY what is actually mentioned in the CV. Do not assume or invent data.

Return ONLY a valid JSON object with these fields (skip any that don't have data):

{
  "name": "full name",
  "primary_specialization": "one-line summary of core expertise",
  "domain_expertise": ["domain 1", "domain 2"],
  "technical_skills": {
    "languages_frameworks": ["Python", "React"],
    "tools_platforms": ["Docker", "AWS"],
    "databases": ["MySQL"],
    "methodologies": ["Agile", "Scrum"]
  },
  "soft_skills": ["Leadership", "Communication"],
  "certifications": ["cert 1"],
  "experience_level": "Junior / Mid / Senior / Lead / Executive",
  "years_of_experience": "e.g. 5 years",
  "industry_background": ["Finance", "Healthcare"],
  "education_specialization": ["Degree - University"],
  "languages_spoken": ["English", "Hindi"],
  
  "research_information": {
    "research_topics": ["topic 1", "topic 2"],
    "specializations": ["spec 1", "spec 2"],
    "total_projects": "number if identifiable"
  },
  
  "project_information": [
    {
      "title": "project title if available",
      "duration": "duration if available",
      "role": "role if mentioned",
      "funding_agency": "agency if mentioned",
      "funding_amount": "amount if mentioned"
    }
  ],
  
  "funding_information": {
    "agencies": ["agency 1", "agency 2"],
    "total_funding": "sum if amounts available",
    "projects_funded": "number if identifiable"
  },
  
  "intellectual_property": {
    "patents_filed": "number if mentioned",
    "patents_granted": "number if mentioned",
    "copyrights": ["copyright details if mentioned"]
  },
  
  "teaching_contribution": {
    "courses_taught": ["course 1", "course 2"],
    "ug_pg_level": "UG / PG / Both",
    "number_of_courses": "number if identifiable"
  },
  
  "administrative_responsibilities": [
    "any administrative role mentioned like Dean, HOD, Coordinator, Committee roles, etc"
  ],
  
  "consultancy_startup": {
    "consultancy_projects": ["project if mentioned"],
    "industry_collaborations": ["collaboration if mentioned"],
    "startup_involvement": ["startup if mentioned"],
    "founder_cofounder_roles": ["role if mentioned"]
  },
  
  "key_achievements": ["achievement 1"],
  "notable_projects": ["brief project description"],
  "publications": "number of publications if mentioned"
}

CV TEXT:
---------
{cv_text}
---------

Return ONLY the JSON object. No markdown, no code blocks, no explanation.`;

// ── Groq Extraction Function ────────────────────────────
async function extractSpecializationWithGroq(cvText) {
    try {
        // Trim CV text if too long (Groq has token limits)
        const cvTrimmed = cvText.length > 12000 ? cvText.substring(0, 12000) : cvText;

        const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: SYSTEM_MESSAGE },
                { role: "user", content: USER_PROMPT.replace('{cv_text}', cvTrimmed) }
            ],
            temperature: 0,
            max_tokens: 3000
        });

        let raw = response.choices[0].message.content.trim();

        // Remove markdown code blocks if present
        if (raw.startsWith('```')) {
            const parts = raw.split('```');
            raw = parts[1] || raw;
            if (raw.startsWith('json')) {
                raw = raw.substring(4);
            }
        }

        return JSON.parse(raw.trim());
    } catch (error) {
        console.error('Groq extraction error:', error);
        throw new Error('Failed to extract specialization with AI');
    }
}

// ── Main CV Parsing Function ────────────────────────────
export async function parseCV(applicationId) {
    try {
        console.log(`📄 Parsing CV for application ID: ${applicationId}`);

        // 1. Fetch application and CV file path from database
        const { data: application, error: fetchError } = await supabase
            .from('faculty_applications')
            .select('cv_path, first_name, last_name')
            .eq('id', applicationId)
            .single();

        if (fetchError || !application) {
            throw new Error('Application not found');
        }

        if (!application.cv_path) {
            throw new Error('No CV file found for this application');
        }

        console.log(`📂 CV file path: ${application.cv_path}`);

        // 2. Download CV file from Supabase Storage
        const { data: fileData, error: downloadError } = await supabase.storage
            .from('application-reports')
            .download(application.cv_path);

        if (downloadError) {
            throw new Error('Failed to download CV file');
        }

        // 3. Convert file to buffer
        const buffer = Buffer.from(await fileData.arrayBuffer());
        const filename = application.cv_path.split('/').pop();

        console.log(`📝 Extracting text from CV...`);

        // 4. Extract text from CV
        const cvText = await extractCVText(buffer, filename);
        console.log(`✅ Extracted ${cvText.length} characters`);

        // 5. Send to Groq for AI analysis
        console.log(`🤖 Sending to Groq AI for analysis...`);
        const parsedData = await extractSpecializationWithGroq(cvText);

        console.log(`✅ CV parsing completed successfully`);

        return {
            success: true,
            data: parsedData,
            candidateName: `${application.first_name} ${application.last_name}`
        };

    } catch (error) {
        console.error('CV parsing error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
