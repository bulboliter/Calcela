(function() {
    'use strict';

    // Domain Lock Configuration
    const ALLOWED_DOMAINS = [
        'calcela.com',
        'www.calcela.com',
        'calcela.pages.dev' // Keep localhost for local development
    ];
    
    // Get current domain
    const currentDomain = window.location.hostname.toLowerCase();
    const currentProtocol = window.location.protocol;
    
    // Check if domain is authorized
    const isDomainAuthorized = ALLOWED_DOMAINS.some(domain => {
        return currentDomain === domain || currentDomain.endsWith('.' + domain);
    });
    
    // Additional security checks
    const isSecureContext = window.isSecureContext;
    const isTopFrame = window.top === window.self;
    
    // Verify domain authorization
    if (!isDomainAuthorized) {
        console.error('Unauthorized domain access detected on:', currentDomain);
        // This will clear the page, preventing the rest of the site from loading or functioning.
        document.body.innerHTML = '<h1 style="font-family: sans-serif; text-align: center; padding: 40px;">Unauthorized Host</h1>';
        // This stops this script's execution. The browser may still download other scripts,
        // but they will fail because the HTML body has been wiped out.
        return; 
    }
    
    // Optional: Check for HTTPS (recommended for production)
    if (currentProtocol !== 'https:' && currentDomain !== 'localhost') {
        console.warn('Insecure connection detected. HTTPS is recommended.');
    }
    
    // Optional: Prevent iframe embedding from unauthorized domains
    if (!isTopFrame) {
        try {
            const parentDomain = window.parent.location.hostname.toLowerCase();
            const isParentAuthorized = ALLOWED_DOMAINS.some(domain => {
                return parentDomain === domain || parentDomain.endsWith('.' + domain);
            });
            
            if (!isParentAuthorized) {
                console.error('Unauthorized iframe embedding detected');
                document.body.innerHTML = ''; // Prevent embedding
                return;
            }
        } catch (e) {
            // Cross-origin iframe - block execution
            console.error('Cross-origin iframe detected');
            document.body.innerHTML = ''; // Prevent embedding
            return;
        }
    }
})();
