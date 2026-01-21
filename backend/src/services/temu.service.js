import dotenv from 'dotenv';

dotenv.config();

// Temu does not have a public API and scraping may violate their ToS
// This service is disabled until official API access is available

export async function searchTemu(query, filters = {}) {
    console.warn('Temu: Service disabled - no public API available');
    console.warn('Temu: Products from this source are not available');

    // Return empty array - no mock data
    return [];
}

export default { searchTemu };

