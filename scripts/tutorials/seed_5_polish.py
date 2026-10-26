"""Last touches for the tutorial demo account, run from project-hub-api with the demo DATABASE_URL set.

Portfolios and programs are made active, people get planned hours (so Capacity and Costs have numbers), the
bookkeeping entries those leave in Recent Activity are removed, everyone but one person shows as signed in, and the
local dev user stops being a platform admin (customers don't see the Platform Admin link).

Usage: python seed_5_polish.py <ids.json>
"""
import json
import sys
from decimal import Decimal
from uuid import UUID

sys.path.insert(0, '.')
from sqlalchemy import delete, select, update  # noqa: E402

from app.core.database import SessionLocal  # noqa: E402
from app.models.activity_log import ActivityLog  # noqa: E402
from app.models.option_set import OptionSet  # noqa: E402
from app.models.option_value import OptionValue  # noqa: E402
from app.models.portfolio import Portfolio  # noqa: E402
from app.models.program import Program  # noqa: E402
from app.models.resource_allocation import ResourceAllocation  # noqa: E402
from app.models.task import Task  # noqa: E402
from app.models.user import User  # noqa: E402

ids = json.load(open(sys.argv[1]))
account_id = UUID(ids['account'])
db = SessionLocal()


def active_status(entity_type: str) -> UUID:
    return db.scalar(
        select(OptionValue.id).join(OptionSet, OptionSet.id == OptionValue.option_set_id)
        .where(OptionSet.account_id == account_id, OptionSet.entity_type == entity_type, OptionValue.value == 'ACTIVE')
    )


db.execute(update(Portfolio).where(Portfolio.account_id == account_id).values(status_id=active_status('PORTFOLIO')))
db.execute(update(Program).where(Program.account_id == account_id).values(status_id=active_status('PROGRAM')))

LIAM = "Liam O'Brien"
PLAN = [
    ('Customer Portal Rebuild', 'Order history page', LIAM, 500), ('Data Center Exit', 'Migrate general ledger', LIAM, 900),
    ('Robotic Picking Pilot', 'Robot installation', LIAM, 300), ('Fleet Telematics Rollout', 'Dispatch integration', LIAM, 100),
    ('Customer Portal Rebuild', 'Visual design system', 'Marcus Lee', 700), ('Data Center Exit', 'Application inventory', 'Priya Shah', 1300),
    ('Enterprise Data Warehouse', 'Finance model', 'Aisha Khan', 1280), ('Demand Forecasting Model', 'Holiday and weather features', 'Tom Becker', 500),
    ('Enterprise Data Warehouse', 'Self-service reporting', 'Tom Becker', 160), ('Fleet Telematics Rollout', 'Install on 400 trucks', 'Elena Garcia', 800),
    ('Robotic Picking Pilot', 'Site preparation in Dayton', 'Elena Garcia', 500), ('Customer Portal Rebuild', 'User acceptance testing', 'Nora Patel', 300),
    ('Data Center Exit', 'Steering committee update', 'Jordan Rivera', 40), ('Customer Portal Rebuild', 'Visual design system', 'Sofia Rossi', 420),
    ('Enterprise Data Warehouse', 'Orders and shipments model', 'Kevin Tan', 600),
]
for project, task_name, person, hours in PLAN:
    task = db.scalar(select(Task).where(Task.project_id == UUID(ids['projects'][project]), Task.name == task_name))
    db.add(ResourceAllocation(account_id=account_id, task_id=task.id, resource_id=UUID(ids['resources'][person]),
                              allocated_hours=Decimal(hours)))

db.flush()
db.execute(delete(ActivityLog).where(ActivityLog.account_id == account_id,
                                     ActivityLog.entity_type.in_(['RESOURCE_ALLOCATION', 'RESOURCE'])))
for user in db.scalars(select(User).where(User.email.like('%@northwind.example') | (User.email == 'dev@example.com'))):
    if user.email != 'nora.patel@northwind.example':
        user.cognito_sub = user.cognito_sub or f'demo-{user.id}'
db.execute(update(User).where(User.email == 'dev@example.com').values(is_platform_admin=False))
db.commit()
print('ok')
