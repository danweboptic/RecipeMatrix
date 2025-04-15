/**
 * MealPlanner - Core meal planning and shopping list generation logic
 */
class MealPlanner {
    constructor(dataLoader) {
        this.dataLoader = dataLoader;
        this.meals = [];
    }

    /**
     * Generate a complete meal plan
     * @param {number} numMeals - Number of meals to generate
     * @param {number} servingsPerMeal - Servings per meal
     * @returns {Object} - Meal plan and shopping list
     */
    generateMealPlan(numMeals, servingsPerMeal) {
        if (!this.dataLoader.isReady()) {
            throw new Error('Ingredient data not loaded yet');
        }

        this.meals = [];
        const usedCuisines = [];

        // Generate the required number of meals
        for (let i = 0; i < numMeals; i++) {
            const meal = this.generateMeal(usedCuisines, servingsPerMeal);
            this.meals.push(meal);
            usedCuisines.push(meal.cuisine);
        }

        // Build the consolidated shopping list
        const shoppingList = this.buildShoppingList();

        return {
            meals: this.meals,
            shoppingList: shoppingList
        };
    }

    /**
     * Generate a single meal
     * @param {Array} usedCuisines - Previously used cuisines
     * @param {number} servings - Number of servings
     * @returns {Object} - Generated meal
     */
    generateMeal(usedCuisines, servings) {
        // Pick a cuisine that hasn't been used if possible
        const cuisine = this.pickCuisine(usedCuisines);
        
        // Pick protein for this cuisine
        const protein = this.pickProteinForCuisine(cuisine);
        
        // Pick carbs that match the cuisine
        const carbs = this.pickCarbsForCuisine(cuisine);
        
        // Pick vegetables that match the cuisine and pair with protein/carbs
        const vegetables = this.pickVegetablesForCuisine(cuisine, protein, carbs);
        
        // Pick pantry items that match the flavors
        const pantryItems = this.pickPantryItems(cuisine, protein, vegetables);
        
        // Check compatibility
        if (!this.isCompatible(protein, carbs, vegetables, pantryItems)) {
            // If incompatible, try again (recursive call)
            return this.generateMeal(usedCuisines, servings);
        }
        
        // Create a meal title
        const mealTitle = this.createMealTitle(cuisine, protein, carbs, vegetables);
        
        // Calculate ingredient quantities
        const ingredients = this.calculateIngredientQuantities(
            protein, carbs, vegetables, pantryItems, servings
        );
        
        return {
            title: mealTitle,
            cuisine: cuisine,
            servings: servings,
            ingredients: ingredients,
            protein: protein,
            carbs: carbs,
            vegetables: vegetables,
            pantryItems: pantryItems
        };
    }

    /**
     * Pick a cuisine, avoiding previously used ones if possible
     * @param {Array} usedCuisines - Previously used cuisines
     * @returns {string} - Selected cuisine
     */
    pickCuisine(usedCuisines) {
        const allCuisines = this.dataLoader.cuisines;
        
        // Find cuisines that haven't been used yet
        const availableCuisines = allCuisines.filter(
            cuisine => !usedCuisines.includes(cuisine)
        );
        
        // If we have unused cuisines, pick from those
        if (availableCuisines.length > 0) {
            return this.randomPick(availableCuisines);
        }
        
        // Otherwise pick from all cuisines
        return this.randomPick(allCuisines);
    }

    /**
     * Pick a protein that matches the cuisine
     * @param {string} cuisine - Selected cuisine
     * @returns {Object} - Selected protein
     */
    pickProteinForCuisine(cuisine) {
        const compatibleProteins = this.dataLoader.getIngredientsByCuisine('proteins', cuisine);
        
        if (compatibleProteins.length === 0) {
            // Fallback to any protein if none match the cuisine
            return this.randomPick(this.dataLoader.proteins);
        }
        
        return this.randomPick(compatibleProteins);
    }

    /**
     * Pick carbs that match the cuisine
     * @param {string} cuisine - Selected cuisine
     * @returns {Array} - Selected carbs (1-2)
     */
    pickCarbsForCuisine(cuisine) {
        const compatibleCarbs = this.dataLoader.getIngredientsByCuisine('carbs', cuisine);
        
        if (compatibleCarbs.length === 0) {
            // Fallback to random carbs if none match the cuisine
            const randomCarb = this.randomPick(this.dataLoader.carbs);
            return [randomCarb];
        }
        
        // Pick 1-2 carbs
        const numCarbs = Math.random() > 0.5 ? 2 : 1;
        return this.pickRandomSubset(compatibleCarbs, numCarbs);
    }

    /**
     * Pick vegetables that match the cuisine and pair with protein/carbs
     * @param {string} cuisine - Selected cuisine
     * @param {Object} protein - Selected protein
     * @param {Array} carbs - Selected carbs
     * @returns {Array} - Selected vegetables (1-3)
     */
    pickVegetablesForCuisine(cuisine, protein, carbs) {
        // Get vegetables that match the cuisine
        let compatibleVegetables = this.dataLoader.getIngredientsByCuisine('vegetables', cuisine);
        
        // Additionally filter by those that pair with the protein or carbs if possible
        const pairingVegetables = this.dataLoader.vegetables.filter(veg => {
            if (!veg.pairs_with) return false;
            
            // Check if the vegetable pairs with the protein
            if (veg.pairs_with.includes(protein.name)) return true;
            
            // Check if the vegetable pairs with any of the carbs
            for (const carb of carbs) {
                if (veg.pairs_with.includes(carb.name)) return true;
            }
            
            return false;
        });
        
        // If we have vegetables that pair well, use those
        if (pairingVegetables.length > 0) {
            compatibleVegetables = pairingVegetables;
        }
        
        // Fallback if no compatible vegetables found
        if (compatibleVegetables.length === 0) {
            compatibleVegetables = this.dataLoader.vegetables;
        }
        
        // Pick 1-3 vegetables
        const numVegetables = Math.floor(Math.random() * 3) + 1;
        return this.pickRandomSubset(compatibleVegetables, numVegetables);
    }

    /**
     * Pick pantry items that match the cuisine and ingredients
     * @param {string} cuisine - Selected cuisine
     * @param {Object} protein - Selected protein
     * @param {Array} vegetables - Selected vegetables
     * @returns {Array} - Selected pantry items (1-4)
     */
    pickPantryItems(cuisine, protein, vegetables) {
        // Get pantry items that match the cuisine
        let compatiblePantryItems = this.dataLoader.getIngredientsByCuisine('pantryItems', cuisine);
        
        // Additionally filter by those that pair with the protein or vegetables if possible
        const pairingPantryItems = this.dataLoader.pantryItems.filter(item => {
            if (!item.pairs_with) return false;
            
            // Check if the pantry item pairs with the protein
            if (item.pairs_with.includes(protein.name)) return true;
            
            // Check if the pantry item pairs with any of the vegetables
            for (const veg of vegetables) {
                if (item.pairs_with.includes(veg.name)) return true;
            }
            
            return false;
        });
        
        // If we have pantry items that pair well, use those
        if (pairingPantryItems.length > 0) {
            compatiblePantryItems = pairingPantryItems;
        }
        
        // Fallback if no compatible pantry items found
        if (compatiblePantryItems.length === 0) {
            compatiblePantryItems = this.dataLoader.pantryItems;
        }
        
        // Pick 1-4 pantry items
        const numPantryItems = Math.floor(Math.random() * 4) + 1;
        return this.pickRandomSubset(compatiblePantryItems, numPantryItems);
    }

    /**
     * Check if all selected ingredients are compatible
     * @param {Object} protein - Selected protein
     * @param {Array} carbs - Selected carbs
     * @param {Array} vegetables - Selected vegetables
     * @param {Array} pantryItems - Selected pantry items
     * @returns {boolean} - True if all ingredients are compatible
     */
    isCompatible(protein, carbs, vegetables, pantryItems) {
        // For simplicity, we'll assume ingredients are compatible unless specified otherwise
        // In a real implementation, this would check specific incompatibility rules
        return true;
    }

    /**
     * Create a meal title based on selected ingredients
     * @param {string} cuisine - Selected cuisine
     * @param {Object} protein - Selected protein
     * @param {Array} carbs - Selected carbs
     * @param {Array} vegetables - Selected vegetables
     * @returns {string} - Generated meal title
     */
    createMealTitle(cuisine, protein, carbs, vegetables) {
        const mainCarb = carbs[0]?.name || '';
        const mainVeg = vegetables[0]?.name || '';
        
        let title = `${cuisine} ${protein.name}`;
        
        if (mainCarb) {
            title += ` with ${mainCarb}`;
        }
        
        if (mainVeg) {
            title += mainCarb ? ` & ${mainVeg}` : ` with ${mainVeg}`;
        }
        
        return title;
    }

    /**
     * Calculate ingredient quantities based on servings
     * @param {Object} protein - Selected protein
     * @param {Array} carbs - Selected carbs
     * @param {Array} vegetables - Selected vegetables
     * @param {Array} pantryItems - Selected pantry items
     * @param {number} servings - Number of servings
     * @returns {Object} - Ingredient quantities
     */
    calculateIngredientQuantities(protein, carbs, vegetables, pantryItems, servings) {
        const ingredients = {};
        
        // Calculate protein quantity
        const proteinPortionSize = protein.type === 'plant' ? 100 : 125; // g per serving
        ingredients[protein.name] = `${proteinPortionSize * servings}g`;
        
        // Calculate carbs quantities
        carbs.forEach(carb => {
            let quantity;
            
            if (carb.name.includes('Rice') || carb.name.includes('Pasta')) {
                quantity = `${75 * servings}g`;
            } else if (carb.name.includes('Potato')) {
                quantity = `${200 * servings}g`;
            } else {
                // Default for other carbs
                quantity = `${100 * servings}g`;
            }
            
            ingredients[carb.name] = quantity;
        });
        
        // Calculate vegetable quantities
        vegetables.forEach(veg => {
            // Default to 100g per meal for vegetables
            ingredients[veg.name] = `${100 * servings}g`;
        });
        
        // Add pantry items with default quantities
        pantryItems.forEach(item => {
            ingredients[item.name] = item.default_quantity || 'to taste';
        });
        
        return ingredients;
    }

    /**
     * Build a consolidated shopping list from all meals
     * @returns {Object} - Grouped shopping list
     */
    buildShoppingList() {
        // Initialize shopping list object
        const consolidatedList = {};
        
        // Process each meal
        this.meals.forEach(meal => {
            // Process each ingredient in the meal
            Object.entries(meal.ingredients).forEach(([ingredient, quantity]) => {
                // Parse the quantity (strip 'g' and convert to number if possible)
                let parsedQuantity = quantity;
                if (typeof quantity === 'string' && quantity.endsWith('g')) {
                    parsedQuantity = parseFloat(quantity.replace('g', ''));
                }
                
                // Add to or update the consolidated list
                if (consolidatedList[ingredient]) {
                    // If ingredient already exists and both quantities are numbers, add them
                    if (typeof consolidatedList[ingredient] === 'number' && 
                        typeof parsedQuantity === 'number') {
                        consolidatedList[ingredient] += parsedQuantity;
                    } else if (typeof parsedQuantity === 'number') {
                        // Convert to number with unit
                        consolidatedList[ingredient] = parsedQuantity;
                    } else {
                        // Keep the existing entry (for 'to taste' etc.)
                        consolidatedList[ingredient] = consolidatedList[ingredient];
                    }
                } else {
                    // Add new ingredient
                    consolidatedList[ingredient] = parsedQuantity;
                }
            });
        });
        
        // Format quantities (add 'g' back for weights)
        Object.keys(consolidatedList).forEach(ingredient => {
            if (typeof consolidatedList[ingredient] === 'number') {
                consolidatedList[ingredient] = `${consolidatedList[ingredient]}g`;
            }
        });
        
        // Group ingredients by category
        const groupedList = {
            'Proteins': {},
            'Carbs': {},
            'Vegetables': {},
            'Pantry Items': {}
        };
        
        // Categorize each ingredient
        Object.entries(consolidatedList).forEach(([ingredient, quantity]) => {
            // Check each category
            if (this.findIngredientInCategory('proteins', ingredient)) {
                groupedList['Proteins'][ingredient] = quantity;
            } else if (this.findIngredientInCategory('carbs', ingredient)) {
                groupedList['Carbs'][ingredient] = quantity;
            } else if (this.findIngredientInCategory('vegetables', ingredient)) {
                groupedList['Vegetables'][ingredient] = quantity;
            } else {
                groupedList['Pantry Items'][ingredient] = quantity;
            }
        });
        
        return groupedList;
    }

    /**
     * Check if an ingredient belongs to a specific category
     * @param {string} category - Category to check
     * @param {string} ingredientName - Ingredient name
     * @returns {boolean} - True if ingredient is in the category
     */
    findIngredientInCategory(category, ingredientName) {
        return this.dataLoader[category].some(item => item.name === ingredientName);
    }

    /**
     * Pick a random item from an array
     * @param {Array} array - Array to pick from
     * @returns {*} - Random item from the array
     */
    randomPick(array) {
        if (!array || array.length === 0) {
            return null;
        }
        return array[Math.floor(Math.random() * array.length)];
    }

    /**
     * Pick a random subset of items from an array
     * @param {Array} array - Array to pick from
     * @param {number} count - Number of items to pick
     * @returns {Array} - Random subset
     */
    pickRandomSubset(array, count) {
        if (!array || array.length === 0) {
            return [];
        }
        
        // Ensure count is not larger than the array
        count = Math.min(count, array.length);
        
        // Shuffle and take the first 'count' items
        const shuffled = [...array].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }
}