import express from 'express';
import supabase from '../config/db.js';
import recommendationService from '../services/recommendationService.js';

const router = express.Router();

// ==================== DEPARTMENTS ====================

// GET all departments (admin sees both ACTIVE and INACTIVE)
router.get('/departments', async (req, res) => {
  try {
    const { type, status } = req.query;
    
    let query = supabase
      .from('departments')
      .select('*')
      .order('name', { ascending: true });
    
    if (type) {
      query = query.eq('type', type.toUpperCase());
    }
    
    if (status) {
      query = query.eq('status', status.toUpperCase());
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching departments:', error);
      return res.status(500).json({ error: 'Failed to fetch departments' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error in departments endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create new department
router.post('/departments', async (req, res) => {
  try {
    const { name, type } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }
    
    if (!['TEACHING', 'NON_TEACHING'].includes(type.toUpperCase())) {
      return res.status(400).json({ error: 'Type must be TEACHING or NON_TEACHING' });
    }
    
    const { data, error } = await supabase
      .from('departments')
      .insert([{
        name,
        type: type.toUpperCase(),
        status: 'ACTIVE'
      }])
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Department already exists' });
      }
      console.error('Error creating department:', error);
      return res.status(500).json({ error: 'Failed to create department' });
    }
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Error in create department endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update department
router.put('/departments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, status } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }
    
    if (!['TEACHING', 'NON_TEACHING'].includes(type.toUpperCase())) {
      return res.status(400).json({ error: 'Type must be TEACHING or NON_TEACHING' });
    }
    
    if (status && !['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      return res.status(400).json({ error: 'Status must be ACTIVE or INACTIVE' });
    }
    
    const updateData = {
      name,
      type: type.toUpperCase()
    };
    
    if (status) {
      updateData.status = status.toUpperCase();
    }
    
    const { data, error } = await supabase
      .from('departments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Department name already exists' });
      }
      console.error('Error updating department:', error);
      return res.status(500).json({ error: 'Failed to update department' });
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error in update department endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH toggle department status
router.patch('/departments/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || !['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      return res.status(400).json({ error: 'Status must be ACTIVE or INACTIVE' });
    }
    
    const { data, error } = await supabase
      .from('departments')
      .update({ status: status.toUpperCase() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating department status:', error);
      return res.status(500).json({ error: 'Failed to update status' });
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error in status toggle endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE department (permanent deletion)
router.delete('/departments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting department:', error);
      return res.status(500).json({ error: 'Failed to delete department' });
    }
    
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error in delete department endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== BRANCHES ====================

// GET all branches (admin sees both ACTIVE and INACTIVE)
router.get('/branches', async (req, res) => {
  try {
    const { department_id, status } = req.query;
    
    let query = supabase
      .from('branches')
      .select(`
        *,
        departments (
          id,
          name,
          type
        )
      `)
      .order('name', { ascending: true });
    
    if (department_id) {
      query = query.eq('department_id', department_id);
    }
    
    if (status) {
      query = query.eq('status', status.toUpperCase());
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching branches:', error);
      return res.status(500).json({ error: 'Failed to fetch branches' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error in branches endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create new branch
router.post('/branches', async (req, res) => {
  try {
    const { name, department_id } = req.body;
    
    if (!name || !department_id) {
      return res.status(400).json({ error: 'Name and department_id are required' });
    }
    
    // Verify department exists and is TEACHING type
    const { data: department, error: deptError } = await supabase
      .from('departments')
      .select('type')
      .eq('id', department_id)
      .single();
    
    if (deptError || !department) {
      return res.status(400).json({ error: 'Invalid department ID' });
    }
    
    if (department.type !== 'TEACHING') {
      return res.status(400).json({ error: 'Branches can only be added to TEACHING departments' });
    }
    
    const { data, error } = await supabase
      .from('branches')
      .insert([{
        name,
        department_id,
        status: 'ACTIVE'
      }])
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Branch already exists in this department' });
      }
      console.error('Error creating branch:', error);
      return res.status(500).json({ error: 'Failed to create branch' });
    }
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Error in create branch endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update branch
router.put('/branches/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, department_id, status } = req.body;
    
    if (!name || !department_id) {
      return res.status(400).json({ error: 'Name and department_id are required' });
    }
    
    // Verify department exists and is TEACHING type
    const { data: department, error: deptError } = await supabase
      .from('departments')
      .select('type')
      .eq('id', department_id)
      .single();
    
    if (deptError || !department) {
      return res.status(400).json({ error: 'Invalid department ID' });
    }
    
    if (department.type !== 'TEACHING') {
      return res.status(400).json({ error: 'Branches can only be added to TEACHING departments' });
    }
    
    if (status && !['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      return res.status(400).json({ error: 'Status must be ACTIVE or INACTIVE' });
    }
    
    const updateData = {
      name,
      department_id
    };
    
    if (status) {
      updateData.status = status.toUpperCase();
    }
    
    const { data, error } = await supabase
      .from('branches')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Branch already exists in this department' });
      }
      console.error('Error updating branch:', error);
      return res.status(500).json({ error: 'Failed to update branch' });
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Branch not found' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error in update branch endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH toggle branch status
router.patch('/branches/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || !['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      return res.status(400).json({ error: 'Status must be ACTIVE or INACTIVE' });
    }
    
    const { data, error } = await supabase
      .from('branches')
      .update({ status: status.toUpperCase() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating branch status:', error);
      return res.status(500).json({ error: 'Failed to update status' });
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Branch not found' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error in status toggle endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE branch (permanent deletion)
router.delete('/branches/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('branches')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting branch:', error);
      return res.status(500).json({ error: 'Failed to delete branch' });
    }
    
    res.json({ message: 'Branch deleted successfully' });
  } catch (error) {
    console.error('Error in delete branch endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== POSITIONS ====================

// GET all positions (admin sees both ACTIVE and INACTIVE)
router.get('/positions', async (req, res) => {
  try {
    const { type, department_id, branch_id, status } = req.query;
    
    let query = supabase
      .from('positions')
      .select(`
        *,
        departments (
          id,
          name,
          type
        ),
        branches (
          id,
          name
        )
      `)
      .order('name', { ascending: true });
    
    if (type) {
      query = query.eq('type', type.toUpperCase());
    }
    
    if (department_id) {
      query = query.eq('department_id', department_id);
    }
    
    if (branch_id) {
      query = query.eq('branch_id', branch_id);
    }
    
    if (status) {
      query = query.eq('status', status.toUpperCase());
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching positions:', error);
      return res.status(500).json({ error: 'Failed to fetch positions' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error in positions endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create new position
router.post('/positions', async (req, res) => {
  try {
    const { name, type, department_id, branch_id } = req.body;
    const normalizedType = type?.toUpperCase();
    
    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }
    
    if (!['TEACHING', 'NON_TEACHING'].includes(normalizedType)) {
      return res.status(400).json({ error: 'Type must be TEACHING or NON_TEACHING' });
    }

    if (!department_id) {
      return res.status(400).json({ error: 'Department is required' });
    }
    
    // For NON_TEACHING, department_id is required
    if (normalizedType === 'NON_TEACHING' && branch_id) {
      return res.status(400).json({ error: 'Branch is not applicable for non-teaching positions' });
    }

    // For TEACHING, branch_id is mandatory
    if (normalizedType === 'TEACHING' && !branch_id) {
      return res.status(400).json({ error: 'Branch is required for teaching positions' });
    }
    
    // For TEACHING with branch_id, verify the branch belongs to the department
    if (normalizedType === 'TEACHING' && branch_id && department_id) {
      const { data: branch, error: branchError } = await supabase
        .from('branches')
        .select('department_id')
        .eq('id', branch_id)
        .single();
      
      if (branchError || !branch || branch.department_id !== department_id) {
        return res.status(400).json({ error: 'Branch does not belong to the selected department' });
      }
    }
    
    const { data, error } = await supabase
      .from('positions')
      .insert([{
        name,
        type: normalizedType,
        department_id,
        branch_id: normalizedType === 'TEACHING' ? branch_id : null,
        status: 'ACTIVE'
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating position:', error);
      return res.status(500).json({ error: 'Failed to create position' });
    }
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Error in create position endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update position
router.put('/positions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, department_id, branch_id, status } = req.body;
    const normalizedType = type?.toUpperCase();
    
    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }
    
    if (!['TEACHING', 'NON_TEACHING'].includes(normalizedType)) {
      return res.status(400).json({ error: 'Type must be TEACHING or NON_TEACHING' });
    }
    
    if (status && !['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      return res.status(400).json({ error: 'Status must be ACTIVE or INACTIVE' });
    }
    
    if (!department_id) {
      return res.status(400).json({ error: 'Department is required' });
    }

    if (normalizedType === 'NON_TEACHING' && branch_id) {
      return res.status(400).json({ error: 'Branch is not applicable for non-teaching positions' });
    }

    if (normalizedType === 'TEACHING' && !branch_id) {
      return res.status(400).json({ error: 'Branch is required for teaching positions' });
    }
    
    // For TEACHING with branch_id, verify the branch belongs to the department
    if (normalizedType === 'TEACHING' && branch_id && department_id) {
      const { data: branch, error: branchError } = await supabase
        .from('branches')
        .select('department_id')
        .eq('id', branch_id)
        .single();
      
      if (branchError || !branch || branch.department_id !== department_id) {
        return res.status(400).json({ error: 'Branch does not belong to the selected department' });
      }
    }
    
    const updateData = {
      name,
      type: normalizedType,
      department_id,
      branch_id: normalizedType === 'TEACHING' ? branch_id : null
    };
    
    if (status) {
      updateData.status = status.toUpperCase();
    }
    
    const { data, error } = await supabase
      .from('positions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating position:', error);
      return res.status(500).json({ error: 'Failed to update position' });
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Position not found' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error in update position endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH toggle position status
router.patch('/positions/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || !['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      return res.status(400).json({ error: 'Status must be ACTIVE or INACTIVE' });
    }
    
    const { data, error } = await supabase
      .from('positions')
      .update({ status: status.toUpperCase() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating position status:', error);
      return res.status(500).json({ error: 'Failed to update status' });
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Position not found' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error in status toggle endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE position (permanent deletion)
router.delete('/positions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('positions')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting position:', error);
      return res.status(500).json({ error: 'Failed to delete position' });
    }
    
    res.json({ message: 'Position deleted successfully' });
  } catch (error) {
    console.error('Error in delete position endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET specializations for a position
router.get('/positions/:id/specializations', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('position_specializations')
      .select('id, keyword, source, created_at')
      .eq('position_id', id)
      .order('keyword', { ascending: true });

    if (error) {
      console.error('Error fetching position specializations:', error);
      return res.status(500).json({ error: 'Failed to fetch position specializations' });
    }

    res.json({
      position_id: id,
      keywords: (data || []).map((row) => row.keyword),
      rows: data || []
    });
  } catch (error) {
    console.error('Error in get specializations endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST upsert specializations for a position
router.post('/positions/:id/specializations', async (req, res) => {
  try {
    const { id } = req.params;
    const { keywords, source = 'ADMIN_MANUAL' } = req.body;

    if (!Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ error: 'keywords must be a non-empty array' });
    }

    const normalized = [...new Set(
      keywords
        .map((k) => (k || '').toString().trim())
        .filter(Boolean)
    )];

    if (normalized.length === 0) {
      return res.status(400).json({ error: 'No valid specialization keywords provided' });
    }

    const { error: deleteError } = await supabase
      .from('position_specializations')
      .delete()
      .eq('position_id', id);

    if (deleteError) {
      console.error('Error clearing existing specializations:', deleteError);
      return res.status(500).json({ error: 'Failed to update specializations' });
    }

    const rowsToInsert = normalized.map((keyword) => ({
      position_id: id,
      keyword,
      source
    }));

    const { data, error } = await supabase
      .from('position_specializations')
      .insert(rowsToInsert)
      .select('id, keyword, source, created_at');

    if (error) {
      console.error('Error saving specializations:', error);
      return res.status(500).json({ error: 'Failed to save specializations' });
    }

    res.json({
      message: 'Specializations saved successfully',
      position_id: id,
      keywords: normalized,
      rows: data || []
    });
  } catch (error) {
    console.error('Error in save specializations endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST generate recommendations for a position
router.post('/positions/:id/recommendations/generate', async (req, res) => {
  try {
    const { id } = req.params;
    const { topN = 10 } = req.body || {};

    const result = await recommendationService.generateForPosition(id, Number(topN) || 10);

    res.json({
      success: true,
      position_id: id,
      recommendations: result.recommendations,
      meta: result.meta
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate recommendations'
    });
  }
});

// GET latest recommendations for a position
router.get('/positions/:id/recommendations/latest', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.min(Number(req.query.limit) || 10, 50);

    const { data: latestRunRow, error: latestRunError } = await supabase
      .from('position_recommendations')
      .select('run_id')
      .eq('position_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestRunError) {
      console.error('Error fetching latest recommendation run:', latestRunError);
      return res.status(500).json({ error: 'Failed to fetch latest recommendations' });
    }

    if (!latestRunRow?.run_id) {
      return res.json({
        success: true,
        position_id: id,
        recommendations: []
      });
    }

    const { data, error } = await supabase
      .from('position_recommendations')
      .select('*')
      .eq('position_id', id)
      .eq('run_id', latestRunRow.run_id)
      .order('rank', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching latest recommendations:', error);
      return res.status(500).json({ error: 'Failed to fetch latest recommendations' });
    }

    res.json({
      success: true,
      position_id: id,
      recommendations: data || []
    });
  } catch (error) {
    console.error('Error in latest recommendations endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
