import axios from 'axios';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';

dotenv.config();

// Ethical web scraper for Temu
// Note: This should only be used with user consent and in compliance with Temu's ToS
// In production, consider using official APIs if available

const TEMU_BASE_URL = 'https://www.temu.com';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Rate limiting to be respectful
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests

async function respectRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
    }

    lastRequestTime = Date.now();
}

export async function searchTemu(query, filters = {}) {
    try {
        // Always use mock data since Temu doesn't have a public API
        // and scraping may violate their ToS
        console.warn('Temu: Using mock data (no public API available)');
        return getMockTemuProducts(query, filters);

        // The code below is for reference only if Temu provides API access in the future
        /*
        await respectRateLimit();
    
        const searchUrl = `${TEMU_BASE_URL}/search_result.html`;
        const response = await axios.get(searchUrl, {
          params: {
            search_key: query,
            search_method: 'user
          },
          headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9'
          },
          timeout: 15000
        });
    
        return parseTemuResponse(response.data, filters);
        */
    } catch (error) {
        console.error('Temu scraping error:', error.message);
        return getMockTemuProducts(query, filters);
    }
}

function parseTemuResponse(html, filters) {
    const $ = cheerio.load(html);
    const products = [];

    // Note: Actual selectors would need to be determined based on Temu's HTML structure
    $('.product-item').each((index, element) => {
        if (products.length >= (filters.limit || 20)) return;

        const $el = $(element);
        const price = parseFloat($el.find('.price').text().replace(/[^0-9.]/g, '')) || 0;

        // Apply filters
        if (filters.minPrice && price < filters.minPrice) return;
        if (filters.maxPrice && price > filters.maxPrice) return;

        products.push({
            source: 'temu',
            externalId: $el.attr('data-id') || `TEMU${Date.now()}${index}`,
            title: $el.find('.title').text().trim() || 'Unknown Product',
            description: $el.find('.description').text().trim() || '',
            price,
            originalPrice: parseFloat($el.find('.original-price').text().replace(/[^0-9.]/g, '')) || price,
            currency: 'USD',
            mainImage: $el.find('img').attr('src') || '',
            images: [$el.find('img').attr('src')].filter(Boolean),
            rating: parseFloat($el.find('.rating').text()) || 0,
            reviewsCount: parseInt($el.find('.reviews-count').text().replace(/[^0-9]/g, '')) || 0,
            salesCount: parseInt($el.find('.sold').text().replace(/[^0-9]/g, '')) || 0,
            category: filters.category || 'General',
            supplierUrl: TEMU_BASE_URL + ($el.find('a').attr('href') || '')
        });
    });

    return products;
}

// Mock data for development/testing
function getMockTemuProducts(query, filters) {
    const mockProducts = [];
    const basePrice = 3 + Math.random() * 25;

    for (let i = 1; i <= (filters.limit || 10); i++) {
        const price = parseFloat((basePrice + i * 1.5).toFixed(2));

        // Apply filters
        if (filters.minPrice && price < filters.minPrice) continue;
        if (filters.maxPrice && price > filters.maxPrice) continue;

        mockProducts.push({
            source: 'temu',
            externalId: `TEMU${Date.now()}${i}`,
            title: `${query} - Super Deal ${i}`,
            description: `Amazing ${query} at unbeatable prices. Fast shipping and great quality.`,
            price,
            originalPrice: parseFloat((price + 5).toFixed(2)),
            currency: 'USD',
            mainImage: `https://via.placeholder.com/400x400?text=Temu+${i}`,
            images: [`https://via.placeholder.com/400x400?text=Temu+${i}`],
            rating: parseFloat((4.2 + Math.random() * 0.8).toFixed(1)),
            reviewsCount: Math.floor(Math.random() * 30000) + 200,
            salesCount: Math.floor(Math.random() * 100000) + 5000,
            category: filters.category || 'Home & Garden',
            supplierUrl: `https://www.temu.com/product/mock${i}.html`
        });
    }

    return mockProducts;
}

export default { searchTemu };
