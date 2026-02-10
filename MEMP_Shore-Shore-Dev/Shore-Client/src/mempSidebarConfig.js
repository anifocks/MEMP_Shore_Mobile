export const mempSidebarConfig = [
  {
    id: 'memp-overview',
    name: 'Fleet Dashboard',
    route: '/app/memp',
    isActive: true,
  },
  
  {
        id: 'vessel-dashboard-parent',
        name: 'Vessel Dashboard',
        route: '/app/memp/vessel-dashboard/status', // Default to Latest Status page
        isActive: true,
        subItems: [
            { id: 'vessel-status', name: 'Latest Status', route: '/app/memp/vessel-dashboard/status', isActive: true },
            { id: 'vessel-emissions', name: 'Emissions', route: '/app/memp/vessel-dashboard/emissions', isActive: true },
            { id: 'vessel-mach-data', name: 'Machinery Data', route: '/app/memp/vessel-dashboard/machinery', isActive: true }, // Corrected typo in name
        ]
  },
{
  id: 'reporting-templates',
  name: 'Reporting Templates',
  route: '/app/memp/templates',
  isActive: true,
},

{
  id: 'compliances-dashboard-parent',
  name: 'Compliance Reports',
  route: '/app/memp/compliances',  // Main unified dashboard
  isActive: true,
  subItems: [
    {
      id: 'cii-reports',
      name: 'CII Report Details',
      route: '/app/memp/cii-report',
      isActive: true,
    },
    {
      id: 'eu-mrv-reports',
      name: 'EU MRV Data',
      route: '/app/memp/eu-mrv-report',
      isActive: true,
    },
    {
      id: 'eu-ets-reports',
      name: 'EU ETS Data',
      route: '/app/memp/eu-ets-report',
      isActive: true,
    },
    {
      id: 'uk-mrv-reports',
      name: 'UK MRV Data',
      route: '/app/memp/uk-mrv-report',
      isActive: true,
    },
    {
      id: 'uk-ets-reports',
      name: 'UK ETS Data',
      route: '/app/memp/uk-ets-report',
      isActive: true,
    },
  ]
},

  // --- NEW: MODULES GROUP ---
  {
    id: 'modules-parent',
    name: 'Modules',
    isActive: true,
    subItems: [
      {
        id: 'vessel-info',
        name: 'Vessel Details',
        route: '/app/memp/vessel-info',
        isActive: true,
      },
      {
        id: 'machinery-details',
        name: 'Machinery Details',
        route: '/app/memp/machinery',
        isActive: true,
      },
      {
        id: 'port-management',
        name: 'Port Management',
        route: '/app/memp/ports',
        isActive: true,
      },
      {
        id: 'voyage-management',
        name: 'Voyage Management',
        route: '/app/memp/voyages',
        isActive: true,
      },
      {
          id: 'bunkering-management',
          name: 'Bunkering',
          route: '/app/memp/bunkering-management',
          isActive: true,
      },
      {
        id: 'vessel-reports',
        name: 'Vessel Reports',
        route: '/app/memp/vessel-reports',
        isActive: true,
      },
      {
        id: 'additive-management', 
        name: 'Additive & Blending', 
        route: '/app/memp/additives', 
        isActive: true,
      },
      {
        id: 'excel-integration',
        name: 'Excel Integration',
        route: '/app/memp/excel-integration',
        isActive: true,
      }
    ]
  },
  // --- ADMIN CONSOLE (Existing) ---
  {
    id: 'admin-console',
    name: 'Admin Console',
    isActive: true,
    subItems: [
      {
        id: 'user-management',
        name: 'User Management',
        route: '/app/memp/admin/users',
        isActive: true,
      },
      {
        id: 'fleet-management',
        name: 'Fleet Management',
        route: '/app/memp/admin/fleets',
        isActive: true,
      },
      {
        id: 'team-management',
        name: 'Team Directory',
        route: '/app/memp/admin/team',
        isActive: true,
      },
    ]
  }
];