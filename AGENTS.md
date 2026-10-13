# Code Quality Enforcer

A disciplined, logic-first coding standard — think, verify, and test before submitting any code.

---

## Core Philosophy

**Never guess. Never assume. Always verify.**

The root cause of repeated mistakes is rushing to implement before fully understanding. Follow this mandatory process before any code is written or changed.

---

## Mandatory Process (Follow Every Time)

### Phase 1 — UNDERSTAND Before Touching Code
- Restate the requirement in your own words
- Identify all inputs, outputs, and expected behavior
- List all files/functions that will be affected
- Ask clarifying questions if anything is ambiguous — do NOT assume

### Phase 2 — PLAN Before Writing
- Write out the logic in plain English steps first
- Identify edge cases: null, empty, wrong type, boundary values
- Check if similar logic already exists (don't duplicate)
- Identify potential side effects on other parts of the codebase

### Phase 3 — IMPLEMENT With Care
- Write tests BEFORE or ALONGSIDE implementation (not after)
- One change at a time — do not bundle multiple fixes
- Never copy-paste without reading every line
- Never assume a function/import exists — verify it

### Phase 4 — SELF-CHECK Before Submitting
- Re-read your own code line by line
- Dry-run trace: manually walk through with at least one example input
- Ask yourself: "Will this actually work, or am I assuming it will?"
- Check: off-by-one errors, wrong variable names, missing return statements, unhandled errors

### Phase 5 — COMMUNICATE Clearly
- State what you did and why
- List what you tested and how
- Flag anything you are uncertain about explicitly
- Never say "this should work" — show the trace that proves it

---

## When a Mistake Happens

Follow this strict recovery process — never just patch the surface:

```
STOP. Do not jump to a fix.

1. Explain WHY this mistake happened (root cause, not symptom)
2. Check if the same mistake exists elsewhere in the codebase
3. Fix the root cause
4. Re-trace the entire logic flow after fixing
5. Tell the user exactly what you verified before submitting the fix
```

---

## Repeat Mistake Prevention

Before making any change, internally check:
- What mistakes were made earlier in this session?
- Does this fix risk reintroducing any of them?
- Have I scanned related files for the same error pattern?

---

## Test Case Requirements

Every non-trivial implementation must include:

| Test Type       | Description                          |
|-----------------|--------------------------------------|
| Happy path      | Normal expected input                |
| Empty/null input| What happens with no data            |
| Edge case       | Boundary values, extremes            |
| Error case      | Invalid input, missing data          |

---

## Output Format (Required Structure)

When submitting code, always follow this structure:

```
### Understanding
[Restate what you understood the task to be]

### Logic Plan
[Step-by-step plan in plain English before any code]

### Implementation
[The actual code]

### Dry-Run Trace
[Walk through the code manually with an example input/output]

### What Could Still Go Wrong
[Honest assessment of remaining risks or uncertainties]
```

---

## Quick Prompts to Use Mid-Session

**When jumping ahead without thinking:**
> Stop. State your understanding of the task first, then plan the logic before writing any code.

**When a fix fails again:**
> Do not patch this again. Explain why the previous fix failed, identify the root cause, then fix it properly.

**When output looks wrong:**
> Trace through your code manually with this input: [example]. Show me each step.

**To prevent repeat mistakes:**
> Before submitting, list the mistakes made earlier in this session and confirm this change doesn't reintroduce any of them.

---

## Common Mistakes & Prevention

### 1. Assuming Imports/Functions Exist
**Mistake:** Using a function or module without verifying it exists
**Prevention:** Always check the codebase or docs before referencing anything

### 2. Surface-Level Fixes
**Mistake:** Patching the error message without fixing the root cause
**Prevention:** Always ask "why did this fail?" before writing any fix

### 3. Wrong Variable Scope
**Mistake:** Using a variable outside its defined scope
**Prevention:** Trace variable lifecycle from declaration to usage

### 4. Off-By-One Errors
**Mistake:** Array index errors, loop boundary mistakes
**Prevention:** Always dry-run with boundary values (0, 1, last item, empty)

### 5. Ignoring Null/Undefined
**Mistake:** Not handling cases where data may be missing
**Prevention:** Every function should have a null/empty input test case

### 6. Bundling Multiple Changes
**Mistake:** Fixing multiple things at once, making debugging harder
**Prevention:** One change per submission, verify before moving on

### 7. Copy-Paste Without Reading
**Mistake:** Pasting code that doesn't fit the current context
**Prevention:** Read every line after pasting, verify variable names match

### 8. Saying "Should Work" Without Proof
**Mistake:** Submitting with confidence but no verification
**Prevention:** Always include a dry-run trace with real example values

### 9. Not Checking Side Effects
**Mistake:** A fix in one place breaks something elsewhere
**Prevention:** List all files/functions affected before making changes

### 10. Repeating the Same Mistake
**Mistake:** Fixing something that was already broken the same way before
**Prevention:** At the start of each fix, review mistakes made earlier in the session

---

## Test Patterns by Language

### JavaScript / TypeScript
```javascript
describe('functionName', () => {
  it('happy path', () => expect(fn(validInput)).toBe(expectedOutput));
  it('empty input', () => expect(fn([])).toBe(null));
  it('null input', () => expect(fn(null)).toThrow());
  it('edge case', () => expect(fn(boundaryValue)).toBe(edgeOutput));
});
```

### Python
```python
def test_function_name():
    assert fn(valid_input) == expected_output      # happy path
    assert fn([]) == None                           # empty
    assert fn(boundary_value) == edge_output        # edge case
    with pytest.raises(ValueError): fn(None)        # error case
```

### React Components
```jsx
it('renders correctly', () => render(<Component prop="value" />));
it('handles empty props', () => render(<Component />));
it('handles user interaction', () => { fireEvent.click(button); expect(...) });
it('handles error state', () => render(<Component error={true} />));
```

### API Endpoints
```
Happy:  POST /endpoint with valid payload → 200 + expected response
Empty:  POST /endpoint with {} → 400 + validation error
Auth:   POST /endpoint without token → 401
Edge:   POST /endpoint with max-length values → 200 or 413
```
