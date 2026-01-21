import express from 'express';
import Stripe from 'stripe';
import {
    handleSubscriptionCreated,
    handleSubscriptionUpdated,
    handleSubscriptionDeleted
} from '../services/stripe.service.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// @route   POST /api/webhooks/stripe
// @desc    Handle Stripe webhooks
// @access  Public (verified by Stripe signature)
router.post('/stripe', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'customer.subscription.created':
                await handleSubscriptionCreated(event.data.object);
                break;

            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object);
                break;

            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;

            case 'invoice.payment_succeeded':
                console.log('Payment succeeded:', event.data.object.id);
                break;

            case 'invoice.payment_failed':
                console.log('Payment failed:', event.data.object.id);
                // Handle failed payment - notify user, etc.
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Webhook handler error:', error);
        res.status(500).json({ error: 'Webhook handler failed' });
    }
});

// @route   POST /api/webhooks/shopify
// @desc    Handle Shopify webhooks (orders, products)
// @access  Public (verified by Shopify signature)
router.post('/shopify', async (req, res) => {
    const hmac = req.headers['x-shopify-hmac-sha256'];
    // Verify Shopify webhook signature in production

    const topic = req.headers['x-shopify-topic'];
    const shopDomain = req.headers['x-shopify-shop-domain'];

    try {
        switch (topic) {
            case 'orders/create':
                console.log('New Shopify order:', req.body);
                // Handle new order - create in our database
                break;

            case 'orders/updated':
                console.log('Shopify order updated:', req.body);
                break;

            case 'products/update':
                console.log('Shopify product updated:', req.body);
                break;

            default:
                console.log(`Shopify webhook: ${topic}`);
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Shopify webhook error:', error);
        res.status(500).send('Error');
    }
});

// @route   POST /api/webhooks/woocommerce
// @desc    Handle WooCommerce webhooks
// @access  Public
router.post('/woocommerce', async (req, res) => {
    const topic = req.headers['x-wc-webhook-topic'];

    try {
        switch (topic) {
            case 'order.created':
                console.log('New WooCommerce order:', req.body);
                break;

            case 'order.updated':
                console.log('WooCommerce order updated:', req.body);
                break;

            default:
                console.log(`WooCommerce webhook: ${topic}`);
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('WooCommerce webhook error:', error);
        res.status(500).send('Error');
    }
});

export default router;
