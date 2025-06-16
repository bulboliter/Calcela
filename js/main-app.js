(function() {
    'use strict';
    
    const CALCULATORS_PER_PAGE = 12;
    let currentPage = 1;
    let totalPages = 1;

    const iconMap = {
        'finance': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`,
        'ai': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>`,
        'math': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><line x1="12" y1="5" x2="12" y2="19"></line></svg>`,
        'default': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>`
    };

    function getIconForCalculator(calculator) {
        const keywords = calculator.keywords.join(' ').toLowerCase();
        if (keywords.includes('finance') || keywords.includes('interest') || keywords.includes('investment')) return iconMap.finance;
        if (keywords.includes('ai') || keywords.includes('llm') || keywords.includes('token')) return iconMap.ai;
        if (keywords.includes('math') || keywords.includes('algebra') || keywords.includes('geometry')) return iconMap.math;
        return iconMap.default;
    }

    function renderCalculators() {
        const calculatorGrid = document.getElementById('calculatorGrid');
        const pagination = document.getElementById('pagination');
        
        if (!window.calculators || window.calculators.length === 0) {
            calculatorGrid.innerHTML = '<p style="text-align: center; color: #7f8c8d;">No calculators available yet.</p>';
            pagination.classList.add('hidden');
            return;
        }

        totalPages = Math.ceil(window.calculators.length / CALCULATORS_PER_PAGE);
        pagination.classList.toggle('hidden', totalPages <= 1);

        const startIndex = (currentPage - 1) * CALCULATORS_PER_PAGE;
        const endIndex = Math.min(startIndex + CALCULATORS_PER_PAGE, window.calculators.length);
        const calculatorsToShow = window.calculators.slice(startIndex, endIndex);
        
        calculatorGrid.innerHTML = calculatorsToShow.map(calc => `
            <a href="${sanitizeHTML(calc.url)}" class="calculator-card">
                <div class="calculator-icon">${getIconForCalculator(calc)}</div>
                <h2 class="calculator-title">${sanitizeHTML(calc.title)}</h2>
                <p class="calculator-description">${sanitizeHTML(calc.description)}</p>
            </a>
        `).join('');

        updatePagination();
    }

    function updatePagination() {
        if (totalPages > 1) {
            document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
            document.getElementById('prevButton').disabled = currentPage === 1;
            document.getElementById('nextButton').disabled = currentPage === totalPages;
        }
    }

    window.changePage = function(direction) {
        const newPage = currentPage + direction;
        if (newPage >= 1 && newPage <= totalPages) {
            currentPage = newPage;
            renderCalculators();
            document.querySelector('.calculators-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    function sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

document.addEventListener('DOMContentLoaded', () => {
    if (window.calculators) {
        renderCalculators();
    } else {
        // Wait for calculators to load
        window.addEventListener('load', renderCalculators);
    }
});
    (function() {
const mainSearchInput = document.getElementById('calculatorSearch');
const mainSearchResults = document.getElementById('searchResults');
        let searchTimeout;
        let selectedIndex = -1;

        function sanitizeSearchInput(input) {
            return input.replace(/<[^>]*>/g, '').trim().substring(0, 100);
        }

        function performMainSearch(query) {
            query = sanitizeSearchInput(query);
            if (!query) {
                hideMainResults();
                return;
            }
            const lowerQuery = query.toLowerCase();
            const results = window.calculators.filter(calc => 
                calc.title.toLowerCase().includes(lowerQuery) ||
                calc.description.toLowerCase().includes(lowerQuery) ||
                calc.keywords.some(k => k.includes(lowerQuery))
            ).sort((a, b) => {
                const aTitleIndex = a.title.toLowerCase().indexOf(lowerQuery);
                const bTitleIndex = b.title.toLowerCase().indexOf(lowerQuery);
                if (aTitleIndex !== -1 && bTitleIndex === -1) return -1;
                if (aTitleIndex === -1 && bTitleIndex !== -1) return 1;
                if (aTitleIndex !== -1 && bTitleIndex !== -1) return aTitleIndex - bTitleIndex;
                return 0;
            });
            displayMainResults(results, query);
        }

        let searchCount = 0;
        let rateLimitReset = Date.now();
        function checkRateLimit() {
            const now = Date.now();
            if (now - rateLimitReset > 60000) {
                searchCount = 0;
                rateLimitReset = now;
            }
            searchCount++;
            if (searchCount > 30) {
                console.warn('Search rate limit exceeded');
                return false;
            }
            return true;
        }

        mainSearchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            if (!checkRateLimit()) return;
            searchTimeout = setTimeout(() => performMainSearch(e.target.value), 300);
        });

        function hideMainResults() {
            mainSearchResults.classList.remove('show');
            setTimeout(() => {
                mainSearchResults.innerHTML = '';
                selectedIndex = -1;
            }, 200);
        }

        function displayMainResults(results, query) {
            if (results.length === 0) {
                mainSearchResults.innerHTML = `<div class="main-search-no-results">No calculators found for "${sanitizeHTML(query)}"</div>`;
            } else {
                mainSearchResults.innerHTML = results.map((calc, index) => `
                    <a href="${sanitizeHTML(calc.url)}" class="main-search-result-item" data-index="${index}">
                        <div class="main-search-result-title">${highlightMatch(sanitizeHTML(calc.title), query)}</div>
                        <div class="main-search-result-description">${sanitizeHTML(calc.description)}</div>
                    </a>
                `).join('');
            }
            mainSearchResults.classList.add('show');
        }

        function highlightMatch(text, query) {
            if (!query.trim()) return text;
            const sanitizedQuery = sanitizeHTML(query);
            const regex = new RegExp(`(${sanitizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            return text.replace(regex, '<strong>$1</strong>');
        }

        mainSearchInput.addEventListener('focus', () => {
            if (mainSearchInput.value.trim()) performMainSearch(mainSearchInput.value);
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.main-search-container')) hideMainResults();
        });

        mainSearchInput.addEventListener('keydown', (e) => {
            const items = mainSearchResults.querySelectorAll('.main-search-result-item');
            switch(e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    if (selectedIndex < items.length - 1) {
                        selectedIndex++;
                        updateSelection(items, selectedIndex);
                    }
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    if (selectedIndex > -1) {
                        selectedIndex--;
                        updateSelection(items, selectedIndex);
                    }
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (selectedIndex > -1 && items[selectedIndex]) {
                        window.location.href = items[selectedIndex].getAttribute('href');
                    } else if (items.length > 0) {
                        window.location.href = items[0].getAttribute('href');
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    hideMainResults();
                    mainSearchInput.blur();
                    break;
            }
        });

        function updateSelection(items, index) {
            items.forEach((item, i) => {
                item.style.backgroundColor = (i === index) ? '#f8fafc' : '';
                if (i === index) item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            });
        }
    })();

    setTimeout(() => document.getElementById('mainSearchInput').focus(), 100);

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(renderCalculators, 250);
    });

    window.addEventListener('beforeunload', () => clearTimeout(resizeTimeout));
})();
