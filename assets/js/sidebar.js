// Sidebar JS - Collapsible Sidebar with Fixed Active State for Submodules

let isSidebarCollapsed = false;

function initSidebar() {
    const sidebar = document.getElementById('mainSidebar');
    const collapseBtn = document.getElementById('collapseBtn');

    // Collapse/Expand sidebar
    if (collapseBtn) {
        const newCollapseBtn = collapseBtn.cloneNode(true);
        collapseBtn.parentNode.replaceChild(newCollapseBtn, collapseBtn);

        newCollapseBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            isSidebarCollapsed = !isSidebarCollapsed;
            sidebar.classList.toggle('collapsed');
            localStorage.setItem('sidebarCollapsed', isSidebarCollapsed);
            
            // Dispatch custom event for header to listen
            const event = new CustomEvent('sidebarToggled', { detail: { collapsed: isSidebarCollapsed } });
            window.dispatchEvent(event);

            const icon = this.querySelector('i');
            if (isSidebarCollapsed) {
                icon.classList.remove('fa-chevron-left');
                icon.classList.add('fa-chevron-right');
            } else {
                icon.classList.remove('fa-chevron-right');
                icon.classList.add('fa-chevron-left');
            }
        });
    }

    // Load saved collapsed state
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState === 'true') {
        isSidebarCollapsed = true;
        sidebar.classList.add('collapsed');
        const collapseBtnElem = document.getElementById('collapseBtn');
        if (collapseBtnElem) {
            const icon = collapseBtnElem.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-chevron-left');
                icon.classList.add('fa-chevron-right');
            }
        }
        // Dispatch event to update header on load
        setTimeout(() => {
            const event = new CustomEvent('sidebarToggled', { detail: { collapsed: true } });
            window.dispatchEvent(event);
        }, 100);
    }

    // Handle submenu toggle for items that have submenus
    const submenuItems = document.querySelectorAll('.has-submenu');

    submenuItems.forEach(item => {
        const navLink = item.querySelector('.toggle-submenu');
        const submenu = item.querySelector('.submenu');

        if (navLink && submenu) {
            const newNavLink = navLink.cloneNode(true);
            navLink.parentNode.replaceChild(newNavLink, navLink);

            newNavLink.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                // Close all other submenus first
                submenuItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        const otherSubmenu = otherItem.querySelector('.submenu');
                        if (otherSubmenu) {
                            otherSubmenu.style.display = 'none';
                            otherItem.classList.remove('submenu-open');
                        }
                    }
                });

                // Toggle current submenu
                if (submenu.style.display === 'none' || submenu.style.display === '') {
                    submenu.style.display = 'block';
                    item.classList.add('submenu-open');
                } else {
                    submenu.style.display = 'none';
                    item.classList.remove('submenu-open');
                }
            });
        }
    });

    // ========== FIXED: Active menu highlighting for submodules ==========
    setTimeout(() => {
        const currentPath = window.location.pathname;
        const currentPage = currentPath.split('/').pop();
        const currentFolder = currentPath.split('/').slice(-2)[0];
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab');

        console.log('Current Path:', currentPath);
        console.log('Current Page:', currentPage);
        console.log('Current Folder:', currentFolder);
        console.log('Tab Param:', tabParam);

        // Remove all active classes from nav-links and submenu links
        document.querySelectorAll('.nav-link, .submenu a').forEach(link => {
            link.classList.remove('active');
        });

        // ========== CHECK SUBMODULES FIRST ==========
        
        // Employee Management Submodules
        // if (currentPage === 'employees.html') {
        //     // Activate parent Employee Management link
        //     const employeeLink = document.querySelector('.nav-link[data-module="employees"]');
        //     if (employeeLink) employeeLink.classList.add('active');
            
        //     // Activate specific submenu based on tab
        //     let submenuLink = null;
        //     if (tabParam === 'all' || !tabParam) submenuLink = document.querySelector('.submenu a[href*="tab=all"]');
        //     else if (tabParam === 'add') submenuLink = document.querySelector('.submenu a[href*="tab=add"]');
        //     else if (tabParam === 'documents') submenuLink = document.querySelector('.submenu a[href*="tab=documents"]');
        //     else if (tabParam === 'history') submenuLink = document.querySelector('.submenu a[href*="tab=history"]');
            
        //     if (submenuLink) submenuLink.classList.add('active');
            
        //     // Open parent submenu
        //     const parentSubmenu = document.querySelector('.has-submenu .submenu');
        //     if (parentSubmenu) {
        //         parentSubmenu.style.display = 'block';
        //         parentSubmenu.closest('.has-submenu').classList.add('submenu-open');
        //     }
        // }

        // Payroll Submodules
        if (currentPage === 'payroll.html') {
            const payrollLink = document.querySelector('.nav-link[data-module="payroll"]');
            if (payrollLink) payrollLink.classList.add('active');
            
            let submenuLink = null;
            if (tabParam === 'structure' || !tabParam) submenuLink = document.querySelector('.submenu a[href*="tab=structure"]');
            else if (tabParam === 'deductions') submenuLink = document.querySelector('.submenu a[href*="tab=deductions"]');
            else if (tabParam === 'run') submenuLink = document.querySelector('.submenu a[href*="tab=run"]');
            else if (tabParam === 'payslips') submenuLink = document.querySelector('.submenu a[href*="tab=payslips"]');
            
            if (submenuLink) submenuLink.classList.add('active');
            
            const parentSubmenu = document.querySelector('.has-submenu .submenu');
            if (parentSubmenu) {
                parentSubmenu.style.display = 'block';
                parentSubmenu.closest('.has-submenu').classList.add('submenu-open');
            }
        }

        // Reports Submodules
        if (currentPage === 'reports.html') {
            const reportsLink = document.querySelector('.nav-link[data-module="reports"]');
            if (reportsLink) reportsLink.classList.add('active');
            
            let submenuLink = null;
            if (tabParam === 'employee' || !tabParam) submenuLink = document.querySelector('.submenu a[href*="tab=employee"]');
            else if (tabParam === 'attendance') submenuLink = document.querySelector('.submenu a[href*="tab=attendance"]');
            else if (tabParam === 'leave') submenuLink = document.querySelector('.submenu a[href*="tab=leave"]');
            else if (tabParam === 'salary') submenuLink = document.querySelector('.submenu a[href*="tab=salary"]');
            
            if (submenuLink) submenuLink.classList.add('active');
            
            const parentSubmenu = document.querySelector('.has-submenu .submenu');
            if (parentSubmenu) {
                parentSubmenu.style.display = 'block';
                parentSubmenu.closest('.has-submenu').classList.add('submenu-open');
            }
        }

        // Security & Role Submodules
        if (currentPage === 'security.html') {
            const securityLink = document.querySelector('.nav-link[data-module="security"]');
            if (securityLink) securityLink.classList.add('active');
            
            let submenuLink = null;
            if (tabParam === 'roles' || !tabParam) submenuLink = document.querySelector('.submenu a[href*="tab=roles"]');
            else if (tabParam === 'permissions') submenuLink = document.querySelector('.submenu a[href*="tab=permissions"]');
            else if (tabParam === 'audit') submenuLink = document.querySelector('.submenu a[href*="tab=audit"]');
            
            if (submenuLink) submenuLink.classList.add('active');
            
            const parentSubmenu = document.querySelector('.has-submenu .submenu');
            if (parentSubmenu) {
                parentSubmenu.style.display = 'block';
                parentSubmenu.closest('.has-submenu').classList.add('submenu-open');
            }
        }

        // ========== MAIN MODULES (No Submodules) ==========
        
        // Dashboard
        if (currentPage === 'dashboard.html') {
            const dashboardLink = document.querySelector('.nav-link[data-module="dashboard"]');
            if (dashboardLink) dashboardLink.classList.add('active');
        }

        // Company Management
        if (currentFolder === 'company-mgmt' || currentPage === 'company.html') {
            const companyLink = document.querySelector('.nav-link[data-module="company"]');
            if (companyLink) companyLink.classList.add('active');
        }

        // Onboarding
        if (currentPage === 'onboarding.html') {
            const link = document.querySelector('.nav-link[data-module="onboarding"]');
            if (link) link.classList.add('active');
        }

        // Attendance
        if (currentPage === 'attendance.html') {
            const link = document.querySelector('.nav-link[data-module="attendance"]');
            if (link) link.classList.add('active');
        }

        // Leave Management
        if (currentPage === 'leave.html') {
            const link = document.querySelector('.nav-link[data-module="leave"]');
            if (link) link.classList.add('active');
        }

        // KPI / Performance
        if (currentPage === 'kpi.html') {
            const link = document.querySelector('.nav-link[data-module="kpi"]');
            if (link) link.classList.add('active');
        }

        // Workflow & Approval
        if (currentPage === 'workflow.html') {
            const link = document.querySelector('.nav-link[data-module="workflow"]');
            if (link) link.classList.add('active');
        }

        // Asset Management
        if (currentPage === 'asset.html') {
            const link = document.querySelector('.nav-link[data-module="asset"]');
            if (link) link.classList.add('active');
        }

        // Expense Management
        if (currentPage === 'expense.html') {
            const link = document.querySelector('.nav-link[data-module="expense"]');
            if (link) link.classList.add('active');
        }

        // Exit Management
        if (currentPage === 'exit.html') {
            const link = document.querySelector('.nav-link[data-module="exit"]');
            if (link) link.classList.add('active');
        }

        // Notification
        if (currentPage === 'notification.html') {
            const link = document.querySelector('.nav-link[data-module="notification"]');
            if (link) link.classList.add('active');
        }

        // Organization Structure
        if (currentPage === 'organization.html') {
            const link = document.querySelector('.nav-link[data-module="organization"]');
            if (link) link.classList.add('active');
        }

        // Fallback: Check for any matching href
        document.querySelectorAll('.submenu a').forEach(link => {
            const href = link.getAttribute('href');
            if (href && (currentPath.includes(href) || currentPage === href.split('/').pop())) {
                link.classList.add('active');
                const parentSubmenu = link.closest('.has-submenu');
                if (parentSubmenu) {
                    const submenu = parentSubmenu.querySelector('.submenu');
                    if (submenu) {
                        submenu.style.display = 'block';
                        parentSubmenu.classList.add('submenu-open');
                    }
                    // Also activate parent nav-link
                    const parentLink = parentSubmenu.querySelector('.nav-link');
                    if (parentLink) parentLink.classList.add('active');
                }
            }
        });

    }, 200);
}

// Initialize sidebar when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(() => {
        initSidebar();
    }, 150);
});