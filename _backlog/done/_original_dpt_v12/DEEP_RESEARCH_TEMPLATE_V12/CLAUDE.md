# Claude

Read `README.md` for the short package entrypoint, then read `AGENT-GUIDE.md` for operating rules.

Do not treat `_framework/output_templates/*.md` as active run files. After instantiation, use the generated five root control files in `RUN_DIR`.

Do not stop for Wave 0/Wave 1/Wave 2 progress. If `stop_authorization_state=unauthorized_continue_required`, continue `unauthorized_stop_next_action`; HITL2 authorizes stopping only after the Wave 2 human-decision brief and `pending_user` PROFILE/STATUS/QUEUE state are written. Otherwise only final delivery, a concrete non-HITL2 decision blocker, or documented empty queue after refill attempts authorizes user-visible stopping.
