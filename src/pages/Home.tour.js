// First-time tour of Home, which is also the first page people see. Targets are data-tour names (see src/lib/tours.js).
export const HOME_TOUR = {
  id: 'home',
  steps: [
    {
      title: 'Welcome to Project Hub',
      body: 'Home is your own workspace: what needs you today, your projects, and what changed. Here is a 30-second look around.',
    },
    {
      target: 'sidebar-nav',
      title: 'Everything is in the sidebar',
      body: 'Portfolios, programs and projects at the top, then Delivery (requirements, testing, sprints) and Controls (RAID, governance, resources).',
    },
    {
      target: 'home-search',
      title: 'Search the whole account',
      body: 'Start typing a project, risk, issue or decision and jump straight to it.',
    },
    {
      target: 'home-create',
      title: 'Create from anywhere',
      body: 'Add a project, risk, issue or decision without leaving Home.',
    },
    {
      target: 'home-bell',
      title: 'Your notifications',
      body: 'Approvals waiting on you, work assigned to you, mentions and escalations land here.',
    },
    {
      target: 'home-priorities',
      title: 'My Priorities',
      body: 'Your open tasks and RAID items, sorted by when they are due. Tick them off right here.',
    },
  ],
};
