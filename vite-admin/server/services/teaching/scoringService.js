import supabase from '../../config/db.js';
import { UNIVERSITY_RANKINGS, findUniversityRanking } from '../../data/university-rankings.js';

class ScoringService {
  constructor() {
    this.criteriaWeights = {
      'Education & Qualifications': 0.20,
      'Research Experience': 0.25,
      'Teaching Experience': 0.20,
      'Industry Experience': 0.15,
      'Publications & Citations': 0.10,
      'Awards & Recognition': 0.05,
      'Communication Skills': 0.05
    };
  }

  // Add this method inside the ScoringService class
  async submitApplication(applicationId) {
    try {
      console.log(`📤 Submitting application ${applicationId} for scoring`);
      const score = await this.calculateApplicationScore(applicationId);
      return { success: true, score };
    } catch (error) {
      console.error('❌ Error in submitApplication:', error);
      throw error;
    }
  }

  // Main scoring function
  async calculateApplicationScore(applicationId) {
    try {
      console.log(`🎯 Calculating score for application ${applicationId}`);
      
      // Get application data
      const application = await this.getApplicationData(applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      // Calculate scores for each criteria
      const scores = await Promise.all([
        this.calculateEducationScore(application),
        this.calculateResearchScore(application),
        this.calculateTeachingScore(application),
        this.calculateIndustryScore(application),
        this.calculatePublicationsScore(application),
        this.calculateAwardsScore(application),
        this.calculateCommunicationScore(application)
      ]);

      // Save individual scores to database
      await this.saveScoresToDatabase(applicationId, scores);

      // Calculate weighted total
      const totalScore = this.calculateWeightedTotal(scores);
      
      // Update main application score
      await this.updateApplicationScore(applicationId, totalScore);
      
      // Update rankings
      await this.updateRankings();

      console.log(`✅ Score calculated: ${totalScore} for application ${applicationId}`);
      return totalScore;

    } catch (error) {
      console.error('❌ Error calculating score:', error);
      throw error;
    }
  }

  // Get complete application data
  async getApplicationData(applicationId) {
    const { data: application, error: appError } = await supabase
      .from('faculty_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (appError) throw appError;

    // Get related data
    const [teachingExp, researchExp, researchInfo, documents] = await Promise.all([
      supabase.from('teaching_experiences').select('*').eq('application_id', applicationId),
      supabase.from('research_experiences').select('*').eq('application_id', applicationId),
      supabase.from('research_info').select('*').eq('application_id', applicationId).single(),
      supabase.from('application_documents').select('*').eq('application_id', applicationId)
    ]);

    return {
      ...application,
      teachingExperiences: teachingExp.data || [],
      researchExperiences: researchExp.data || [],
      researchInfo: researchInfo.data || {},
      documents: documents.data || []
    };
  }

  // Education & Qualifications Scoring (0-100)
  async calculateEducationScore(application) {
    let score = 0;
    const { highest_degree, university, graduation_year } = application;

    // Degree level scoring
    if (highest_degree) {
      const degree = highest_degree.toLowerCase();
      if (degree.includes('phd') || degree.includes('doctorate')) {
        score += 40;
      } else if (degree.includes('master') || degree.includes('m.tech') || degree.includes('mba')) {
        score += 25;
      } else if (degree.includes('bachelor') || degree.includes('b.tech')) {
        score += 15;
      }
    }

    // University reputation scoring (baseline)
    if (university) {
      const uni = university.toLowerCase();
      const topUniversities = ['iit', 'iim', 'iisc', 'du', 'jnu', 'jadavpur', 'anna university'];
      const isTopUni = topUniversities.some(topUni => uni.includes(topUni));
      
      if (isTopUni) {
        score += 30;
      } else if (uni.includes('university') || uni.includes('institute')) {
        score += 20;
      } else {
        score += 10;
      }

      // Additional boost using NIRF & QS rankings if recognizable
      score += this.calculateUniversityRankingBoost(uni);
    }

    // Recent graduation bonus
    if (graduation_year) {
      const year = parseInt(graduation_year);
      const currentYear = new Date().getFullYear();
      const yearsSinceGraduation = currentYear - year;
      
      if (yearsSinceGraduation <= 5) {
        score += 15; // Recent graduate
      } else if (yearsSinceGraduation <= 10) {
        score += 10; // Mid-career
      } else {
        score += 5; // Experienced
      }
    }

    return {
      criteria: 'Education & Qualifications',
      score: Math.min(score, 100),
      maxScore: 100,
      weight: this.criteriaWeights['Education & Qualifications']
    };
  }

  // Extra points based on NIRF and QS rankings for the candidate's university
  calculateUniversityRankingBoost(uniLower) {
    const match = findUniversityRanking(uniLower);
    if (!match) return 0;

    // Convert ranks to scores (smaller rank => larger score)
    const rankToScore = (rank, maxRank) => {
      if (!rank || rank <= 0) return 0;
      const clamped = Math.min(rank, maxRank);
      return Math.max(0, (maxRank - clamped) / maxRank) * 100; // 0..100
    };

    const nirfScore = rankToScore(match.nirf, 100); // assume ranks up to 100
    const qsScore = rankToScore(match.qs, 1500);    // QS world ranks up to 1500

    // Weight NIRF more for local relevance
    const combined = (0.6 * nirfScore) + (0.4 * qsScore);

    // Scale to a modest boost (0..20)
    const boost = Math.min(20, combined * 0.2);
    return boost;
  }

  // Public helper to compute NIRF and QS scores on 0..10 scale given a university string
  getUniversityRankingScores(uniLower) {
    if (!uniLower) return { nirf10: null, qs10: null };

    const match = findUniversityRanking(uniLower);
    if (!match) return { nirf10: null, qs10: null };

    const rankToScore = (rank, maxRank) => {
      if (!rank || rank <= 0) return null;
      const clamped = Math.min(rank, maxRank);
      return Math.max(0, (maxRank - clamped) / maxRank) * 100; // 0..100
    };

    const nirf100 = rankToScore(match.nirf, 100);
    const qs100 = rankToScore(match.qs, 1500);

    // Convert to 0..10 scale and round to one decimal for display
    const nirf10 = nirf100 !== null ? Math.round((nirf100 / 10) * 10) / 10 : null;
    const qs10 = qs100 !== null ? Math.round((qs100 / 10) * 10) / 10 : null;
    return { nirf10, qs10 };
  }

  // Research Experience Scoring (0-100)
  async calculateResearchScore(application) {
    let score = 0;
    const { researchExperiences, researchInfo, years_of_experience } = application;

    // Research experience duration
    if (years_of_experience) {
      const expYears = this.extractYearsFromExperience(years_of_experience);
      if (expYears >= 10) score += 25;
      else if (expYears >= 5) score += 20;
      else if (expYears >= 2) score += 15;
      else score += 5;
    }

    // Research positions
    if (researchExperiences && researchExperiences.length > 0) {
      score += Math.min(researchExperiences.length * 10, 30);
      
      // Check for prestigious institutions
      const prestigiousInstitutions = ['iit', 'iisc', 'iim', 'tifr', 'isro', 'drdo'];
      const hasPrestigiousExp = researchExperiences.some(exp => 
        prestigiousInstitutions.some(inst => 
          exp.institution.toLowerCase().includes(inst)
        )
      );
      if (hasPrestigiousExp) score += 15;
    }

    // Research metrics
    if (researchInfo) {
      const { scopus_general_papers = 0, conference_papers = 0, edited_books = 0 } = researchInfo;
      const totalPublications = scopus_general_papers + conference_papers + edited_books;
      
      if (totalPublications >= 20) score += 20;
      else if (totalPublications >= 10) score += 15;
      else if (totalPublications >= 5) score += 10;
      else if (totalPublications > 0) score += 5;
    }

    return {
      criteria: 'Research Experience',
      score: Math.min(score, 100),
      maxScore: 100,
      weight: this.criteriaWeights['Research Experience']
    };
  }

  // Teaching Experience Scoring (0-100)
  async calculateTeachingScore(application) {
    let score = 0;
    const { teachingExperiences, years_of_experience } = application;

    // Teaching experience duration
    if (years_of_experience) {
      const expYears = this.extractYearsFromExperience(years_of_experience);
      if (expYears >= 10) score += 30;
      else if (expYears >= 5) score += 25;
      else if (expYears >= 2) score += 20;
      else score += 10;
    }

    // Teaching positions
    if (teachingExperiences && teachingExperiences.length > 0) {
      score += Math.min(teachingExperiences.length * 8, 25);
      
      // Check for teaching positions
      const teachingPositions = ['professor', 'associate professor', 'assistant professor', 'lecturer'];
      const hasTeachingPos = teachingExperiences.some(exp => 
        teachingPositions.some(pos => 
          exp.post.toLowerCase().includes(pos)
        )
      );
      if (hasTeachingPos) score += 20;
    }

    // Course diversity (if available in experience descriptions)
    if (teachingExperiences && teachingExperiences.length > 0) {
      const courseKeywords = ['course', 'subject', 'curriculum', 'syllabus', 'teaching'];
      const hasCourseInfo = teachingExperiences.some(exp => 
        courseKeywords.some(keyword => 
          exp.experience.toLowerCase().includes(keyword)
        )
      );
      if (hasCourseInfo) score += 15;
    }

    return {
      criteria: 'Teaching Experience',
      score: Math.min(score, 100),
      maxScore: 100,
      weight: this.criteriaWeights['Teaching Experience']
    };
  }

  // Industry Experience Scoring (0-100)
  async calculateIndustryScore(application) {
    let score = 0;
    const { previous_positions, years_of_experience } = application;

    // Industry experience duration
    if (years_of_experience) {
      const expYears = this.extractYearsFromExperience(years_of_experience);
      if (expYears >= 10) score += 30;
      else if (expYears >= 5) score += 25;
      else if (expYears >= 2) score += 20;
      else score += 10;
    }

    // Previous positions analysis
    if (previous_positions) {
      const positions = previous_positions.toLowerCase();
      
      // Senior positions
      if (positions.includes('senior') || positions.includes('lead') || positions.includes('head')) {
        score += 25;
      } else if (positions.includes('manager') || positions.includes('director')) {
        score += 20;
      } else if (positions.includes('engineer') || positions.includes('analyst')) {
        score += 15;
      } else {
        score += 10;
      }

      // Industry relevance
      const relevantIndustries = ['technology', 'research', 'education', 'consulting', 'finance'];
      const hasRelevantIndustry = relevantIndustries.some(industry => 
        positions.includes(industry)
      );
      if (hasRelevantIndustry) score += 20;
    }

    return {
      criteria: 'Industry Experience',
      score: Math.min(score, 100),
      maxScore: 100,
      weight: this.criteriaWeights['Industry Experience']
    };
  }

  // Publications & Citations Scoring (0-100)
  async calculatePublicationsScore(application) {
    let score = 0;
    const { researchInfo, publications } = application;

    // Research info scoring
    if (researchInfo) {
      const { scopus_general_papers = 0, conference_papers = 0, edited_books = 0 } = researchInfo;
      
      // Scopus papers (higher weight)
      if (scopus_general_papers >= 15) score += 40;
      else if (scopus_general_papers >= 10) score += 30;
      else if (scopus_general_papers >= 5) score += 20;
      else if (scopus_general_papers > 0) score += 10;

      // Conference papers
      if (conference_papers >= 10) score += 20;
      else if (conference_papers >= 5) score += 15;
      else if (conference_papers > 0) score += 10;

      // Edited books
      if (edited_books >= 3) score += 15;
      else if (edited_books > 0) score += 10;

      // Research IDs presence (indicates active researcher)
      const hasResearchIds = researchInfo.scopus_id || researchInfo.google_scholar_id || researchInfo.orchid_id;
      if (hasResearchIds) score += 15;
    }

    // Publications field (if available)
    if (publications) {
      const pubCount = parseInt(publications) || 0;
      if (pubCount >= 20) score += 10;
      else if (pubCount >= 10) score += 8;
      else if (pubCount >= 5) score += 5;
      else if (pubCount > 0) score += 3;
    }

    return {
      criteria: 'Publications & Citations',
      score: Math.min(score, 100),
      maxScore: 100,
      weight: this.criteriaWeights['Publications & Citations']
    };
  }

  // Awards & Recognition Scoring (0-100)
  async calculateAwardsScore(application) {
    let score = 0;
    const { previous_positions, researchInfo } = application;

    // Check for awards in previous positions
    if (previous_positions) {
      const positions = previous_positions.toLowerCase();
      const awardKeywords = ['award', 'recognition', 'honor', 'prize', 'fellowship', 'scholarship'];
      const hasAwards = awardKeywords.some(keyword => positions.includes(keyword));
      if (hasAwards) score += 50;
    }

    // Check for research recognition
    if (researchInfo) {
      const { scopus_general_papers = 0 } = researchInfo;
      // High publication count indicates recognition
      if (scopus_general_papers >= 20) score += 30;
      else if (scopus_general_papers >= 10) score += 20;
      else if (scopus_general_papers >= 5) score += 10;
    }

    // Default score for having completed education and experience
    if (application.highest_degree && application.years_of_experience) {
      score += 20;
    }

    return {
      criteria: 'Awards & Recognition',
      score: Math.min(score, 100),
      maxScore: 100,
      weight: this.criteriaWeights['Awards & Recognition']
    };
  }

  // Communication Skills Scoring (0-100)
  async calculateCommunicationScore(application) {
    let score = 0;

    // Document completeness (indicates attention to detail)
    const requiredDocs = ['resume_path', 'cover_letter_path'];
    const providedDocs = requiredDocs.filter(doc => application[doc]);
    score += (providedDocs.length / requiredDocs.length) * 40;

    // Application completeness
    const requiredFields = ['first_name', 'last_name', 'email', 'phone', 'address', 'highest_degree', 'university'];
    const providedFields = requiredFields.filter(field => application[field]);
    score += (providedFields.length / requiredFields.length) * 30;

    // Experience description quality (if available)
    if (application.previous_positions && application.previous_positions.length > 50) {
      score += 15; // Detailed description
    } else if (application.previous_positions && application.previous_positions.length > 20) {
      score += 10; // Basic description
    } else {
      score += 5; // Minimal description
    }

    // Research experience descriptions
    if (application.researchExperiences && application.researchExperiences.length > 0) {
      const hasDetailedExp = application.researchExperiences.some(exp => 
        exp.experience && exp.experience.length > 30
      );
      if (hasDetailedExp) score += 15;
    }

    return {
      criteria: 'Communication Skills',
      score: Math.min(score, 100),
      maxScore: 100,
      weight: this.criteriaWeights['Communication Skills']
    };
  }

  // Helper function to extract years from experience string
  extractYearsFromExperience(experienceStr) {
    if (!experienceStr) return 0;
    
    const yearsMatch = experienceStr.match(/(\d+)\s*years?/i);
    if (yearsMatch) {
      return parseInt(yearsMatch[1]);
    }
    
    // Try to extract from months
    const monthsMatch = experienceStr.match(/(\d+)\s*months?/i);
    if (monthsMatch) {
      return Math.floor(parseInt(monthsMatch[1]) / 12);
    }
    
    return 0;
  }

  // Save individual scores to database
  async saveScoresToDatabase(applicationId, scores) {
    try {
      // Get criteria IDs
      const { data: criteria, error: criteriaError } = await supabase
        .from('scoring_criteria')
        .select('id, criteria_name');

      if (criteriaError) throw criteriaError;

      const criteriaMap = {};
      criteria.forEach(c => {
        criteriaMap[c.criteria_name] = c.id;
      });

      // Prepare scores for insertion
      const scoresToInsert = scores.map(score => ({
        application_id: applicationId,
        criteria_id: criteriaMap[score.criteria],
        score: score.score,
        max_possible_score: score.maxScore,
        weighted_score: score.score * score.weight
      }));

      // Insert scores (upsert to handle updates)
      const { error: insertError } = await supabase
        .from('application_scores')
        .upsert(scoresToInsert, { 
          onConflict: 'application_id,criteria_id',
          ignoreDuplicates: false 
        });

      if (insertError) throw insertError;

      console.log(`✅ Saved ${scoresToInsert.length} scores for application ${applicationId}`);
    } catch (error) {
      console.error('❌ Error saving scores:', error);
      throw error;
    }
  }

  // Calculate weighted total score
  calculateWeightedTotal(scores) {
    let totalWeightedScore = 0;
    let totalWeight = 0;

    scores.forEach(score => {
      totalWeightedScore += score.score * score.weight;
      totalWeight += score.weight;
    });

    return totalWeight > 0 ? Math.round((totalWeightedScore / totalWeight) * 100) / 100 : 0;
  }

  // Update application score in main table
  async updateApplicationScore(applicationId, score) {
    const { error } = await supabase
      .from('faculty_applications')
      .update({ score: score })
      .eq('id', applicationId);

    if (error) throw error;
  }

  // Update rankings for all applications
  async updateRankings() {
    const { error } = await supabase.rpc('update_application_rankings');
    if (error) throw error;
  }

  // Get detailed score breakdown for an application
  async getScoreBreakdown(applicationId) {
    const { data, error } = await supabase
      .from('application_scores')
      .select(`
        *,
        scoring_criteria (
          criteria_name,
          weight,
          max_score,
          description
        )
      `)
      .eq('application_id', applicationId);

    if (error) throw error;
    return data;
  }

  // Get top ranked applications
  async getTopRankedApplications(department = null, position = null, limit = 10) {
    let query = supabase
      .from('faculty_applications')
      .select(`
        *,
        research_info (
          scopus_id,
          scopus_general_papers,
          conference_papers
        )
      `)
      .not('score', 'is', null)
      .limit(limit);

    if (department) {
      query = query.eq('department', department);
    }

    if (position) {
      query = query.eq('position', position);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    // Sort by total Scopus papers (general + conference), then by citations
    const sorted = (data || []).sort((a, b) => {
      const aScopusPapers = (a.research_info?.[0]?.scopus_general_papers || 0) + 
                            (a.research_info?.[0]?.conference_papers || 0);
      const bScopusPapers = (b.research_info?.[0]?.scopus_general_papers || 0) + 
                            (b.research_info?.[0]?.conference_papers || 0);
      
      // Sort by total Scopus papers
      return bScopusPapers - aScopusPapers;
    });
    
    return sorted;
  }
}

export default new ScoringService();
