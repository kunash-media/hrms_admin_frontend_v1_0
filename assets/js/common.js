// Common JS - Global Functions & Session Management

// ========== CONFIGURATION ==========
const API_BASE_URL = 'http://localhost:8086';

// ========== UTILITY FUNCTIONS ==========

/**
 * Get base path dynamically based on current page location
 */
function getBasePath() {
    const path = window.location.pathname;

    if (path.includes('/pages/reports/')) return '../../';
    else if (path.includes('/pages/payroll/')) return '../../';
    else if (path.includes('/company-mgmt/')) return '../../';
    else if (path.includes('/pages/')) return '../';
    return './';
}

/**
 * Check if user is logged in
 */
function isUserLoggedIn() {
    const isLoggedIn = localStorage.getItem('hrms_logged_in') === 'true';
    const hasSessionCookie = document.cookie.split(';').some(cookie =>
        cookie.trim().startsWith('admin_token=')
    );
    return isLoggedIn || hasSessionCookie;
}

/**
 * Redirect to login if not authenticated
 */
function checkAuthentication() {
    if (!isUserLoggedIn()) {
        console.warn('User not authenticated - Redirecting to login');
        window.location.href = '/index.html';
        return false;
    }
    return true;
}

/**
 * Get current user data from localStorage
 */
function getCurrentUser() {
    try {
        const userDataStr = localStorage.getItem('hrms_user');
        if (userDataStr) {
            return JSON.parse(userDataStr);
        }
        return null;
    } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
    }
}

/**
 * Make API request with automatic auth handling
 */
async function apiRequest(endpoint, options = {}) {
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include' // ✅ Always include cookies
    };

    const finalOptions = { ...defaultOptions, ...options };

    try {
        const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
        const response = await fetch(url, finalOptions);

        // If 401 (unauthorized), redirect to login
        if (response.status === 401) {
            console.warn('Unauthorized - Redirecting to login');
            localStorage.clear();
            window.location.href = '/index.html';
            return null;
        }

        return response;
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}

// ========== SIDEBAR & HEADER LOADING ==========

/**
 * Load sidebar from includes folder
 */
function loadSidebar() {
    const basePath = getBasePath();
    const sidebarPath = basePath + 'includes/sidebar.html';
    console.log('Loading sidebar from:', sidebarPath);

    fetch(sidebarPath)
        .then(response => {
            if (!response.ok) throw new Error('Sidebar not found at: ' + sidebarPath);
            return response.text();
        })
        .then(data => {
            document.getElementById('sidebar-container').innerHTML = data;

            setTimeout(() => {

                if (typeof initSidebar === 'function') {
                    initSidebar();
                }

                updateSidebarLogo();

            }, 150);
        })
        .catch(error => {
            console.error('Error loading sidebar:', error);
            const altPaths = ['../includes/sidebar.html', './includes/sidebar.html', '/includes/sidebar.html'];
            tryAlternativePaths(altPaths, 0, 'sidebar-container', 'initSidebar');
        });
}

/**
 * Load header from includes folder
 */
function loadHeader() {
    const basePath = getBasePath();
    const headerPath = basePath + 'includes/header.html';
    console.log('Loading header from:', headerPath);

    fetch(headerPath)
        .then(response => {
            if (!response.ok) {
                throw new Error('Header not found at: ' + headerPath);
            }
            return response.text();
        })
        .then(data => {
            document.getElementById('header-container').innerHTML = data;
            setTimeout(() => {
                if (typeof initHeader === 'function') {
                    initHeader();
                }
            }, 150);
        })
        .catch(error => {
            console.error('Error loading header:', error);
            const altPaths = ['../includes/header.html', './includes/header.html', '/includes/header.html'];
            tryAlternativePaths(altPaths, 0, 'header-container', 'initHeader');
        });
}

/**
 * Try alternative paths for loading components
 */
function tryAlternativePaths(paths, index, containerId, initFunction) {
    if (index >= paths.length) {
        console.error('All paths failed for:', containerId);
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '<div class="text-red-500 p-4 text-center">Failed to load component. Please refresh the page.</div>';
        }
        return;
    }

    fetch(paths[index])
        .then(response => {
            if (!response.ok) throw new Error();
            return response.text();
        })
        .then(data => {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = data;
                setTimeout(() => {
                    if (typeof window[initFunction] === 'function') window[initFunction]();
                }, 150);
            }
        })
        .catch(() => {
            tryAlternativePaths(paths, index + 1, containerId, initFunction);
        });
}

// ========== NOTIFICATIONS & UI ==========

/**
 * Show notification toast
 */
function showNotification(message, type = 'success') {
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300 flex items-center gap-2 text-sm`;
    toast.style.backgroundColor = colors[type];
    toast.innerHTML = `<i class="fas ${icons[type]}"></i><span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Show confirmation dialog
 */
function showConfirmDialog(message, onConfirm, onCancel) {
    const dialog = document.createElement('div');
    dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    dialog.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-sm">
            <p class="text-gray-700 mb-6">${message}</p>
            <div class="flex justify-end gap-3">
                <button id="cancel-btn" class="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50">Cancel</button>
                <button id="confirm-btn" class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Confirm</button>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);

    document.getElementById('confirm-btn').addEventListener('click', () => {
        dialog.remove();
        if (onConfirm) onConfirm();
    });

    document.getElementById('cancel-btn').addEventListener('click', () => {
        dialog.remove();
        if (onCancel) onCancel();
    });

    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            dialog.remove();
            if (onCancel) onCancel();
        }
    });
}

// ========== FORMATTING FUNCTIONS ==========

/**
 * Format date string to DD/MM/YYYY
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
}

/**
 * Format currency to INR
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0
    }).format(amount);
}

/**
 * Get current time in HH:MM format
 */
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format phone number
 */
function formatPhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
    }
    return phone;
}

// ========== MENU MANAGEMENT ==========

/**
 * Set active menu based on module name
 */
function setActiveMenu(moduleName) {
    setTimeout(() => {
        const allNavLinks = document.querySelectorAll('.nav-link');
        allNavLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-module') === moduleName) {
                link.classList.add('active');
            }
        });
    }, 300);
}

/**
 * Highlight active menu item
 */
function highlightActiveMenu() {
    const currentPath = window.location.pathname;
    const links = document.querySelectorAll('a[href]');

    links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && currentPath.includes(href)) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

function updateSidebarLogo() {
    const logoUrl = localStorage.getItem('companyLogo');
    const sidebarLogo = document.getElementById('sidebarCompanyLogo');
    
    if (logoUrl && sidebarLogo) {
        // Ensure we're using the full URL
        const fullLogoUrl = logoUrl.startsWith('http') ? logoUrl : `${API_BASE_URL}${logoUrl}`;
        sidebarLogo.src = fullLogoUrl;
        sidebarLogo.style.display = 'block';
        
        // Add error handling for missing logo
        sidebarLogo.onerror = function() {
            console.warn('Logo failed to load, using default');
            this.src = '/assets/images/logo.png';
            this.style.display = 'block';
        };
    } else if (sidebarLogo) {
        // Use default logo if no company logo exists
        sidebarLogo.src = '/assets/images/logo.png';
        sidebarLogo.style.display = 'block';
    }
}

// ========== AUTO-INITIALIZATION ==========

/**
 * Initialize authentication on page load
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== Common.js Initialized ===');

    // Check if user is logged in (except on login page)
    if (!window.location.pathname.includes('index.html') && !window.location.pathname.includes('login')) {
        checkAuthentication();
    }
    // ✅ Initialize sidebar logo
    setTimeout(() => {
        updateSidebarLogo();
    }, 500);
});

// ========== EXPORTS FOR OTHER SCRIPTS ==========
window.hrmsCommon = {
    getBasePath,
    isUserLoggedIn,
    checkAuthentication,
    getCurrentUser,
    apiRequest,
    loadSidebar,
    loadHeader,
    showNotification,
    showConfirmDialog,
    formatDate,
    formatCurrency,
    getCurrentTime,
    setActiveMenu
};

// ========== EXPORT API BASE URL ==========
window.API_BASE_URL = API_BASE_URL;













// // Common JS - Global Functions & Session Management

// // ========== CONFIGURATION ==========
// const API_BASE_URL = 'http://localhost:8086';

// // ========== UTILITY FUNCTIONS ==========

// /**
//  * Get base path dynamically based on current page location
//  */
// function getBasePath() {
//     const path = window.location.pathname;
    
//     if (path.includes('/pages/reports/')) return '../../';
//     else if (path.includes('/pages/payroll/')) return '../../';
//     else if (path.includes('/company-mgmt/')) return '../../';
//     else if (path.includes('/pages/')) return '../';
//     return './';
// }

// /**
//  * Check if user is logged in
//  */
// function isUserLoggedIn() {
//     const isLoggedIn = localStorage.getItem('hrms_logged_in') === 'true';
//     const hasSessionCookie = document.cookie.split(';').some(cookie => 
//        cookie.trim().startsWith('admin_token=')
//     );
//     return isLoggedIn || hasSessionCookie;
// }

// /**
//  * Redirect to login if not authenticated
//  */
// function checkAuthentication() {
//     if (!isUserLoggedIn()) {
//         console.warn('User not authenticated - Redirecting to login');
//         window.location.href = '/index.html';
//         return false;
//     }
//     return true;
// }

// /**
//  * Get current user data from localStorage
//  */
// function getCurrentUser() {
//     try {
//         const userDataStr = localStorage.getItem('hrms_user');
//         if (userDataStr) {
//             return JSON.parse(userDataStr);
//         }
//         return null;
//     } catch (error) {
//         console.error('Error parsing user data:', error);
//         return null;
//     }
// }

// /**
//  * Make API request with automatic auth handling
//  */
// async function apiRequest(endpoint, options = {}) {
//     const defaultOptions = {
//         method: 'GET',
//         headers: {
//             'Content-Type': 'application/json'
//         },
//         credentials: 'include' // ✅ Always include cookies
//     };
    
//     const finalOptions = { ...defaultOptions, ...options };
    
//     try {
//         const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
//         const response = await fetch(url, finalOptions);
        
//         // If 401 (unauthorized), redirect to login
//         if (response.status === 401) {
//             console.warn('Unauthorized - Redirecting to login');
//             localStorage.clear();
//             window.location.href = '/index.html';
//             return null;
//         }
        
//         return response;
//     } catch (error) {
//         console.error('API request error:', error);
//         throw error;
//     }
// }

// // ========== SIDEBAR & HEADER LOADING ==========

// /**
//  * Load sidebar from includes folder
//  */
// function loadSidebar() {
//     const basePath = getBasePath();
//     const sidebarPath = basePath + 'includes/sidebar.html';
//     console.log('Loading sidebar from:', sidebarPath);
    
//     fetch(sidebarPath)
//         .then(response => {
//             if (!response.ok) throw new Error('Sidebar not found at: ' + sidebarPath);
//             return response.text();
//         })
//         .then(data => {
//             document.getElementById('sidebar-container').innerHTML = data;
//             setTimeout(() => {
//                 if (typeof initSidebar === 'function') initSidebar();
//             }, 150);
//         })
//         .catch(error => {
//             console.error('Error loading sidebar:', error);
//             const altPaths = ['../includes/sidebar.html', './includes/sidebar.html', '/includes/sidebar.html'];
//             tryAlternativePaths(altPaths, 0, 'sidebar-container', 'initSidebar');
//         });
// }

// /**
//  * Load header from includes folder
//  */
// function loadHeader() {
//     const basePath = getBasePath();
//     const headerPath = basePath + 'includes/header.html';
//     console.log('Loading header from:', headerPath);
    
//     fetch(headerPath)
//         .then(response => {
//             if (!response.ok) {
//                 throw new Error('Header not found at: ' + headerPath);
//             }
//             return response.text();
//         })
//         .then(data => {
//             document.getElementById('header-container').innerHTML = data;
//             setTimeout(() => {
//                 if (typeof initHeader === 'function') {
//                     initHeader();
//                 }
//             }, 150);
//         })
//         .catch(error => {
//             console.error('Error loading header:', error);
//             const altPaths = ['../includes/header.html', './includes/header.html', '/includes/header.html'];
//             tryAlternativePaths(altPaths, 0, 'header-container', 'initHeader');
//         });
// }

// /**
//  * Try alternative paths for loading components
//  */
// function tryAlternativePaths(paths, index, containerId, initFunction) {
//     if (index >= paths.length) {
//         console.error('All paths failed for:', containerId);
//         const container = document.getElementById(containerId);
//         if (container) {
//             container.innerHTML = '<div class="text-red-500 p-4 text-center">Failed to load component. Please refresh the page.</div>';
//         }
//         return;
//     }
    
//     fetch(paths[index])
//         .then(response => {
//             if (!response.ok) throw new Error();
//             return response.text();
//         })
//         .then(data => {
//             const container = document.getElementById(containerId);
//             if (container) {
//                 container.innerHTML = data;
//                 setTimeout(() => {
//                     if (typeof window[initFunction] === 'function') window[initFunction]();
//                 }, 150);
//             }
//         })
//         .catch(() => {
//             tryAlternativePaths(paths, index + 1, containerId, initFunction);
//         });
// }

// // ========== NOTIFICATIONS & UI ==========

// /**
//  * Show notification toast
//  */
// function showNotification(message, type = 'success') {
//     const colors = {
//         success: '#28a745',
//         error: '#dc3545',
//         warning: '#ffc107',
//         info: '#17a2b8'
//     };
    
//     const icons = {
//         success: 'fa-check-circle',
//         error: 'fa-exclamation-circle',
//         warning: 'fa-exclamation-triangle',
//         info: 'fa-info-circle'
//     };
    
//     const toast = document.createElement('div');
//     toast.className = `fixed bottom-4 right-4 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300 flex items-center gap-2 text-sm`;
//     toast.style.backgroundColor = colors[type];
//     toast.innerHTML = `<i class="fas ${icons[type]}"></i><span>${message}</span>`;
//     document.body.appendChild(toast);
    
//     setTimeout(() => {
//         toast.style.opacity = '0';
//         toast.style.transform = 'translateX(100px)';
//         setTimeout(() => toast.remove(), 300);
//     }, 3000);
// }

// /**
//  * Show confirmation dialog
//  */
// function showConfirmDialog(message, onConfirm, onCancel) {
//     const dialog = document.createElement('div');
//     dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
//     dialog.innerHTML = `
//         <div class="bg-white rounded-lg p-6 max-w-sm">
//             <p class="text-gray-700 mb-6">${message}</p>
//             <div class="flex justify-end gap-3">
//                 <button id="cancel-btn" class="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50">Cancel</button>
//                 <button id="confirm-btn" class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Confirm</button>
//             </div>
//         </div>
//     `;
    
//     document.body.appendChild(dialog);
    
//     document.getElementById('confirm-btn').addEventListener('click', () => {
//         dialog.remove();
//         if (onConfirm) onConfirm();
//     });
    
//     document.getElementById('cancel-btn').addEventListener('click', () => {
//         dialog.remove();
//         if (onCancel) onCancel();
//     });
    
//     dialog.addEventListener('click', (e) => {
//         if (e.target === dialog) {
//             dialog.remove();
//             if (onCancel) onCancel();
//         }
//     });
// }

// // ========== FORMATTING FUNCTIONS ==========

// /**
//  * Format date string to DD/MM/YYYY
//  */
// function formatDate(dateString) {
//     const date = new Date(dateString);
//     return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
// }

// /**
//  * Format currency to INR
//  */
// function formatCurrency(amount) {
//     return new Intl.NumberFormat('en-IN', {
//         style: 'currency',
//         currency: 'INR',
//         minimumFractionDigits: 0
//     }).format(amount);
// }

// /**
//  * Get current time in HH:MM format
//  */
// function getCurrentTime() {
//     const now = new Date();
//     return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
// }

// /**
//  * Format phone number
//  */
// function formatPhoneNumber(phone) {
//     const cleaned = phone.replace(/\D/g, '');
//     if (cleaned.length === 10) {
//         return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
//     }
//     return phone;
// }

// // ========== MENU MANAGEMENT ==========

// /**
//  * Set active menu based on module name
//  */
// function setActiveMenu(moduleName) {
//     setTimeout(() => {
//         const allNavLinks = document.querySelectorAll('.nav-link');
//         allNavLinks.forEach(link => {
//             link.classList.remove('active');
//             if (link.getAttribute('data-module') === moduleName) {
//                 link.classList.add('active');
//             }
//         });
//     }, 300);
// }

// /**
//  * Highlight active menu item
//  */
// function highlightActiveMenu() {
//     const currentPath = window.location.pathname;
//     const links = document.querySelectorAll('a[href]');
    
//     links.forEach(link => {
//         const href = link.getAttribute('href');
//         if (href && currentPath.includes(href)) {
//             link.classList.add('active');
//         } else {
//             link.classList.remove('active');
//         }
//     });
// }

// // ========== AUTO-INITIALIZATION ==========

// /**
//  * Initialize authentication on page load
//  */
// document.addEventListener('DOMContentLoaded', () => {
//     console.log('=== Common.js Initialized ===');
    
//     // Check if user is logged in (except on login page)
//     if (!window.location.pathname.includes('index.html') && !window.location.pathname.includes('login')) {
//         checkAuthentication();
//     }
// });

// // ========== EXPORTS FOR OTHER SCRIPTS ==========
// window.hrmsCommon = {
//     getBasePath,
//     isUserLoggedIn,
//     checkAuthentication,
//     getCurrentUser,
//     apiRequest,
//     loadSidebar,
//     loadHeader,
//     showNotification,
//     showConfirmDialog,
//     formatDate,
//     formatCurrency,
//     getCurrentTime,
//     setActiveMenu
// };

// // ========== EXPORT API BASE URL ==========
// window.API_BASE_URL = API_BASE_URL;