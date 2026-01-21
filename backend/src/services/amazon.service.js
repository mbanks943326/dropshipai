import axios from 'axios';
import * as cheerio from 'cheerio';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const AMAZON_HOST = 'webservices.amazon.com';
const AMAZON_REGION = 'us-east-1';
const AMAZON_SERVICE = 'ProductAdvertisingAPI';

// User agents for scraping
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
];

function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
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

// Main search function - tries API first, then scraping
export async function searchAmazon(query, filters = {}) {
    // Try official API first if credentials are available
    if (process.env.AMAZON_ACCESS_KEY && process.env.AMAZON_SECRET_KEY) {
        try {
            return await searchAmazonAPI(query, filters);
        } catch (error) {
            console.warn('Amazon API failed, falling back to scraping:', error.message);
        }
    }

    // Use web scraping as fallback
    console.log('Amazon: Using web scraping for real products');
    return await scrapeAmazonProducts(query, filters);
}

// Official Amazon Product Advertising API
async function searchAmazonAPI(query, filters) {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
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

// Web scraping for Amazon products
async function scrapeAmazonProducts(query, filters) {
    try {
        const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(query)}&ref=nb_sb_noss`;

        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': getRandomUserAgent(),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Cache-Control': 'max-age=0'
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const products = [];

        // Parse search results
        $('[data-component-type="s-search-result"]').each((index, element) => {
            if (index >= (filters.limit || 20)) return false;

            const $item = $(element);
            const asin = $item.attr('data-asin');

            if (!asin) return;

            // Get title
            const titleElement = $item.find('h2 a span, .a-text-normal');
            const title = titleElement.first().text().trim();

            if (!title) return;

            // Get price
            const priceWhole = $item.find('.a-price-whole').first().text().replace(',', '').replace('.', '');
            const priceFraction = $item.find('.a-price-fraction').first().text() || '00';
            const price = parseFloat(`${priceWhole}.${priceFraction}`) || 0;

            // Get original price
            const originalPriceText = $item.find('.a-text-price .a-offscreen').first().text();
            const originalPrice = parseFloat(originalPriceText.replace(/[^0-9.]/g, '')) || price;

            // Get image
            const image = $item.find('img.s-image').attr('src') || '';

            // Get rating
            const ratingText = $item.find('.a-icon-star-small .a-icon-alt, .a-icon-star .a-icon-alt').first().text();
            const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
            const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

            // Get review count
            const reviewsText = $item.find('[aria-label*="stars"] + span, .a-size-base.s-underline-text').first().text();
            const reviewsMatch = reviewsText.replace(/,/g, '').match(/(\d+)/);
            const reviewsCount = reviewsMatch ? parseInt(reviewsMatch[1]) : 0;

            // Apply price filters
            if (filters.minPrice && price < parseFloat(filters.minPrice)) return;
            if (filters.maxPrice && price > parseFloat(filters.maxPrice)) return;
            if (filters.minRating && rating < parseFloat(filters.minRating)) return;

            products.push({
                source: 'amazon',
                externalId: asin,
                title: title,
                description: `Amazon product: ${title}`,
                price: price,
                originalPrice: originalPrice,
                currency: 'USD',
                mainImage: image,
                images: [image],
                rating: rating,
                reviewsCount: reviewsCount,
                salesCount: Math.floor(reviewsCount * 0.3), // Estimate
                category: filters.category || 'General',
                supplierUrl: `https://www.amazon.com/dp/${asin}`
            });
        });

        // Log if no products found
        if (products.length === 0) {
            console.warn('Amazon: No products found for query:', query);
        }

        return products;

    } catch (error) {
        console.error('Amazon scraping error:', error.message);
        // No mock data - only real products
        console.warn('Amazon: No products found. Scraping may be blocked.');
        return [];
    }
}

// No mock data - this app only uses real products

export default { searchAmazon };
