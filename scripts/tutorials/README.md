# Help Center tutorial screenshots

The lessons and Tutorial Library in the Help Center (`src/tutorials/content.js`) show screenshots from a demo account,
Northwind Logistics. They live in `public/tutorials/<image>.webp`. Retake them when a screen they show changes.

## Rebuild the demo account

You need a private Postgres, the API in local auth mode, Vite pointed at it, and Chrome.

1. Create an empty database and migrate it (from `project-hub-api`):
   `DATABASE_URL=postgresql+psycopg://postgres@127.0.0.1:5544/tutorial_demo alembic upgrade head`
2. Run the API on port 8044 against it, with `ENVIRONMENT=local AUTH_MODE=local`.
3. Run Vite with `VITE_AUTH_MODE=local VITE_API_PROXY_TARGET=http://127.0.0.1:8044`. Without `VITE_AUTH_MODE=local`
   the local dev user only sees the platform admin portal.
4. Seed it. The first three scripts talk to the API, and the rest open the database, so run them from `project-hub-api`
   with the same `DATABASE_URL`:
   - `python seed_1_people_and_projects.py ids.json` creates the account, people, portfolios, programs and projects. It
     writes their ids to `ids.json`, and the other scripts read it.
   - `python seed_2_plans.py ids.json` adds roles, time off, sprints and task plans.
   - `python seed_3_raid_and_delivery.py ids.json` adds risks, issues, assumptions, dependencies, decisions, change
     requests, requirements and test cases.
   - `python seed_5_polish.py ids.json` sets statuses and planned hours, cleans Recent Activity, and marks people as
     signed in.
5. Mark the first-time tours as seen, so they don't cover the pages:
   `POST /api/v1/me/tours/<id>` for `home`, `scope`, `directory`, `raid`, `governance`, `sprints`, `requirements`,
   `testing` and `resources`.

## Take the screenshots

Start Chrome headless with `--remote-debugging-port=9333 --hide-scrollbars`. `capture.py` lists every screenshot and
the clicks needed to reach it, and `shoot.mjs` drives Chrome through them.

1. With AI still off for the account, take the one AI-off screenshot (the Request AI card):
   `python capture.py ids.json off.json off`, then `node shoot.mjs off.json ../../public/tutorials`
2. Turn AI on and add the example Ask Compass chat (from `project-hub-api`): `python seed_4_ai.py ids.json`. The answer
   is written from the demo data; no model is called.
3. Take the rest: `python capture.py ids.json on.json on`, then `node shoot.mjs on.json ../../public/tutorials`

`shoot.mjs` prints `missing ...` for any element it couldn't find, and a count of failures at the end. To retake
specific shots, pass a name prefix as the third argument instead of `on`/`off`, for example
`python capture.py ids.json one.json raid/`.

A new tutorial step needs a `shot(...)` entry in `capture.py` and a step in `content.js` with the same image name.
