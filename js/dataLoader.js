/**
 * DataLoader - Handles loading and preparing ingredient data
 */
class DataLoader {
    constructor() {
        this.proteins = [];
        this.carbs = [];
        this.vegetables = [];
        this.pantryItems = [];
        this.cuisines = [];
        this.loaded = false;
        this.loadError = null;
    }

    /**
     * Load all data files
     * @returns {Promise} - Resolves when all data is loaded
     */
    async loadData() {
        try {
            // Load all data in parallel
            const [proteins, carbs, vegetables, pantryItems] = await Promise.all([
                this.fetchJSON('data/proteins.json'),
                this.fetchJSON('data/carbs.json'),
                this.fetchJSON('data/vegetables.json'),
                this.fetchJSON('data/pantry.json')
            ]);
            
            this.proteins = proteins;
            this.carbs = carbs;
            this.vegetables = vegetables;
            this.pantryItems = pantryItems;
            
            // Extract unique cuisines from all ingredients
            this.cuisines = this.extractCuisines();
            
            this.loaded = true;
            return true;
        } catch (error) {
            this.loadError = error.message;
            console.error('Error loading ingredient data:', error);
            throw error;
        }
    }

    /**
     * Fetch and parse a JSON file
     * @param {string} url - Path to JSON file
     * @returns {Promise} - Resolves with parsed JSON data
     */
    async fetchJSON(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load ${url}: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * Extract unique cuisines from all ingredients
     * @returns {Array} - List of unique cuisines
     */
    extractCuisines() {
        const allCuisines = new Set();
        
        // Collect cuisines from each ingredient type
        [this.proteins, this.carbs, this.vegetables, this.pantryItems].forEach(category => {
            category.forEach(item => {
                if (item.cuisines && Array.isArray(item.cuisines)) {
                    item.cuisines.forEach(cuisine => allCuisines.add(cuisine));
                }
            });
        });
        
        return Array.from(allCuisines);
    }

    /**
     * Check if all data is loaded
     * @returns {boolean} - True if data is loaded
     */
    isReady() {
        return this.loaded;
    }

    /**
     * Get ingredients filtered by cuisine
     * @param {string} type - Ingredient type ('proteins', 'carbs', etc.)
     * @param {string} cuisine - Cuisine to filter by
     * @returns {Array} - Filtered ingredients
     */
    getIngredientsByCuisine(type, cuisine) {
        if (!this[type]) {
            return [];
        }
        
        return this[type].filter(item => 
            item.cuisines && item.cuisines.includes(cuisine)
        );
    }
}

// Create a global instance
const dataLoader = new DataLoader();