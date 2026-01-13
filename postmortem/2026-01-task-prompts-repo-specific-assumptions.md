# Summary

Luban's user-facing "New Task" prompt templates are intended to instruct an external code agent (e.g., Claude Code / Codex)
to work inside the newly created worktree for *any* target repository. In multiple iterations, the templates accidentally
embedded Luban-centric workflow expectations (for example, asking the agent to output patch/diff artifacts, or implicitly
assuming a specific local workflow instead of following the target repository's own conventions).

This was a product correctness issue: the prompt is part of the UI contract, and any repo-specific assumptions degrade
agent performance and user trust.

# Severity

**Sev-3 (Medium)**

# Impact

- Users creating tasks for arbitrary repositories received prompts that could:
  - misdirect the agent toward an unsuitable workflow (e.g., "provide a patch/diff" instead of acting directly)
  - implicitly bias the agent toward Luban's development conventions, rather than discovering the target repo's practices
- Result: lower success rate, more back-and-forth with the user, and confusion about expected outputs.

# Detection

- Detected via repeated user feedback that task prompts were not repo-agnostic and kept reintroducing Luban-specific
  expectations.
- No automated coverage initially prevented regressions across prompt template iterations.

# Root cause

1. **Conflated scopes**: We treated "agent instructions for working on Luban" and "product prompts for any project" as
   interchangeable guidance.
2. **Insufficient invariants**: The code lacked a strict contract enforced by tests (e.g., "no hardcoded tool names" and
   "must instruct agent to follow target repo practices").
3. **Template churn**: Multiple incremental changes to intent-specific templates increased the chance of reintroducing
   repo-specific assumptions.

# Triggering commits (introduced by)

- `7611c8b` (introduced the prompt requirement to "provide a patch/diff", which is mismatched for code agents that can
  modify code directly)

# Fix commits (resolved/mitigated by)

- `9189cfd` (removed patch/diff output requirement and added a "simple vs complex" operating mode)
- `HEAD` (this change): explicitly requires following the target repo's practices and adds tests to prevent hardcoded tool
  names from reappearing

# Reproduction steps

1. Create a New Task for an unrelated repository.
2. Inspect the generated agent prompt.
3. Observe repo-specific assumptions such as:
   - requiring patch/diff output, or
   - missing a clear instruction to discover and follow the target repository's own workflow.

# Resolution

- Updated the prompt templates to:
  - explicitly instruct agents to discover and follow the target repository's own practices (README/CONTRIBUTING/CI)
  - avoid hardcoding any particular build/test tool or workflow
  - encourage an explicit SIMPLE vs COMPLEX decision and discussion-first planning for complex work
- Added regression tests to enforce the template contract.

# Lessons learned

- User-facing prompts are product API surface and require the same rigor as code interfaces.
- Any mention of a specific toolchain in a cross-repo prompt is a likely bug.
- Prompt templates need "contract tests" (negative assertions are particularly valuable).

# Prevention / action items

1. Maintain a strict prompt template contract with tests:
   - must instruct following target repo practices
   - must not mention repository-specific tools (e.g., `just`, `pnpm`, `cargo`)
2. Add a review checklist item for prompt changes:
   - "Is this instruction repo-agnostic?"
   - "Does it ask the agent to act directly rather than produce artifacts?"
3. Keep prompt templates small and composable to reduce churn-driven regressions.

