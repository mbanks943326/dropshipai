import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// @route   GET /api/notifications
// @desc    Get user's notifications
// @access  Private
router.get('/', authenticate, asyncHandler(async (req, res) => {
    const { limit = 20, unreadOnly = false } = req.query;

    let query = supabaseAdmin
        .from('notifications')
        .select('*')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

    if (unreadOnly === 'true') {
        query = query.eq('read', false);
    }

    const { data: notifications, error } = await query;

    if (error) {
        console.error('Error fetching notifications:', error);
        return res.status(500).json({ success: false, error: { message: 'Failed to fetch notifications' } });
    }

    // Get unread count
    const { count } = await supabaseAdmin
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', req.user.id)
        .eq('read', false);

    res.json({
        success: true,
        data: {
            notifications,
            unreadCount: count || 0
        }
    });
}));

// @route   PUT /api/notifications/:id/read
// @desc    Mark a notification as read
// @access  Private
router.put('/:id/read', authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .eq('user_id', req.user.id)
        .select()
        .single();

    if (error) {
        console.error('Error updating notification:', error);
        return res.status(500).json({ success: false, error: { message: 'Failed to update notification' } });
    }

    res.json({ success: true, data: { notification: data } });
}));

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all', authenticate, asyncHandler(async (req, res) => {
    const { error } = await supabaseAdmin
        .from('notifications')
        .update({ read: true })
        .eq('user_id', req.user.id)
        .eq('read', false);

    if (error) {
        console.error('Error updating notifications:', error);
        return res.status(500).json({ success: false, error: { message: 'Failed to update notifications' } });
    }

    res.json({ success: true, message: 'All notifications marked as read' });
}));

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification
// @access  Private
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { error } = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', req.user.id);

    if (error) {
        console.error('Error deleting notification:', error);
        return res.status(500).json({ success: false, error: { message: 'Failed to delete notification' } });
    }

    res.json({ success: true, message: 'Notification deleted' });
}));

// Helper function to create notifications (for use in other routes)
export async function createNotification(userId, { type, title, message, actionUrl = null, metadata = {} }) {
    const { data, error } = await supabaseAdmin
        .from('notifications')
        .insert({
            user_id: userId,
            type,
            title,
            message,
            action_url: actionUrl,
            metadata
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating notification:', error);
        return null;
    }

    return data;
}

export default router;
