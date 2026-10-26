"""Builds the screenshot script for the Help Center tutorials. Usage: python capture.py <ids.json> <out.json> [only-prefix]

Each shot is a list of actions run in order (see shoot.mjs); its name is the image path under public/tutorials/.
"""
import json
import sys

ids = json.load(open(sys.argv[1]))
only = sys.argv[3] if len(sys.argv) > 3 else ''
U = 'http://localhost:5199'
P, G, F = ids['projects'], ids['programs'], ids['portfolios']
CP = P['Customer Portal Rebuild']
SCOPE_KEY = f"user_pref:{ids['me']}:global_scope:{ids['account']}"
CLEAR_SCOPE = {'eval': f"localStorage.removeItem({json.dumps(SCOPE_KEY)}); 'ok'"}


def go(path, after=5000):
    return {'go': U + path, 'after': after}


def text(t, **kw):
    return {'text': t, **kw}


def tour(name):
    return {'sel': f'[data-tour="{name}"]'}


shots = {}


def shot(name, *actions):
    shots[name] = list(actions)


# --- Lesson 1: Welcome to Row -------------------------------------------------------------------------
shot('welcome/home', go('/'))
shot('welcome/sidebar', go('/'), {'mark': tour('sidebar-nav')})
shot('welcome/search', go('/'), {'click': {'sel': 'input[placeholder="Search projects, risks, issues..."]'}},
     {'type': {'sel': 'input[placeholder="Search projects, risks, issues..."]', 'text': 'portal'}}, {'wait': 1500})
shot('welcome/create', go('/'), {'click': tour('home-create')}, {'wait': 600})
shot('welcome/bell', go('/'), {'click': {'sel': '[data-tour="home-bell"] button'}}, {'wait': 800})
shot('welcome/mywork', go('/MyWork'))
shot('welcome/profile', go('/Account'))

# --- Lesson 2: Understand Row's structure -------------------------------------------------------------
shot('structure/portfolios', go('/Projects?view=all_portfolios'), {'mark': tour('data-table')})
shot('structure/portfolio', go(f"/portfolios/{F['Digital Transformation 2026']}"))
shot('structure/portfolio-timeline', go(f"/portfolios/{F['Digital Transformation 2026']}"), {'mark': text('PORTFOLIO TIMELINE')},
     {'eval': "document.querySelector('[data-tut-mark]').scrollIntoView({block: 'start'}); 'ok'"}, {'wait': 600})
shot('structure/programs', go('/Projects?view=all_programs'), {'mark': tour('data-table')})
shot('structure/program', go(f"/programs/{G['Cloud Migration']}"))
shot('structure/projects', go('/Projects?view=all_projects'), {'mark': tour('data-table')})
shot('structure/scope', CLEAR_SCOPE, go('/RiskLog?tab=risks'), {'click': {'sel': 'button[title="Choose what every module shows"]'}}, {'wait': 700})
shot('structure/scoped', {'eval': f"localStorage.setItem({json.dumps(SCOPE_KEY)}, JSON.stringify({{portfolioId: {json.dumps(F['Digital Transformation 2026'])}, programId: null, projectId: null}})); 'ok'"},
     go('/RiskLog?tab=risks'), {'mark': tour('scope-bar')}, {'mark': tour('page-filters')})
shot('structure/reset', go('/RiskLog?tab=risks'), {'mark': text('Reset', tag='button')}, CLEAR_SCOPE)

# --- Lesson 3: Create your first project --------------------------------------------------------------
shot('first-project/new-button', CLEAR_SCOPE, go('/Projects?view=all_projects'), {'mark': text('New Project', tag='button')})
shot('first-project/dialog', go('/Projects?view=all_projects'), {'click': text('New Project', tag='button')}, {'wait': 700},
     {'type': {'sel': 'input[placeholder="Enter project name"]', 'text': 'Partner Onboarding Portal'}})
shot('first-project/page', go(f'/projects/{CP}/sheet'), {'click': text('Details', tag='button')}, {'wait': 500})
shot('first-project/people', go(f'/projects/{CP}/sheet'), {'click': text('People', tag='button')}, {'wait': 900})
shot('first-project/favorite', go(f'/projects/{CP}/sheet'), {'mark': {'sel': 'h1 ~ button', 'index': 1}})

# --- Lesson 4: Plan & track work ----------------------------------------------------------------------
EXPAND = ("(() => { for (const name of %s) { const row = [...document.querySelectorAll('tr[data-task-id]')].find(r => [...r.querySelectorAll('input')].some(i => i.value === name));"
          " const icon = row && row.querySelector('svg.lucide-chevron-right'); icon && icon.closest('button').click(); } return 'ok'; })()")
shot('plan/sheet', go(f'/projects/{CP}/sheet', 6000), {'eval': EXPAND % '["Build"]'}, {'wait': 1000},
     {'mark': {'sel': 'input[placeholder="Type a task name and press Enter"]', 'up': 'td'}})
shot('plan/toolbar', go(f'/projects/{CP}/sheet'), {'mark': text('Columns', exact=False, tag='button')}, {'mark': text('Indent', tag='button')},
     {'mark': text('Outdent', tag='button')})
shot('plan/gantt', go(f'/projects/{CP}/gantt', 6000), {'mark': text('Critical Path', tag='label,span,div')})
shot('plan/board', go(f'/projects/{CP}/board', 6000))
shot('plan/task-detail', go(f'/projects/{CP}/board', 6000), {'click': text('Order history page', tag='p,span,div,h3,h4')}, {'wait': 1500})
shot('plan/import', go(f'/projects/{CP}/sheet'), {'click': text('Import', tag='button')}, {'wait': 900})
shot('plan/export', go(f'/projects/{CP}/sheet'), {'click': text('Export', tag='button')}, {'wait': 700})
shot('plan/audit', go(f'/projects/{CP}/audit', 6000))
shot('plan/reports', go(f'/projects/{CP}/sheet'), {'click': text('Reports', tag='button')}, {'wait': 900})

# --- Lesson 5: Manage risks & resources ---------------------------------------------------------------
shot('raid/overview', go('/RiskLog'))
shot('raid/risks', go('/RiskLog?tab=risks'), {'mark': text('New Risk', tag='button')})
shot('raid/new-risk', go('/RiskLog?tab=risks'), {'click': text('New Risk', tag='button')}, {'wait': 800})
shot('raid/detail', go('/RiskLog?tab=risks'), {'click': {'sel': '[data-tour="data-table"] tbody tr'}}, {'wait': 1200}, {'mark': text('Escalate', tag='button')})
shot('raid/escalate', go('/RiskLog?tab=risks'), {'click': {'sel': '[data-tour="data-table"] tbody tr'}}, {'wait': 1200},
     {'click': text('Escalate', tag='button')}, {'wait': 800}, {'click': text('A team', tag='button')}, {'wait': 300}, {'click': text('PMO', tag='button')})
shot('raid/issues', go('/RiskLog?tab=issues'))
shot('raid/assumptions', go('/RiskLog?tab=assumptions'))
shot('raid/dependencies', go('/RiskLog?tab=dependencies'))
shot('resources/overview', go('/ResourceManagementHub'))
shot('resources/capacity', go('/ResourceManagementHub'), {'click': text('Capacity', tag='button')}, {'wait': 1500})
shot('resources/availability', go('/ResourceManagementHub'), {'click': text('Availability', tag='button')}, {'wait': 1500})
shot('resources/costs', go('/ResourceManagementHub'), {'click': text('Costs', tag='button')}, {'wait': 1500})

# --- Lesson 6: Dashboards & Compass -------------------------------------------------------------------
shot('dashboards/home', go('/'), {'mark': text('My Projects', tag='h2,h3,p,span')})
shot('dashboards/delivery', go('/SprintManagement'), {'click': text('Cloud Migration', tag='span,p,button')}, {'wait': 800})
shot('dashboards/compass', go('/AIAssistant'), {'click': text('Which projects need attention this week?', exact=False, tag='button,span,p,div')}, {'wait': 2500})
shot('dashboards/ai-settings', go('/Account?tab=ai'))

# --- Library: delivery --------------------------------------------------------------------------------
shot('requirements/list', go('/Requirements'))
shot('requirements/new', go('/Requirements'), {'click': text('New Requirement', tag='button')}, {'wait': 900})
shot('testing/list', go('/Testing'))
shot('testing/new', go('/Testing'), {'click': text('New Test Case', tag='button')}, {'wait': 900})
shot('sprints/board', go('/SprintManagement'), {'click': text('Sprint Board', tag='button')}, {'wait': 1200},
     {'click': text('Select a project', tag='button')}, {'wait': 500}, {'click': text('Customer Portal Rebuild', tag='[role=option]')}, {'wait': 2500})
# --- Library: governance ------------------------------------------------------------------------------
shot('governance/overview', go('/ChangeRegisterHub'))
shot('governance/decisions', go('/ChangeRegisterHub?tab=decisions'))
shot('governance/decision', go('/ChangeRegisterHub?tab=decisions'), {'click': text('Choose the customer support chat tool', tag='p,span,div')}, {'wait': 1500})
shot('governance/changes', go('/ChangeRegisterHub?tab=changes'))
# --- Library: templates, account, help ----------------------------------------------------------------
shot('templates/list', go('/Projects?view=templates'))
shot('templates/view', go('/Projects?view=templates'), {'click': text('View Template', tag='button')}, {'wait': 1200})
shot('account/users', go('/Account?tab=users'))
shot('account/notifications', go('/Account?tab=notifications'))
shot('account/connected', go('/Account?tab=connected'))
shot('account/billing', go('/Account?tab=billing'))
shot('account/settings', go('/Account?tab=settings'))
shot('help/home', go('/LearnSupport'), {'mark': text('Show tours again', tag='button')})
shot('help/contact', go('/LearnSupport'), {'click': text('Contact Support', tag='span')}, {'wait': 1200})
# Taken while AI is still off for the demo account (phase "off"); everything else is taken with AI on.
shot('ai/request', go('/Account?tab=connected'), {'mark': text('Request AI', tag='button')})

OFF_PHASE = {'ai/request'}
phase = only if only in ('off', 'on') else ''
actions = [go('/', 6000), CLEAR_SCOPE]
for name, acts in shots.items():
    if phase == 'off' and name not in OFF_PHASE:
        continue
    if phase == 'on' and name in OFF_PHASE:
        continue
    if only and not phase and not name.startswith(only):
        continue
    actions += [{'key': 'Escape'}, {'unmark': True}] + acts + [{'shot': name}]
json.dump(actions, open(sys.argv[2], 'w'), indent=1)
print(sum(1 for a in actions if 'shot' in a), 'shots')
