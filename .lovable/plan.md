## Findings on the Respond to Webhook node

Two concrete issues are visible in the screenshot. Together they explain why some submissions return an empty body while others return the full `baseline_plan`.

### Issue 1: `JSON.stringify(...)` is wrong when "Respond With" = JSON

```text
Respond With: JSON
Response Body: {{ JSON.stringify({ baseline_plan: ..., welcome_message: ..., ... }) }}
```

When **Respond With** is set to **JSON**, n8n already serializes the expression result to JSON. Wrapping it in `JSON.stringify(...)` double-encodes it — the HTTP body becomes a *JSON string* (a quoted blob), not a JSON object. The client's `JSON.parse` then yields a string, and `result.baseline_plan` is `undefined` → fallback message shows.

**Fix:** remove `JSON.stringify(...)`. The Response Body should be the raw object expression:

```text
{{ {
  baseline_plan: JSON.parse($('OpenAI').item.json.output[0].content[0].text).baseline_plan,
  welcome_message: JSON.parse($('OpenAI').item.json.output[0].content[0].text).welcome_message,
  first_check_in_at: $('Code').item.json.created_at
} }}
```

Alternatively, switch **Respond With** to **Text** and keep `JSON.stringify(...)` — but the JSON-mode fix above is cleaner.

### Issue 2: "Only runs for the first item in the input data"

The yellow banner in the node says:

> When using expressions, note that this node will only run for the first item in the input data.

The node is downstream of a **Merge** node that emits multiple items (user_id, week_number, plan_json, adherence rows, etc.). If the *first* item coming out of Merge does not have a populated `$('OpenAI').item.json.output[0].content[0].text`, the expression silently resolves to `undefined` and the response body is effectively empty — which matches exactly the symptom seen for `build_strength + few_times_week + 240` but not for `get_lean + rarely + 120`.

This is branch-dependent because the Merge node's item ordering depends on which upstream branches fired and in what order.

**Fix options (pick one):**

1. **Reference OpenAI directly with a guard**, not via the merged first item:
   ```text
   {{ {
     baseline_plan: $('OpenAI').first().json.output[0].content[0].text
       ? JSON.parse($('OpenAI').first().json.output[0].content[0].text).baseline_plan
       : null,
     welcome_message: $('OpenAI').first().json.output[0].content[0].text
       ? JSON.parse($('OpenAI').first().json.output[0].content[0].text).welcome_message
       : null,
     first_check_in_at: $('Code').first().json.created_at
   } }}
   ```
   Using `.first()` instead of `.item` makes it independent of which Merge item is "current".

2. **Move "Respond to Webhook" to a dedicated branch** that only takes the OpenAI output (not the merged sheet rows), so its single input item always has the OpenAI payload.

3. **Add a Set/Code node before Respond** that collapses everything into a single, predictable item with the three fields already extracted. Then the Respond node just echoes that one item.

### Headers (already correct)

```text
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Origin: *   ← visible at the bottom of the screenshot
```

These are fine. No app-side change needed for headers.

### Summary of n8n-side changes

1. Remove the outer `JSON.stringify(...)` from Response Body.
2. Replace `$('OpenAI').item.json...` with `$('OpenAI').first().json...` (and same for `$('Code')`) so the response no longer depends on Merge item ordering.
3. Re-deploy the workflow and retest with both:
   - `get_lean + rarely + 120` (previously worked)
   - `build_strength + few_times_week + 240` (previously empty)

Both should now return the full `{ baseline_plan, welcome_message, first_check_in_at }` object.

### App side

No code change required once the workflow is fixed. The current `src/lib/api.ts` already:
- sends `Content-Type: application/json`
- parses the JSON response
- falls back gracefully on empty body

If you want, after the n8n fix is verified I can also harden `Onboard.tsx` to show a clearer message when `baseline_plan.sessions` is missing (instead of the generic "system warms up" copy). Let me know.