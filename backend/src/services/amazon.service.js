import axios from 'axios';
import * as cheerio from 'cheerio';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const AMAZON_HOST = 'webservices.amazon.com';
const AMAZON_REGION = 'us-east-1';
const AMAZON_SERVICE = 'ProductAdvertisingAPI';

// Extended list of user agents for better rotation
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0'
];

// Accept-Language variations
const ACCEPT_LANGUAGES = [
    'en-US,en;q=0.9',
    'en-US,en;q=0.9,es;q=0.8',
    'en-GB,en;q=0.9,en-US;q=0.8',
    'en;q=0.9'
];

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Delay between requests to avoid rate limiting
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Generate AWS Signature v4 (for official API)
function generateSignature(requestParams, timestamp, date) {
    const accessKey = process.env.AMAZON_ACCESS_KEY;
    const secretKey = process.env.AMAZON_SECRET_KEY;

    const canonicalHeaders = `host:${AMAZON_HOST}\nx-amz-date:${timestamp}\n`;
    const signedHeaders = 'host;x-amz-date';

    const payload = JSON.stringify(requestParams);
    const payloadHash = crypto.createHash('sha256').update(payload).digest('hex');

    const canonicalRequest = [
        'POST',
        '/paapi5/searchitems',
        '',
        canonicalHeaders,
        signedHeaders,
        payloadHash
    ].join('\n');

    const credentialScope = `${date}/${AMAZON_REGION}/${AMAZON_SERVICE}/aws4_request`;
    const stringToSign = [
        'AWS4-HMAC-SHA256',
        timestamp,
        credentialScope,
        crypto.createHash('sha256').update(canonicalRequest).digest('hex')
    ].join('\n');

    const kDate = crypto.createHmac('sha256', `AWS4${secretKey}`).update(date).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(AMAZON_REGION).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(AMAZON_SERVICE).digest();
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

    return { signature, credentialScope, signedHeaders };
}

// Main search function
export async function searchAmazon(query, filters = {}) {
    // Try official API first if credentials are available
    if (process.env.AMAZON_ACCESS_KEY && process.env.AMAZON_SECRET_KEY) {
        try {
            return await searchAmazonAPI(query, filters);
        } catch (error) {
            console.warn('Amazon API failed, falling back to scraping:', error.message);
        }
    }

    // Use enhanced web scraping
    console.log('Amazon: Using enhanced web scraping');
    return await scrapeAmazonProducts(query, filters);
}

// Official Amazon Product Advertising API
async function searchAmazonAPI(query, filters) {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:-]|\.\\d{3}/g, '');
    const date = timestamp.substring(0, 8);

    const requestParams = {
        Keywords: query,
        PartnerTag: process.env.AMAZON_PARTNER_TAG,
        PartnerType: 'Associates',
        Marketplace: process.env.AMAZON_MARKETPLACE || 'www.amazon.com',
        Resources: [
            'Images.Primary.Large',
            'ItemInfo.Title',
            'ItemInfo.Features',
            'Offers.Listings.Price',
            'CustomerReviews.StarRating',
            'CustomerReviews.Count'
        ],
        ItemCount: filters.limit || 20
    };

    const { signature, credentialScope, signedHeaders } = generateSignature(requestParams, timestamp, date);
    const authHeader = `AWS4-HMAC-SHA256 Credential=${process.env.AMAZON_ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const response = await axios.post(
        `https://${AMAZON_HOST}/paapi5/searchitems`,
        requestParams,
        {
            headers: {
                'Authorization': authHeader,
                'X-Amz-Date': timestamp,
                'Content-Type': 'application/json; charset=utf-8',
                'Host': AMAZON_HOST
            },
            timeout: 10000
        }
    );

    return parseAmazonAPIResponse(response.data);
}

function parseAmazonAPIResponse(data) {
    if (!data.SearchResult?.Items) return [];

    return data.SearchResult.Items.map(item => ({
        source: 'amazon',
        externalId: item.ASIN,
        title: item.ItemInfo?.Title?.DisplayValue || 'Unknown Product',
        description: item.ItemInfo?.Features?.DisplayValues?.join(' ') || '',
        price: parseFloat(item.Offers?.Listings?.[0]?.Price?.Amount || 0),
        originalPrice: parseFloat(item.Offers?.Listings?.[0]?.SavingBasis?.Amount || 0),
        currency: 'USD',
        mainImage: item.Images?.Primary?.Large?.URL || '',
        images: [item.Images?.Primary?.Large?.URL].filter(Boolean),
        rating: parseFloat(item.CustomerReviews?.StarRating?.Value || 0),
        reviewsCount: parseInt(item.CustomerReviews?.Count || 0),
        salesCount: 0,
        category: item.ItemInfo?.Classifications?.ProductGroup?.DisplayValue || '',
        supplierUrl: item.DetailPageURL || `https://www.amazon.com/dp/${item.ASIN}`
    }));
}

// Enhanced web scraping for Amazon products
async function scrapeAmazonProducts(query, filters) {
    try {
        // Add random delay to avoid detection
        await delay(Math.random() * 1000 + 500);

        const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(query)}&ref=nb_sb_noss`;

        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': getRandomItem(USER_AGENTS),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': getRandomItem(ACCEPT_LANGUAGES),
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Cache-Control': 'max-age=0',
                'sec-ch-ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"'
            },
            timeout: 20000,
            maxRedirects: 5
        });

        const $ = cheerio.load(response.data);
        const products = [];

        // Multiple selector strategies for different Amazon page versions
        const productSelectors = [
            '[data-component-type="s-search-result"]',
            '.s-result-item[data-asin]',
            '[data-cel-widget^="search_result_"]'
        ];

        let productElements = [];
        for (const selector of productSelectors) {
            productElements = $(selector).toArray();
            if (productElements.length > 0) break;
        }

        for (let index = 0; index < Math.min(productElements.length, filters.limit || 20); index++) {
            const element = productElements[index];
            const $item = $(element);
            const asin = $item.attr('data-asin');

            if (!asin || asin.length < 5) continue;

            // Title extraction - multiple selectors
            let title = '';
            const titleSelectors = [
                'h2 a span',
                'h2 span.a-text-normal',
                '.a-size-medium.a-text-normal',
                '.a-size-base-plus.a-text-normal',
                '[data-cy="title-recipe"] span'
            ];
            for (const sel of titleSelectors) {
                title = $item.find(sel).first().text().trim();
                if (title) break;
            }
            if (!title) continue;

            // Price extraction - enhanced
            let price = 0;
            const priceSelectors = [
                '.a-price .a-offscreen',
                '.a-price-whole',
                '[data-cy="price-recipe"] .a-offscreen',
                '.a-color-price'
            ];
            for (const sel of priceSelectors) {
                const priceText = $item.find(sel).first().text();
                const priceMatch = priceText.replace(/[,$]/g, '').match(/(\d+\.?\d*)/);
                if (priceMatch) {
                    price = parseFloat(priceMatch[1]);
                    break;
                }
            }

            // Original price extraction
            let originalPrice = price;
            const origPriceText = $item.find('.a-text-price .a-offscreen, [data-a-strike="true"] .a-offscreen').first().text();
            if (origPriceText) {
                const origMatch = origPriceText.replace(/[,$]/g, '').match(/(\d+\.?\d*)/);
                if (origMatch) originalPrice = parseFloat(origMatch[1]);
            }

            // Image extraction - enhanced
            let image = '';
            const imgSelectors = [
                'img.s-image',
                '.s-image',
                '[data-component-type="s-product-image"] img',
                '.s-product-image-container img'
            ];
            for (const sel of imgSelectors) {
                image = $item.find(sel).attr('src') || $item.find(sel).attr('data-src') || '';
                if (image && image.includes('http')) break;
            }

            // Rating extraction - enhanced with multiple patterns
            let rating = 0;
            const ratingSelectors = [
                '.a-icon-star-small .a-icon-alt',
                '.a-icon-star .a-icon-alt',
                '[data-cy="reviews-ratings-slot"] .a-icon-alt',
                'i.a-icon-star span.a-icon-alt',
                '.aok-align-bottom .a-icon-alt'
            ];
            for (const sel of ratingSelectors) {
                const ratingText = $item.find(sel).first().text();
                // Match patterns like "4.5 out of 5 stars" or "4,5 de 5"
                const ratingMatch = ratingText.match(/(\d+[.,]?\d*)/);
                if (ratingMatch) {
                    rating = parseFloat(ratingMatch[1].replace(',', '.'));
                    break;
                }
            }

            // Also try aria-label on rating container
            if (rating === 0) {
                const ariaLabel = $item.find('[aria-label*="star"], [aria-label*="estrella"]').first().attr('aria-label') || '';
                const ariaMatch = ariaLabel.match(/(\d+[.,]?\d*)/);
                if (ariaMatch) {
                    rating = parseFloat(ariaMatch[1].replace(',', '.'));
                }
            }

            // Reviews count extraction - enhanced
            let reviewsCount = 0;
            const reviewsSelectors = [
                '.a-size-base.s-underline-text',
                '[aria-label*="star"] + span',
                '[data-cy="reviews-ratings-slot"] span.a-size-base',
                '.a-link-normal .a-size-base',
                'a[href*="customerReviews"] span'
            ];
            for (const sel of reviewsSelectors) {
                const reviewsText = $item.find(sel).first().text().replace(/[,.\s]/g, '');
                const reviewsMatch = reviewsText.match(/(\d+)/);
                if (reviewsMatch && parseInt(reviewsMatch[1]) > 0) {
                    reviewsCount = parseInt(reviewsMatch[1]);
                    break;
                }
            }

            // Also check aria-label for review count
            if (reviewsCount === 0) {
                const reviewLinks = $item.find('a[href*="customerReviews"], a[href*="product-reviews"]');
                reviewLinks.each((_, el) => {
                    const text = $(el).text().replace(/[,.\s]/g, '');
                    const match = text.match(/(\d+)/);
                    if (match && parseInt(match[1]) > 0) {
                        reviewsCount = parseInt(match[1]);
                        return false; // break
                    }
                });
            }

            // Apply price filters
            if (filters.minPrice && price < parseFloat(filters.minPrice)) continue;
            if (filters.maxPrice && price > parseFloat(filters.maxPrice)) continue;
            if (filters.minRating && rating < parseFloat(filters.minRating)) continue;

            products.push({
                source: 'amazon',
                externalId: asin,
                title: title,
                description: `Amazon product: ${title}`,
                price: price,
                originalPrice: originalPrice,
                currency: 'USD',
                mainImage: image,
                images: image ? [image] : [],
                rating: rating,
                reviewsCount: reviewsCount,
                salesCount: Math.floor(reviewsCount * 0.3), // Estimate based on reviews
                category: filters.category || 'General',
                supplierUrl: `https://www.amazon.com/dp/${asin}`
            });
        }

        console.log(`Amazon: Found ${products.length} products for "${query}"`);

        if (products.length === 0) {
            console.warn('Amazon: No products extracted. Page structure may have changed.');
        }

        return products;

    } catch (error) {
        console.error('Amazon scraping error:', error.message);
        if (error.response?.status === 503) {
            console.warn('Amazon: Service unavailable - may be rate limited');
        }
        return [];
    }
}

export default { searchAmazon };
