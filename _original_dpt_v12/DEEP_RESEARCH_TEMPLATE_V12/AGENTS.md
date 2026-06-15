# Agents

Read `README.md` for the short package entrypoint, then read `AGENT-GUIDE.md` before changing or executing anything in this template package.

Key rule: run-specific changing data belongs in the generated run directory, especially `<PLAN_BASENAME>.profile.md`; shared `_framework/specs/*` files hold reusable policy only.

During execution, do not stop for Wave 0/Wave 1/Wave 2 progress. If `stop_authorization_state=unauthorized_continue_required`, continue `unauthorized_stop_next_action`; HITL2 authorizes stopping only after the Wave 2 human-decision brief and `pending_user` PROFILE/STATUS/QUEUE state are written. Otherwise only final delivery, a concrete non-HITL2 decision blocker, or documented empty queue after refill attempts authorizes user-visible stopping.
