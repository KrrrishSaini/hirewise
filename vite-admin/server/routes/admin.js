import express from 'express';
import supabase from '../config/db.js';

const router = express.Router();

// Admin Login - uses Supabase Auth
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Admin login error:', error);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is admin (you can add metadata check here)
    const { user, session } = data;

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || 'Administrator'
      },
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Get Admin Profile
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || 'Administrator',
        created_at: user.created_at
      }
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update Admin Profile (name and email)
router.put('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const { name, email } = req.body;

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Use service role to update user
    const updates = {};
    if (email && email !== user.email) {
      updates.email = email;
    }
    if (name) {
      updates.data = { name };
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No changes provided' });
    }

    const { data, error } = await supabase.auth.admin.updateUserById(
      user.id,
      updates
    );

    if (error) {
      console.error('Update profile error:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || name
      }
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Change Password
router.put('/password', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Verify current password by attempting to sign in
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    });

    if (verifyError) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password using admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Password update error:', updateError);
      return res.status(400).json({ error: updateError.message });
    }

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout (client-side mostly, but can track here)
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Sign out the session
      await supabase.auth.admin.signOut(token);
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
