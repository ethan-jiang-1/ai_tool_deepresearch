import {
  assertHasFinding,
  assertNoFindings,
  runIfMain,
} from "./test-runtime-harness.mjs";
import { profileInstantiationFindings } from "../checks/check-instantiation.mjs";
import {
  profileFixture,
  profilePlan,
} from "./test-runtime-regression-profile-fixtures.mjs";

export const tests = [
  [
    "profile instantiation accepts default unspecified search preferences",
    () => {
      const findings = profileInstantiationFindings({
        profile: profileFixture(),
        plan: profilePlan(),
      });
      assertNoFindings(findings, "profile instantiation accepts default unspecified search preferences");
    },
  ],
  [
    "profile instantiation rejects missing Search Preference Intake",
    () => {
      const profile = profileFixture().replace(/\n## Search Preference Intake[\s\S]*?\n## Configured Profile Parameters/, "\n## Configured Profile Parameters");
      const findings = profileInstantiationFindings({
        profile,
        plan: profilePlan(),
      });
      assertHasFinding(findings, /missing Search Preference Intake section/, "profile instantiation rejects missing Search Preference Intake");
    },
  ],
  [
    "profile instantiation rejects invalid search preference status",
    () => {
      const findings = profileInstantiationFindings({
        profile: profileFixture({ searchPreferenceStatus: "required" }),
        plan: profilePlan(),
      });
      assertHasFinding(findings, /search_preference_intake_status must be/, "profile instantiation rejects invalid search preference status");
    },
  ],
  [
    "profile instantiation rejects recorded search preference without concrete input",
    () => {
      const findings = profileInstantiationFindings({
        profile: profileFixture({ searchPreferenceStatus: "recorded", searchPreferenceInput: "not_specified_use_profile_defaults" }),
        plan: profilePlan(),
      });
      assertHasFinding(findings, /search_preference_intake_status=recorded requires concrete user_search_preference_input/, "profile instantiation rejects recorded search preference without concrete input");
    },
  ],
  [
    "profile instantiation rejects PROFILE/PLAN research profile mismatch",
    () => {
      const findings = profileInstantiationFindings({
        profile: profileFixture({ profile: "quick_factual" }),
        plan: profilePlan({ profile: "exploratory_map" }),
      });
      assertHasFinding(findings, /research_profile must match PROFILE/, "profile instantiation rejects PROFILE/PLAN research profile mismatch");
    },
  ],
  [
    "profile instantiation rejects PROFILE/PLAN floor mismatch",
    () => {
      const findings = profileInstantiationFindings({
        profile: profileFixture(),
        plan: profilePlan({ wave1: 6 }),
      });
      assertHasFinding(findings, /wave1_doc_floor_per_topic must match PROFILE configured_floors\.wave1_per_topic/, "profile instantiation rejects PROFILE/PLAN floor mismatch");
    },
  ],
  [
    "profile instantiation rejects missing PROFILE artifact_dir binding",
    () => {
      const profile = profileFixture().replace(/\| `artifact_dir` \| `[^\n]+`\s*\|\n/, "");
      const findings = profileInstantiationFindings({
        profile,
        plan: profilePlan(),
      });
      assertHasFinding(findings, /PROFILE Profile Binding\.artifact_dir must be a concrete absolute path/, "profile instantiation rejects missing PROFILE artifact_dir binding");
    },
  ],
  [
    "profile instantiation rejects wrong PROFILE artifact_dir binding",
    () => {
      const profile = profileFixture().replace("`/tmp/v12-profile-regression/seed_topics/_artifacts`", "`/tmp/v12-profile-regression/artifacts`");
      const findings = profileInstantiationFindings({
        profile,
        plan: profilePlan(),
      });
      assertHasFinding(findings, /PROFILE Profile Binding\.artifact_dir must resolve to RUN_DIR\/seed_topics\/_artifacts/, "profile instantiation rejects wrong PROFILE artifact_dir binding");
    },
  ],
  [
    "profile instantiation rejects wrong HITL2 decision brief path",
    () => {
      const profile = profileFixture().replace("`/tmp/v12-profile-regression/seed_topics/_artifacts/wave2/human-decision-brief.md`", "`/tmp/v12-profile-regression/seed_topics/_artifacts/wave2/brief.md`");
      const findings = profileInstantiationFindings({
        profile,
        plan: profilePlan(),
      });
      assertHasFinding(findings, /hitl2_decision_brief_path must resolve to PROFILE artifact_dir\/wave2\/human-decision-brief\.md/, "profile instantiation rejects wrong HITL2 decision brief path");
    },
  ],
  [
    "profile instantiation rejects non-default floors without manual override",
    () => {
      const findings = profileInstantiationFindings({
        profile: profileFixture({ floors: "wave0=9; wave1_per_topic=5; primary=2; secondary=1; recent=1; limitation=1" }),
        plan: profilePlan({ wave0: 9 }),
      });
      assertHasFinding(findings, /configured_floors\.wave0 must match quick_factual defaults without manual override/, "profile instantiation rejects non-default floors without manual override");
    },
  ],
  [
    "profile instantiation rejects assumption as final must-answer intake status",
    () => {
      const findings = profileInstantiationFindings({
        profile: profileFixture({ intakeStatus: "assumption" }),
        plan: profilePlan(),
      });
      assertHasFinding(findings, /final_must_answer_intake_status must be ready \/ gap_queue_backed/, "profile instantiation rejects assumption as final must-answer intake status");
    },
  ],
  [
    "profile instantiation rejects generic HITL1 pseudo-confirmation",
    () => {
      const findings = profileInstantiationFindings({
        profile: profileFixture({ hitl1Input: "profile choice plus root must-answer set" }),
        plan: profilePlan(),
      });
      assertHasFinding(findings, /HITL1 row must record the concrete user profile choice/, "profile instantiation rejects generic HITL1 pseudo-confirmation");
    },
  ],
  [
    "profile instantiation rejects ready Root Must-Answer without concrete FMA row",
    () => {
      const profile = profileFixture().replace(/\| FMA-1 \|.*\n/, "");
      const findings = profileInstantiationFindings({
        profile,
        plan: profilePlan(),
      });
      assertHasFinding(findings, /requires at least one concrete Root Must-Answer table row/, "profile instantiation rejects ready Root Must-Answer without concrete FMA row");
    },
  ],
  [
    "profile instantiation rejects invalid mixed pending decomposition phase",
    () => {
      const findings = profileInstantiationFindings({
        profile: profileFixture({ rowPhase: "mixed_pending_decomposition" }),
        plan: profilePlan(),
      });
      assertHasFinding(findings, /initial_answer_phase must be wave1_topic \/ wave2_synthesis \/ pending_decomposition/, "profile instantiation rejects invalid mixed pending decomposition phase");
    },
  ],
  [
    "profile instantiation accepts gap queue backed Root Must-Answer row",
    () => {
      const findings = profileInstantiationFindings({
        profile: profileFixture({ intakeStatus: "gap_queue_backed", rowPhase: "pending_decomposition", mappedTopics: "pending decomposition" }),
        plan: profilePlan(),
      });
      assertNoFindings(findings, "profile instantiation accepts gap queue backed Root Must-Answer row");
    },
  ],
  [
    "profile instantiation rejects gap queue backed row without concrete queue consequence",
    () => {
      const findings = profileInstantiationFindings({
        profile: profileFixture({ intakeStatus: "gap_queue_backed", rowPhase: "pending_decomposition", mappedTopics: "pending decomposition" }).replace("clarify root must-answer in slot_2_next", "not_applicable"),
        plan: profilePlan(),
      });
      assertHasFinding(findings, /intake_status=gap requires concrete queue_consequence/, "profile instantiation rejects gap queue backed row without concrete queue consequence");
    },
  ],
];

runIfMain(import.meta.url, tests);
