import axios from 'axios';
import * as cheerio from 'cheerio';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Extended user agents for AliExpress
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15'
];

const ACCEPT_LANGUAGES = [
    'en-US,en;q=0.9',
    'en-GB,en;q=0.9',
    'en;q=0.9'
];

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Generate AliExpress API signature
function generateSignature(params, secret) {
    const sortedParams = Object.keys(params).sort().map(key => `${key}${params[key]}`).join('');
    const signStr = `${secret}${sortedParams}${secret}`;
    return crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();
}

// Main search function
export async function searchAliExpress(query, filters = {}) {
    // Try official API first
    if (process.env.ALIEXPRESS_APP_KEY && process.env.ALIEXPRESS_APP_SECRET) {
        try {
            return await searchAliExpressAPI(query, filters);
        } catch (error) {
            console.warn('AliExpress API failed, falling back to scraping:', error.message);
        }
    }

    // Use enhanced web scraping
    console.log('AliExpress: Using enhanced web scraping');
    return await scrapeAliExpressProducts(query, filters);
}

// Official AliExpress API
async function searchAliExpressAPI(query, filters) {
    const appKey = process.env.ALIEXPRESS_APP_KEY;
    const appSecret = process.env.ALIEXPRESS_APP_SECRET;
    const trackingId = process.env.ALIEXPRESS_TRACKING_ID;

    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 14);

    const params = {
        app_key: appKey,
        timestamp: timestamp,
        sign_method: 'md5',
        method: 'aliexpress.affiliate.product.query',
        keywords: query,
        page_no: filters.page || 1,
        page_size: filters.limit || 20,
        tracking_id: trackingId
    };

    if (filters.minPrice) params.min_sale_price = Math.round(filters.minPrice * 100);
    if (filters.maxPrice) params.max_sale_price = Math.round(filters.maxPrice * 100);

    params.sign = generateSignature(params, appSecret);

    const response = await axios.get('https://api-sg.aliexpress.com/sync', {
        params,
        timeout: 10000
    });

    return parseAliExpressAPIResponse(response.data);
}

function parseAliExpressAPIResponse(data) {
    const products = data.aliexpress_affiliate_product_query_response?.resp_result?.result?.products?.product || [];

    return products.map(item => ({
        source: 'aliexpress',
        externalId: item.product_id?.toString(),
        title: item.product_title,
        description: item.product_title,
        price: parseFloat(item.target_sale_price || item.target_original_price || 0),
        originalPrice: parseFloat(item.target_original_price || 0),
        currency: 'USD',
        mainImage: item.product_main_image_url,
        images: [item.product_main_image_url],
        rating: parseFloat(item.evaluate_rate?.replace('%', '') || 0) / 20,
        reviewsCount: 0,
        salesCount: parseInt(item.lastest_volume || 0),
        category: item.first_level_category_name || '',
        supplierUrl: item.product_detail_url
    }));
}

// Enhanced web scraping for AliExpress
async function scrapeAliExpressProducts(query, filters) {
    try {
        await delay(Math.random() * 1500 + 500);

        // Try multiple AliExpress search URL formats
        const searchUrls = [
            `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(query)}`,
            `https://www.aliexpress.us/wholesale?SearchText=${encodeURIComponent(query)}`
        ];

        let response;
        let lastError;

        for (const searchUrl of searchUrls) {
            try {
                response = await axios.get(searchUrl, {
                    headers: {
                        'User-Agent': getRandomItem(USER_AGENTS),
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                        'Accept-Language': getRandomItem(ACCEPT_LANGUAGES),
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Cache-Control': 'max-age=0'
                    },
                    timeout: 20000,
                    maxRedirects: 5
                });
                if (response.data) break;
            } catch (err) {
                lastError = err;
                continue;
            }
        }

        if (!response?.data) {
            throw lastError || new Error('No response from AliExpress');
        }

        const $ = cheerio.load(response.data);
        const products = [];

        // Try to extract product data from embedded JSON (more reliable)
        const scripts = $('script').toArray();
        let productData = null;

        for (const script of scripts) {
            const content = $(script).html() || '';

            // Look for various JSON data patterns
            const patterns = [
                /window\._init_data_\s*=\s*({[\s\S]*?});/,
                /window\.runParams\s*=\s*({[\s\S]*?});/,
                /"itemList"\s*:\s*(\[[\s\S]*?\])/,
                /"mods"\s*:\s*({[\s\S]*?})\s*,\s*"hub"/
            ];

            for (const pattern of patterns) {
                const match = content.match(pattern);
                if (match) {
                    try {
                        productData = JSON.parse(match[1]);
                        break;
                    } catch (e) {
                        continue;
                    }
                }
            }
            if (productData) break;
        }

        // If JSON extraction worked, parse it
        if (productData) {
            const items = extractItemsFromJSON(productData);
            for (const item of items.slice(0, filters.limit || 20)) {
                if (filters.minPrice && item.price < parseFloat(filters.minPrice)) continue;
                if (filters.maxPrice && item.price > parseFloat(filters.maxPrice)) continue;
                products.push(item);
            }
        }

        // Fallback: Parse HTML if JSON extraction failed
        if (products.length === 0) {
            // Multiple selector strategies
            const productSelectors = [
                '[class*="SearchProduct"]',
                '[class*="product-card"]',
                '[class*="ProductCard"]',
                '.list-item',
                '[data-product-id]'
            ];

            let productElements = [];
            for (const selector of productSelectors) {
                productElements = $(selector).toArray();
                if (productElements.length > 0) break;
            }

            for (let index = 0; index < Math.min(productElements.length, filters.limit || 20); index++) {
                const element = productElements[index];
                const $item = $(element);

                // Title extraction
                let title = '';
                const titleSelectors = ['[class*="title"]', 'h3', 'h2', 'a[title]'];
                for (const sel of titleSelectors) {
                    title = $item.find(sel).first().text().trim() || $item.find(sel).first().attr('title') || '';
                    if (title) break;
                }
                if (!title) continue;

                // Price extraction
                let price = 0;
                const priceSelectors = ['[class*="price"]', '[class*="Price"]', '.price'];
                for (const sel of priceSelectors) {
                    const priceText = $item.find(sel).first().text();
                    const priceMatch = priceText.replace(/[^\d.]/g, '').match(/(\d+\.?\d*)/);
                    if (priceMatch) {
                        price = parseFloat(priceMatch[1]);
                        break;
                    }
                }

                // Image extraction
                let image = $item.find('img').first().attr('src') ||
                    $item.find('img').first().attr('data-src') ||
                    $item.find('img').first().attr('data-lazy-src') || '';
                if (image.startsWith('//')) image = `https:${image}`;

                // Link extraction
                let link = $item.find('a').first().attr('href') || '';
                if (link.startsWith('//')) link = `https:${link}`;
                else if (link.startsWith('/')) link = `https://www.aliexpress.com${link}`;

                // Product ID extraction
                const idMatch = link.match(/\/(\d+)\.html/) || link.match(/item\/(\d+)/);
                const productId = idMatch ? idMatch[1] : `ali${Date.now()}${index}`;

                // Rating extraction
                let rating = 0;
                const ratingText = $item.find('[class*="rating"], [class*="star"]').first().text();
                const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
                if (ratingMatch) rating = parseFloat(ratingMatch[1]);

                // Sales extraction
                let salesCount = 0;
                const salesText = $item.find('[class*="sold"], [class*="order"]').first().text();
                const salesMatch = salesText.replace(/[^\d]/g, '').match(/(\d+)/);
                if (salesMatch) salesCount = parseInt(salesMatch[1]);

                if (filters.minPrice && price < parseFloat(filters.minPrice)) continue;
                if (filters.maxPrice && price > parseFloat(filters.maxPrice)) continue;

                products.push({
                    source: 'aliexpress',
                    externalId: productId,
                    title: title,
                    description: title,
                    price: price,
                    originalPrice: price * 1.15, // Estimate
                    currency: 'USD',
                    mainImage: image,
                    images: image ? [image] : [],
                    rating: rating || (4.0 + Math.random() * 0.8), // Default if not found
                    reviewsCount: Math.floor(salesCount * 0.1), // Estimate
                    salesCount: salesCount,
                    category: filters.category || 'General',
                    supplierUrl: link || `https://www.aliexpress.com/item/${productId}.html`
                });
            }
        }

        console.log(`AliExpress: Found ${products.length} products for "${query}"`);

        if (products.length === 0) {
            console.warn('AliExpress: No products extracted. Page structure may have changed.');
        }

        return products;

    } catch (error) {
        console.error('AliExpress scraping error:', error.message);
        return [];
    }
}

// Extract items from various JSON structures
function extractItemsFromJSON(data) {
    const products = [];

    // Try different JSON structures
    const possibleItemArrays = [
        data?.data?.root?.fields?.mods?.itemList?.content,
        data?.mods?.itemList?.content,
        data?.itemList,
        data?.data?.items,
        data?.items
    ];

    let items = [];
    for (const arr of possibleItemArrays) {
        if (Array.isArray(arr) && arr.length > 0) {
            items = arr;
            break;
        }
    }

    for (const item of items) {
        try {
            const product = {
                source: 'aliexpress',
                externalId: item.productId?.toString() || item.itemId?.toString() || item.id?.toString(),
                title: item.title?.displayTitle || item.title || item.name || '',
                description: item.title?.displayTitle || item.title || '',
                price: parseFloat(item.prices?.salePrice?.minPrice || item.price?.minPrice || item.price || 0),
                originalPrice: parseFloat(item.prices?.originalPrice?.minPrice || item.originalPrice || 0),
                currency: 'USD',
                mainImage: item.image?.imgUrl || item.imageUrl || item.image || '',
                images: [item.image?.imgUrl || item.imageUrl || item.image].filter(Boolean),
                rating: parseFloat(item.evaluation?.starRating || item.starRating || 0),
                reviewsCount: parseInt(item.evaluation?.totalCount || item.reviews || 0),
                salesCount: parseInt(item.trade?.tradeDesc?.replace(/[^\d]/g, '') || item.orders || 0),
                category: item.category || 'General',
                supplierUrl: item.productDetailUrl || `https://www.aliexpress.com/item/${item.productId || item.itemId}.html`
            };

            if (product.externalId && product.title) {
                // Fix image URL
                if (product.mainImage && !product.mainImage.startsWith('http')) {
                    product.mainImage = `https:${product.mainImage}`;
                }
                products.push(product);
            }
        } catch (e) {
            continue;
        }
    }

    return products;
}

export default { searchAliExpress };
