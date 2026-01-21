import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// eBay Browse API configuration
const EBAY_API_URL = 'https://api.ebay.com';
const EBAY_SANDBOX_URL = 'https://api.sandbox.ebay.com';

// Get OAuth token for eBay API
async function getEbayToken() {
    const appId = process.env.EBAY_APP_ID;
    const certId = process.env.EBAY_CERT_ID;

    if (!appId || !certId) {
        console.warn('eBay: Missing API credentials');
        return null;
    }

    const credentials = Buffer.from(`${appId}:${certId}`).toString('base64');

    try {
        const response = await axios.post(
            `${EBAY_API_URL}/identity/v1/oauth2/token`,
            'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${credentials}`
                },
                timeout: 10000
            }
        );

        return response.data.access_token;
    } catch (error) {
        console.error('eBay token error:', error.response?.data || error.message);
        return null;
    }
}

// Search products using eBay Browse API
export async function searchEbay(query, filters = {}) {
    const token = await getEbayToken();

    if (!token) {
        console.warn('eBay: Could not obtain access token');
        return [];
    }

    try {
        // Build search parameters
        const params = new URLSearchParams({
            q: query,
            limit: filters.limit || 20
        });

        // Add price filters
        if (filters.minPrice) {
            params.append('filter', `price:[${filters.minPrice}..${filters.maxPrice || '*'}],priceCurrency:USD`);
        }

        const response = await axios.get(
            `${EBAY_API_URL}/buy/browse/v1/item_summary/search?${params.toString()}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
                },
                timeout: 15000
            }
        );

        return parseEbayResponse(response.data, filters);

    } catch (error) {
        console.error('eBay search error:', error.response?.data || error.message);

        // Return empty array - no mock data
        console.warn('eBay: Search failed, returning empty results');
        return [];
    }
}

// Parse eBay API response
function parseEbayResponse(data, filters) {
    if (!data.itemSummaries || data.itemSummaries.length === 0) {
        console.warn('eBay: No products found');
        return [];
    }

    const products = [];

    for (const item of data.itemSummaries) {
        const price = parseFloat(item.price?.value || 0);

        // Apply price filters
        if (filters.minPrice && price < parseFloat(filters.minPrice)) continue;
        if (filters.maxPrice && price > parseFloat(filters.maxPrice)) continue;

        products.push({
            source: 'ebay',
            externalId: item.itemId,
            title: item.title,
            description: item.shortDescription || item.title,
            price: price,
            originalPrice: price,
            currency: item.price?.currency || 'USD',
            mainImage: item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl || '',
            images: item.thumbnailImages?.map(img => img.imageUrl) || [item.image?.imageUrl].filter(Boolean),
            rating: 0, // eBay Browse API doesn't include ratings
            reviewsCount: 0,
            salesCount: 0,
            category: item.categories?.[0]?.categoryName || filters.category || 'General',
            supplierUrl: item.itemWebUrl || `https://www.ebay.com/itm/${item.itemId}`,
            condition: item.condition || 'New',
            seller: {
                username: item.seller?.username,
                feedbackPercentage: item.seller?.feedbackPercentage,
                feedbackScore: item.seller?.feedbackScore
            },
            shippingInfo: {
                cost: parseFloat(item.shippingOptions?.[0]?.shippingCost?.value || 0),
                type: item.shippingOptions?.[0]?.shippingCostType
            }
        });
    }

    return products;
}

// Get single item details
export async function getEbayItem(itemId) {
    const token = await getEbayToken();

    if (!token) {
        return null;
    }

    try {
        const response = await axios.get(
            `${EBAY_API_URL}/buy/browse/v1/item/${itemId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
                },
                timeout: 10000
            }
        );

        const item = response.data;

        return {
            source: 'ebay',
            externalId: item.itemId,
            title: item.title,
            description: item.description || item.shortDescription,
            price: parseFloat(item.price?.value || 0),
            currency: item.price?.currency || 'USD',
            mainImage: item.image?.imageUrl,
            images: item.additionalImages?.map(img => img.imageUrl) || [],
            category: item.categoryPath,
            supplierUrl: item.itemWebUrl,
            condition: item.condition,
            seller: item.seller,
            shippingInfo: item.shippingOptions
        };

    } catch (error) {
        console.error('eBay item error:', error.response?.data || error.message);
        return null;
    }
}

export default { searchEbay, getEbayItem };
