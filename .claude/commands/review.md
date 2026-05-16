# Review Command

Run a structured technical review of the current change or specified files.

## Steps

1. Read `.ai/skills/core/architecture.md` and verify no architectural rules are violated.
2. Apply the review checklist from `.ai/skills/core/review.md`.
3. Check security constraints:
   - Inputs validated, outputs escaped
   - No unsafe SQL
   - No XSS or CSRF exposure
4. Check frontend consistency (if applicable):
   - Modular JS, no globals
   - BEM CSS, no unapproved libraries
5. Check Joomla integration (if applicable):
   - MVC respected, ACL intact, API-first approach
6. Verify `.ai/skills/core/definition-of-done.md` criteria are met.

## Output

- Pass/fail status per checklist item
- List of issues found with file and line reference
- Recommended fixes for each issue
- Final DoD verdict (pass/fail + reason)
