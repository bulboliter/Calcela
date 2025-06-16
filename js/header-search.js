(function() {
    'use strict';

    if (!window.calculators) {
        console.error('Calculator database not loaded. Please ensure calculators-database.js is included.');
        return;
    }

    function sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    function sanitizeSearchInput(input) {
        return input.replace(/<[^>]*>/g, '').trim().substring(0, 100);
    }

    const searchInput = document.getElementById('calculatorSearch');
    const searchResults = document.getElementById('searchResults');
    let searchTimeout;
    let selectedIndex = -1;

    function performSearch(query) {
        query = sanitizeSearchInput(query);

        if (!query.trim()) {
            hideResults();
            return;
        }

        showLoading();

        setTimeout(() => {
            const lowerQuery = query.toLowerCase();
            const results = window.calculators.filter(calc => {
                const titleMatch = calc.title.toLowerCase().includes(lowerQuery);
                const descMatch = calc.description.toLowerCase().includes(lowerQuery);
                const keywordMatch = calc.keywords.some(keyword => keyword.includes(lowerQuery));
                return titleMatch || descMatch || keywordMatch;
            });

            results.sort((a, b) => {
                const aTitle = a.title.toLowerCase().indexOf(lowerQuery);
                const bTitle = b.title.toLowerCase().indexOf(lowerQuery);
                if (aTitle !== -1 && bTitle === -1) return -1;
                if (aTitle === -1 && bTitle !== -1) return 1;
                if (aTitle !== -1 && bTitle !== -1) return aTitle - bTitle;
                return 0;
            });

            displayResults(results, query);
        }, 200);
    }

    function showLoading() {
        searchResults.innerHTML = '<div class="search-loading"><div class="search-spinner"></div></div>';
        searchResults.classList.add('show');
    }

    function hideResults() {
        searchResults.classList.remove('show');
        setTimeout(() => {
            searchResults.innerHTML = '';
            selectedIndex = -1;
        }, 200);
    }

    function displayResults(results, query) {
        if (results.length === 0) {
            searchResults.innerHTML = `
                <div class="search-no-results">
                    No calculators found for "${sanitizeHTML(query)}"
                </div>
            `;
        } else {
            searchResults.innerHTML = results.map((calc, index) => `
                <a href="${sanitizeHTML(calc.url)}" 
                   class="search-result-item" 
                   role="option" 
                   aria-selected="false"
                   data-index="${index}"
                   tabindex="-1">
                    <div class="search-result-title">${highlightMatch(sanitizeHTML(calc.title), query)}</div>
                    <div class="search-result-description">${sanitizeHTML(calc.description)}</div>
                </a>
            `).join('');
        }
        searchResults.classList.add('show');
    }

    function highlightMatch(text, query) {
        if (!query.trim()) return text;
        const sanitizedQuery = sanitizeHTML(query);
        const regex = new RegExp(`(${sanitizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<strong>$1</strong>');
    }

    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            performSearch(e.target.value);
        }, 300);
    });

    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim()) {
            performSearch(searchInput.value);
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-wrapper')) {
            hideResults();
        }
    });

    searchInput.addEventListener('keydown', (e) => {
        const items = searchResults.querySelectorAll('.search-result-item');

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
                    const url = items[selectedIndex].getAttribute('href');
                    if (url && url.startsWith('/')) {
                        window.location.href = url;
                    }
                } else if (items.length > 0) {
                    window.location.href = items[0].getAttribute('href');
                }
                break;

            case 'Escape':
                e.preventDefault();
                hideResults();
                searchInput.blur();
                break;
        }
    });

    function updateSelection(items, index) {
        items.forEach((item, i) => {
            if (i === index) {
                item.setAttribute('aria-selected', 'true');
                item.style.backgroundColor = '#f8fafc';
                item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                item.setAttribute('aria-selected', 'false');
                item.style.backgroundColor = '';
            }
        });
    }

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
        }
    });

    if ('ontouchstart' in window) {
        searchResults.addEventListener('touchstart', (e) => {
            const target = e.target.closest('.search-result-item');
            if (target) {
                target.style.backgroundColor = '#f0f4f8';
            }
        }, { passive: true });

        searchResults.addEventListener('touchend', (e) => {
            const target = e.target.closest('.search-result-item');
            if (target) {
                setTimeout(() => {
                    target.style.backgroundColor = '';
                }, 100);
            }
        }, { passive: true });
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

    const originalPerformSearch = performSearch;
    performSearch = function(query) {
        if (checkRateLimit()) {
            originalPerformSearch(query);
        }
    };

    const announcer = document.createElement('div');
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.style.position = 'absolute';
    announcer.style.left = '-10000px';
    announcer.style.width = '1px';
    announcer.style.height = '1px';
    announcer.style.overflow = 'hidden';
    document.body.appendChild(announcer);

    const originalDisplayResults = displayResults;
    displayResults = function(results, query) {
        originalDisplayResults(results, query);

        if (results.length === 0) {
            announcer.textContent = `No results found for ${query}`;
        } else {
            announcer.textContent = `${results.length} calculator${results.length > 1 ? 's' : ''} found`;
        }
    };

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (searchResults.classList.contains('show') && window.innerWidth <= 768) {
                const rect = searchInput.getBoundingClientRect();
                searchResults.style.maxWidth = `${window.innerWidth - 32}px`;
            } else {
                searchResults.style.maxWidth = '';
            }
        }, 250);
    });

    window.addEventListener('beforeunload', () => {
        clearTimeout(searchTimeout);
        clearTimeout(resizeTimeout);
    });

    document.querySelector('.brand-name').addEventListener('click', () => {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'brand_click', {
                'event_category': 'Navigation',
                'event_label': 'CALCELA Brand'
            });
        }
    });
})();