import json, urllib.request, urllib.error, sys
B = 'http://127.0.0.1:8044/api/v1'
def call(m, path, body=None):
    req = urllib.request.Request(B + path, method=m, data=json.dumps(body).encode() if body is not None else None,
                                 headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read(); return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        print('ERR', m, path, e.code, e.read()[:600].decode()); raise
ids = json.load(open(sys.argv[1]))
A = ids['account']; P = ids['projects']; U = ids['users']
U['Jordan Rivera'] = 'dev@example.com'
opts = {(s['entity_type'], s['name'], v['value']): v['id'] for s in call('GET', f'/accounts/{A}/options') for v in s['values']}
opt = lambda e, n, v: opts[(e, n, v)]
LIAM = "Liam O'Brien"

# People
res = {r['name']: r for r in (lambda d: d.get('items', d) if isinstance(d, dict) else d)(call('GET', f'/accounts/{A}/resources'))}
profile = {'Jordan Rivera': ('Portfolio Director', 'PMO', 120), 'Priya Shah': ('Program Manager', 'PMO', 95), 'Marcus Lee': ('Product Owner', 'Delivery', 85),
           'Aisha Khan': ('Data Lead', 'Data', 90), 'Tom Becker': ('Data Scientist', 'Data', 88), 'Elena Garcia': ('Operations Director', 'Operations', 98),
           LIAM: ('Engineering Manager', 'Engineering', 92), 'Nora Patel': ('QA Analyst', 'Quality', 70)}
for name, (role, dept, rate) in profile.items():
    call('PATCH', f'/resources/{res[name]["id"]}', {'role': role, 'department': dept, 'hourly_rate': rate})
for name, role, dept, rate in [('Sofia Rossi', 'Frontend Developer', 'Engineering', 75), ('Kevin Tan', 'Data Engineer', 'Data', 80)]:
    res[name] = call('POST', f'/accounts/{A}/resources', {'name': name, 'role': role, 'department': dept, 'hourly_rate': rate})
for name, s, e, why in [('Marcus Lee', '2026-11-02', '2026-11-06', 'Vacation'), ('Aisha Khan', '2026-11-23', '2026-11-27', 'Thanksgiving week'),
                        ('Sofia Rossi', '2026-10-28', '2026-10-30', 'Conference'), (LIAM, '2026-12-21', '2027-01-01', 'Holidays')]:
    call('POST', f'/resources/{res[name]["id"]}/time-off', {'start_date': s, 'end_date': e, 'reason': why})
ids['resources'] = {n: r['id'] for n, r in res.items()}

# Projects are active
for pid in P.values():
    call('PATCH', f'/projects/{pid}', {'status_id': opt('PROJECT', 'STATUS', 'ACTIVE')})

# Sprints
def sprint(project, name, goal, start, end, status, cap):
    return call('POST', f'/projects/{P[project]}/sprints', {'name': name, 'goal': goal, 'start_date': start, 'end_date': end, 'capacity': cap,
                                                            'status_id': opt('SPRINT', 'STATUS', status)})
for n, g, s, e, st in [('Sprint 1', 'Sign-in and account basics', '2026-09-21', '2026-10-02', 'COMPLETED'),
                        ('Sprint 2', 'Account dashboard', '2026-10-05', '2026-10-16', 'COMPLETED'),
                        ('Sprint 3', 'Orders and invoices', '2026-10-19', '2026-10-30', 'ACTIVE'),
                        ('Sprint 4', 'Notifications and support', '2026-11-02', '2026-11-13', 'PLANNED')]:
    sprint('Customer Portal Rebuild', n, g, s, e, st, 30)
for n, g, s, e, st in [('Sprint 1', 'Baseline model', '2026-10-05', '2026-10-16', 'COMPLETED'), ('Sprint 2', 'Hub-level features', '2026-10-19', '2026-10-30', 'ACTIVE')]:
    sprint('Demand Forecasting Model', n, g, s, e, st, 20)

def row(name, type_='Activity', status='Not Started', start=None, finish=None, pct=None, who=None, parent=None, sprint=None, pts=None, prio='Medium', desc=None):
    r = {'name': name, 'type': type_, 'status': status, 'priority': prio, 'start_date': start, 'finish_date': finish, 'parent': parent, 'sprint': sprint,
         'percent_complete': None if pct is None else str(pct), 'assignee': U.get(who) if who else None, 'story_points': None if pts is None else str(pts),
         'description': desc}
    return {k: v for k, v in r.items() if v is not None}
def load(project, rows):
    out = call('POST', f'/projects/{P[project]}/tasks/import', {'rows': rows})
    assert not out['errors'], out['errors']

W, M = 'Work Package', 'Milestone'
load('Customer Portal Rebuild', [
    row('Discovery', W, 'Complete', '2026-09-01', '2026-09-18', 100, 'Marcus Lee'),
    row('Stakeholder interviews', status='Complete', start='2026-09-01', finish='2026-09-09', pct=100, who='Marcus Lee', parent='Discovery'),
    row('Current-state journey map', status='Complete', start='2026-09-08', finish='2026-09-16', pct=100, who='Marcus Lee', parent='Discovery'),
    row('Requirements sign-off', M, 'Complete', '2026-09-18', '2026-09-18', 100, 'Priya Shah', 'Discovery'),
    row('Design', W, 'In Progress', '2026-09-14', '2026-11-06', 60, 'Marcus Lee'),
    row('Wireframes', status='Complete', start='2026-09-14', finish='2026-09-25', pct=100, who='Marcus Lee', parent='Design'),
    row('Visual design system', status='In Progress', start='2026-09-28', finish='2026-10-30', pct=60, who='Marcus Lee', parent='Design', prio='High'),
    row('Accessibility review', status='Not Started', start='2026-11-02', finish='2026-11-06', pct=0, who='Nora Patel', parent='Design'),
    row('Build', W, 'In Progress', '2026-09-21', '2026-11-13', 45, LIAM),
    row('Sign in with company SSO', status='Complete', who=LIAM, parent='Build', sprint='Sprint 1', pts=5, pct=100),
    row('Profile and password settings', status='Complete', who=LIAM, parent='Build', sprint='Sprint 1', pts=3, pct=100),
    row('Account dashboard', status='Complete', who=LIAM, parent='Build', sprint='Sprint 2', pts=8, pct=100),
    row('Order history page', status='In Progress', who=LIAM, parent='Build', sprint='Sprint 3', pts=8, pct=50, prio='High'),
    row('Invoice download as PDF', status='Blocked', who=LIAM, parent='Build', sprint='Sprint 3', pts=5, pct=20, prio='High',
        desc='Waiting on the finance API change (DY-101).'),
    row('Shipment tracking map', status='Not Started', who=LIAM, parent='Build', sprint='Sprint 3', pts=8),
    row('Notification preferences', parent='Build', pts=3),
    row('Live chat with support', parent='Build', pts=13, prio='Low'),
    row('Saved delivery addresses', parent='Build', pts=5),
    row('Launch', W, 'Not Started', '2026-11-16', '2027-01-29', 0, 'Marcus Lee'),
    row('User acceptance testing', status='Not Started', start='2026-11-16', finish='2026-12-11', who='Nora Patel', parent='Launch'),
    row('Go-live', M, 'Not Started', '2027-01-29', '2027-01-29', 0, 'Marcus Lee', 'Launch', prio='Critical'),
])
load('Data Center Exit', [
    row('Inventory and wave plan', W, 'Complete', '2026-06-01', '2026-07-17', 100, 'Priya Shah'),
    row('Application inventory', status='Complete', start='2026-06-01', finish='2026-06-26', pct=100, who='Priya Shah', parent='Inventory and wave plan'),
    row('Wave plan approved', M, 'Complete', '2026-07-17', '2026-07-17', 100, 'Priya Shah', 'Inventory and wave plan'),
    row('Wave 1: internal tools', W, 'Complete', '2026-07-20', '2026-09-25', 100, LIAM),
    row('Wave 2: finance systems', W, 'In Progress', '2026-09-28', '2026-12-18', 40, LIAM),
    row('Migrate general ledger', status='In Progress', start='2026-09-28', finish='2026-11-20', pct=55, who=LIAM, parent='Wave 2: finance systems', prio='High'),
    row('Migrate payroll', status='Not Started', start='2026-11-09', finish='2026-12-18', who=LIAM, parent='Wave 2: finance systems'),
    row('Wave 3: warehouse systems', W, 'Not Started', '2027-01-04', '2027-03-19', 0, LIAM),
    row('Data center lease ends', M, 'Not Started', '2027-03-31', '2027-03-31', 0, 'Priya Shah', prio='Critical'),
])
load('Enterprise Data Warehouse', [
    row('Source system analysis', status='Complete', start='2026-05-04', finish='2026-06-12', pct=100, who='Aisha Khan'),
    row('Orders and shipments model', status='Complete', start='2026-06-15', finish='2026-08-28', pct=100, who='Aisha Khan'),
    row('Finance model', status='In Progress', start='2026-08-31', finish='2026-11-13', pct=70, who='Aisha Khan'),
    row('Self-service reporting', status='Not Started', start='2026-11-16', finish='2026-12-11', who='Tom Becker'),
    row('Warehouse live', M, 'Not Started', '2026-12-18', '2026-12-18', 0, 'Aisha Khan'),
])
load('Demand Forecasting Model', [
    row('Historical data extract', status='Complete', who='Tom Becker', sprint='Sprint 1', pts=5, pct=100),
    row('Baseline weekly model', status='Complete', who='Tom Becker', sprint='Sprint 1', pts=8, pct=100),
    row('Holiday and weather features', status='In Progress', who='Tom Becker', sprint='Sprint 2', pts=8, pct=40),
    row('Hub-level accuracy report', status='Not Started', who='Tom Becker', sprint='Sprint 2', pts=5),
    row('Staffing planner hand-off', pts=5),
])
load('Robotic Picking Pilot', [
    row('Vendor selection', status='Complete', start='2026-07-06', finish='2026-08-14', pct=100, who=LIAM),
    row('Site preparation in Dayton', status='In Progress', start='2026-08-17', finish='2026-11-06', pct=65, who='Elena Garcia', prio='High'),
    row('Robot installation', status='Not Started', start='2026-11-09', finish='2027-01-15', who=LIAM),
    row('Pilot go/no-go', M, 'Not Started', '2027-02-26', '2027-02-26', 0, 'Elena Garcia'),
])
load('Fleet Telematics Rollout', [
    row('Device procurement', status='Complete', start='2026-04-06', finish='2026-05-29', pct=100, who='Elena Garcia'),
    row('Install on 400 trucks', status='In Progress', start='2026-06-01', finish='2026-10-23', pct=92, who='Elena Garcia', prio='High'),
    row('Dispatch integration', status='Blocked', start='2026-09-14', finish='2026-11-13', pct=30, who=LIAM, prio='Critical'),
    row('Driver training', status='Not Started', start='2026-11-02', finish='2026-11-20', who='Elena Garcia'),
])
# Some of Jordan's own work, so Home and My Work have something to show.
load('Data Center Exit', [
    row('Approve wave 2 budget', status='Not Started', start='2026-10-26', finish='2026-10-28', who='Jordan Rivera', prio='High'),
    row('Steering committee update', status='In Progress', start='2026-10-20', finish='2026-10-23', pct=50, who='Jordan Rivera'),
])
load('Robotic Picking Pilot', [
    row('Sign robot lease agreement', status='Not Started', start='2026-10-27', finish='2026-10-30', who='Jordan Rivera', prio='Critical'),
])
json.dump(ids, open(sys.argv[1], 'w'), indent=1)
print('ok')
