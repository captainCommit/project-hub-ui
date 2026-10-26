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
A = ids['account']; P = ids['projects']
LIAM = "Liam O'Brien"
CP, DC, EDW, DF, RP, FT = (P[n] for n in ['Customer Portal Rebuild', 'Data Center Exit', 'Enterprise Data Warehouse',
                                          'Demand Forecasting Model', 'Robotic Picking Pilot', 'Fleet Telematics Rollout'])

risks = [
    (CP, 'Finance API change slips past Sprint 3', 'Finance team is short-staffed', 'Invoice download misses the release', 'high', 'mitigating', LIAM, '2026-11-06'),
    (CP, 'Accessibility gaps found late', 'Review is scheduled after build', 'Rework before go-live', 'medium', 'open', 'Nora Patel', '2026-11-13'),
    (DC, 'Payroll cut-over overlaps year-end', 'Wave 2 runs into December', 'Payroll errors at year-end', 'critical', 'open', 'Priya Shah', '2026-11-27'),
    (DC, 'Lease extension refused', 'Landlord has a new tenant lined up', 'Hard stop on March 31', 'high', 'open', 'Jordan Rivera', '2026-12-15'),
    (EDW, 'Source data quality in finance ledger', 'Duplicate cost centers', 'Wrong margin reports', 'medium', 'mitigating', 'Aisha Khan', '2026-11-20'),
    (RP, 'Robot vendor delivery delay', 'Chip shortage at the vendor', 'Pilot starts after peak season', 'critical', 'open', 'Elena Garcia', '2026-11-30'),
    (FT, 'Driver union pushback on tracking', 'Privacy concerns', 'Rollout paused in two depots', 'high', 'open', 'Elena Garcia', '2026-11-13'),
    (DF, 'Not enough holiday history', 'Only two years of clean data', 'Forecast misses peak weeks', 'medium', 'open', 'Tom Becker', '2026-11-20'),
]
for pid, title, cause, effect, prio, status, who, date in risks:
    call('POST', f'/projects/{pid}/risks', {'title': title, 'cause': cause, 'effect': effect, 'priority': prio, 'status': status,
                                            'assigned_to_name': who, 'target_resolution_date': date})
issues = [
    (FT, 'Dispatch system rejects GPS timestamps', 'Timestamps arrive in UTC; dispatch expects local time.', 'critical', 'in_progress', LIAM, '2026-10-30'),
    (CP, 'Staging environment unstable', 'Nightly deploys fail about one night in three.', 'high', 'open', LIAM, '2026-10-29'),
    (RP, 'Floor reinforcement quote over budget', 'Quote is 18% above estimate.', 'high', 'open', 'Elena Garcia', '2026-11-06'),
    (EDW, 'Missing access to payroll source', 'Security review still pending.', 'medium', 'blocked', 'Aisha Khan', '2026-11-02'),
]
for pid, title, desc, prio, status, who, date in issues:
    call('POST', f'/projects/{pid}/issues', {'title': title, 'description': desc, 'priority': prio, 'status': status,
                                             'assigned_to_name': who, 'target_resolution_date': date})
for pid, desc, status, who, date in [
    (CP, 'Customers will sign in with their existing company SSO accounts.', 'validated', 'Marcus Lee', '2026-10-30'),
    (DC, 'The cloud landing zone is ready before wave 2 starts.', 'validated', 'Priya Shah', '2026-09-25'),
    (RP, 'Dayton hub floor can carry the robot racks without reinforcement.', 'in_review', 'Elena Garcia', '2026-11-06'),
    (DF, 'Hub managers will use a weekly forecast, not a daily one.', 'open', 'Tom Becker', '2026-11-13'),
]:
    call('POST', f'/projects/{pid}/assumptions', {'description': desc, 'status': status, 'assigned_to_name': who, 'entered_by_name': 'Jordan Rivera',
                                                  'date_entered': '2026-10-01', 'target_date': date})
for pid, title, desc, impact, fallback, prio, status, who, date in [
    (CP, 'Finance API supports invoice PDFs', 'Finance platform team adds a PDF endpoint.', 'Invoice download cannot ship.', 'Email invoices instead for launch.', 'high', 'open', 'Priya Shah', '2026-11-06'),
    (DC, 'Network team opens firewall routes for wave 2', 'New routes between cloud and branch offices.', 'Finance systems unreachable after cut-over.', 'Keep the VPN tunnel for one more month.', 'critical', 'escalated', LIAM, '2026-10-30'),
    (FT, 'Telematics vendor delivers API v2', 'v2 adds driver-hours data.', 'Hours-of-service report delayed.', 'Use the nightly file export.', 'medium', 'in_review', 'Elena Garcia', '2026-11-20'),
]:
    call('POST', f'/projects/{pid}/dependencies', {'title': title, 'description': desc, 'impact_of_delay': impact, 'fallback_plan': fallback, 'priority': prio,
                                                   'status': status, 'assigned_to_name': who, 'entered_by_name': 'Jordan Rivera', 'date_entered': '2026-10-05',
                                                   'target_date': date})

d1 = call('POST', f'/projects/{CP}/decisions', {'title': 'Choose the customer support chat tool', 'description': 'Live chat ships in Sprint 4.',
                                                'impact': 'Support team workflow and licence cost.', 'priority': 'high', 'status': 'in_review',
                                                'proposed_by_name': 'Marcus Lee', 'proposed_date': '2026-10-20'})
for i, (t, pros, cons, effort) in enumerate([('Zendesk Messaging', 'Support team already uses Zendesk', 'Higher licence cost', 'Low'),
                                             ('Intercom', 'Best mobile experience', 'New tool for the support team', 'Medium'),
                                             ('Build in-house', 'Full control', 'Takes two more sprints', 'High')]):
    call('POST', f'/decisions/{d1["id"]}/options', {'title': t, 'pros': pros, 'cons': cons, 'work_effort': effort, 'sort_order': i})
call('POST', f'/projects/{DC}/decisions', {'title': 'Move payroll in January, after year-end close', 'description': 'Avoid year-end payroll risk.',
                                           'impact': 'Wave 2 finishes three weeks later.', 'priority': 'critical', 'status': 'approved',
                                           'proposed_by_name': 'Priya Shah', 'proposed_date': '2026-10-12', 'approved_date': '2026-10-16'})
call('POST', f'/projects/{RP}/decisions', {'title': 'Pick the robot vendor', 'priority': 'high', 'status': 'approved',
                                           'proposed_by_name': LIAM, 'proposed_date': '2026-08-03', 'approved_date': '2026-08-14'})
call('POST', f'/projects/{EDW}/decisions', {'title': 'Keep finance history for seven years', 'priority': 'medium', 'status': 'draft',
                                            'proposed_by_name': 'Aisha Khan', 'proposed_date': '2026-10-22'})
for pid, title, desc, prio, status, who, date in [
    (CP, 'Add saved delivery addresses to scope', 'Top request from customer interviews.', 'medium', 'in_review', 'Marcus Lee', '2026-10-21'),
    (DC, 'Extend wave 2 by three weeks', 'Follows the payroll decision.', 'high', 'approved', 'Priya Shah', '2026-10-16'),
    (RP, 'Increase pilot budget for floor work', 'Floor reinforcement quote is over estimate.', 'high', 'open', 'Elena Garcia', '2026-10-23'),
]:
    call('POST', f'/projects/{pid}/change-requests', {'title': title, 'description': desc, 'priority': prio, 'status': status,
                                                      'proposed_by_name': who, 'proposed_date': date})

reqs = {}
for title, desc, prio, status in [
    ('Customers sign in with company SSO', 'SAML and OIDC providers.', 'critical', 'validated'),
    ('Customers see 24 months of order history', 'Filter by date and status.', 'high', 'validated'),
    ('Invoices download as PDF', 'Same layout as the printed invoice.', 'high', 'in_review'),
    ('Pages meet WCAG 2.1 AA', 'Every customer-facing page.', 'high', 'in_review'),
    ('Customers manage notification preferences', 'Email and SMS per event type.', 'medium', 'in_review'),
]:
    reqs[title] = call('POST', f'/projects/{CP}/requirements', {'title': title, 'description': desc, 'priority': prio, 'status': status,
                                                               'entered_by_name': 'Marcus Lee', 'entered_date': '2026-09-18'})['id']
for title, req, result, who, date in [
    ('SSO sign-in with Okta', 'Customers sign in with company SSO', 'PASS', 'Nora Patel', '2026-10-02'),
    ('SSO sign-in with Azure AD', 'Customers sign in with company SSO', 'PASS', 'Nora Patel', '2026-10-02'),
    ('Order history shows 24 months', 'Customers see 24 months of order history', 'FAIL', 'Nora Patel', '2026-10-23'),
    ('Order history filters by status', 'Customers see 24 months of order history', 'PASS', 'Nora Patel', '2026-10-23'),
    ('Invoice PDF matches printed layout', 'Invoices download as PDF', 'NOT_EXECUTED', None, None),
    ('Keyboard-only navigation', 'Pages meet WCAG 2.1 AA', 'NOT_EXECUTED', None, None),
]:
    body = {'title': title, 'requirement_id': reqs[req], 'result': result, 'designed_by_name': 'Nora Patel', 'priority': 'high',
            'test_steps': '1. Open the portal\n2. Follow the scenario\n3. Compare with the expected result',
            'expected_results': 'Matches the requirement.'}
    if who:
        body.update({'executed_by_name': who, 'execution_date': date})
    call('POST', f'/projects/{CP}/test-cases', body)
print('ok')
