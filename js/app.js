/**
 * Main application logic
 */
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const numMealsInput = document.getElementById('num-meals');
    const servingsInput = document.getElementById('servings');
    const generateButton = document.getElementById('generate-plan');
    const resultsSection = document.querySelector('.results');
    const mealList = document.getElementById('meal-list');
    const shoppingList = document.getElementById('shopping-list');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const loader = document.getElementById('loader');
    const printButton = document.getElementById('print-list');
    
    // Initialize meal planner with data loader
    const mealPlanner = new MealPlanner(dataLoader);
    
    // Load ingredient data when the page loads
    initializeApp();
    
    // Event Listeners
    generateButton.addEventListener('click', handleGeneratePlan);
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });
    
    printButton.addEventListener('click', () => {
        window.print();
    });
    
    /**
     * Initialize the application
     */
    async function initializeApp() {
        showLoader('Loading ingredient data...');
        
        try {
            await dataLoader.loadData();
            hideLoader();
            console.log('Ingredient data loaded successfully');
        } catch (error) {
            hideLoader();
            alert(`Failed to load ingredient data: ${error.message}`);
            console.error('Failed to initialize app:', error);
        }
    }
    
    /**
     * Handle generate plan button click
     */
    async function handleGeneratePlan() {
        const numMeals = parseInt(numMealsInput.value, 10);
        const servings = parseInt(servingsInput.value, 10);
        
        // Validation
        if (isNaN(numMeals) || numMeals < 1 || isNaN(servings) || servings < 1) {
            alert('Please enter valid numbers for meals and servings');
            return;
        }
        
        showLoader('Generating your meal plan...');
        
        // Use setTimeout to allow the loader to display
        setTimeout(() => {
            try {
                const { meals, shoppingList: groceryList } = mealPlanner.generateMealPlan(numMeals, servings);
                
                // Display the results
                displayMeals(meals);
                displayShoppingList(groceryList);
                resultsSection.classList.remove('hidden');
                
                // Switch to the meals tab
                switchTab('meals');
                
                // Hide the loader
                hideLoader();
                
                // Scroll to results
                resultsSection.scrollIntoView({ behavior: 'smooth' });
            } catch (error) {
                hideLoader();
                alert(`Failed to generate meal plan: ${error.message}`);
                console.error('Error generating meal plan:', error);
            }
        }, 100); // Short delay for the loader to show
    }
    
    /**
     * Display the generated meals
     * @param {Array} meals - List of generated meals
     */
    function displayMeals(meals) {
        mealList.innerHTML = '';
        
        meals.forEach(meal => {
            const mealCard = document.createElement('div');
            mealCard.className = 'meal-card';
            
            // Create meal header
            const mealHeader = document.createElement('div');
            mealHeader.className = 'meal-header';
            mealHeader.innerHTML = `
                <h3 class="meal-title">${meal.title}</h3>
                <span class="meal-cuisine">${meal.cuisine}</span>
                <span class="meal-servings">${meal.servings} servings</span>
            `;
            
            // Create meal ingredients
            const mealIngredients = document.createElement('div');
            mealIngredients.className = 'meal-ingredients';
            
            let ingredientsHTML = '<h4>Ingredients</h4><ul class="ingredient-list">';
            
            // Add all ingredients to the list
            Object.entries(meal.ingredients).forEach(([ingredient, quantity]) => {
                ingredientsHTML += `
                    <li class="ingredient-item">
                        <span class="ingredient-name">${ingredient}</span>
                        <span class="ingredient-quantity">${quantity}</span>
                    </li>
                `;
            });
            
            ingredientsHTML += '</ul>';
            mealIngredients.innerHTML = ingredientsHTML;
            
            // Assemble the meal card
            mealCard.appendChild(mealHeader);
            mealCard.appendChild(mealIngredients);
            
            mealList.appendChild(mealCard);
        });
    }
    
    /**
     * Display the shopping list
     * @param {Object} groceryList - Grouped shopping list
     */
    function displayShoppingList(groceryList) {
        shoppingList.innerHTML = '';
        
        // Process each category
        Object.entries(groceryList).forEach(([category, items]) => {
            // Skip empty categories
            if (Object.keys(items).length === 0) {
                return;
            }
            
            const categorySection = document.createElement('div');
            categorySection.className = 'shopping-category';
            
            let categoryHTML = `<h3>${category}</h3><ul class="shopping-items">`;
            
            // Add all items in this category
            Object.entries(items).forEach(([item, quantity]) => {
                categoryHTML += `
                    <li class="shopping-item">
                        <span class="item-name">${item}</span>
                        <span class="item-quantity">${quantity}</span>
                    </li>
                `;
            });
            
            categoryHTML += '</ul>';
            categorySection.innerHTML = categoryHTML;
            
            shoppingList.appendChild(categorySection);
        });
    }
    
    /**
     * Switch between tabs
     * @param {string} tabId - Tab identifier
     */
    function switchTab(tabId) {
        // Update tab buttons
        tabButtons.forEach(btn => {
            if (btn.dataset.tab === tabId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Update tab contents
        tabContents.forEach(content => {
            if (content.id === `${tabId}-tab`) {
                content.classList.remove('hidden');
            } else {
                content.classList.add('hidden');
            }
        });
    }
    
    /**
     * Show the loader with a message
     * @param {string} message - Message to display
     */
    function showLoader(message = 'Loading...') {
        const loaderMessage = loader.querySelector('p');
        if (loaderMessage) {
            loaderMessage.textContent = message;
        }
        loader.classList.remove('hidden');
    }
    
    /**
     * Hide the loader
     */
    function hideLoader() {
        loader.classList.add('hidden');
    }
});