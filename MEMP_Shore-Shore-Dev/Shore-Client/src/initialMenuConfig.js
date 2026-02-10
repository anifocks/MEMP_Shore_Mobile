export const initialMenuConfig = [
	{
		// FIX: Using 'about-us' ID to resolve routing error if your MainLayout expects this.
		id: 'about-us', 
		name: 'Admin Page',
		route: '/app/menu/about-us',
		backgroundImage: '/menu-backgrounds/admin-console.jpg',
		hasSubmenu: true,
		// CHANGED: Set to false to hide from Main Dashboard (Moved to MEMP)
		isActive: false, 
		subItems: [
			// --- EXISTING: USER MANAGEMENT MODULE LINK ---
			{ 
				id: 'user-management', 
				name: 'User Management', 
				route: '/app/admin/users', // This routes to the new UserManagementPage
				backgroundImage: '/menu-backgrounds/User-Rights.jpg', 
				isActive: true 
			},
			// --- NEW: FLEET MANAGEMENT MODULE LINK ---
			{ 
				id: 'fleet-management', 
				name: 'Fleet Management', 
				route: '/app/admin/fleets', // This routes to the new FleetManagementPage
				backgroundImage: '/menu-backgrounds/Fleet.jpg', // Ensure this file exists in public/menu-backgrounds
				isActive: true 
			},
			// ----------------------------------------
			{ id: 'team', name: 'Team', route: '/app/team', backgroundImage: '/menu-backgrounds/team.jpg', isActive: true },
		],
	},
	/* // --- END OF CORRECTED MEMP SECTION ---
	{
		id: 'services',
		name: 'Services',
		route: '/app/menu/services',
		backgroundImage: '/menu-backgrounds/services-main.jpg',
		hasSubmenu: true,
		isActive: true,
		subItems: [
			{ id: 'veems-link', name: 'VEEMS', route: 'https://veems.co/veemsoffice/Login.aspx', type: 'external', backgroundImage: '/menu-backgrounds/veems.jpg', isActive: true },
			{
				id: 'svms', name: 'SVMS', route: '/app/menu/svms', backgroundImage: '/menu-backgrounds/svms-main.jpg', hasSubmenu: true, isActive: true,
				subItems: [
					{ id: 'svms-web-link', name: 'Web App', route: 'https://offshorev2.veems.co/login', type: 'external', backgroundImage: '/menu-backgrounds/svms-web.jpg', isActive: true },
					{ id: 'svms-mobile', name: 'Mobile App Info', route: '/app/services/svms/mobile-info', backgroundImage: '/menu-backgrounds/svms-mobile.jpg', isActive: true },
					{ id: 'svms-status', name: 'App Status', route: '/app/services/svms/status-page', backgroundImage: '/menu-backgrounds/svms-status.jpg', isActive: true },
				],
			},
			{
				id: 'logbooks', name: 'Log Books', route: '/app/menu/logbooks', backgroundImage: '/menu-backgrounds/logbooks-main.jpg', hasSubmenu: true, isActive: true,
				subItems: [
					{ id: 'elog', name: 'ELog Info', route: '/app/services/logbooks/elog-info', backgroundImage: '/menu-backgrounds/elog.jpg', isActive: true },
					{ id: 'vlog360', name: 'VLOG 360 Info', route: '/app/services/logbooks/vlog360-info', backgroundImage: '/menu-backgrounds/vlog360.jpg', isActive: true },
					{ id: 'logbook-status', name: 'Log Book Status', route: '/app/services/logbooks/status-page', backgroundImage: '/menu-backgrounds/logbook-status.jpg', isActive: true },
				],
			},
		],
	},
	{ id: 'clients', name: 'Clients', route: '/app/clients-page', backgroundImage: '/menu-backgrounds/clients.jpg', isActive: true },
	{ id: 'investors', name: 'Investors', route: '/app/investors-page', backgroundImage: '/menu-backgrounds/investors.jpg', isActive: true },
	{ id: 'pricing', name: 'Pricing', route: '/app/pricing-page', backgroundImage: '/menu-backgrounds/pricing.jpg', isActive: true },
	{ id: 'training', name: 'Training', route: '/app/training-page', backgroundImage: '/menu-backgrounds/training.jpg', isActive: true },
	{ id: 'contact', name: 'Contact Us', route: '/app/contact-page', backgroundImage: '/menu-backgrounds/contact-us.jpg', isActive: true },
*/
	// --- CORRECTED MEMP SECTION ---
	{
		id: 'memp',
		name: 'MEMP',
		route: '/app/memp', 
		backgroundImage: '/menu-backgrounds/memp-main-bg.jpg', 
		hasSubmenu: true, 
		isActive: true,
		subItems: [
			{ id: 'vessel-info', name: 'Vessel Details', route: '/app/memp', backgroundImage: '/menu-backgrounds/vessel-info.jpg', isActive: true },
			{ id: 'vessel-details-specific', name: 'Vessel Overview', route: '/app/memp/vessel-details/defaultId', backgroundImage: '/menu-backgrounds/vessel-details.jpg', isActive: true }, 
		],
	},
];