"""Turns AI on for the demo account and stores one example Ask Compass chat for the tutorial screenshots.

The answer is written from the demo data (no model is called). Usage (from project-hub-api, with the demo DATABASE_URL): python seed_4_ai.py <ids.json>
"""
import json
import sys
from datetime import UTC, datetime, timedelta
from uuid import UUID

sys.path.insert(0, '.')
from app.core.database import SessionLocal  # noqa: E402
from app.models.account import Account  # noqa: E402
from app.models.ai import AiAccountSettings, AiConversation, AiMessage, AiRun  # noqa: E402

ids = json.load(open(sys.argv[1]))
account_id = UUID(ids['account'])
user_id = UUID(ids['me'])
db = SessionLocal()

account = db.get(Account, account_id)
account.ai_enabled = True
account.ai_requested_at = None
row = db.get(AiAccountSettings, account_id) or AiAccountSettings(account_id=account_id, assistant_enabled=True, retention_days=90)
row.provider, row.model, row.encrypted_key, row.key_last4 = 'OPENAI', 'gpt-4.1', b'demo-not-a-key', 'x7Qa'
row.key_updated_by, row.key_updated_at = user_id, datetime.now(UTC)
row.data_notice_accepted_by, row.data_notice_accepted_at = user_id, datetime.now(UTC)
db.add(row)

QUESTION = 'Which projects need attention this week?'
ANSWER = """Three projects need attention this week:

1. **Fleet Telematics Rollout**: *Dispatch integration* is blocked, and the critical issue *Dispatch system rejects GPS timestamps* is due Oct 30. Liam O'Brien owns both.
2. **Data Center Exit**: *Steering committee update* is 3 days overdue, and the critical risk *Payroll cut-over overlaps year-end* is still open. The decision to move payroll to January is approved, so the risk can be updated.
3. **Robotic Picking Pilot**: the critical risk *Robot vendor delivery delay* is open, and the floor reinforcement quote is 18% over budget. A change request to increase the budget is waiting for review.

Also worth a look: Liam O'Brien is booked at 140% across four projects."""

started = datetime.now(UTC) - timedelta(minutes=3)
conversation = AiConversation(account_id=account_id, user_id=user_id, title=QUESTION)
db.add(conversation)
db.flush()
run = AiRun(conversation_id=conversation.id, account_id=account_id, user_id=user_id, status='DONE', source='BYOK',
            provider='OPENAI', model='gpt-4.1', model_calls=3, input_tokens=5200, output_tokens=310,
            started_at=started, finished_at=started + timedelta(seconds=9))
db.add(run)
db.flush()
parts = [
    ('user', {'role': 'user', 'content': QUESTION}),
    ('assistant', {'role': 'assistant', 'content': None, 'tool_calls': [
        {'id': 'call_1', 'name': 'account_dashboard', 'arguments': {}},
        {'id': 'call_2', 'name': 'list_raid_items', 'arguments': {}},
    ]}),
    ('tool', {'role': 'tool', 'tool_call_id': 'call_1', 'content': '{}'}),
    ('tool', {'role': 'tool', 'tool_call_id': 'call_2', 'content': '{}'}),
    ('assistant', {'role': 'assistant', 'content': ANSWER}),
]
for position, (role, content) in enumerate(parts):
    db.add(AiMessage(conversation_id=conversation.id, run_id=run.id, position=position, role=role, content=content))
db.commit()
print('ok', conversation.id)
