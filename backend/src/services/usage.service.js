import { supabaseAdmin } from '../config/supabase.js';

// Usage limits by subscription tier
const USAGE_LIMITS = {
    free: {
        search: 10,     // searches per day
        import: 5,      // imports per day
        ai_analysis: 3  // AI analyses per day
    },
    pro: {
        search: -1,     // unlimited
        import: -1,     // unlimited
        ai_analysis: -1 // unlimited
    }
};

/**
 * Track usage for a specific action
 */
export async function trackUsage(userId, action) {
    const today = new Date().toISOString().split('T')[0];

    const { data: existing } = await supabaseAdmin
        .from('usage_logs')
        .select('id, count')
        .eq('user_id', userId)
        .eq('action', action)
        .eq('date', today)
        .single();

    if (existing) {
        await supabaseAdmin
            .from('usage_logs')
            .update({ count: existing.count + 1 })
            .eq('id', existing.id);
    } else {
        await supabaseAdmin
            .from('usage_logs')
            .insert({
                user_id: userId,
                action,
                date: today,
                count: 1
            });
    }
}

/**
 * Check if user has remaining usage for an action
 */
export async function checkUsageLimit(userId, action, subscriptionTier = 'free') {
    const limit = USAGE_LIMITS[subscriptionTier]?.[action] ?? USAGE_LIMITS.free[action];

    // -1 means unlimited
    if (limit === -1) {
        return true;
    }

    const today = new Date().toISOString().split('T')[0];

    const { data: usage } = await supabaseAdmin
        .from('usage_logs')
        .select('count')
        .eq('user_id', userId)
        .eq('action', action)
        .eq('date', today)
        .single();

    const currentCount = usage?.count || 0;
    return currentCount < limit;
}

/**
 * Get usage summary for a user
 */
export async function getUsageSummary(userId, subscriptionTier = 'free') {
    const today = new Date().toISOString().split('T')[0];

    const { data: usageLogs } = await supabaseAdmin
        .from('usage_logs')
        .select('action, count')
        .eq('user_id', userId)
        .eq('date', today);

    const usage = {};
    const limits = USAGE_LIMITS[subscriptionTier] || USAGE_LIMITS.free;

    for (const [action, limit] of Object.entries(limits)) {
        const log = usageLogs?.find(l => l.action === action);
        usage[action] = {
            used: log?.count || 0,
            limit: limit === -1 ? 'unlimited' : limit,
            remaining: limit === -1 ? 'unlimited' : Math.max(0, limit - (log?.count || 0))
        };
    }

    return usage;
}

export default {
    trackUsage,
    checkUsageLimit,
    getUsageSummary
};
