import supabase from '../config/db.js';
import scoringService from './scoringService.js';

class DocumentService {
  constructor() {
    this.universityName = 'BML Munjal University';
    this.universityAddress = '67th KM Stone, NH-8, Sidhrawali, Gurgaon, Haryana 122413';
  }

  // Add this method inside the DocumentService class
async generateInitialReport(applicationId) {
  try {
    console.log(`📄 Generating initial report for application ${applicationId}`);
    
    // Reuse the existing generateApplicationReport method
    const report = await this.generateApplicationReport(applicationId, 'pdf');
    return report;
  } catch (error) {
    console.error('❌ Error in generateInitialReport:', error);
    // Don't throw - let the application submission continue
    return { success: false, error: error.message };
  }
}

  

  // Generate comprehensive application report
  async generateApplicationReport(applicationId, format = 'pdf') {
    try {
      console.log(`📄 Generating ${format.toUpperCase()} report for application ${applicationId}`);

      // Get complete application data
      const application = await scoringService.getApplicationData(applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      // Get score breakdown
      const scoreBreakdown = await scoringService.getScoreBreakdown(applicationId);

      // Generate document content
      const documentContent = this.generateDocumentContent(application, scoreBreakdown);

      if (format.toLowerCase() === 'pdf') {
        return await this.generatePDF(documentContent, application);
      } else if (format.toLowerCase() === 'docx') {
        return await this.generateDOCX(documentContent, application);
      } else {
        throw new Error('Unsupported format. Use "pdf" or "docx"');
      }

    } catch (error) {
      console.error('❌ Error generating document:', error);
      throw error;
    }
  }

  // Generate document content structure
  generateDocumentContent(application, scoreBreakdown) {
    const currentDate = new Date().toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return {
      header: {
        title: 'Faculty Application Report',
        university: this.universityName,
        address: this.universityAddress,
        date: currentDate,
        applicationId: application.id
      },
      candidate: {
        name: `${application.first_name} ${application.last_name}`,
        email: application.email,
        phone: application.phone,
        address: application.address,
        gender: application.gender,
        dateOfBirth: application.date_of_birth,
        nationality: application.nationality
      },
      position: {
        appliedFor: application.position,
        department: application.department,
        branch: application.branch
      },
      education: {
        highestDegree: application.highest_degree,
        university: application.university,
        graduationYear: application.graduation_year
      },
      experience: {
        yearsOfExperience: application.years_of_experience,
        previousPositions: application.previous_positions,
        teachingExperiences: application.teachingExperiences,
        researchExperiences: application.researchExperiences
      },
      research: {
        publications: application.publications,
        researchInfo: application.researchInfo,
        scopusPapers: application.researchInfo?.scopus_general_papers || 0,
        conferencePapers: application.researchInfo?.conference_papers || 0,
        editedBooks: application.researchInfo?.edited_books || 0
      },
      scoring: {
        totalScore: application.score || 0,
        rank: application.rank || 'Not Ranked',
        breakdown: scoreBreakdown.map(score => ({
          criteria: score.scoring_criteria.criteria_name,
          score: score.score,
          maxScore: score.max_possible_score,
          weight: score.scoring_criteria.weight,
          weightedScore: score.weighted_score
        }))
      },
      documents: {
        cv: application.cv_path,
        coverLetter: application.cover_letter_path,
        teachingStatement: application.teaching_statement_path,
        researchStatement: application.research_statement_path,
        otherPublications: application.other_publications_path
      },
      status: {
        currentStatus: application.status || 'submitted',
        createdAt: application.created_at,
        lastUpdated: new Date().toISOString()
      }
    };
  }

  // Generate PDF document
  async generatePDF(content, application) {
    try {
      // For now, we'll generate HTML that can be converted to PDF
      // In production, you might want to use libraries like puppeteer, jsPDF, or PDFKit
      const htmlContent = this.generateHTMLContent(content);
      
      // Save HTML to a temporary file or return it for client-side PDF generation
      const fileName = `application_${application.id}_${Date.now()}.html`;
      
      // Store in Supabase storage
      const { data, error } = await supabase.storage
        .from('application-reports')
        .upload(fileName, htmlContent, {
          contentType: 'text/html',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('application-reports')
        .getPublicUrl(fileName);

      return {
        fileName,
        url: urlData.publicUrl,
        format: 'html', // Can be converted to PDF client-side
        content: htmlContent
      };

    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }

  // Generate DOCX document
  async generateDOCX(content, application) {
    try {
      // Generate structured text content for DOCX
      const docxContent = this.generateDOCXContent(content);
      
      const fileName = `application_${application.id}_${Date.now()}.txt`;
      
      // Store in Supabase storage
      const { data, error } = await supabase.storage
        .from('application-reports')
        .upload(fileName, docxContent, {
          contentType: 'text/plain',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('application-reports')
        .getPublicUrl(fileName);

      return {
        fileName,
        url: urlData.publicUrl,
        format: 'txt', // Can be converted to DOCX
        content: docxContent
      };

    } catch (error) {
      console.error('Error generating DOCX:', error);
      throw error;
    }
  }

  // Generate HTML content for PDF conversion
  generateHTMLContent(content) {
    const baseUrl = process.env.SUPABASE_URL || '';
    const linkItem = (label, path) => path ? `<li class="doc-item"><a href="${baseUrl}/storage/v1/object/public/application-reports/${path}" target="_blank" rel="noopener noreferrer">${label}</a></li>` : '';
    const documentsSection = (content.documents.cv || content.documents.coverLetter || content.documents.teachingStatement || content.documents.researchStatement || content.documents.otherPublications) ? `
        <div class="section">
            <h3>Attached Documents</h3>
            <ul class="doc-list">
                ${linkItem('Curriculum Vitae (CV)', content.documents.cv)}
                ${linkItem('Cover Letter', content.documents.coverLetter)}
                ${linkItem('Teaching Statement', content.documents.teachingStatement)}
                ${linkItem('Research Statement', content.documents.researchStatement)}
                ${linkItem('Top 3 Publications (Compiled)', content.documents.otherPublications)}
            </ul>
        </div>
    ` : '';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${content.header.title}</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #0E76A8;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #0E76A8;
            margin: 0;
            font-size: 28px;
        }
        .header h2 {
            color: #666;
            margin: 5px 0;
            font-size: 18px;
            font-weight: normal;
        }
        .section {
            margin-bottom: 25px;
            padding: 15px;
            border-left: 4px solid #0E76A8;
            background-color: #f9f9f9;
        }
        .section h3 {
            color: #0E76A8;
            margin-top: 0;
            font-size: 18px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
        }
        .info-item {
            display: flex;
            flex-direction: column;
        }
        .info-label {
            font-weight: bold;
            color: #333;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        .info-value {
            color: #666;
            font-size: 14px;
        }
        .score-section {
            background: linear-gradient(135deg, #0E76A8, #4A90E2);
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .score-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 15px;
        }
        .score-item {
            text-align: center;
        }
        .score-number {
            font-size: 36px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .score-label {
            font-size: 14px;
            opacity: 0.9;
        }
        .breakdown-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        .breakdown-table th,
        .breakdown-table td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        .breakdown-table th {
            background-color: #f5f5f5;
            font-weight: bold;
            color: #333;
        }
    .doc-list {
      list-style: none;
      padding-left: 0;
    }
    .doc-item { margin: 6px 0; }
    .doc-item a { color: #0E76A8; text-decoration: none; }
    .doc-item a:hover { text-decoration: underline; }
        .experience-item {
            margin-bottom: 15px;
            padding: 10px;
            background: white;
            border-radius: 4px;
            border-left: 3px solid #0E76A8;
        }
        .experience-title {
            font-weight: bold;
            color: #0E76A8;
            margin-bottom: 5px;
        }
        .experience-details {
            color: #666;
            font-size: 14px;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 12px;
        }
        @media print {
            body { background-color: white; }
            .container { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${content.header.title}</h1>
            <h2>${content.header.university}</h2>
            <p>${content.header.address}</p>
            <p><strong>Report Date:</strong> ${content.header.date} | <strong>Application ID:</strong> ${content.header.applicationId}</p>
        </div>

        <div class="section">
            <h3>Candidate Information</h3>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Full Name</span>
                    <span class="info-value">${content.candidate.name}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Email</span>
                    <span class="info-value">${content.candidate.email}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Phone</span>
                    <span class="info-value">${content.candidate.phone}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Gender</span>
                    <span class="info-value">${content.candidate.gender}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Date of Birth</span>
                    <span class="info-value">${content.candidate.dateOfBirth}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Nationality</span>
                    <span class="info-value">${content.candidate.nationality}</span>
                </div>
            </div>
            <div class="info-item">
                <span class="info-label">Address</span>
                <span class="info-value">${content.candidate.address}</span>
            </div>
        </div>

        <div class="section">
            <h3>Position Applied</h3>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Position</span>
                    <span class="info-value">${content.position.appliedFor}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Department</span>
                    <span class="info-value">${content.position.department}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Branch</span>
                    <span class="info-value">${content.position.branch || 'N/A'}</span>
                </div>
            </div>
        </div>

        <div class="section">
            <h3>Education</h3>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Highest Degree</span>
                    <span class="info-value">${content.education.highestDegree}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">University</span>
                    <span class="info-value">${content.education.university}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Graduation Year</span>
                    <span class="info-value">${content.education.graduationYear}</span>
                </div>
            </div>
        </div>

        <div class="section">
            <h3>Experience Summary</h3>
            <div class="info-item">
                <span class="info-label">Years of Experience</span>
                <span class="info-value">${content.experience.yearsOfExperience}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Previous Positions</span>
                <span class="info-value">${content.experience.previousPositions || 'Not specified'}</span>
            </div>
        </div>

        ${content.experience.teachingExperiences.length > 0 ? `
        <div class="section">
            <h3>Teaching Experience</h3>
            ${content.experience.teachingExperiences.map(exp => `
                <div class="experience-item">
                    <div class="experience-title">${exp.post} at ${exp.institution}</div>
                    <div class="experience-details">
                        <strong>Duration:</strong> ${exp.start_date} to ${exp.end_date}<br>
                        <strong>Description:</strong> ${exp.experience}
                    </div>
                </div>
            `).join('')}
        </div>
        ` : ''}

        ${content.experience.researchExperiences.length > 0 ? `
        <div class="section">
            <h3>Research Experience</h3>
            ${content.experience.researchExperiences.map(exp => `
                <div class="experience-item">
                    <div class="experience-title">${exp.post} at ${exp.institution}</div>
                    <div class="experience-details">
                        <strong>Duration:</strong> ${exp.start_date} to ${exp.end_date}<br>
                        <strong>Description:</strong> ${exp.experience}
                    </div>
                </div>
            `).join('')}
        </div>
        ` : ''}

    ${documentsSection}

    <div class="section">
            <h3>Research & Publications</h3>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Scopus Papers</span>
                    <span class="info-value">${content.research.scopusPapers}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Conference Papers</span>
                    <span class="info-value">${content.research.conferencePapers}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Edited Books</span>
                    <span class="info-value">${content.research.editedBooks}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Total Publications</span>
                    <span class="info-value">${content.research.publications || 'Not specified'}</span>
                </div>
            </div>
        </div>

        <div class="score-section">
            <h3 style="margin-top: 0; color: white;">Application Scoring & Ranking</h3>
            <div class="score-grid">
                <div class="score-item">
                    <div class="score-number">${content.scoring.totalScore}</div>
                    <div class="score-label">Total Score</div>
                </div>
                <div class="score-item">
                    <div class="score-number">${content.scoring.rank}</div>
                    <div class="score-label">Rank</div>
                </div>
            </div>
            
            <h4 style="color: white; margin-top: 20px;">Score Breakdown</h4>
            <table class="breakdown-table" style="background: rgba(255,255,255,0.1); color: white;">
                <thead>
                    <tr>
                        <th>Criteria</th>
                        <th>Score</th>
                        <th>Weight</th>
                        <th>Weighted Score</th>
                    </tr>
                </thead>
                <tbody>
                    ${content.scoring.breakdown.map(score => `
                        <tr>
                            <td>${score.criteria}</td>
                            <td>${score.score}/${score.maxScore}</td>
                            <td>${(score.weight * 100).toFixed(1)}%</td>
                            <td>${score.weightedScore.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h3>Application Status</h3>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Current Status</span>
                    <span class="info-value">${content.status.currentStatus}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Application Date</span>
                    <span class="info-value">${new Date(content.status.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>This report was generated automatically by the BML Munjal University Faculty Recruitment System.</p>
            <p>For any queries, please contact the HR department.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  // Generate DOCX content (structured text)
  generateDOCXContent(content) {
    return `
FACULTY APPLICATION REPORT
${content.header.university}
${content.header.address}

Report Date: ${content.header.date}
Application ID: ${content.header.applicationId}

================================================================================

CANDIDATE INFORMATION
================================================================================

Name: ${content.candidate.name}
Email: ${content.candidate.email}
Phone: ${content.candidate.phone}
Address: ${content.candidate.address}
Gender: ${content.candidate.gender}
Date of Birth: ${content.candidate.dateOfBirth}
Nationality: ${content.candidate.nationality}

================================================================================

POSITION APPLIED
================================================================================

Position: ${content.position.appliedFor}
Department: ${content.position.department}
Branch: ${content.position.branch || 'N/A'}

================================================================================

EDUCATION
================================================================================

Highest Degree: ${content.education.highestDegree}
University: ${content.education.university}
Graduation Year: ${content.education.graduationYear}

================================================================================

EXPERIENCE SUMMARY
================================================================================

Years of Experience: ${content.experience.yearsOfExperience}
Previous Positions: ${content.experience.previousPositions || 'Not specified'}

${content.experience.teachingExperiences.length > 0 ? `
TEACHING EXPERIENCE
================================================================================
${content.experience.teachingExperiences.map((exp, index) => `
${index + 1}. ${exp.post} at ${exp.institution}
   Duration: ${exp.start_date} to ${exp.end_date}
   Description: ${exp.experience}
`).join('')}
` : ''}

${content.experience.researchExperiences.length > 0 ? `
RESEARCH EXPERIENCE
================================================================================
${content.experience.researchExperiences.map((exp, index) => `
${index + 1}. ${exp.post} at ${exp.institution}
   Duration: ${exp.start_date} to ${exp.end_date}
   Description: ${exp.experience}
`).join('')}
` : ''}

================================================================================

RESEARCH & PUBLICATIONS
================================================================================

Scopus Papers: ${content.research.scopusPapers}
Conference Papers: ${content.research.conferencePapers}
Edited Books: ${content.research.editedBooks}
Total Publications: ${content.research.publications || 'Not specified'}

================================================================================

APPLICATION SCORING & RANKING
================================================================================

Total Score: ${content.scoring.totalScore}
Rank: ${content.scoring.rank}

SCORE BREAKDOWN:
${content.scoring.breakdown.map(score => `
- ${score.criteria}: ${score.score}/${score.maxScore} (Weight: ${(score.weight * 100).toFixed(1)}%, Weighted: ${score.weightedScore.toFixed(2)})
`).join('')}

================================================================================

APPLICATION STATUS
================================================================================

Current Status: ${content.status.currentStatus}
Application Date: ${new Date(content.status.createdAt).toLocaleDateString()}
Last Updated: ${new Date(content.status.lastUpdated).toLocaleDateString()}

================================================================================

This report was generated automatically by the BML Munjal University 
Faculty Recruitment System. For any queries, please contact the HR department.
    `;
  }

  // Get all generated reports for an application
  async getApplicationReports(applicationId) {
    try {
      const { data, error } = await supabase.storage
        .from('application-reports')
        .list('', {
          search: `application_${applicationId}_`
        });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching reports:', error);
      throw error;
    }
  }

  // Delete a report
  async deleteReport(fileName) {
    try {
      const { error } = await supabase.storage
        .from('application-reports')
        .remove([fileName]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting report:', error);
      throw error;
    }
  }
}

export default new DocumentService();
