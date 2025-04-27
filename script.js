// DOM Elements
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const fundResultsSection = document.getElementById('fund-results');
const loadingIndicator = document.getElementById('loading-indicator');
const fundDataSection = document.getElementById('fund-data');
const timePeriodButtons = document.querySelectorAll('.time-period-btn');
const topFundsContainer = document.getElementById('top-funds');
const autocompleteResults = document.getElementById('autocomplete-results');
const compareContainer = document.getElementById('compare-container');
const compareEmptyState = document.getElementById('compare-empty');
const compareFundsContainer = document.getElementById('compare-funds');
const compareTableBody = document.getElementById('compare-table-body');
const comparePeriodButtons = document.querySelectorAll('.compare-period-btn');
const clearCompareButton = document.getElementById('clear-compare');

// Global variables
let fundChart;
let compareChart;
let currentSchemeCode;
let currentNavData = [];
let selectedPeriod = '1m';
let compareSelectedPeriod = '1m';
let typeTimer; // For search debounce
let searchCache = {}; // Cache for search results
let compareFunds = []; // Array to store funds for comparison
const MAX_COMPARE_FUNDS = 3; // Maximum number of funds to compare

// API Base URL
const API_BASE_URL = 'https://api.mfapi.in';

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadTopPerformingFunds();
    initializeCompareSection();
});

// Setup event listeners
function initializeEventListeners() {
    // Search button click
    searchButton.addEventListener('click', handleSearch);
    
    // Search on Enter key
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    // Autocomplete functionality
    searchInput.addEventListener('input', handleAutocomplete);
    
    // Hide autocomplete when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target !== searchInput && e.target !== autocompleteResults) {
            autocompleteResults.classList.add('hidden');
        }
    });
    
    // Time period buttons
    timePeriodButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active state
            timePeriodButtons.forEach(btn => btn.classList.remove('active', 'bg-indigo-100', 'text-indigo-600'));
            timePeriodButtons.forEach(btn => btn.classList.add('bg-gray-100', 'text-gray-600'));
            button.classList.remove('bg-gray-100', 'text-gray-600');
            button.classList.add('active', 'bg-indigo-100', 'text-indigo-600');
            
            // Update chart with selected period
            selectedPeriod = button.getAttribute('data-period');
            updateNavChart(currentNavData, selectedPeriod);
        });
    });
    
    // Compare period buttons
    comparePeriodButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active state
            comparePeriodButtons.forEach(btn => btn.classList.remove('active', 'bg-indigo-100', 'text-indigo-600'));
            comparePeriodButtons.forEach(btn => btn.classList.add('bg-gray-100', 'text-gray-600'));
            button.classList.remove('bg-gray-100', 'text-gray-600');
            button.classList.add('active', 'bg-indigo-100', 'text-indigo-600');
            
            // Update chart with selected period
            compareSelectedPeriod = button.getAttribute('data-period');
            updateCompareChart();
        });
    });
    
    // Dynamic "View Details" buttons
    document.addEventListener('click', (e) => {
        if (e.target.hasAttribute('data-scheme-code')) {
            const schemeCode = e.target.getAttribute('data-scheme-code');
            searchInput.value = schemeCode;
            handleSearch();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
    
    // Add to compare button
    document.getElementById('add-to-compare').addEventListener('click', () => {
        if (currentSchemeCode) {
            addFundToCompare(currentSchemeCode);
        }
    });
    
    // Clear compare button
    clearCompareButton.addEventListener('click', clearComparison);
}

// Initialize compare section
function initializeCompareSection() {
    // Load saved comparison funds from localStorage if any
    const savedCompareFunds = localStorage.getItem('compareFunds');
    if (savedCompareFunds) {
        try {
            const parsedFunds = JSON.parse(savedCompareFunds);
            // Load each fund
            Promise.all(parsedFunds.map(schemeCode => 
                fetch(`${API_BASE_URL}/mf/${schemeCode}`)
                .then(response => response.json())
            ))
            .then(fundsData => {
                fundsData.forEach(data => {
                    if (data && data.status === 'SUCCESS') {
                        addFundToCompareData(data.meta, data.data);
                    }
                });
                updateCompareUI();
            })
            .catch(error => {
                console.error('Error loading saved comparison funds:', error);
                localStorage.removeItem('compareFunds');
            });
        } catch (error) {
            console.error('Error parsing saved comparison funds:', error);
            localStorage.removeItem('compareFunds');
        }
    }
}

// Handle autocomplete for search input
function handleAutocomplete() {
    const query = searchInput.value.trim();
    
    // Clear previous timeout
    clearTimeout(typeTimer);
    
    // Hide autocomplete if query is empty
    if (!query || query.length < 2) {
        autocompleteResults.classList.add('hidden');
        return;
    }
    
    // Set a timer to delay the search (debounce)
    typeTimer = setTimeout(() => {
        // If query is numeric, it's likely a scheme code, don't show autocomplete
        if (/^\d+$/.test(query)) {
            autocompleteResults.classList.add('hidden');
            return;
        }
        
        // Check cache first
        if (searchCache[query]) {
            displayAutocompleteResults(searchCache[query]);
            return;
        }
        
        // Fetch autocomplete results
        fetch(`${API_BASE_URL}/mf/search?q=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(data => {
                // Cache the results
                searchCache[query] = data;
                displayAutocompleteResults(data);
            })
            .catch(error => {
                console.error('Autocomplete error:', error);
                autocompleteResults.classList.add('hidden');
            });
    }, 300); // 300ms delay for debounce
}

// Display autocomplete results
function displayAutocompleteResults(funds) {
    // Clear previous results
    autocompleteResults.innerHTML = '';
    
    if (!funds || funds.length === 0) {
        autocompleteResults.classList.add('hidden');
        return;
    }
    
    // Limit to 5 results for better UX
    const limitedFunds = funds.slice(0, 5);
    
    // Create result elements
    limitedFunds.forEach(fund => {
        const resultItem = document.createElement('div');
        resultItem.className = 'p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100';
        resultItem.innerHTML = `
            <div class="font-medium text-gray-800">${fund.schemeName}</div>
            <div class="text-xs text-gray-500">${fund.fundHouse}</div>
        `;
        
        // Add click event
        resultItem.addEventListener('click', () => {
            searchInput.value = fund.schemeCode;
            autocompleteResults.classList.add('hidden');
            handleSearch();
        });
        
        autocompleteResults.appendChild(resultItem);
    });
    
    // Show results
    autocompleteResults.classList.remove('hidden');
}

// Handle search functionality
async function handleSearch() {
    const query = searchInput.value.trim();
    
    if (!query) {
        showNotification('Please enter a fund name or scheme code', 'error');
        return;
    }
    
    try {
        // Show loading state
        fundResultsSection.classList.remove('hidden');
        loadingIndicator.classList.remove('hidden');
        fundDataSection.classList.add('hidden');
        
        // Hide autocomplete
        autocompleteResults.classList.add('hidden');
        
        // Determine if query is a scheme code or name
        const isSchemeCode = /^\d+$/.test(query);
        
        if (isSchemeCode) {
            // Direct fetch if scheme code
            await fetchFundData(query);
        } else {
            // Search for fund by name
            await searchFunds(query);
        }
    } catch (error) {
        console.error('Search error:', error);
        showNotification('Failed to search for funds. Please try again.', 'error');
        loadingIndicator.classList.add('hidden');
    }
}

// Search funds by name
async function searchFunds(query) {
    try {
        const response = await fetch(`${API_BASE_URL}/mf/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data && data.length > 0) {
            // Get the first matching fund
            const fund = data[0];
            await fetchFundData(fund.schemeCode);
        } else {
            loadingIndicator.classList.add('hidden');
            showNotification('No funds found matching your search', 'error');
        }
    } catch (error) {
        console.error('Fund search error:', error);
        loadingIndicator.classList.add('hidden');
        showNotification('Failed to search for funds. Please try again.', 'error');
    }
}

// Fetch fund data by scheme code
async function fetchFundData(schemeCode) {
    try {
        currentSchemeCode = schemeCode;
        
        const response = await fetch(`${API_BASE_URL}/mf/${schemeCode}`);
        const data = await response.json();
        
        if (data && data.status === 'SUCCESS') {
            displayFundData(data.meta, data.data);
            
            // Update "Add to Compare" button state
            const addToCompareBtn = document.getElementById('add-to-compare');
            if (compareFunds.some(fund => fund.meta.scheme_code === schemeCode)) {
                addToCompareBtn.textContent = 'Remove from Compare';
                addToCompareBtn.classList.remove('bg-indigo-100', 'text-indigo-700');
                addToCompareBtn.classList.add('bg-red-100', 'text-red-700');
            } else {
                addToCompareBtn.innerHTML = '<i class="fas fa-balance-scale mr-1"></i> Add to Compare';
                addToCompareBtn.classList.remove('bg-red-100', 'text-red-700');
                addToCompareBtn.classList.add('bg-indigo-100', 'text-indigo-700');
            }
        } else {
            loadingIndicator.classList.add('hidden');
            showNotification('Failed to load fund data', 'error');
        }
    } catch (error) {
        console.error('Fund data fetch error:', error);
        loadingIndicator.classList.add('hidden');
        showNotification('Failed to load fund data. Please try again.', 'error');
    }
}

// Add fund to comparison
async function addFundToCompare(schemeCode) {
    // Check if fund is already in comparison
    const existingFundIndex = compareFunds.findIndex(fund => fund.meta.scheme_code === schemeCode);
    
    if (existingFundIndex !== -1) {
        // Remove fund from comparison
        compareFunds.splice(existingFundIndex, 1);
        updateCompareUI();
        
        // Update button text
        const addToCompareBtn = document.getElementById('add-to-compare');
        addToCompareBtn.innerHTML = '<i class="fas fa-balance-scale mr-1"></i> Add to Compare';
        addToCompareBtn.classList.remove('bg-red-100', 'text-red-700');
        addToCompareBtn.classList.add('bg-indigo-100', 'text-indigo-700');
        
        showNotification('Fund removed from comparison', 'info');
        return;
    }
    
    // Check if comparison limit reached
    if (compareFunds.length >= MAX_COMPARE_FUNDS) {
        showNotification(`You can compare maximum ${MAX_COMPARE_FUNDS} funds at once`, 'error');
        return;
    }
    
    try {
        // If fund is not in comparison yet, fetch its data
        if (schemeCode === currentSchemeCode && currentNavData.length > 0) {
            // Use current fund data if already loaded
            const meta = {
                scheme_name: document.getElementById('fund-name').textContent,
                scheme_code: currentSchemeCode,
                fund_house: document.getElementById('fund-house').textContent,
                scheme_category: document.getElementById('fund-category').textContent,
                scheme_type: document.getElementById('scheme-type').textContent
            };
            
            addFundToCompareData(meta, currentNavData);
        } else {
            // Fetch fund data
            const response = await fetch(`${API_BASE_URL}/mf/${schemeCode}`);
            const data = await response.json();
            
            if (data && data.status === 'SUCCESS') {
                addFundToCompareData(data.meta, data.data);
            } else {
                showNotification('Failed to add fund to comparison', 'error');
                return;
            }
        }
        
        // Update UI
        updateCompareUI();
        
        // Update button text if current fund
        if (schemeCode === currentSchemeCode) {
            const addToCompareBtn = document.getElementById('add-to-compare');
            addToCompareBtn.textContent = 'Remove from Compare';
            addToCompareBtn.classList.remove('bg-indigo-100', 'text-indigo-700');
            addToCompareBtn.classList.add('bg-red-100', 'text-red-700');
        }
        
        showNotification('Fund added to comparison', 'info');
        
        // Scroll to comparison section
        document.getElementById('compare-section').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error adding fund to comparison:', error);
        showNotification('Failed to add fund to comparison', 'error');
    }
}

// Add fund data to comparison array
function addFundToCompareData(meta, navData) {
    compareFunds.push({
        meta: meta,
        data: navData
    });
    
    // Save to localStorage
    saveFundsToLocalStorage();
}

// Save comparison funds to localStorage
function saveFundsToLocalStorage() {
    const schemeCodes = compareFunds.map(fund => fund.meta.scheme_code);
    localStorage.setItem('compareFunds', JSON.stringify(schemeCodes));
}

// Update comparison UI
function updateCompareUI() {
    if (compareFunds.length === 0) {
        compareContainer.classList.add('hidden');
        compareEmptyState.classList.remove('hidden');
        return;
    }
    
    // Show comparison container, hide empty state
    compareContainer.classList.remove('hidden');
    compareEmptyState.classList.add('hidden');
    
    // Clear previous comparison cards
    compareFundsContainer.innerHTML = '';
    
    // Add fund cards
    compareFunds.forEach(fund => {
        const card = createComparisonCard(fund);
        compareFundsContainer.appendChild(card);
    });
    
    // Update comparison chart
    updateCompareChart();
    
    // Update comparison table
    updateCompareTable();
}

// Create comparison card
function createComparisonCard(fund) {
    const { meta, data } = fund;
    
    // Calculate 1-day change
    const today = parseFloat(data[0].nav);
    const yesterday = parseFloat(data[1].nav);
    const changePercent = ((today - yesterday) / yesterday * 100).toFixed(2);
    const isPositiveChange = changePercent >= 0;
    
    // Determine category class
    let categoryClass = 'bg-gray-100 text-gray-800';
    if (meta.scheme_category.includes('Equity')) {
        categoryClass = 'bg-green-100 text-green-800';
    } else if (meta.scheme_category.includes('Debt')) {
        categoryClass = 'bg-blue-100 text-blue-800';
    } else if (meta.scheme_category.includes('Hybrid')) {
        categoryClass = 'bg-purple-100 text-purple-800';
    }
    
    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow-md p-4 border border-gray-100';
    card.innerHTML = `
        <div class="flex justify-between items-start mb-3">
            <span class="${categoryClass} text-xs px-2 py-1 rounded">
                ${meta.scheme_category.split('-')[0].trim()}
            </span>
            <button class="text-gray-400 hover:text-red-500" data-remove-scheme="${meta.scheme_code}">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <h3 class="font-bold text-gray-800 mb-1">${meta.scheme_name}</h3>
        <p class="text-xs text-gray-500 mb-3">${meta.fund_house}</p>
        <div class="flex justify-between items-center">
            <span class="text-gray-900 font-medium">₹ ${data[0].nav}</span>
            <span class="${isPositiveChange ? 'text-green-600' : 'text-red-600'} text-sm">
                ${isPositiveChange ? '+' : ''}${changePercent}%
            </span>
        </div>
    `;
    
    // Add event listener for remove button
    card.querySelector(`[data-remove-scheme="${meta.scheme_code}"]`).addEventListener('click', () => {
        removeFundFromCompare(meta.scheme_code);
    });
    
    return card;
}

// Remove fund from comparison
function removeFundFromCompare(schemeCode) {
    const index = compareFunds.findIndex(fund => fund.meta.scheme_code === schemeCode);
    if (index !== -1) {
        compareFunds.splice(index, 1);
        updateCompareUI();
        
        // Update "Add to Compare" button if current fund
        if (schemeCode === currentSchemeCode) {
            const addToCompareBtn = document.getElementById('add-to-compare');
            addToCompareBtn.innerHTML = '<i class="fas fa-balance-scale mr-1"></i> Add to Compare';
            addToCompareBtn.classList.remove('bg-red-100', 'text-red-700');
            addToCompareBtn.classList.add('bg-indigo-100', 'text-indigo-700');
        }
        
        // Save to localStorage
        saveFundsToLocalStorage();
        
        showNotification('Fund removed from comparison', 'info');
    }
}

// Clear all funds from comparison
function clearComparison() {
    compareFunds = [];
    updateCompareUI();
    
    // Update "Add to Compare" button if needed
    const addToCompareBtn = document.getElementById('add-to-compare');
    addToCompareBtn.innerHTML = '<i class="fas fa-balance-scale mr-1"></i> Add to Compare';
    addToCompareBtn.classList.remove('bg-red-100', 'text-red-700');
    addToCompareBtn.classList.add('bg-indigo-100', 'text-indigo-700');
    
    // Clear localStorage
    localStorage.removeItem('compareFunds');
    
    showNotification('Comparison cleared', 'info');
}

// Update comparison chart
function updateCompareChart() {
    if (compareFunds.length === 0) return;
    
    const canvas = document.getElementById('compare-chart');
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if exists
    if (compareChart) {
        compareChart.destroy();
    }
    
    // Determine days to show based on selected period
    let daysToShow;
    switch (compareSelectedPeriod) {
        case '1m': daysToShow = 30; break;
        case '3m': daysToShow = 90; break;
        case '6m': daysToShow = 180; break;
        case '1y': daysToShow = 365; break;
        default: daysToShow = 30;
    }
    
    // Prepare datasets for each fund
    const datasets = [];
    const colors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    
    compareFunds.forEach((fund, index) => {
        // Take only needed amount of data
        const filteredData = fund.data.slice(0, Math.min(daysToShow, fund.data.length));
        
        // Prepare data
        const values = filteredData.map(item => parseFloat(item.nav)).reverse();
        
        // Get color for this dataset
        const color = colors[index % colors.length];
        
        // Normalize values for better comparison (start at 100)
        const baseValue = values[0];
        const normalizedValues = values.map(value => (value / baseValue) * 100);
        
        // Add dataset
        datasets.push({
            label: fund.meta.scheme_name,
            data: normalizedValues,
            borderColor: color,
            backgroundColor: `${color}20`, // 20 is hex for 12% opacity
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.3,
            fill: false
        });
    });
    
    // Get common labels (dates)
    const labels = compareFunds[0].data.slice(0, Math.min(daysToShow, compareFunds[0].data.length))
        .map(item => item.date).reverse();
    
    // Create chart
    compareChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        boxWidth: 12,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#334155',
                    bodyColor: '#334155',
                    borderColor: '#e2e8f0',
                    borderWidth: 1,
                    padding: 10,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw.toFixed(2)}`;
                        },
                        title: function(tooltipItems) {
                            return tooltipItems[0].label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxTicksLimit: 6
                    }
                },
                y: {
                    grid: {
                        borderDash: [2, 4],
                        color: '#e2e8f0'
                    },
                    title: {
                        display: true,
                        text: 'Normalized Value (Base 100)',
                        color: '#64748B'
                    }
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            }
        }
    });
}

// Update comparison table
function updateCompareTable() {
    // Clear table
    compareTableBody.innerHTML = '';
    
    if (compareFunds.length === 0) return;
    
    // Add row for each fund
    compareFunds.forEach(fund => {
        const { meta, data } = fund;
        const row = document.createElement('tr');
        
        // Calculate returns for different periods
        const currentNav = parseFloat(data[0].nav);
        const oneDayNav = parseFloat(data[1].nav);
        const oneMonthNav = findNavAtPeriodForFund(data, 30);
        const threeMonthNav = findNavAtPeriodForFund(data, 90);
        const sixMonthNav = findNavAtPeriodForFund(data, 180);
        const oneYearNav = findNavAtPeriodForFund(data, 365);
        const threeYearNav = findNavAtPeriodForFund(data, 365 * 3);
        
        const oneDayReturn = ((currentNav - oneDayNav) / oneDayNav * 100).toFixed(2);
        const oneMonthReturn = ((currentNav - oneMonthNav) / oneMonthNav * 100).toFixed(2);
        const threeMonthReturn = ((currentNav - threeMonthNav) / threeMonthNav * 100).toFixed(2);
        const sixMonthReturn = ((currentNav - sixMonthNav) / sixMonthNav * 100).toFixed(2);
        const oneYearReturn = ((currentNav - oneYearNav) / oneYearNav * 100).toFixed(2);
        const threeYearReturn = ((currentNav - threeYearNav) / threeYearNav * 100).toFixed(2);
        
        // Helper function to create return cell
        const createReturnCell = (returnValue) => {
            const isPositive = parseFloat(returnValue) >= 0;
            return `<td class="py-3 px-4 text-right ${isPositive ? 'text-green-600' : 'text-red-600'} font-medium">
                ${isPositive ? '+' : ''}${returnValue}%
            </td>`;
        };
        
        // Create row HTML
        row.innerHTML = `
            <td class="py-3 px-4 text-left">
                <div class="font-medium text-gray-800">${meta.scheme_name}</div>
                <div class="text-xs text-gray-500">${meta.fund_house}</div>
            </td>
            <td class="py-3 px-4 text-right font-medium">₹ ${data[0].nav}</td>
            ${createReturnCell(oneDayReturn)}
            ${createReturnCell(oneMonthReturn)}
            ${createReturnCell(threeMonthReturn)}
            ${createReturnCell(sixMonthReturn)}
            ${createReturnCell(oneYearReturn)}
            ${createReturnCell(threeYearReturn)}
        `;
        
        compareTableBody.appendChild(row);
    });
}

// Helper function to find NAV at specific period for a fund
function findNavAtPeriodForFund(navData, days) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - days);
    
    // Find closest date
    for (const item of navData) {
        const itemDate = new Date(item.date.split('-').reverse().join('-'));
        if (itemDate <= targetDate) {
            return parseFloat(item.nav);
        }
    }
    return parseFloat(navData[navData.length - 1].nav);
}

// Display fund data in the UI
function displayFundData(meta, navData) {
    // Store NAV data globally
    currentNavData = navData;
    
    // Update fund information
    document.getElementById('fund-name').textContent = meta.scheme_name;
    document.getElementById('fund-category').textContent = meta.scheme_category;
    document.getElementById('fund-nav').textContent = `₹ ${navData[0].nav}`;
    
    // Calculate 1-day change
    const today = parseFloat(navData[0].nav);
    const yesterday = parseFloat(navData[1].nav);
    const changePercent = ((today - yesterday) / yesterday * 100).toFixed(2);
    const changeEl = document.getElementById('fund-change');
    
    // Clear previous classes
    changeEl.className = 'ml-2 text-sm font-medium';
    
    if (changePercent > 0) {
        changeEl.classList.add('performance-up');
        changeEl.textContent = `+${changePercent}%`;
    } else {
        changeEl.classList.add('performance-down');
        changeEl.textContent = `${changePercent}%`;
    }
    
    // Fund information
    document.getElementById('fund-house').textContent = meta.fund_house;
    document.getElementById('scheme-type').textContent = meta.scheme_type;
    document.getElementById('category').textContent = meta.scheme_category;
    
    // Additional details (these are placeholder as the API doesn't provide this info)
    document.getElementById('launch-date').textContent = "N/A";
    document.getElementById('fund-size').textContent = "N/A";
    document.getElementById('expense-ratio').textContent = "N/A";
    
    // Calculate returns for different periods
    calculateReturns(navData);
    
    // Create/update chart
    updateNavChart(navData, selectedPeriod);
    
    // Hide loading, show data
    loadingIndicator.classList.add('hidden');
    fundDataSection.classList.remove('hidden');
    fundDataSection.classList.add('fade-in');
}

// Calculate and display returns for different time periods
function calculateReturns(navData) {
    // Helper function to find NAV at specific date range
    const findNavAtPeriod = (days) => {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - days);
        
        // Find closest date
        for (const item of navData) {
            const itemDate = new Date(item.date.split('-').reverse().join('-'));
            if (itemDate <= targetDate) {
                return parseFloat(item.nav);
            }
        }
        return parseFloat(navData[navData.length - 1].nav);
    };
    
    // Current NAV
    const currentNav = parseFloat(navData[0].nav);
    
    // Calculate returns
    const oneYearNav = findNavAtPeriod(365);
    const threeYearNav = findNavAtPeriod(365 * 3);
    const fiveYearNav = findNavAtPeriod(365 * 5);
    
    const oneYearReturn = ((currentNav - oneYearNav) / oneYearNav * 100).toFixed(2);
    const threeYearReturn = ((currentNav - threeYearNav) / threeYearNav * 100).toFixed(2);
    const fiveYearReturn = ((currentNav - fiveYearNav) / fiveYearNav * 100).toFixed(2);
    
    // Display returns
    const returnsOneYear = document.getElementById('returns-1y');
    const returnsThreeYears = document.getElementById('returns-3y');
    const returnsFiveYears = document.getElementById('returns-5y');
    
    returnsOneYear.textContent = `${oneYearReturn}%`;
    returnsThreeYears.textContent = `${threeYearReturn}%`;
    returnsFiveYears.textContent = `${fiveYearReturn}%`;
    
    // Clear previous classes
    returnsOneYear.className = 'text-xl font-bold';
    returnsThreeYears.className = 'text-xl font-bold';
    returnsFiveYears.className = 'text-xl font-bold';
    
    // Add color classes
    returnsOneYear.classList.add(oneYearReturn >= 0 ? 'performance-up' : 'performance-down');
    returnsThreeYears.classList.add(threeYearReturn >= 0 ? 'performance-up' : 'performance-down');
    returnsFiveYears.classList.add(fiveYearReturn >= 0 ? 'performance-up' : 'performance-down');
}

// Update NAV chart with given data and time period
function updateNavChart(navData, period) {
    const canvas = document.getElementById('nav-chart');
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if exists
    if (fundChart) {
        fundChart.destroy();
    }
    
    // Filter data according to selected time period
    let daysToShow;
    switch (period) {
        case '1m': daysToShow = 30; break;
        case '3m': daysToShow = 90; break;
        case '6m': daysToShow = 180; break;
        case '1y': daysToShow = 365; break;
        case '3y': daysToShow = 365 * 3; break;
        case '5y': daysToShow = 365 * 5; break;
        default: daysToShow = 30;
    }
    
    // Take only needed amount of data
    const filteredData = navData.slice(0, Math.min(daysToShow, navData.length));
    
    // Prepare data for Chart.js
    const labels = filteredData.map(item => item.date).reverse();
    const values = filteredData.map(item => parseFloat(item.nav)).reverse();
    
    // Determine chart color based on trend
    const startValue = values[0];
    const endValue = values[values.length - 1];
    const isPositiveTrend = endValue >= startValue;
    const chartColor = isPositiveTrend ? 'rgba(16, 185, 129, 1)' : 'rgba(239, 68, 68, 1)';
    const chartBgColor = isPositiveTrend ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
    
    // Create chart
    fundChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'NAV',
                data: values,
                borderColor: chartColor,
                backgroundColor: chartBgColor,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 4,
                pointHoverBackgroundColor: chartColor,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#334155',
                    bodyColor: '#334155',
                    borderColor: '#e2e8f0',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `₹ ${context.raw}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxTicksLimit: 6,
                        maxRotation: 0
                    }
                },
                y: {
                    grid: {
                        borderDash: [2, 4],
                        color: '#e2e8f0'
                    },
                    ticks: {
                        callback: function(value) {
                            return '₹ ' + value;
                        }
                    }
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            }
        }
    });
}

// Show a notification message
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg max-w-xs z-50 ${
        type === 'error' ? 'bg-red-50 text-red-700 border-l-4 border-red-500' : 
        'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-500'
    } slide-up`;
    
    notification.innerHTML = `
        <div class="flex items-center">
            <div class="mr-3">
                <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            </div>
            <div>${message}</div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        notification.style.transition = 'opacity 0.5s, transform 0.5s';
        
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 4000);
}

// Load top performing funds
async function loadTopPerformingFunds() {
    // This is a placeholder function since the API doesn't provide a direct way
    // to get top performing funds. In a real application, you might call a specific
    // endpoint for this data.
    
    // Default fund codes (these are just examples)
    const topFundCodes = [
        '119551', // Example fund 1 (HDFC)
        '120123', // Example fund 2 (ICICI) 
        '120486', // Example fund 3 (SBI)
        '118834', // Example fund 4 
        '119589', // Example fund 5
        '125354'  // Example fund 6
    ];
    
    // We could fetch each fund's data and display cards, but for now
    // we're using the preset cards in the HTML.
    
    // For a real app you would do:
    /*
    try {
        // Clear existing cards
        topFundsContainer.innerHTML = '';
        
        // Fetch and create cards for each top fund
        for (const code of topFundCodes) {
            const response = await fetch(`${API_BASE_URL}/mf/${code}`);
            const data = await response.json();
            
            if (data && data.status === 'SUCCESS') {
                createFundCard(data.meta, data.data, topFundsContainer);
            }
        }
    } catch (error) {
        console.error('Error loading top funds:', error);
    }
    */
}

// Create a fund card for the top funds section
function createFundCard(meta, navData, container) {
    // Calculate 1-year return
    const currentNav = parseFloat(navData[0].nav);
    let oneYearNav = currentNav;
    
    // Find NAV approximately 1 year ago
    for (const item of navData) {
        const itemDate = new Date(item.date.split('-').reverse().join('-'));
        const yearAgo = new Date();
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        
        if (itemDate <= yearAgo) {
            oneYearNav = parseFloat(item.nav);
            break;
        }
    }
    
    const yearReturn = ((currentNav - oneYearNav) / oneYearNav * 100).toFixed(2);
    const isPositiveReturn = yearReturn >= 0;
    
    // Create card element
    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow-md hover:shadow-lg transition p-5 hover-scale';
    
    // Determine category class
    let categoryClass = 'bg-gray-100 text-gray-800';
    if (meta.scheme_category.includes('Equity')) {
        categoryClass = 'bg-green-100 text-green-800';
    } else if (meta.scheme_category.includes('Debt')) {
        categoryClass = 'bg-blue-100 text-blue-800';
    } else if (meta.scheme_category.includes('Hybrid')) {
        categoryClass = 'bg-purple-100 text-purple-800';
    }
    
    // Set card content
    card.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <span class="${categoryClass} text-xs px-2 py-1 rounded">
                ${meta.scheme_category.split('-')[0].trim()}
            </span>
            <span class="${isPositiveReturn ? 'text-green-600' : 'text-red-600'} font-medium">
                ${isPositiveReturn ? '+' : ''}${yearReturn}%
            </span>
        </div>
        <h3 class="font-bold text-lg mb-2">${meta.scheme_name}</h3>
        <p class="text-gray-600 text-sm mb-4">${meta.fund_house}</p>
        <div class="flex justify-between items-center">
            <span class="text-gray-900 font-bold">₹ ${navData[0].nav}</span>
            <button class="text-indigo-600 hover:text-indigo-800 text-sm font-medium" data-scheme-code="${meta.scheme_code}">
                View Details
            </button>
        </div>
    `;
    
    // Add card to container
    container.appendChild(card);
} 