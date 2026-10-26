import json, urllib.request, urllib.error, sys
B = 'http://127.0.0.1:8044/api/v1'
def call(m, path, body=None):
    req = urllib.request.Request(B + path, method=m, data=json.dumps(body).encode() if body is not None else None,
                                 headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        print('ERR', m, path, e.code, e.read()[:400]); raise

call('PATCH', '/me', {'first_name': 'Jordan', 'last_name': 'Rivera', 'title': 'Portfolio Director', 'department': 'PMO', 'company': 'Northwind Logistics'})
acc = call('POST', '/accounts', {'name': 'Northwind Logistics', 'slug': 'northwind'})
A = acc['id']
ids = {'account': A, 'projects': {}, 'programs': {}, 'portfolios': {}}

hier = {
    'Digital Transformation 2026': ('Jordan Rivera', 'Modernise how customers and teams work with Northwind.', {
        'Cloud Migration': ('Priya Shah', [('Customer Portal Rebuild', 'Marcus Lee', 'AGILE', 420000, '2026-09-01', '2027-01-29',
                                            'Replace the 2014 customer portal with a self-service experience on the new cloud platform.'),
                                           ('Data Center Exit', 'Priya Shah', 'WATERFALL', 1150000, '2026-06-01', '2027-03-31',
                                            'Move every workload out of the Columbus data center before the lease ends.')]),
        'Data & Analytics': ('Aisha Khan', [('Enterprise Data Warehouse', 'Aisha Khan', 'WATERFALL', 680000, '2026-05-04', '2026-12-18',
                                             'One governed warehouse for orders, shipments and finance.'),
                                            ('Demand Forecasting Model', 'Tom Becker', 'AGILE', 210000, '2026-08-17', '2026-12-11',
                                             'Predict weekly shipment volumes per hub to plan staffing.')]),
    }),
    'Operational Excellence': ('Elena Garcia', 'Lower cost per shipment across our warehouses and fleet.', {
        'Warehouse Modernization': ('Elena Garcia', [('Robotic Picking Pilot', "Liam O'Brien", 'WATERFALL', 950000, '2026-07-06', '2027-02-26',
                                                      'Pilot autonomous picking robots in the Dayton hub.'),
                                                     ('Fleet Telematics Rollout', 'Elena Garcia', 'WATERFALL', 330000, '2026-04-06', '2026-11-27',
                                                      'Fit telematics to 400 trucks and feed live location into dispatch.')]),
    }),
}
for pname, (powner, pdesc, programs) in hier.items():
    port = call('POST', f'/accounts/{A}/portfolios', {'name': pname, 'owner': powner, 'description': pdesc})
    ids['portfolios'][pname] = port['id']
    for gname, (gowner, projects) in programs.items():
        prog = call('POST', f'/portfolios/{port["id"]}/programs', {'name': gname, 'owner': gowner})
        ids['programs'][gname] = prog['id']
        for (name, pm, dtype, budget, start, end, desc) in projects:
            proj = call('POST', f'/programs/{prog["id"]}/projects', {'name': name, 'project_manager': pm, 'delivery_type': dtype,
                                                                       'budget': budget, 'start_date': start, 'target_end_date': end,
                                                                       'description': desc})
            ids['projects'][name] = proj['id']

people = [
    ('Priya Shah', 'priya.shah', 'Program Manager', 'PMO', 'MANAGER', 95),
    ('Marcus Lee', 'marcus.lee', 'Product Owner', 'Delivery', 'MEMBER', 85),
    ('Aisha Khan', 'aisha.khan', 'Data Lead', 'Data', 'MEMBER', 90),
    ('Tom Becker', 'tom.becker', 'Data Scientist', 'Data', 'MEMBER', 88),
    ('Elena Garcia', 'elena.garcia', 'Operations Director', 'Operations', 'MANAGER', 98),
    ("Liam O'Brien", 'liam.obrien', 'Engineering Manager', 'Engineering', 'MEMBER', 92),
    ('Nora Patel', 'nora.patel', 'QA Analyst', 'Quality', 'MEMBER', 70),
]
ids['users'] = {}
me = call('GET', '/me')
ids['me'] = me['id']
for name, handle, role, dept, arole, rate in people:
    email = f'{handle}@northwind.example'
    body = {'email': email, 'full_name': name, 'role': arole}
    if arole == 'MEMBER':
        body['access'] = {'portfolio_id': ids['portfolios']['Digital Transformation 2026' if dept != 'Operations' and name != "Liam O'Brien" else 'Operational Excellence'],
                          'modules': ['TASKS', 'SPRINTS', 'RISKS', 'ISSUES', 'ASSUMPTIONS', 'DEPENDENCIES', 'DECISIONS', 'CHANGE_REQUESTS', 'REQUIREMENTS', 'TESTING']}
    res = call('POST', f'/accounts/{A}/users/invite', body)
    ids['users'][name] = email
json.dump(ids, open(sys.argv[1], 'w'), indent=1)
print(json.dumps(ids['projects'], indent=1))
