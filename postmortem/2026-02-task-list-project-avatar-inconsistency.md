# Task List project avatar inconsistent with Project List

## Summary

The Task List header did not render the same project avatar/icon as the sidebar Project List. This caused inconsistent UI cues and repeated user reports.

## Severity

Sev-4 (Low): cosmetic/papercut, but recurring.

## Impact

- The active project indicator in the Task List header was less recognizable than in the sidebar.
- Users had to re-validate context visually, increasing friction.

## Detection

Detected via repeated user feedback; not caught by CI because there was no UI smoke assertion for the Task List header project indicator.

## Root cause

- The project indicator UI was implemented in multiple places with slightly different rendering logic.
- Sidebar Project List was upgraded to use avatar URLs, but Task List header kept using the legacy fallback icon path.
- No shared component or regression test enforced consistency between the two views.

## Triggering commits (introduced by)

- `a49252d` (sidebar Project List started rendering GitHub avatars)

## Fix commits (resolved/mitigated by)

- `c06feb1` (Task List header now uses the same avatar source and adds a UI smoke check)

## Reproduction steps

1. Add a GitHub-backed project so the sidebar can render an avatar.
2. Navigate to Task List view for that project.
3. Observe the top-left project indicator in the header.

Expected: the same project avatar/icon as the sidebar Project List.

## Resolution

- Task List header derives project display name and `avatarUrl` from the same source used by the sidebar.
- UI smoke test asserts the Task List header project indicator renders the avatar (when available) in mock mode.

## Lessons learned

- Visual consistency regressions are easy to introduce when the same UI concept is duplicated across multiple views.
- UI smoke tests should assert key cross-view invariants (not just navigation).

## Prevention / action items

- Keep a single source of truth for project avatar rendering.
- Add or extend UI smoke coverage for other places that show "active project" indicators.
- Prefer extracting a shared component for project avatar + fallback rendering if duplication grows again.
