import Stripe from 'stripe';
import { supabaseAdmin } from '../config/supabase.js';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PLANS = {
    free: {
        name: 'Free',
        price: 0,
        features: [
            '10 product searches per day',
            '5 product imports per day',
            '3 AI analyses per day',
            'Basic analytics',
            '1 store connection'
        ]
    },
    pro: {
        name: 'Pro',
        price: 19,
        priceId: process.env.STRIPE_PRICE_PRO_MONTHLY,
        features: [
            'Unlimited product searches',
            'Unlimited product imports',
            'Unlimited AI analyses',
            'Advanced analytics & reports',
            'Unlimited store connections',
            'Auto-fulfillment',
            'Priority support',
            'AI marketing suggestions'
        ]
    }
};

/**
 * Create or get Stripe customer
 */
export async function getOrCreateCustomer(user) {
    // Check if user already has a Stripe customer ID
    const { data: userData } = await supabaseAdmin
        .from('users')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .single();

    if (userData?.stripe_customer_id) {
        return userData.stripe_customer_id;
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name,
        metadata: {
            userId: user.id
        }
    });

    // Save customer ID to database
    await supabaseAdmin
        .from('users')
        .update({ stripe_customer_id: customer.id })
        .eq('id', user.id);

    return customer.id;
}

/**
 * Create checkout session for subscription
 */
export async function createCheckoutSession(user, plan = 'pro') {
    const customerId = await getOrCreateCustomer(user);
    const priceId = PLANS[plan]?.priceId;

    if (!priceId) {
        throw new Error('Invalid plan');
    }

    const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
            {
                price: priceId,
                quantity: 1
            }
        ],
        mode: 'subscription',
        success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
        metadata: {
            userId: user.id,
            plan
        }
    });

    return session;
}

/**
 * Create billing portal session
 */
export async function createBillingPortalSession(user) {
    const customerId = await getOrCreateCustomer(user);

    const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.FRONTEND_URL}/settings`
    });

    return session;
}

/**
 * Handle successful subscription
 */
export async function handleSubscriptionCreated(subscription) {
    const customerId = subscription.customer;

    // Find user by Stripe customer ID
    const { data: user } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

    if (!user) {
        console.error('User not found for Stripe customer:', customerId);
        return;
    }

    // Determine plan from price
    const priceId = subscription.items.data[0]?.price?.id;
    const plan = priceId === PLANS.pro.priceId ? 'pro' : 'free';

    // Update or create subscription record
    await supabaseAdmin
        .from('subscriptions')
        .upsert({
            user_id: user.id,
            stripe_subscription_id: subscription.id,
            stripe_price_id: priceId,
            plan,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end
        }, {
            onConflict: 'stripe_subscription_id'
        });

    // Update user's subscription tier
    await supabaseAdmin
        .from('users')
        .update({ subscription_tier: plan })
        .eq('id', user.id);

    // Create notification
    await supabaseAdmin
        .from('notifications')
        .insert({
            user_id: user.id,
            type: 'subscription',
            title: 'Subscription Activated',
            message: `Your ${PLANS[plan].name} subscription is now active!`
        });
}

/**
 * Handle subscription updated
 */
export async function handleSubscriptionUpdated(subscription) {
    const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', subscription.id)
        .single();

    if (!sub) {
        return handleSubscriptionCreated(subscription);
    }

    const priceId = subscription.items.data[0]?.price?.id;
    const plan = priceId === PLANS.pro.priceId ? 'pro' : 'free';

    await supabaseAdmin
        .from('subscriptions')
        .update({
            status: subscription.status,
            plan,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end
        })
        .eq('stripe_subscription_id', subscription.id);

    await supabaseAdmin
        .from('users')
        .update({ subscription_tier: plan })
        .eq('id', sub.user_id);
}

/**
 * Handle subscription deleted/cancelled
 */
export async function handleSubscriptionDeleted(subscription) {
    const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', subscription.id)
        .single();

    if (!sub) return;

    await supabaseAdmin
        .from('subscriptions')
        .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', subscription.id);

    await supabaseAdmin
        .from('users')
        .update({ subscription_tier: 'free' })
        .eq('id', sub.user_id);

    await supabaseAdmin
        .from('notifications')
        .insert({
            user_id: sub.user_id,
            type: 'subscription',
            title: 'Subscription Cancelled',
            message: 'Your Pro subscription has been cancelled. You now have a Free account.'
        });
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(userId) {
    const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('stripe_subscription_id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

    if (!subscription?.stripe_subscription_id) {
        throw new Error('No active subscription found');
    }

    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true
    });

    await supabaseAdmin
        .from('subscriptions')
        .update({ cancel_at_period_end: true })
        .eq('stripe_subscription_id', subscription.stripe_subscription_id);
}

/**
 * Resume cancelled subscription
 */
export async function resumeSubscription(userId) {
    const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('stripe_subscription_id')
        .eq('user_id', userId)
        .single();

    if (!subscription?.stripe_subscription_id) {
        throw new Error('No subscription found');
    }

    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: false
    });

    await supabaseAdmin
        .from('subscriptions')
        .update({ cancel_at_period_end: false })
        .eq('stripe_subscription_id', subscription.stripe_subscription_id);
}

export { PLANS };

export default {
    getOrCreateCustomer,
    createCheckoutSession,
    createBillingPortalSession,
    handleSubscriptionCreated,
    handleSubscriptionUpdated,
    handleSubscriptionDeleted,
    cancelSubscription,
    resumeSubscription,
    PLANS
};
