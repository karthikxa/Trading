# Desk operations

How to change the roster without breaking the one-roster, one-computer rule.

## Add a specialist

1. Create `agents/<name>.md`. Use the same structure as the other specialists:
   identity, operating constraints, lens, output JSON, failure rule.
2. Add one `agents.<name>` block to `kortix.yaml`:
   - `mode: subagent`
   - `prompt_file: agents/<name>.md`
   - `tools: none`
   - `skills: none`
   - `subagents: none`
   - `connectors: none`
   - `apps: none`
   - `secrets: none`
   - `kortix_permissions: none`
   - no `sandbox`
3. Add the name to `agents.portfolio_manager.subagents`.
4. Add the name and lens to the roster table in `agents/portfolio-manager.md`
   and in `SKILL.md`.
5. Add its output schema to `references/decision-schema.md`.
6. Run `kortix validate` and `kortix agents ls`. The new agent must appear as a
   subagent, never in the composer.

No UI change is needed. The agents page lists it in the subagent section.

## Remove a specialist

1. Remove the name from `agents.portfolio_manager.subagents`.
2. Set `enabled: false` on its block for one release.
3. Remove it from the roster table and the decision schema.
4. After one release with no calls, delete the block and the prompt file.

Do not rename an agent in place. `project_sessions.agent_name` stores the name.
A rename behaves like a removal plus an addition. Add the new name, disable the
old one, and let `repointSessionAgentToDeclaredDefault` move an affected session
to the declared default. Never fake a grant to keep an undeclared name alive.

## Add a connector

1. Declare or connect the connector in the project (dashboard or
   `kortix connectors`).
2. Grant it to the Chief. `connectors: all` already covers every declared
   connector. To narrow it, replace `all` with the explicit names.
3. Keep the specialists at `connectors: none`. They receive data through the
   Chief's prompt.
4. Add a connector policy when the call moves money or writes to a third party:

   ```yaml
   policies:
     - match: { connector: <slug>, action: <action> }
       action: require_approval
   ```

5. Set `approvals.ttl` to the decision window. The project uses `4h`.
6. Test the held call: it must return pending approval, then run once after a
   person approves. Do not repeat the call.

## Add a tool, skill or app

- **Project tool**: add `tools.<snake_case>: tools/<name>.ts`, then grant it to
  the Chief. Specialists stay at `tools: none`.
- **Skill**: add `skills.<name>: skills/<name>` with `skills/<name>/SKILL.md`,
  then grant it to the Chief. Specialists stay at `skills: none`.
- **App**: add the app under `apps:` or deploy it with `kortix apps deploy`.
  The Chief already has `apps: all`.

The Chief is the only agent that uses a shared capability. A specialist that
needs data gets it in the prompt, not through a new grant.

## Change a model

- Leave `model` unset to use the project default.
- Set `model` and `variant` on one agent when it needs a different model.
- Do not set a model on a specialist to work around a tool problem. Specialists
  have no tools; a model change does not give them one.

## Change the risk policy

The risk policy is prose, not code. Change it in two places together:

1. `skills/trading-desk/references/decision-schema.md` (the authority).
2. `agents/portfolio-manager.md` (the short restatement).

Then run one paper decision and confirm the Chief applies the new band. Do not
change the policy in a prompt only; the next session would read two different
rules.

## Validate

```bash
kortix validate
kortix agents ls
```

`kortix validate` must report zero errors. `kortix agents ls` must show:

- one primary: `portfolio_manager`;
- eleven subagents;
- no second primary.

Then open a real session and run one decision. Confirm:

- each specialist call has `session: "same"`;
- no new session or desktop appears;
- the risk gate runs before the decision;
- the decision JSON includes every specialist call.

## Roll back

1. Revert `kortix.yaml` and the prompt files together.
2. Run `kortix validate` again.
3. Reopen the Chief's session. A removed agent is disabled, not silently
   granted. A session that names it is repointed to the declared default by the
   existing `session-agent` logic.
4. Do not restore a legacy `trading.agents` read to recover a roster. The
   manifest is the source of truth.

## Separate work

The journal audit is not part of this roster. Do not edit journal rows, do not
delete the disputed journal row, and do not couple the journal fix to the
manifest migration.
