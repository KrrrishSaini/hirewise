import { randomUUID } from 'crypto';
import supabase from '../config/db.js';

class RecommendationService {
  constructor() {
    this.maxChunkLength = 700;
    this.overlap = 120;
  }

  normalizeText(value) {
    return (value || '').toString().trim().toLowerCase();
  }

  tokenize(value) {
    return this.normalizeText(value)
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  }

  flattenValues(input) {
    if (input === null || input === undefined) return [];
    if (Array.isArray(input)) {
      return input.flatMap((v) => this.flattenValues(v));
    }
    if (typeof input === 'object') {
      return Object.values(input).flatMap((v) => this.flattenValues(v));
    }
    return [String(input)];
  }

  uniqueKeywords(items = []) {
    const seen = new Set();
    const out = [];
    for (const item of items) {
      const clean = this.normalizeText(item);
      if (!clean) continue;
      if (!seen.has(clean)) {
        seen.add(clean);
        out.push(clean);
      }
    }
    return out;
  }

  buildCandidateDocument(candidate, researchInfo) {
    const parsed = this.flattenValues(candidate.cv_parsed_data).join(' ');
    const structured = [
      `Name: ${candidate.first_name || ''} ${candidate.last_name || ''}`,
      `Position Applied: ${candidate.position || 'N/A'}`,
      `Department: ${candidate.department || 'N/A'}`,
      `Branch: ${candidate.branch || 'N/A'}`,
      `Degree: ${candidate.highest_degree || 'N/A'}`,
      `Experience: ${candidate.years_of_experience || 'N/A'}`,
      `Previous Roles: ${candidate.previous_positions || 'N/A'}`,
      `Scopus Papers: ${researchInfo?.scopus_general_papers ?? 0}`,
      `Conference Papers: ${researchInfo?.conference_papers ?? 0}`,
      `Edited Books: ${researchInfo?.edited_books ?? 0}`,
      `Research IDs: ${researchInfo?.scopus_id || ''} ${researchInfo?.google_scholar_id || ''} ${researchInfo?.orchid_id || ''}`,
    ].join('\n');

    return `${structured}\n\nCV Parsed Content:\n${parsed}`.trim();
  }

  chunkText(text) {
    const cleaned = (text || '').replace(/\s+/g, ' ').trim();
    if (!cleaned) return [];
    if (cleaned.length <= this.maxChunkLength) return [cleaned];

    const chunks = [];
    let index = 0;
    while (index < cleaned.length) {
      const end = Math.min(index + this.maxChunkLength, cleaned.length);
      const slice = cleaned.slice(index, end);
      chunks.push(slice);
      index = Math.max(end - this.overlap, index + 1);
    }
    return chunks;
  }

  computeRetrievalScore(queryTokens, chunk) {
    const chunkTokens = this.tokenize(chunk);
    if (chunkTokens.length === 0 || queryTokens.length === 0) return 0;

    const freq = new Map();
    for (const token of chunkTokens) {
      freq.set(token, (freq.get(token) || 0) + 1);
    }

    let score = 0;
    queryTokens.forEach((token) => {
      const tf = freq.get(token) || 0;
      if (tf > 0) {
        score += 1 + Math.log(1 + tf);
      }
    });

    const coverage = queryTokens.filter((t) => freq.has(t)).length / queryTokens.length;
    const normalized = score / Math.sqrt(chunkTokens.length);
    return Math.max(0, (normalized * 70) + (coverage * 30));
  }

  retrieveTopEvidence(queryTokens, chunks, topK = 4) {
    const scored = chunks
      .map((chunk) => ({
        chunk,
        score: this.computeRetrievalScore(queryTokens, chunk),
      }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return {
      chunks: scored.map((s) => s.chunk),
      retrievalScore: scored.length > 0
        ? Math.round((scored.reduce((sum, x) => sum + x.score, 0) / scored.length) * 100) / 100
        : 0,
    };
  }

  async getGroqRagAssessment({ position, specializationKeywords, candidate, evidenceChunks }) {
    const apiKey = process.env.GROQ_API_KEY_1 || process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY_1 or GROQ_API_KEY is required for RAG recommendations');
    }

    const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

    const evidenceText = evidenceChunks.map((chunk, idx) => `Chunk ${idx + 1}: ${chunk}`).join('\n\n');

    const prompt = [
      'You are a strict academic CV relevance evaluator.',
      'Use ONLY the retrieved evidence chunks. Do not invent facts.',
      'Return valid JSON only with fields: score (0-100 number), reason (string <= 220 chars), matched_keywords (array of strings).',
      `Target Position: ${position.name}`,
      `Department: ${position.departments?.name || 'N/A'}`,
      `Branch: ${position.branches?.name || 'N/A'}`,
      `Specialization Keywords: ${specializationKeywords.join(', ') || 'None'}`,
      `Candidate Name: ${candidate.first_name || ''} ${candidate.last_name || ''}`,
      'Retrieved Evidence:',
      evidenceText || 'No evidence found',
    ].join('\n');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          max_tokens: 220,
          messages: [
            { role: 'system', content: 'Return only JSON. No markdown. No explanation outside JSON.' },
            { role: 'user', content: prompt }
          ]
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(`Groq API error: ${txt}`);
      }

      const payload = await response.json();
      const content = String(payload?.choices?.[0]?.message?.content || '').trim();

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        const numberMatch = content.match(/\d+(?:\.\d+)?/);
        parsed = {
          score: numberMatch ? Number(numberMatch[0]) : 0,
          reason: 'LLM response was partially parsed.',
          matched_keywords: []
        };
      }

      const score = Math.max(0, Math.min(100, Number(parsed.score || 0)));
      return {
        score,
        reason: (parsed.reason || '').toString().slice(0, 220),
        matchedKeywords: Array.isArray(parsed.matched_keywords)
          ? parsed.matched_keywords.map((k) => String(k))
          : [],
      };
    } catch (err) {
      throw new Error(err.message || 'Failed to assess candidate via Groq RAG');
    } finally {
      clearTimeout(timeout);
    }
  }

  async generateForPosition(positionId, topN = 10) {
    const { data: position, error: positionError } = await supabase
      .from('positions')
      .select(`
        id,
        name,
        type,
        department_id,
        branch_id,
        departments ( id, name, type ),
        branches ( id, name )
      `)
      .eq('id', positionId)
      .single();

    if (positionError || !position) {
      throw new Error('Position not found');
    }

    const { data: specializations, error: specsError } = await supabase
      .from('position_specializations')
      .select('keyword')
      .eq('position_id', positionId);

    if (specsError) {
      throw new Error('Failed to load position specializations');
    }

    const specializationKeywords = this.uniqueKeywords((specializations || []).map((s) => s.keyword));
    if (specializationKeywords.length === 0) {
      throw new Error('Please add specialization keywords before generating recommendations');
    }

    const { data: applications, error: appError } = await supabase
      .from('faculty_applications')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        position,
        department,
        branch,
        highest_degree,
        years_of_experience,
        previous_positions,
        cv_parsed_data,
        score,
        status,
        created_at,
        submitted_at
      `)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (appError) {
      console.error('Recommendation candidate load error:', appError);
      throw new Error(`Failed to load candidate applications: ${appError.message}`);
    }

    const deptName = this.normalizeText(position.departments?.name);
    const branchName = this.normalizeText(position.branches?.name);
    const roleType = this.normalizeText(position.type);

    let activeApplications = (applications || []).filter(
      (app) => this.normalizeText(app.status) !== 'rejected'
    );

    // Fallback safety: if custom projection unexpectedly returns empty,
    // retry with a simpler query to avoid false zero-pool scenarios.
    if (activeApplications.length === 0) {
      const { data: fallbackApps, error: fallbackError } = await supabase
        .from('faculty_applications')
        .select('id, first_name, last_name, email, phone, position, department, branch, highest_degree, years_of_experience, previous_positions, cv_parsed_data, score, status, created_at, submitted_at')
        .limit(1000);

      if (!fallbackError) {
        activeApplications = (fallbackApps || []).filter(
          (app) => this.normalizeText(app.status) !== 'rejected'
        );
      }
    }

    const strictPool = activeApplications.filter((app) => {
      const appDept = this.normalizeText(app.department);
      const appBranch = this.normalizeText(app.branch);
      if (deptName && appDept !== deptName) return false;
      if (roleType === 'teaching' && branchName && appBranch !== branchName) return false;
      return true;
    });

    // If strict pool is empty, use a broader but still relevant pool
    const broadPool = activeApplications.filter((app) => {
      const appDept = this.normalizeText(app.department);
      const appBranch = this.normalizeText(app.branch);
      const parsedCvText = this.flattenValues(app.cv_parsed_data).join(' ').toLowerCase();
      const profileText = [
        app.position,
        app.department,
        app.branch,
        app.previous_positions,
        parsedCvText,
      ].filter(Boolean).join(' ').toLowerCase();

      const hasKeywordHit = specializationKeywords.some((k) => profileText.includes(k));
      const hasDeptMatch = deptName && appDept === deptName;
      const hasBranchMatch = branchName && appBranch === branchName;
      const hasRoleTokenMatch = this.tokenize(position.name).some((token) => profileText.includes(token));

      return hasKeywordHit || hasDeptMatch || hasBranchMatch || hasRoleTokenMatch;
    });

    const pooled = strictPool.length > 0
      ? strictPool
      : (broadPool.length > 0 ? broadPool : activeApplications);

    if (pooled.length === 0) {
      return {
        recommendations: [],
        meta: {
          poolSize: 0,
          generatedCount: 0,
          positionId,
          specializationKeywords,
          debug: {
            totalFetched: (applications || []).length,
            activeAfterStatusFilter: activeApplications.length,
            strictPoolSize: strictPool.length,
            broadPoolSize: broadPool.length,
            poolStrategy: 'none',
          }
        }
      };
    }

    const appIds = pooled.map((p) => p.id);
    const { data: researchRows } = await supabase
      .from('research_info')
      .select('application_id, scopus_general_papers, conference_papers, edited_books, scopus_id, google_scholar_id, orchid_id')
      .in('application_id', appIds);

    const researchByAppId = new Map((researchRows || []).map((r) => [String(r.application_id), r]));

    const queryText = [
      position.name,
      position.type,
      position.departments?.name,
      position.branches?.name,
      ...specializationKeywords,
    ].filter(Boolean).join(' ');
    const queryTokens = this.uniqueKeywords(this.tokenize(queryText));

    const retrieved = pooled.map((candidate) => {
      const researchInfo = researchByAppId.get(String(candidate.id));
      const doc = this.buildCandidateDocument(candidate, researchInfo);
      const chunks = this.chunkText(doc);
      const evidence = this.retrieveTopEvidence(queryTokens, chunks, 4);
      return {
        app: candidate,
        researchInfo,
        retrievalScore: evidence.retrievalScore,
        evidenceChunks: evidence.chunks,
      };
    }).sort((a, b) => b.retrievalScore - a.retrievalScore);

    // RAG: retrieve first, then generate grounded assessment for top retrieved candidates
    const generationPool = retrieved.slice(0, Math.max(10, Math.min(40, retrieved.length)));

    const assessed = [];
    for (const row of generationPool) {
      if (row.evidenceChunks.length === 0) continue;

      const llm = await this.getGroqRagAssessment({
        position,
        specializationKeywords,
        candidate: row.app,
        evidenceChunks: row.evidenceChunks,
      });

      assessed.push({
        ...row,
        llmScore: llm.score,
        reason: llm.reason,
        matchedKeywords: llm.matchedKeywords,
        finalScore: llm.score,
      });
    }

    assessed.sort((a, b) => b.finalScore - a.finalScore);

    const topRows = assessed.slice(0, Math.max(1, Math.min(topN, 50))).map((row, index) => ({
      position_id: positionId,
      application_id: row.app.id,
      rank: index + 1,
      final_score: row.finalScore,
      candidate_name: `${row.app.first_name || ''} ${row.app.last_name || ''}`.trim() || row.app.email || 'Candidate',
      score_breakdown: {
        retrieval_score: row.retrievalScore,
        llm_rag_score: row.llmScore,
        matched_keywords: row.matchedKeywords,
        evidence_chunks_count: row.evidenceChunks.length,
        evidence_preview: row.evidenceChunks.map((c) => c.slice(0, 180)),
      },
      reason_summary: row.reason || 'Ranked using retrieved CV evidence',
    }));

    const runId = randomUUID();
    const rowsToInsert = topRows.map((row) => ({ ...row, run_id: runId }));

    const { error: insertError } = await supabase
      .from('position_recommendations')
      .insert(rowsToInsert);

    if (insertError) {
      throw new Error('Failed to store recommendations');
    }

    return {
      recommendations: topRows,
      meta: {
        positionId,
        runId,
        poolSize: generationPool.length,
        generatedCount: topRows.length,
        specializationKeywords,
        debug: {
          totalFetched: (applications || []).length,
          activeAfterStatusFilter: activeApplications.length,
          strictPoolSize: strictPool.length,
          broadPoolSize: broadPool.length,
          retrievalCandidates: retrieved.length,
          generationCandidates: generationPool.length,
          withEvidence: generationPool.filter((r) => r.evidenceChunks.length > 0).length,
          poolStrategy: strictPool.length > 0 ? 'strict' : (broadPool.length > 0 ? 'broad' : 'all-active'),
        }
      }
    };
  }
}

const recommendationService = new RecommendationService();
export default recommendationService;
