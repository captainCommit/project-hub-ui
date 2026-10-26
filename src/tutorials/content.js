// Help Center tutorials: the six Getting Started lessons and the Tutorial Library.
// Each step's image is a screenshot under public/tutorials/<image>.webp. They are taken from a demo account
// (Northwind Logistics) by scripts/tutorials; retake them there when a screen changes.

/** @typedef {{ title: string, body: string, image: string, tip?: string }} TutorialStep */
/** @typedef {{ id: string, title: string, summary: string, minutes: number, steps: TutorialStep[] }} Tutorial */

export const imageUrl = (image) => `/tutorials/${image}.webp`;

/** @type {(Tutorial & { number: number, icon: string })[]} */
export const LESSONS = [
  {
    id: 'welcome',
    number: 1,
    icon: 'Compass',
    title: 'Welcome to Row',
    summary: 'Explore the workspace and navigation',
    minutes: 4,
    steps: [
      {
        title: 'Start on Home',
        image: 'welcome/home',
        body: 'Home is your own workspace. The counters at the top show tasks to complete, overdue work, what is due this week and your active projects. My Priorities lists your open tasks and RAID items by due date: tick the circle to finish one. My Projects shows how the projects you work on are doing, and Recent Activity shows the latest changes.',
      },
      {
        title: 'Find your way with the sidebar',
        image: 'welcome/sidebar',
        body: 'Portfolios, Programs and Projects sit at the top. Delivery holds Requirements, Testing and Sprints; Controls holds RAID, Governance and Resources. Below them are Templates, Ask Compass (the AI assistant, when AI is turned on for your account) and this Help Center. The button next to the logo collapses the sidebar.',
      },
      {
        title: 'Search everything',
        image: 'welcome/search',
        body: 'Start typing in the search box at the top of Home. Projects, risks, issues, decisions, people and more appear as you type; pick one to open it.',
      },
      {
        title: 'Create from Home',
        image: 'welcome/create',
        body: 'The Create button adds a project, risk, issue or decision without leaving Home.',
      },
      {
        title: 'Check your notifications',
        image: 'welcome/bell',
        body: 'The bell collects work assigned to you, approvals waiting on you, mentions and escalations. Click one to open it, use Mark all as read, or remove the ones you are done with.',
      },
      {
        title: 'Your profile and account',
        image: 'welcome/profile',
        body: 'Click your name at the bottom of the sidebar to open Account. Add a photo and your title so teammates recognise you. The tabs along the top hold your email notifications and connected apps, and for account owners: users, billing, the AI assistant and settings.',
      },
    ],
  },
  {
    id: 'structure',
    number: 2,
    icon: 'Network',
    title: "Understand Row's Structure",
    summary: 'Portfolios, programs, and projects',
    minutes: 5,
    steps: [
      {
        title: 'Three levels of work',
        image: 'structure/portfolios',
        body: 'Work is organised in three levels: a portfolio holds programs, and a program holds projects. The Portfolio Directory lists every portfolio with its health, status, completion and owner. Click a row to open one.',
      },
      {
        title: 'Inside a portfolio',
        image: 'structure/portfolio',
        body: 'A portfolio opens with its status, health, number of programs and projects, and overall completion. Programs & Projects lists each program with its projects, dates and managers. Export and Reports are at the top right; the star adds it to your favorites.',
      },
      {
        title: 'Timeline, risks and people',
        image: 'structure/portfolio-timeline',
        body: 'Scroll down for the portfolio timeline (every project against today), the top risks and issues, resource utilization and the budget forecast.',
      },
      {
        title: 'Programs',
        image: 'structure/program',
        body: 'A program page works the same way: its projects with status, dates and project manager, a timeline, and its top risks and issues. Open the Program Directory from the sidebar to see every program.',
      },
      {
        title: 'Projects',
        image: 'structure/projects',
        body: 'The Project Directory shows every project with health, status, completion, task counts and project manager. Use the page filters to narrow it down, and click a row to open the project.',
      },
      {
        title: 'Choose what you are viewing',
        image: 'structure/scope',
        body: 'The Viewing bar at the top of module pages decides which part of the account you see. Pick a portfolio, program or project and every module shows only that part, even as you move between pages.',
      },
      {
        title: 'Page filters narrow further',
        image: 'structure/scoped',
        body: 'Here the view is set to Digital Transformation 2026, so RAID only lists its risks. The page filters (search, project, status, priority, person) narrow inside that choice and never change it. Press Reset next to Viewing to see everything again.',
      },
    ],
  },
  {
    id: 'first-project',
    number: 3,
    icon: 'FolderPlus',
    title: 'Create Your First Project',
    summary: 'Set up a project and key milestones',
    minutes: 5,
    steps: [
      {
        title: 'Start a new project',
        image: 'first-project/new-button',
        body: 'Open Projects in the sidebar and click New Project. You can also use Create > Project on Home.',
      },
      {
        title: 'Fill in the basics',
        image: 'first-project/dialog',
        body: 'Give the project a name and description, then choose its status and color. Template decides the columns it starts with, and Open in picks the view it opens in. Choose the program it belongs to, the project manager, an optional budget, and the start and end dates. Click Create Project and it opens straight away.',
      },
      {
        title: 'Get to know the project page',
        image: 'first-project/page',
        body: 'Switch between Sheet, Gantt, Board and Audit at the top left. The header shows status, progress, project manager and open risks and issues; Details shows the program, portfolio, dates and description. The pencil renames the project and the gear opens its settings.',
      },
      {
        title: 'Add tasks and milestones',
        image: 'plan/sheet',
        body: 'Type a task name in the empty row at the bottom of the sheet and press Enter. Key milestones are tasks too: show the Type column from Columns and set it to Milestone. Give them a finish date so they appear on Home and in the portfolio timeline.',
      },
      {
        title: 'Bring your team in',
        image: 'first-project/people',
        body: 'People shows who can open the project. Add someone from the account, choose Member or Viewer, and pick what they can see and edit, module by module. Account owners always see everything, and access on a portfolio or program covers every project inside it.',
      },
      {
        title: 'Keep it close',
        image: 'first-project/favorite',
        body: 'Click the star next to the project name to add it to Favorites on Home.',
      },
    ],
  },
  {
    id: 'plan-track',
    number: 4,
    icon: 'CalendarCheck',
    title: 'Plan & Track Work',
    summary: 'Tasks, schedules, and progress',
    minutes: 7,
    steps: [
      {
        title: 'Plan in the sheet',
        image: 'plan/sheet',
        body: 'The sheet works like a spreadsheet. Work packages group tasks: click the arrow to expand one. Edit status, owner, start, finish and % complete right in the cells, and add a task in the empty row at the bottom.',
      },
      {
        title: 'Shape the plan',
        image: 'plan/toolbar',
        body: 'Indent moves a task under the one above it and Outdent moves it back out. Columns shows the hidden ones: type, priority, duration, predecessors, planned resources, attachments and related records. Focus mode gives the sheet the whole screen.',
      },
      {
        title: 'See the schedule on the Gantt',
        image: 'plan/gantt',
        body: 'The Gantt draws each task as a bar against the calendar, with a line for today. Turn on Critical Path to highlight the tasks that drive the end date, filter by task type, or export the chart.',
      },
      {
        title: 'Move work on the Board',
        image: 'plan/board',
        body: 'The Board shows a card per task in a column per status. Drag a card to another column to change its status. Hide empty columns tidies the board.',
      },
      {
        title: 'Open a task for details',
        image: 'plan/task-detail',
        body: 'Click a card to see everything about the task: status, priority, type, sprint, who is assigned and their planned hours, dates, story points and progress. Post updates at the bottom, @mention teammates and attach files.',
      },
      {
        title: 'Import a plan',
        image: 'plan/import',
        body: 'Import adds tasks from a CSV file. Download the template, fill in a row per task (put a parent task name in Parent to nest it), and choose the file. Nothing is imported until every row is valid.',
      },
      {
        title: 'Export and share',
        image: 'plan/export',
        body: 'Export saves the plan to Excel (CSV) or PowerPoint for steering meetings.',
      },
      {
        title: 'See what changed',
        image: 'plan/audit',
        body: 'Audit lists every change to the project and its records: what changed, who changed it and when.',
      },
    ],
  },
  {
    id: 'risks-resources',
    number: 5,
    icon: 'ShieldAlert',
    title: 'Manage Risks & Resources',
    summary: 'RAID, assignments, and capacity',
    minutes: 7,
    steps: [
      {
        title: 'The RAID overview',
        image: 'raid/overview',
        body: 'RAID stands for risks, assumptions, issues and dependencies. Overview sums up all four logs; use the page filters to look at one portfolio, program or project.',
      },
      {
        title: 'Work in a log',
        image: 'raid/risks',
        body: 'Each tab is one log, listing items with their ID, project, priority, status and target date. Search by ID or title, filter the list, export it, or click New Risk.',
      },
      {
        title: 'Log a risk',
        image: 'raid/new-risk',
        body: 'Pick the project, priority and status, then describe the risk as a cause (If...) and an effect (Then...). Assign someone and set a target date.',
      },
      {
        title: 'Follow it through',
        image: 'raid/detail',
        body: 'Click a row to open the item. Update its status, owner and dates, write a mitigation plan, and discuss it in the comments.',
      },
      {
        title: 'Escalate when it needs attention',
        image: 'raid/escalate',
        body: 'Escalate sends the item to one person or a whole team with an optional note. They get a notification and an email with the details, and the item is marked Escalated.',
      },
      {
        title: 'See who is busy',
        image: 'resources/overview',
        body: 'Resources > Overview shows how many people are over or under allocated, with each person\'s allocation on the chart. Filter it to a portfolio, program, project or department.',
      },
      {
        title: 'Check capacity',
        image: 'resources/capacity',
        body: 'Capacity lists everyone with their weekly capacity, weekly allocation and the projects they are on. Anyone above 100% is over-booked. Add people with New Resource.',
      },
      {
        title: 'Plan around time off',
        image: 'resources/availability',
        body: 'Availability lists time off and flags conflicts with work the person is assigned to. Add Time Off records vacations and holidays; switch to Department to see a team at a glance.',
      },
    ],
  },
  {
    id: 'dashboards-compass',
    number: 6,
    icon: 'Sparkles',
    title: 'Dashboards & Compass',
    summary: 'Monitor progress and get AI support',
    minutes: 5,
    steps: [
      {
        title: 'Your projects at a glance',
        image: 'dashboards/home',
        body: 'My Projects on Home shows progress, health, the next milestone and the due date of every project you work on.',
      },
      {
        title: 'Delivery across projects',
        image: 'dashboards/delivery',
        body: 'Sprints > Overview totals sprints and stories across the account, then lists each program\'s projects with their sprints, dates, stories and progress.',
      },
      {
        title: 'Budget against actuals',
        image: 'resources/costs',
        body: 'Resources > Costs compares each project\'s budget with planned and actual cost per person, so you can see the remaining budget and variance.',
      },
      {
        title: 'Ask Compass',
        image: 'dashboards/compass',
        body: 'Compass is the AI assistant. Ask it about your projects, risks, issues, resources or team status in plain language, and start a New Chat for each topic.',
        tip: 'Compass is turned on per account. If Ask Compass is missing from your sidebar, AI is not on for your account yet.',
      },
      {
        title: 'Turn on AI for your account',
        image: 'ai/request',
        body: 'Account owners: open Account > Connected apps and click Request AI. Once Project Hub turns it on, Ask Compass appears in the sidebar, Reports appear on projects, programs and portfolios, and the AI assistant tab appears in Account.',
      },
      {
        title: 'Reports in one click',
        image: 'plan/reports',
        body: 'Reports on a project, program or portfolio page asks Compass to write one from the live data: a weekly status report, steering committee update, executive summary, RAID report, or what changed since a date. Preview it, then export it to PDF or PowerPoint.',
      },
      {
        title: 'Set up the assistant',
        image: 'dashboards/ai-settings',
        body: 'Once AI is on, owners choose how Compass runs under Account > AI assistant: with your own model key, or with a model Project Hub provides, and how long chats are kept.',
      },
    ],
  },
];

/** @type {{ id: string, title: string, description: string, tutorials: Tutorial[] }[]} */
export const LIBRARY = [
  {
    id: 'getting-around',
    title: 'Getting around',
    description: 'Home, search, notifications and your account.',
    tutorials: [
      {
        id: 'home-and-search',
        title: 'Home, search and notifications',
        summary: 'Your workspace, finding anything, and staying informed.',
        minutes: 3,
        steps: [LESSONS[0].steps[0], LESSONS[0].steps[2], LESSONS[0].steps[3], LESSONS[0].steps[4]],
      },
      {
        id: 'viewing-scope',
        title: 'The Viewing bar and page filters',
        summary: 'Focus every module on one portfolio, program or project.',
        minutes: 2,
        steps: [LESSONS[1].steps[5], LESSONS[1].steps[6]],
      },
      {
        id: 'profile-and-email',
        title: 'Your profile and email notifications',
        summary: 'Keep your details current and choose which emails you get.',
        minutes: 2,
        steps: [
          LESSONS[0].steps[5],
          {
            title: 'Choose your emails',
            image: 'account/notifications',
            body: 'Account > Notifications decides which notifications are also emailed to you: right away, in a daily digest, or not at all. The Home summary adds your overdue, due-today and blocked tasks to the digest. Set the time and time zone it arrives.',
          },
        ],
      },
    ],
  },
  {
    id: 'portfolios-programs',
    title: 'Portfolios & programs',
    description: 'The big picture across many projects.',
    tutorials: [
      {
        id: 'portfolios',
        title: 'Portfolios',
        summary: 'Health, timeline, risks and resources for a group of programs.',
        minutes: 3,
        steps: [LESSONS[1].steps[0], LESSONS[1].steps[1], LESSONS[1].steps[2]],
      },
      {
        id: 'programs',
        title: 'Programs',
        summary: 'Related projects managed together.',
        minutes: 2,
        steps: [
          {
            title: 'The Program Directory',
            image: 'structure/programs',
            body: 'Programs in the sidebar lists every program with its portfolio, health, status, completion and owner. Click a row to open one, or New Program to add one.',
          },
          LESSONS[1].steps[3],
        ],
      },
    ],
  },
  {
    id: 'projects',
    title: 'Projects',
    description: 'Plan, schedule and share project work.',
    tutorials: [
      {
        id: 'create-project',
        title: 'Create a project',
        summary: 'Set one up and find your way around it.',
        minutes: 3,
        steps: [LESSONS[2].steps[0], LESSONS[2].steps[1], LESSONS[2].steps[2], LESSONS[2].steps[5]],
      },
      {
        id: 'project-sheet',
        title: 'The project sheet',
        summary: 'Build and update the plan like a spreadsheet.',
        minutes: 3,
        steps: [LESSONS[3].steps[0], LESSONS[3].steps[1], LESSONS[2].steps[3]],
      },
      {
        id: 'gantt-and-board',
        title: 'Gantt, Board and task details',
        summary: 'See the schedule, move work along, and open any task.',
        minutes: 3,
        steps: [LESSONS[3].steps[2], LESSONS[3].steps[3], LESSONS[3].steps[4]],
      },
      {
        id: 'import-export',
        title: 'Import and export',
        summary: 'Bring a plan in from a spreadsheet, or take it out.',
        minutes: 2,
        steps: [LESSONS[3].steps[5], LESSONS[3].steps[6]],
      },
      {
        id: 'audit-and-reports',
        title: 'Audit trail and reports',
        summary: 'Every change on record, and status reports on demand.',
        minutes: 2,
        steps: [LESSONS[3].steps[7], LESSONS[5].steps[5]],
      },
      {
        id: 'sharing',
        title: 'Share a project',
        summary: 'Who can see and edit what.',
        minutes: 2,
        steps: [LESSONS[2].steps[4]],
      },
      {
        id: 'templates',
        title: 'Project templates',
        summary: 'Start projects with the columns you always use.',
        minutes: 2,
        steps: [
          {
            title: 'Your templates',
            image: 'templates/list',
            body: 'Templates in the sidebar lists the templates new projects can start from. The Standard Project Template comes with every account; Create Template saves your own.',
          },
          {
            title: 'Arrange a template',
            image: 'templates/view',
            body: 'View Template shows its columns. Drag a column header to reorder it and click Save Order. New projects choose a template in the New Project form.',
          },
        ],
      },
    ],
  },
  {
    id: 'delivery',
    title: 'Delivery',
    description: 'Requirements, testing and sprints.',
    tutorials: [
      {
        id: 'requirements',
        title: 'Requirements',
        summary: 'Capture what you need to build and track test coverage.',
        minutes: 2,
        steps: [
          {
            title: 'The requirements list',
            image: 'requirements/list',
            body: 'Requirements lists every requirement with its status and project. The cards at the top count total, validated and in-review requirements and how many are covered by tests.',
          },
          {
            title: 'Add a requirement',
            image: 'requirements/new',
            body: 'New Requirement opens a form: pick the project, write a title and description, set priority and status, and link the test cases that prove it.',
          },
        ],
      },
      {
        id: 'testing',
        title: 'Testing',
        summary: 'Write test cases and record results.',
        minutes: 2,
        steps: [
          {
            title: 'Test results at a glance',
            image: 'testing/list',
            body: 'Testing counts passed, failed and not-yet-run test cases, and lists each one with the requirements it covers, its result, and who implemented it and when.',
          },
          {
            title: 'Write a test case',
            image: 'testing/new',
            body: 'New Test Case opens a form for the steps, inputs and expected results. Link it to a requirement and record the result when it has been run.',
          },
        ],
      },
      {
        id: 'sprints',
        title: 'Sprints',
        summary: 'Plan sprints and track delivery.',
        minutes: 3,
        steps: [
          LESSONS[5].steps[1],
          {
            title: 'The Sprint Board',
            image: 'sprints/board',
            body: 'Sprint Board plans one project at a time: choose it at the top, step through its sprints, and drag stories between the backlog and a sprint. New Sprint adds the next one with its dates, goal and capacity.',
          },
        ],
      },
    ],
  },
  {
    id: 'controls',
    title: 'Controls',
    description: 'RAID, governance and resources.',
    tutorials: [
      {
        id: 'raid-logs',
        title: 'RAID logs',
        summary: 'Risks, assumptions, issues and dependencies.',
        minutes: 4,
        steps: [
          LESSONS[4].steps[0],
          LESSONS[4].steps[1],
          LESSONS[4].steps[2],
          {
            title: 'Issues',
            image: 'raid/issues',
            body: 'Issues are problems happening now. Each one has a priority, status, owner and target date.',
          },
          {
            title: 'Assumptions',
            image: 'raid/assumptions',
            body: 'Assumptions record what the plan takes for granted, so they can be checked and marked validated or invalidated.',
          },
          {
            title: 'Dependencies',
            image: 'raid/dependencies',
            body: 'Dependencies track what the project needs from others, with the impact of a delay and a fallback plan.',
          },
        ],
      },
      {
        id: 'escalations',
        title: 'Escalate a RAID item',
        summary: 'Get the right people on it, fast.',
        minutes: 2,
        steps: [LESSONS[4].steps[3], LESSONS[4].steps[4]],
      },
      {
        id: 'governance',
        title: 'Decisions and change requests',
        summary: 'Record decisions and control changes to scope, time and budget.',
        minutes: 3,
        steps: [
          {
            title: 'The governance overview',
            image: 'governance/overview',
            body: 'Governance > Overview counts decisions and change requests by status and lists what needs attention, such as items in review or approved changes waiting to be implemented.',
          },
          {
            title: 'The decision log',
            image: 'governance/decisions',
            body: 'Decisions lists every decision with its priority, status, who proposed it and when. New Decision records one.',
          },
          {
            title: 'Review a decision',
            image: 'governance/decision',
            body: 'Open a decision to set its status, record who approved it and when, compare the options and discuss it in the comments.',
          },
          {
            title: 'Change requests',
            image: 'governance/changes',
            body: 'Changes holds change requests the same way: propose a change, review it, approve it, and mark it implemented.',
          },
        ],
      },
      {
        id: 'resources',
        title: 'Resources, capacity and costs',
        summary: 'People, workload, time off and spend.',
        minutes: 4,
        steps: [LESSONS[4].steps[5], LESSONS[4].steps[6], LESSONS[4].steps[7], LESSONS[5].steps[2]],
      },
    ],
  },
  {
    id: 'account-admin',
    title: 'Account & admin',
    description: 'For account owners: people, billing, apps and settings.',
    tutorials: [
      {
        id: 'users-access',
        title: 'Users and access',
        summary: 'Invite people and decide what they can do.',
        minutes: 3,
        steps: [
          {
            title: 'Add people',
            image: 'account/users',
            body: 'Account > Users adds people by email, or many at once with Import CSV. Owners see everything; managers, members and viewers see only what they are added to. Access sets exactly which portfolios, programs and projects each person can open.',
          },
          LESSONS[2].steps[4],
        ],
      },
      {
        id: 'billing-apps',
        title: 'Billing and connected apps',
        summary: 'Your plan, seats, and the tools Row works with.',
        minutes: 2,
        steps: [
          {
            title: 'Billing',
            image: 'account/billing',
            body: 'Account > Billing shows how many full and viewer seats the account uses and what that costs each month. Invited people are not billed until they sign in.',
          },
          {
            title: 'Connected apps',
            image: 'account/connected',
            body: 'Connected apps links your own calendar and chat. Owners also connect the account to Slack and Microsoft 365 here.',
          },
        ],
      },
      {
        id: 'ai-assistant',
        title: 'The AI assistant',
        summary: 'Ask Compass questions and generate reports.',
        minutes: 2,
        steps: [LESSONS[5].steps[4], LESSONS[5].steps[3], LESSONS[5].steps[5], LESSONS[5].steps[6]],
      },
      {
        id: 'settings',
        title: 'Account settings',
        summary: 'Appearance, dates, defaults and working days.',
        minutes: 2,
        steps: [
          {
            title: 'Settings',
            image: 'account/settings',
            body: 'Account > Settings sets light or dark screens, the date format, which view projects open in, and the working week and non-working dates used to schedule tasks.',
          },
        ],
      },
    ],
  },
  {
    id: 'help',
    title: 'Getting help',
    description: 'Support tickets and guided tours.',
    tutorials: [
      {
        id: 'contact-support',
        title: 'Contact support',
        summary: 'Send a request and follow it to an answer.',
        minutes: 2,
        steps: [
          {
            title: 'Open a request',
            image: 'help/contact',
            body: 'In the Help Center, Contact Support opens a form: choose a category and priority, describe what happened and attach a screenshot if it helps. Answers arrive by email and in My Requests, where you can reply.',
          },
          {
            title: 'Replay the tours',
            image: 'help/home',
            body: 'Every page has a short tour the first time you open it. Show tours again brings them all back.',
          },
        ],
      },
    ],
  },
];

export const ALL_TUTORIALS = [
  ...LESSONS.map(l => ({ ...l, kind: 'lesson' })),
  ...LIBRARY.flatMap(g => g.tutorials.map(t => ({ ...t, kind: 'library', group: g.title }))),
];

export const findTutorial = (id) => ALL_TUTORIALS.find(t => t.id === id) || null;
