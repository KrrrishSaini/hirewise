import express from 'express';
import supabase from '../config/db.js';

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
    
    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }
    
    if (!['TEACHING', 'NON_TEACHING'].includes(type.toUpperCase())) {
      return res.status(400).json({ error: 'Type must be TEACHING or NON_TEACHING' });
    }
    
    // For NON_TEACHING, department_id is required
    if (type.toUpperCase() === 'NON_TEACHING' && !department_id) {
      return res.status(400).json({ error: 'Department is required for non-teaching positions' });
    }
    
    // For TEACHING with branch_id, verify the branch belongs to the department
    if (branch_id && department_id) {
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
        type: type.toUpperCase(),
        department_id: department_id || null,
        branch_id: branch_id || null,
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
    
    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }
    
    if (!['TEACHING', 'NON_TEACHING'].includes(type.toUpperCase())) {
      return res.status(400).json({ error: 'Type must be TEACHING or NON_TEACHING' });
    }
    
    if (status && !['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      return res.status(400).json({ error: 'Status must be ACTIVE or INACTIVE' });
    }
    
    // For NON_TEACHING, department_id is required
    if (type.toUpperCase() === 'NON_TEACHING' && !department_id) {
      return res.status(400).json({ error: 'Department is required for non-teaching positions' });
    }
    
    // For TEACHING with branch_id, verify the branch belongs to the department
    if (branch_id && department_id) {
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
      type: type.toUpperCase(),
      department_id: department_id || null,
      branch_id: branch_id || null
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

export default router;
