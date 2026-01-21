import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseAdmin } from '../config/supabase.js';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Initialize Gemini model
const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048
    }
});

/**
 * Analyze a product using Gemini AI
 * Returns a comprehensive analysis with score
 */
export async function analyzeProduct(product) {
    try {
        const prompt = `Analyze this dropshipping product and provide a detailed assessment:

Product Title: ${product.title}
Description: ${product.description || 'Not provided'}
Price: $${product.price} ${product.currency}
Original Price: $${product.originalPrice || 'N/A'}
Rating: ${product.rating}/5 stars
Reviews: ${product.reviewsCount} reviews
Sales: ${product.salesCount} units sold
Category: ${product.category || 'General'}
Source: ${product.source}

Please analyze and provide a JSON response with the following structure:
{
  "score": <number 0-100>,
  "summary": "<brief 2-3 sentence summary>",
  "profitPotential": {
    "rating": "<low|medium|high|excellent>",
    "suggestedMarkup": <number percentage>,
    "suggestedPrice": <number>,
    "estimatedProfit": <number per sale>
  },
  "marketAnalysis": {
    "demandLevel": "<low|medium|high>",
    "competitionLevel": "<low|medium|high>",
    "trendDirection": "<declining|stable|growing|hot>",
    "targetAudience": "<description>"
  },
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "recommendations": ["<rec 1>", "<rec 2>", "<rec 3>"],
  "riskLevel": "<low|medium|high>",
  "isRecommended": <boolean>
}

Be realistic and data-driven in your analysis. Consider:
- Price competitiveness for dropshipping margins
- Review sentiment and product quality indicators
- Sales volume and market demand
- Competition level in the niche
- Shipping and fulfillment considerations`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const analysis = JSON.parse(jsonMatch[0]);
            return {
                ...analysis,
                analyzedAt: new Date().toISOString()
            };
        }

        // Fallback if JSON parsing fails
        return getDefaultAnalysis(product);
    } catch (error) {
        console.error('Gemini analysis error:', error);
        return getDefaultAnalysis(product);
    }
}

/**
 * Get winning products using AI analysis
 * Analyzes cached products and returns top recommendations
 */
export async function getWinningProducts(category = null, limit = 20) {
    try {
        // Get recent cached products
        let query = supabaseAdmin
            .from('products')
            .select('*')
            .order('cached_at', { ascending: false })
            .limit(100);

        if (category) {
            query = query.ilike('category', `%${category}%`);
        }

        const { data: products, error } = await query;

        if (error || !products?.length) {
            return [];
        }

        // Analyze products that don't have AI scores
        const productsToAnalyze = products.filter(p => !p.ai_score);

        for (const product of productsToAnalyze.slice(0, 10)) {
            const analysis = await analyzeProduct(product);

            await supabaseAdmin
                .from('products')
                .update({
                    ai_score: analysis.score,
                    ai_analysis: analysis,
                    is_winning: analysis.score >= 70
                })
                .eq('id', product.id);

            product.ai_score = analysis.score;
            product.ai_analysis = analysis;
        }

        // Get products with high AI scores
        const { data: winningProducts } = await supabaseAdmin
            .from('products')
            .select('*')
            .gte('ai_score', 60)
            .order('ai_score', { ascending: false })
            .limit(limit);

        return winningProducts || [];
    } catch (error) {
        console.error('Get winning products error:', error);
        return [];
    }
}

/**
 * Generate product description using AI
 */
export async function generateProductDescription(product, style = 'professional') {
    try {
        const prompt = `Generate a compelling product description for an e-commerce store.

Product: ${product.title}
Original Description: ${product.description || 'Not provided'}
Category: ${product.category || 'General'}

Style: ${style} (options: professional, casual, luxury, minimal)

Create a description that:
1. Highlights key benefits (not just features)
2. Uses emotional triggers
3. Includes 3-5 bullet points for key features
4. Has a compelling opening hook
5. Is SEO-friendly
6. Is 150-200 words total

Return as JSON:
{
  "title": "<optimized title>",
  "description": "<main description>",
  "bulletPoints": ["<point 1>", "<point 2>", ...],
  "seoKeywords": ["<keyword 1>", "<keyword 2>", ...]
}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        return {
            title: product.title,
            description: product.description,
            bulletPoints: [],
            seoKeywords: []
        };
    } catch (error) {
        console.error('Generate description error:', error);
        return {
            title: product.title,
            description: product.description,
            bulletPoints: [],
            seoKeywords: []
        };
    }
}

/**
 * Get AI pricing suggestions
 */
export async function getPricingSuggestion(product, marketData = {}) {
    try {
        const prompt = `Analyze pricing strategy for this dropshipping product:

Product: ${product.title}
Cost Price: $${product.price}
Category: ${product.category}
Rating: ${product.rating}/5
Sales Volume: ${product.salesCount}

Consider:
- Standard dropshipping margins (25-50%)
- Market positioning
- Perceived value
- Competition level

Provide JSON response:
{
  "recommendedPrice": <number>,
  "minimumPrice": <number>,
  "maximumPrice": <number>,
  "optimalMarkup": <percentage as number>,
  "priceStrategy": "<penetration|competitive|premium>",
  "reasoning": "<brief explanation>"
}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        // Default pricing
        const defaultMarkup = 0.35;
        return {
            recommendedPrice: product.price * (1 + defaultMarkup),
            minimumPrice: product.price * 1.2,
            maximumPrice: product.price * 2.0,
            optimalMarkup: 35,
            priceStrategy: 'competitive',
            reasoning: 'Standard competitive pricing strategy'
        };
    } catch (error) {
        console.error('Pricing suggestion error:', error);
        return {
            recommendedPrice: product.price * 1.35,
            minimumPrice: product.price * 1.2,
            maximumPrice: product.price * 2.0,
            optimalMarkup: 35,
            priceStrategy: 'competitive',
            reasoning: 'Default pricing applied'
        };
    }
}

/**
 * Generate marketing suggestions
 */
export async function getMarketingSuggestions(product) {
    try {
        const prompt = `Create marketing suggestions for this product:

Product: ${product.title}
Category: ${product.category}
Price Point: $${product.custom_price || product.price}
Target Platform: E-commerce store

Provide JSON response with:
{
  "adCopy": {
    "headline": "<catchy headline>",
    "subheadline": "<supporting text>",
    "callToAction": "<CTA text>"
  },
  "socialMedia": {
    "instagram": "<post suggestion>",
    "facebook": "<ad text>",
    "tiktok": "<video idea>"
  },
  "targetAudiences": [
    {
      "name": "<audience name>",
      "demographics": "<age, interests>",
      "approach": "<marketing approach>"
    }
  ],
  "hashtags": ["<hashtag1>", "<hashtag2>", ...],
  "emailSubjectLines": ["<subject 1>", "<subject 2>", "<subject 3>"]
}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        return getDefaultMarketingSuggestions();
    } catch (error) {
        console.error('Marketing suggestions error:', error);
        return getDefaultMarketingSuggestions();
    }
}

// Default fallbacks
function getDefaultAnalysis(product) {
    const baseScore = 50;
    const ratingBonus = (product.rating || 3) * 5;
    const reviewsBonus = Math.min(product.reviewsCount / 100, 10);
    const salesBonus = Math.min(product.salesCount / 1000, 15);

    const score = Math.min(Math.round(baseScore + ratingBonus + reviewsBonus + salesBonus), 100);

    return {
        score,
        summary: 'Analysis based on available metrics. Consider additional market research.',
        profitPotential: {
            rating: score >= 70 ? 'high' : score >= 50 ? 'medium' : 'low',
            suggestedMarkup: 35,
            suggestedPrice: product.price * 1.35,
            estimatedProfit: product.price * 0.35
        },
        marketAnalysis: {
            demandLevel: product.salesCount > 1000 ? 'high' : 'medium',
            competitionLevel: 'medium',
            trendDirection: 'stable',
            targetAudience: 'General consumers'
        },
        strengths: ['Competitive pricing', 'Available for dropshipping'],
        weaknesses: ['Limited differentiation'],
        recommendations: ['Test with small ad spend', 'Optimize product images', 'Create compelling description'],
        riskLevel: 'medium',
        isRecommended: score >= 60,
        analyzedAt: new Date().toISOString()
    };
}

function getDefaultMarketingSuggestions() {
    return {
        adCopy: {
            headline: 'Discover Your New Favorite Product',
            subheadline: 'Quality meets affordability',
            callToAction: 'Shop Now'
        },
        socialMedia: {
            instagram: 'Check out this amazing find! Link in bio.',
            facebook: 'Limited time offer on this trending product.',
            tiktok: 'POV: You find the perfect product online'
        },
        targetAudiences: [
            {
                name: 'General Shoppers',
                demographics: '25-45, interested in online shopping',
                approach: 'Value-focused messaging'
            }
        ],
        hashtags: ['#shopping', '#deals', '#musthave'],
        emailSubjectLines: ['You need to see this!', 'Just dropped: New arrival', 'Your cart is waiting']
    };
}

export default {
    analyzeProduct,
    getWinningProducts,
    generateProductDescription,
    getPricingSuggestion,
    getMarketingSuggestions
};
