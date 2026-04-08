# Omega Life — Development Log

**Project:** Base44 → Laravel V2 Integration

**Started:** March 30, 2026

**Developer:** Vedang + Claude Code

---

## Phase 1 — Patch & Polish (Mar 30 – Apr 23, 2026)

**Goal:** Complete every half-built feature so it's usable end-to-end.

**Budget:** 68 hours

| # | Task | Est. | Status |

|---|---|---|---|

| 1 | Body Maps — verify + complete | 3h | ✅ Done |

| 2 | SOS Alerts UI | 2h | ✅ Done |

| 3 | Handover Notes — views | 4h | ✅ Done |

| 4 | DoLS — frontend views | 4h | ✅ Done |

| 5 | Staff Training — create/edit forms | 4h | ✅ Done |

| 6 | Incident Management (Roster) — completion | 3h | ✅ Done |

| 7 | MAR Sheets — blade views + admin UI | 8h | ✅ Done |

| 8 | Notifications frontend | 5h | ⬜ Not started |

| 9 | Safeguarding case UI | 6h | ⬜ Not started |

---

## Completed Tasks

### 🔄 Phase 1 Audit & Debug — In Progress

**Date started:** April 2, 2026

---

#### ✅ Step 1 — Laravel Log Audit

**Date:** April 2, 2026

**Time spent:** ~1h

**Errors found and triaged:**

| Error | Frequency | Root cause | Fix |

|---|---|---|---|

| `OnboardingConfigurationController does not exist` | Every route:list call | Route registered but controller never created | Created stub controller + placeholder view |

| `thunderingslap.com SSL timeout` | Repeated | External API call with no timeout or error handling | Wrapped in try/catch with 5s timeout |

| `HomeArea model not found` | Live server only | Model exists locally, not deployed | Run migrations on next deploy |

| `getCarerAvailabilityDetails() undefined` | Live server only | Method exists locally, old live code | Deploy will resolve |

| `Validator not found` | Live server only | Already imported locally | Deploy will resolve |

| `App\Models\Auth not found` | Live server only | Already using Facades\Auth locally | Deploy will resolve |

**Files changed:**

- `app/Http/Controllers/frontEnd/Roster/OnboardingConfigurationController.php` — **new file** — stub controller returning placeholder view

- `resources/views/frontEnd/roster/onboarding/configuration.blade.php` — **new file** — "coming soon" placeholder using master layout

- `routes/web.php` — added `use` import for OnboardingConfigurationController (line 52)

- `app/Services/Staff/StaffService.php` — `courses()` method wrapped in try/catch with `Http::timeout(5)`, returns `[]` on failure

**Teaching Notes:**

**Stub controllers — when and why**

Rather than removing the route for `onboarding-configuration` (which risks breaking nav links or future references), a stub controller is safer. It renders a "coming soon" page and keeps the route valid. When Phase 5 builds the real onboarding module, the stub gets replaced. The key rule: a route must always have a resolvable controller, even if it's a placeholder.

**External API calls — always wrap in try/catch with a timeout**

`Http::get('http://thunderingslap.com/api/all-courses-list/')` had no timeout set, so a slow or dead server would block the entire PHP process until the default socket timeout (often 30–60s). Two fixes applied together:

1. `Http::timeout(5)` — abort if no response in 5 seconds

2. `try/catch (\Exception $e)` — if the call throws (SSL error, DNS failure, network timeout), return `[]` gracefully instead of crashing

This pattern should be applied to every external HTTP call in the codebase.

**"Live only" errors vs "local only" errors**

The log contained errors that only appear on the live server (missing model, undefined method). This means the live server is running an older code version than local. These aren't bugs in the new code — they're deployment drift. The fix is a clean deploy with migrations. Note this pattern: when the same class/method works locally but throws on live, it's almost always a deploy issue, not a code bug.

---

#### ✅ Step 6 — E2E Code-side Audit (Route + DB + Controller checks)

**Date:** April 2, 2026

**Time spent:** ~30min

**All 9 Phase 1 routes confirmed registered:**

All routes for SOS Alerts, Handover Notes, DoLS (6 routes), Notifications, Safeguarding, Body Maps (3 routes), Staff Training (9 routes), Incident Management, MAR Sheets verified present in `routes/web.php`.

**DB record counts:**

| Table | Count | Notes |

|---|---|---|

| `sos_alerts` (active) | 0 | No test data — SOS page will show empty state |

| `handover_log_book` | 5 | home_id=1, testable |

| `dols` | 1 | home_id=92 — won't show for home_id=1 user; create a new record to test |

| `notification` | 4979 (home 1) | Plenty of test data |

| `su_risk` | 357 | Body maps testable via /service/body-map/7 |

| `body_map` entries | 0 | No pins saved yet — add/remove flow needs manual test |

| `training` | 23 | Testable |

| `staff_report_incidents` | 63 | Testable |

| `incidents (safeguarding)` | 47 | Testable — use IDs 3, 6, 7 |

| `medication_logs` | 4 | Client IDs 19 (Mick) and 162 |

**All controllers pass PHP syntax check** — no parse errors in any Phase 1 controller.

**Bug found and fixed:**

`SafeguardingCaseController::index()` — safeguarding type filter used wrong column reference `safeguarding_type.id` (table alias) instead of `safeguarding_types.id` (actual table name). Would throw `SQLSTATE[42S22]: Column not found` when any user applied the safeguarding type filter.

**Files changed:**

- `app/Http/Controllers/frontEnd/SafeguardingCaseController.php` — line 38: `safeguarding_type.id` → `safeguarding_types.id`

**Teaching Notes:**

**How `whereHas` with a pivot table resolves column names**

`safeguarddetails()` is a `belongsToMany` through the `staff_report_incidents_safeguardings` pivot. When you write `whereHas('safeguarddetails', fn($q) => $q->where('X.id', 1))`, Laravel builds a subquery that JOINs `safeguarding_types` (the actual model table). The table name in the `where()` must match the real DB table name — not an alias. `safeguarding_type` was the wrong name (no 's'); `safeguarding_types` is correct.

**DoLS test data is on home_id=92, not home_id=1**

The single DoLS record in the DB belongs to home 92. A logged-in user with home_id=1 will see an empty DoLS list — this is correct behaviour (home scoping working), not a bug. To test the DoLS feature, create a new record via `/dols/create` while logged in.

---

#### ⬜ Step 2 — N+1 Query Fixes

Not started.

---

#### ⬜ Step 3 — Server-side Input Validation

Not started.

---

#### ⬜ Steps 4, 5, 7–11 — Remaining Audit & Manual Browser Tests

Steps 2–5 are code-side (can run in Claude Code). Steps 7–11 require browser testing — see checklist below.

---

### ✅ Task 1 — SOS Alerts UI

**Date:** March 30, 2026

**Time spent:** ~1.5h

**What was built:**

- Active alerts list — shows staff name, job title, location, time, "X mins ago" label

- Resolve button — AJAX dismiss, row fades out without page reload

- Resolved alerts history — last 20 resolved alerts with resolution timestamp

- Empty state — friendly message when no active alerts

**Files changed:**

- `app/Models/staffManagement/sosAlert.php` — added fillable, table name, `staff()` relationship

- `app/Http/Controllers/frontEnd/StaffManagement/SosAlertController.php` — **new file** — index + resolve

- `resources/views/frontEnd/staffManagement/sos_alerts.blade.php` — **new file** — full UI

- `routes/web.php` — added GET `/staff/sos-alerts` and POST `/staff/sos-alerts/resolve`

**Teaching Notes:**

**The pattern: Model → Controller → Route → Blade**

Every feature in this Laravel app follows the same 4-layer chain. SOS Alerts is the cleanest example because it's small.

**1. Model (`sosAlert.php`)**

The `sos_alerts` table already existed in the DB. The model just needed 3 things added:

- `protected $table = 'sos_alerts'` — tells Eloquent which table to use (Laravel normally guesses from the class name, but `sosAlert` → `so_s_alerts` would be wrong)

- `protected $fillable = ['staff_id', 'location']` — whitelists which fields can be mass-assigned (security measure — prevents someone POSTing arbitrary columns)

- `public function staff()` — an Eloquent **relationship**: `belongsTo(User::class, 'staff_id')` means "the `staff_id` column on this table is a foreign key pointing to the `user` table". After this, you can write `$alert->staff->name` and Laravel does the JOIN automatically.

**2. Controller (`SosAlertController.php`)**

- `index()` — loads active alerts (where `deleted_at IS NULL`) and resolved alerts (where `deleted_at IS NOT NULL`), passes both to the blade via `compact('alerts', 'resolved')`

- `resolve()` — sets `deleted_at = now()` and saves. This is a manual soft-delete (the model doesn't use the `SoftDeletes` trait, so we do it by hand). Returns JSON so the JS can confirm success without a page reload.

- **`whereHas` + `FIND_IN_SET`**: The `home_id` on the `user` table is stored as a comma-separated string (e.g. `"1,3,5"`) because one staff member can work at multiple homes. `FIND_IN_SET(?, home_id)` is a MySQL function that checks if a value exists within a comma-separated column. `whereHas('staff', fn)` means "only include alerts whose related staff record passes this sub-query".

**3. Routes**

```php

Route::get('/staff/sos-alerts', [SosAlertController::class, 'index']);

Route::post('/staff/sos-alerts/resolve', [SosAlertController::class, 'resolve']);

```

GET for the page load, POST for the resolve action (changes data → must be POST, not GET).

**4. Blade + AJAX**

The blade renders the initial HTML from PHP (server-side). The resolve button fires a jQuery `$.ajax POST` to the resolve route, passing the alert ID + CSRF token. On success, the row fades out with `$(row).fadeOut()` — no page reload needed.

**Why `deleted_at` for "resolved"?**

Soft deletes mean the record stays in the DB (for audit history) but is hidden from normal queries. Active alerts = `deleted_at IS NULL`. Resolved history = `deleted_at IS NOT NULL`. This is a common pattern across the whole app.

### ✅ Task 7 — MAR Sheets (blade views)

**Date:** March 31, 2026

**Time spent:** ~1.5h

**What was built:**

- Replaced hardcoded dummy MAR sheet cards with dynamic `#renderHtmlMARSheets` container

- `showMarSheets()` — AJAX loads all medication logs for the current client; renders planCard items with status badges, delete & view buttons

- Fixed `showMedicationList()` — now passes `client_id` (was missing, so all clients' logs showed)

- `medication_log_detail` controller method + `GET /client/medication-log-detail/{id}` route — returns single record JSON

- `medication_log_delete` controller method + `POST /client/medication-log-delete` route — soft-deletes a log

- Detail view (`medicationSectionSecond`) now dynamically populated: List tab shows field-by-field breakdown, Table tab shows medication card with notes/side effects

- `cancelMedicationLogBtn` handler — resets and hides the log form

- `#addMARSheetBtn` handler — switches to Medication Logs sub-tab and opens the form

- Removed conflicting inline `marSheetDetails` handler from blade (moved to `client_details.js` where it also fetches data before showing detail section)

- Fixed `medication_log_list` controller to filter by `home_id` instead of the logged-in `user_id`

**Files changed:**

- `resources/views/frontEnd/roster/client/client_details.blade.php` — replace static MAR cards + detail panels with dynamic containers; add new URL vars; remove duplicate inline handler

- `public/js/roster/client/client_details.js` — add `showMarSheets()`, fix `showMedicationList()`, add cancel/delete/add/detail handlers

- `app/Http/Controllers/frontEnd/Roster/Client/ClientController.php` — add `medication_log_detail`, `medication_log_delete`, fix `medication_log_list`

- `routes/web.php` — add `GET /client/medication-log-detail/{id}` and `POST /client/medication-log-delete`

**Teaching Notes:**

**The full AJAX data flow for this feature**

This task is a good example of how the frontend JS, routes, controller, service, and model all connect:

```

User clicks "Medication" tab

→ getMedication() fires

→ showMarSheets() → POST /client/medication-log-list → ClientController::medication_log_list()

→ ClientManagementService::list(['client_id' => X, 'home_id' => Y])

→ medication_logs table query → paginated JSON back

→ JS renders each item as a planCard div in #renderHtmlMARSheets

→ showMedicationList() → same route, same data, different render target (#renderHtmlMedicalLogs)

```

Notice the same route/controller/service method is called twice — by `showMarSheets()` for the MAR Sheets list panel and by `showMedicationList()` for the Medication Logs panel. They just render the response differently.

**Why separate JS files vs inline script in the blade**

`client_details.js` is a separate JS file loaded with `defer`. The blade has some inline `<script>` blocks too. The rule used here: pure event handlers and data-fetching functions live in the `.js` file (reusable, cacheable). One-off page-level initialization (setting URL variables, tab switching) lives inline in the blade where the Blade/PHP values are available:

```html
<script>
  var listMedicationLogUrl = "{{ url('roster/client/medication-log-list') }}";

  var client_id = "{{ $client_id }}";
</script>

<script src="client_details.js" defer></script>
```

The JS file reads `listMedicationLogUrl` and `client_id` as global variables set by the blade.

**The missing `client_id` bug**

`showMedicationList()` was calling:

```javascript
$.ajax({ data: { _token: token } }); // no client_id!
```

The service method `ClientManagementService::list()` filters by `client_id` only if it's present:

```php

if (!empty($filters['client_id'])) {

$query->where('client_id', $filters['client_id']);

}

```

So when `client_id` was absent, NO filter was applied and ALL clients' medication logs came back. It's the kind of bug that passes a quick test (you see logs) but is wrong in a multi-client system. Fix: pass `client_id: client_id` in the AJAX data.

**Two handlers for the same button — the conflict**

The blade had an inline handler:

```javascript
$(document).on("click", ".marSheetDetails", function () {
  $(".medicationSectionFirst").hide();

  $(".medicationSectionSecond").show();
});
```

And `client_details.js` added a new handler that fetched data AND then showed the section. Both would fire on click. The problem: the inline one would show the empty detail section immediately (before data loaded). The fix: remove the inline one. The JS file handler now owns the full flow: fetch data → populate containers → then show section.

**GET vs POST for the detail endpoint**

- `GET /client/medication-log-detail/{id}` — read-only, ID in URL. GET is correct for fetching a single record.

- `POST /client/medication-log-delete` — mutates data (soft-delete). POST is correct for any action that changes DB state.

This matters because GET requests can be bookmarked, cached, and replayed by browsers. You never want a data-changing action on a GET route.

### ✅ Task 6 — Incident Management (Roster) Completion

**Date:** March 30, 2026

**Time spent:** ~1.5h

**What was found:**

- Main listing page (`incident.blade.php`, 748 lines) — fully built: AJAX loads data, add incident form with all fields, safeguarding details, filters, pagination

- Service layer (`StaffReportIncidentService`) — `store()`, `list()`, `report_details()` all built

- Model, relationships, routes all in place

- Details page (`incident_report_details.blade.php`) — existed but was 100% static mockup data

**What was fixed/completed:**

- `incident_report_details($id)` controller method — was returning view with no data; now passes real incident with eager-loaded relationships (incidentType, clients, safeguarddetails)

- Added home_id ownership check to prevent viewing other homes' incidents

- Added `incident_status_update()` controller method — AJAX endpoint to change status

- Added `POST /roster/incident-status-update` route

- Details view header — wired real incident type, severity badge, status badge, safeguarding/CQC flags, ref number

- Details view incident section — wired real what_happened, immediate_action, date/time, location, client name

- Details view safeguarding section — conditional display based on is_safeguarding; real safeguarding types from pivot table

- Details view investigation section — shows real investigation_findings, resolution_notes, lessons_learned (or "No details yet")

- Details view status dropdown — inline AJAX update with green border flash on save

- Listing view incident type filter — was hardcoded with wrong IDs; now uses `$incident_type` from controller

- Listing view "Urgent Action Required" section — was hardcoded "6 incidents / 2 critical"; now shows real live counts

**Files changed:**

- `app/Http/Controllers/frontEnd/Roster/IncidentManagementController.php` — wired details, added status update, added live counts

- `routes/web.php` — added status update route

- `resources/views/frontEnd/roster/incident_management/incident_report_details.blade.php` — wired all real data

- `resources/views/frontEnd/roster/incident_management/incident.blade.php` — fixed type filter, wired counts

**Teaching Notes:**

**The Service Layer pattern (used heavily in this app)**

Incident Management uses a `StaffReportIncidentService` between the controller and the model:

```

Controller → Service → Model → Database

```

The controller calls `$this->incidentService->report_details($id)` rather than calling `StaffReportIncidents::find($id)` directly. Why?

- The same service is used by both the web controller AND the API controller — one place to change query logic

- Keeps controllers thin (just HTTP concerns: auth check, input, response format)

- Service handles business logic: which relationships to eager-load, which filters to apply

**Eager loading with `with()` (avoiding N+1 queries)**

```php

$incident = StaffReportIncidents::with(['incidentType', 'clients', 'safeguarddetails'])->find($id);

```

Without `with()`, accessing `$incident->incidentType->name` in the blade would fire a separate SQL query every time. With `with()`, Laravel loads all related records in one extra query upfront. This is called "eager loading" — load everything you'll need before the loop, not during it.

**What was a "static mockup" and why it's dangerous**

The details blade had hardcoded HTML like `<span>Broken arm</span>` and `<span>Staff: John Smith</span>`. This is a UI mockup — it looks finished in a browser but has zero real data. The bug is invisible until you click through to a real incident. The fix was replacing each hardcoded value with `{{ $incident->what_happened }}`, `{{ $incident->incidentType->name }}`, etc.

**Inline AJAX status update (no page reload)**

The status dropdown in the details view fires on `change`:

```javascript
$("#incidentStatus").on("change", function () {
  $.post(
    statusUpdateUrl,
    { id: incident_id, status: $(this).val(), _token: token },
    function (r) {
      if (r.success) {
        /* flash green border */
      }
    },
  );
});
```

The controller validates ownership (`where('home_id', $home_id)`) before saving — critical security check. Without it, any authenticated user could change the status of any incident by sending the right ID.

**Counting for dashboards (live counts)**

```php

$data['cqc_pending_count'] = StaffReportIncidents::where('home_id', $home_id)

->where('cqcNotification', 1)

->whereNull('deleted_at')

->whereIn('status', [1, 2])

->count();

```

This is passed to the blade and rendered as `{{ $cqc_pending_count }}` instead of the hardcoded `6`. The `whereIn('status', [1, 2])` means "only open/in-progress incidents" — we don't want resolved ones in the urgent count.

---

### ✅ Task 5 — Staff Training (verify + fix)

**Date:** March 30, 2026

**Time spent:** ~30min

**What was found:**

- `TrainingController` — fully built: index, add, view, completed/active/not-completed AJAX endpoints, status_update, add_user_training, view_fields, edit_fields, delete

- `training_listing.blade.php` — calendar grid layout (Jan–Dec by year), add modal, edit modal with AJAX data population, form validation

- `training_view.blade.php` — per-training page showing active/completed/not-completed staff, AJAX pagination per section, staff assignment form with Select2

- All 9 routes registered

**Bugs fixed:**

- Delete training: click handler confirmed but then did nothing (navigation was commented out with wrong URL `/service/care_team/delete/`). Fixed to navigate to the `href` set on the element.

- "Not Completed" empty state: `@if($completed_training->isEmpty())` was checking the wrong variable. Fixed to `$not_completed_training->isEmpty()`.

**Files changed:**

- `resources/views/frontEnd/staffManagement/training_listing.blade.php` — fixed delete navigation

- `resources/views/frontEnd/staffManagement/training_view.blade.php` — fixed wrong empty check

**Teaching Notes:**

**How to diagnose a "button does nothing" bug**

The delete button JS was:

```javascript
if (confirm("Are you sure?")) {
  // window.location.href = '/service/care_team/delete/' + id; ← commented out, wrong URL
}
```

The developer had commented out the navigation while testing and never put it back. The fix was to navigate to the correct URL that was already set as the `href` on the anchor tag — `window.location.href = $(this).attr('href')`. The lesson: always check if the confirm/click handler actually does anything after the condition.

**Blade variable naming bug**

```php

@if($completed_training->isEmpty())

No not-completed training yet

@endif

```

This rendered the "empty" message when `$completed_training` was empty, not when `$not_completed_training` was empty. So the Not Completed section showed an incorrect empty message while having real data. The fix was a one-word change: `$not_completed_training->isEmpty()`. These are the easiest bugs to miss in code review because the logic looks right at a glance — you only catch it by testing each section independently.

**Why this task was 30 minutes instead of hours**

Not every task needs building from scratch. The audit step (reading the controller, routes, blade) showed everything was already working. The skill is knowing when to stop looking for things to build and just fix what's broken. Over-engineering wastes time.

---

### ✅ Task 4 — Body Maps (verify + fix)

**Date:** March 30, 2026

**Time spent:** ~30min

**What was found:**

- View (`body_map.blade.php`) — fully built, interactive SVG with 60+ clickable body regions (front + back)

- Controller (`BodyMapController`) — index, addInjury, removeInjury all existed

- Routes — all 3 routes existed

- CSRF — handled globally by `$.ajaxSetup` in `developer.js`

**Bugs fixed:**

- `removeInjury` was deleting ALL body_map records globally with a given `sel_body_map_id`, regardless of which service user or risk they belonged to. Fixed by scoping the `WHERE` clause to include `su_risk_id`.

- Route param for remove was named `service_user_id` but the JS passes `su_risk_id` — corrected to match.

**Files changed:**

- `app/Http/Controllers/frontEnd/ServiceUserManagement/BodyMapController.php` — scoped removeInjury by su_risk_id

- `app/BodyMap.php` — added $fillable

- `routes/web.php` — corrected remove route param name

**Teaching Notes:**

**How Body Maps work conceptually**

The blade renders an SVG diagram of a human body (front + back view). Each region (e.g. left shoulder, right knee) has a unique ID like `sel_body_map_id = "LEFT_SHOULDER"`. When a user clicks a region:

- If it's not marked → AJAX POST to `addInjury` → saves a `body_map` row → region turns red

- If it's already marked → AJAX POST to `removeInjury` → soft-deletes that row → region clears

On page load, `index()` fetches existing marked regions and passes them to the blade so it can pre-highlight them.

**The data corruption bug (critical lesson)**

Before the fix, `removeInjury` did:

```php

BodyMap::where('sel_body_map_id', $selected_id)->update(['is_deleted' => '1']);

```

This would delete ALL records with that body part ID across ALL service users and ALL risks. So if Client A had "LEFT_SHOULDER" marked on Risk #5, and someone removed it for Client B on Risk #12, it would also delete Client A's record. The fix scopes it:

```php

$query = BodyMap::where('sel_body_map_id', $selected_id);

if ($su_risk_id) {

$query->where('su_risk_id', $su_risk_id);

}

```

**Lesson:** Always scope deletes/updates to the owning record. Never delete by a single non-unique identifier.

**Route param mismatch**

The route was defined as `/body-map/remove/{service_user_id}` but the JS was sending the `su_risk_id` value. In Laravel, the route param name is just a label — `$su_risk_id` in the method signature must match what's in `{curly_braces}` in the route. Renaming the route param to `{su_risk_id}` fixed the disconnect.

**`$fillable` on the model**

`BodyMap::create([...])` uses mass assignment (passing an array). Without `$fillable`, Laravel throws a `MassAssignmentException` as a security guard. Adding `protected $fillable = ['service_user_id', 'staff_id', 'sel_body_map_id', 'su_risk_id']` whitelists exactly which columns can be set this way.

---

### ✅ Task 3 — DoLS Frontend Views

**Date:** March 30, 2026

**Time spent:** ~1.5h

**What was built:**

- List page at `/dols` — filters by service user, status, referral date range; paginated 25/page

- Status badges with colour coding (green = Authorised, red = Not Authorised, yellow = Expired/Under Review, etc.)

- View Detail modal — shows all fields including compliance checklist as Yes/No badges

- Edit button links to form; Delete button uses AJAX soft-delete

- Create/Edit form at `/dols/create` and `/dols/{id}/edit`:

- Core details: service user, status, auth type, case reference

- Key dates: referral, auth start, auth end, review

- Assessors: supervisory body, best interests assessor, mental health assessor, reason

- Compliance checklist: 5 checkboxes (IMCA, MCA, appeal rights, care plan, family notified)

- Additional notes textarea

- Existing API routes (`POST client/save-dols`, `POST client/dols-list`) left untouched

**Files changed:**

- `app/Models/Dol.php` — added `serviceUser()` relationship

- `app/Http/Controllers/frontEnd/ServiceUserManagement/DolsAdminController.php` — **new file**

- `resources/views/frontEnd/serviceUserManagement/dols.blade.php` — **new file**

- `resources/views/frontEnd/serviceUserManagement/dols_form.blade.php` — **new file**

- `routes/web.php` — added 6 DoLS routes

**Teaching Notes:**

**Full CRUD — what that means**

DoLS is the first task that needed the complete Create/Read/Update/Delete cycle. The 6 routes map to 6 controller methods:

```

GET /dols → index() (list all)

GET /dols/create → create() (show blank form)

POST /dols → store() (save new record)

GET /dols/{id}/edit → edit() (show filled form)

PUT /dols/{id} → update() (save changes)

DELETE /dols/{id} → destroy() (soft delete)

```

This is the standard Laravel "resourceful" routing pattern. You could replace all 6 routes with `Route::resource('dols', DolsAdminController::class)`.

**One form view used for both create and edit**

Rather than two separate blade files, `dols_form.blade.php` is shared. The controller passes `$dol = null` for create and `$dol = Dol::find($id)` for edit. In the blade:

```php

<input name="client_id" value="{{ $dol ? $dol->client_id : '' }}">

```

The form action also switches: `{{ $dol ? route('dols.update', $dol->id) : route('dols.store') }}`.

**Why `$request->has()` for checkboxes instead of `$request->input()`**

HTML checkboxes are NOT submitted at all when unchecked — they simply don't appear in the POST data. So `$request->input('imca_appointed')` returns `null` for both "unchecked" and "not in form". `$request->has('imca_appointed')` correctly returns `false` when unchecked, `true` when checked. That's why we do:

```php

'imca_appointed' => $request->has('imca_appointed') ? 1 : 0,

```

**`homeId()` private helper method**

All 5 methods that need the home_id do the same `explode(',', Auth::user()->home_id)[0]` dance. Instead of repeating that in every method, we extracted it into a private helper:

```php

private function homeId() {

return explode(',', Auth::user()->home_id)[0];

}

```

Then every method just calls `$this->homeId()`. Keeps code DRY.

**Ownership check on edit/update/delete**

```php

$dol = Dol::where('id', $id)->where('home_id', $home_id)->firstOrFail();

```

The `where('home_id', $home_id)` is a security check — it ensures a user from Home A can't edit/delete DoLS records belonging to Home B just by guessing an ID. `firstOrFail()` throws a 404 if nothing matches, which Laravel handles automatically.

**SoftDeletes on the Model**

`Dol` uses `use SoftDeletes`. This means `$dol->delete()` doesn't run `DELETE FROM dols` — it sets `deleted_at = NOW()`. All normal queries automatically add `WHERE deleted_at IS NULL` so soft-deleted records are invisible unless you explicitly use `withTrashed()`.

---

### ✅ Task 2 — Handover Notes

**Date:** March 26, 2026

**Time spent:** ~1.5h

**What was built:**

- New standalone admin page at `/handover/notes` (separate from the existing AJAX-only handover flow at `/handover/daily/log`)

- Filter panel — search by title, date picker, assigned staff dropdown, clear filters link

- Records table — #, Title, Service User, Created By, Handed To, Date, View button

- View Detail modal — shows all fields (title, su, date, staff, assigned, details, notes) populated via JS data attributes

- Pagination with query string preserved

**Files changed:**

- `app/Http/Controllers/frontEnd/HandoverController.php` — added `admin_index()` method with query, filters, pagination

- `resources/views/frontEnd/staffManagement/handover_notes.blade.php` — **new file** — full UI with modal + JS

- `routes/web.php` — added GET `/handover/notes`

**Notes:**

- Existing `index()` (AJAX modal endpoint) and `handover_log_edit()` left completely untouched

- `home_id` is split from comma-separated string (Auth user may have multiple homes); uses first ID

**Teaching Notes:**

**Why a new method instead of editing the existing one?**

`HandoverController::index()` already handled the AJAX handover submission flow used elsewhere in the app. Touching it risked breaking that. Instead we added `admin_index()` as a completely separate method — same controller, new responsibility. This is the "open/closed" principle: open for extension, closed for modification.

**The query pattern: build then filter**

```php

$query = HandoverLogBook::select(...)

->leftJoin('user as u', ...)

->leftJoin('user as au', ...) // two joins on same table — need aliases

->where('home_id', $home_id);



if ($request->filled('search')) {

$query->where('title', 'like', '%'.$request->search.'%');

}

$records = $query->paginate(25);

```

The query is built as a "query builder object" and filters are conditionally added before executing. `$request->filled('search')` means "was this field submitted AND is it non-empty?" — safer than just `isset()`.

**Two JOINs on the same table**

`handover_log_book` has both `user_id` (who created it) and `assigned_staff_user_id` (who it was handed to) — both pointing to the `user` table. To join the same table twice you need SQL aliases:

```sql

LEFT JOIN user AS u ON u.id = handover_log_book.user_id

LEFT JOIN user AS au ON au.id = handover_log_book.assigned_staff_user_id

```

Then in SELECT: `u.name as staff_name`, `au.name as assigned_staff_name`.

**Pagination with filters preserved**

Laravel's `paginate(25)` automatically generates Next/Previous links. But if the user filtered by a date and clicks Next, the filter disappears unless you append it. In the blade: `{{ $records->appends(request()->query())->links() }}` — this tells Laravel to include all current GET params in the pagination URLs.

**Modal populated from data attributes (no extra AJAX)**

Instead of making an AJAX call when the View button is clicked, all record data is embedded in `data-*` attributes on the button:

```html
<button data-title="{{ $r->title }}" data-notes="{{ $r->details }}" ...>
  View
</button>
```

The JS reads these on click and populates the modal fields. This works well for read-only modals where you don't need to fetch extra related data.

---

### ✅ Task 9 — Safeguarding Case UI

**Date:** March 31, 2026

**Time spent:** ~1h

**What was found:**

- Safeguarding is embedded inside Incident Management: `staff_report_incidents` table has `is_safeguarding` (0/1), `cqcNotification`, `family_notify`, `policeInvolved` columns

- `SafeguardingType` model — admin-managed list of safeguarding concern types (Physical Abuse, Emotional Abuse, etc.) per home

- `StaffReportIncidentsSafeguarding` — pivot table linking incidents to safeguarding types (`staff_report_incidents_safeguardings`)

- `StaffReportIncidents::safeguarddetails()` — `belongsToMany` relationship already defined

- Existing incident form (`incident.blade.php`) already has "This is a SAFEGUARDING concern" checkbox and safeguarding type multi-select — no new create form needed

- Existing detail page (`/roster/incident-report-details/{id}`) already shows safeguarding section with type badges — no new detail page needed

**What was built:**

- Standalone Safeguarding Cases page at `GET /safeguarding` — filters incidents where `is_safeguarding = 1`

- Summary row (4 cards): Total cases, Open/Under Investigation, CQC Notifiable, Police Involved

- Filter form: Service User, Status (Reported / Under Investigation / Resolved / Closed), Safeguarding Type, date range

- Cases table: Ref (monospace), Service User, Incident Type, Safeguarding Types (red badges), Date, Status badge, CQC/FAM/POL flag pills, View button → existing detail page

- Pagination with filter params preserved

**Files changed:**

- `app/Http/Controllers/frontEnd/SafeguardingCaseController.php` — **new file** — index with eager-loaded relationships + 5 filters + paginate(25)

- `resources/views/frontEnd/safeguarding/safeguarding_cases.blade.php` — **new file** — full listing UI with summary cards, filter form, cases table

- `routes/web.php` — added `GET /safeguarding`

**Teaching Notes:**

**Why no new create/edit/detail pages?**

Safeguarding cases in this app ARE incidents — they're just a subset (where `is_safeguarding = 1`). The create form already exists in `incident.blade.php` with the safeguarding checkbox. The detail page already exists with a "SAFEGUARDING" badge and safeguarding types section. Building duplicate forms would be wasted work and create a maintenance burden (two places to update when the form changes). The safeguarding page is purely a **filtered view** — a lens over the incident data.

**`whereHas()` for filtering by pivot relationship**

To filter cases by a specific safeguarding type:

```php

$query->whereHas('safeguarddetails', function ($q) use ($request) {

$q->where('safeguarding_type.id', $request->safeguarding_type_id);

});

```

`whereHas()` generates a `WHERE EXISTS (SELECT ... FROM staff_report_incidents_safeguardings WHERE ...)` subquery. It's the Eloquent way to filter by a related model without doing a JOIN yourself.

**Summary cards from the paginated collection**

The 4 summary cards show counts from `$cases->getCollection()` (the current page only). This is intentional — it gives a quick snapshot of what's visible on screen. If you wanted total counts across all pages, you'd run separate `count()` queries in the controller. Using the collection keeps it simple and avoids extra DB hits.

**CQC/FAM/POL flag pills**

Three one-letter badges in the table: CQC (purple), FAM (blue), POL (red). These map to `cqcNotification`, `family_notify`, `policeInvolved` boolean columns. In a CQC inspection, staff can immediately see which cases have notifications outstanding — scanning a column of pills is faster than reading text.

---

### ✅ Task 8 — Notifications Frontend

**Date:** March 31, 2026

**Time spent:** ~1h

**What was found:**

- `app/Notification.php` — model exists, table: `notification`. Has `getSuNotification()` (returns HTML string) and `getStickyNotifications()` (for gritter popups)

- `notification_bar.blade.php` — sidebar panel showing 4–10 notifications + "View More" modal with date filter (already working, loads from `/service/notifications/`)

- `sticky_notification.blade.php` — gritter popup alerts for urgent events (types 14–21); ack via `sticky_individual_ack` (JSON) and `sticky_master_ack`

- `StickyNotificationController` — `ack_master()` and `ack_individual()` — already working

- No standalone full-page notification listing existed

**What was built:**

- Standalone Notification Centre page at `GET /notifications` with server-side pagination (25/page)

- Filters: Service User dropdown, Notification Type dropdown (all 23 types), From/To date range

- Table listing: #, Type (colour-coded badge), Service User, Action, Date/Time, Ack column

- Mark-as-read AJAX: `POST /notifications/mark-read/{id}` — writes current user + timestamp into `sticky_individual_ack` JSON column (reuses existing ack mechanism)

- Acknowledged rows turn grey with a green tick; unread rows show a "✓" button

- Colour-coded badges: red for urgent (In Danger, Risk Change), orange for Need Assistance, blue for records, green for Placement Plan/Money Request

**Files changed:**

- `app/Http/Controllers/frontEnd/NotificationCenterController.php` — **new file** — index (query + filters + paginate), mark_read (individual ack)

- `resources/views/frontEnd/notifications/notifications_center.blade.php` — **new file** — full listing UI with filters, table, ack buttons, colour JS

- `routes/web.php` — added `GET /notifications` and `POST /notifications/mark-read/{id}`

**Teaching Notes:**

**Why not use `getSuNotification()` from the model?**

`getSuNotification()` returns a raw HTML string (built with string concatenation). That works fine for the sidebar panel, but a standalone page needs actual data objects for pagination, row numbers, and conditional rendering (e.g. is-read state). So the controller queries the `notification` table directly with `DB::table()`, passes the result set to the blade, and the blade does the rendering. This is the cleaner separation: model can keep its HTML-generating method for the sidebar; the new page owns its own query.

**Reusing `sticky_individual_ack` as mark-read for all notifications**

The sticky ack columns already exist on every `notification` row. `sticky_individual_ack` is a JSON column: `{"user_id": "timestamp"}`. The sticky notification system already uses this to hide gritter popups for users who clicked "Ok". The new page reads the same field to decide whether to show a grey acknowledged row vs. an active "✓" button. On button click, `POST /notifications/mark-read/{id}` adds the current user's ID to the JSON. No new DB column needed.

**`$notifications->appends(request()->query())->links()`**

Laravel's `paginate()` generates Next/Prev links but drops all GET params by default. `appends(request()->query())` tells it to include the current filter values in every page link, so filtering is preserved across pages.

---

## Change Log

| Date | File | Change |

|---|---|---|

| Apr 2 | `app/Http/Controllers/frontEnd/Roster/OnboardingConfigurationController.php` | New stub controller — resolves route error; renders placeholder "coming soon" view |

| Apr 2 | `resources/views/frontEnd/roster/onboarding/configuration.blade.php` | New placeholder blade for onboarding configuration |

| Apr 2 | `routes/web.php` | Added `use` import for OnboardingConfigurationController |

| Apr 2 | `app/Services/Staff/StaffService.php` | Wrapped thunderingslap.com API call in try/catch with 5s timeout — was causing SSL timeout errors in log |

|---|---|---|

| Mar 31 | `app/Http/Controllers/frontEnd/SafeguardingCaseController.php` | New controller — index with 5 filters + eager-load safeguarddetails, paginate(25) |

| Mar 31 | `resources/views/frontEnd/safeguarding/safeguarding_cases.blade.php` | New blade — summary cards, filter form, cases table with type badges + CQC/FAM/POL flags |

| Mar 31 | `routes/web.php` | Added GET /safeguarding |

| Mar 31 | `app/Http/Controllers/frontEnd/NotificationCenterController.php` | New controller — index (paginated list + filters), mark_read (individual ack) |

| Mar 31 | `resources/views/frontEnd/notifications/notifications_center.blade.php` | New blade — full listing with type/SU/date filters, pagination, colour badges, AJAX mark-read |

| Mar 31 | `routes/web.php` | Added GET /notifications and POST /notifications/mark-read/{id} |

| Mar 30 | `app/Models/staffManagement/sosAlert.php` | Added fillable, table, relationship |

| Mar 30 | `app/Http/Controllers/frontEnd/StaffManagement/SosAlertController.php` | New controller |

| Mar 30 | `resources/views/frontEnd/staffManagement/sos_alerts.blade.php` | New blade view |

| Mar 30 | `routes/web.php` | Added 2 SOS alert routes |

| Mar 26 | `app/Http/Controllers/frontEnd/HandoverController.php` | Added `admin_index()` method |

| Mar 26 | `resources/views/frontEnd/staffManagement/handover_notes.blade.php` | New blade view |

| Mar 26 | `routes/web.php` | Added GET `/handover/notes` |

| Mar 30 | `app/Http/Controllers/frontEnd/ServiceUserManagement/DolsAdminController.php` | New controller — index, create, store, edit, update, destroy |

| Mar 30 | `app/Models/Dol.php` | Added `serviceUser()` belongsTo relationship |

| Mar 30 | `resources/views/frontEnd/serviceUserManagement/dols.blade.php` | New blade view — list, filters, view modal, delete AJAX |

| Mar 30 | `resources/views/frontEnd/serviceUserManagement/dols_form.blade.php` | New blade view — create/edit form with all fields, compliance checklist |

| Mar 30 | `routes/web.php` | Added 6 DoLS routes (index, create, store, edit, update, delete) |

| Mar 30 | `app/Http/Controllers/frontEnd/ServiceUserManagement/BodyMapController.php` | Fixed removeInjury — now scopes delete by su_risk_id to prevent data corruption |

| Mar 30 | `routes/web.php` | Fixed body-map remove route param name from service_user_id to su_risk_id |

| Mar 30 | `app/BodyMap.php` | Added $fillable array |

| Mar 30 | `resources/views/frontEnd/staffManagement/training_listing.blade.php` | Fixed delete training — navigate to href on confirm instead of commented-out wrong URL |

| Mar 30 | `resources/views/frontEnd/staffManagement/training_view.blade.php` | Fixed Not Completed empty check — was checking $completed_training instead of $not_completed_training |

| Mar 30 | `app/Http/Controllers/frontEnd/Roster/IncidentManagementController.php` | Wired incident_report_details to pass real data; added incident_status_update method; added CQC/critical live counts to index |

| Mar 30 | `routes/web.php` | Added POST /roster/incident-status-update route |

| Mar 30 | `resources/views/frontEnd/roster/incident_management/incident_report_details.blade.php` | Wired real data: header badges, ref, incident details, safeguarding types, investigation section; added status update dropdown with AJAX |

| Mar 30 | `resources/views/frontEnd/roster/incident_management/incident.blade.php` | Fixed hardcoded incident type filter to use dynamic $incident_type; wired live CQC/critical counts in Urgent Action Required section |

---

## Known Issues / Notes

_Bugs, edge cases, and things to revisit will be logged here._

---

## Laravel Error Audit #2 — April 7, 2026

**Scope:** Full `storage/logs/laravel.log` audit (~51,595 lines, 25 unique error types)

**Result:** 15 files modified, 3 files created, 9 issues resolved by next deploy

---

### CRITICAL Fixes (9 issues, ~200 hits total)

| # | Error | Hits | File(s) | Fix |

|---|-------|------|---------|-----|

| 1 | `RelationNotFoundException` — undefined `emergencyContacts` / `shifts` on User | 78 | `app/User.php` | **Deploy only** — both relations exist locally (lines 115, 357). Errors from old server. |

| 2 | `Collection::latest does not exist` | 34 | `app/Http/Controllers/Api/Staff/ClientCareTaskApi.php` | Added Builder type guard + null-safe `?->` on `clientTaskType` and `clientTaskCategorys` access |

| 3 | `HomeArea` model / `home_areas` table missing | 29 | `ScheduleShiftController.php`, new migration | Created migration `2026_04_07_000001_create_home_areas_table.php`. Added try/catch fallback in `index()` |

| 4 | `Undefined array key 0` in severity/status lookup | 8 | `app/Http/Controllers/Api/Staff/IncidentManagementApi.php` | Added key `0` to arrays + `?? 'Pending'` / `?? 'Unknown'` fallbacks |

| 5 | `ClientTaskType` not found (PSR-4 case) | 8 | `clientTaskType.php` → `ClientTaskType.php`, `clientTaskCategory.php` → `ClientTaskCategory.php`, + 4 files | Renamed files + class names to PascalCase. Updated all `use` imports and static calls |

| 6 | `DynamicFormBuilder` not found | 7 | `app/Services/Staff/StaffTaskService.php` | **Deploy only** — import `use App\DynamicFormBuilder` already on line 4 |

| 7 | `getShiftUser()` undefined | 6 | `app/Services/Staff/StaffService.php` | **Deploy only** — method exists at line 326 |

| 8 | `ScheduledShift` model not found | 5 | `app/Models/ScheduledShift.php` | **Deploy only** — model exists locally |

| 9 | `getCarerAvailabilityDetails()` undefined | 5 | `app/Services/Staff/StaffService.php` | **Deploy only** — method exists at line 489 |

---

### MEDIUM Fixes (13 issues, ~45 hits total)

| # | Error | Hits | File | Fix |

|---|-------|------|------|-----|

| 11 | `property "title" on null` | 14 | `staffTaskFormwebview.blade.php:42` | Changed `$formTemplate->title` to `$formTemplate->title ?? 'Untitled Form'` |

| 12 | `OnboardingConfigurationController` not found | 5 | `routes/web.php` | **Already resolved** — controller + route exist from Apr 2 fix |

| 13 | `Collection::get()` too few args | 4 | `CarerController.php:133` | **Deploy only** — current code correct |

| 14 | `$staffDetails` undefined | 3 | `CarerDetailsController.php:30` | Added `if (!$staffDetails) { abort(404); }` before `->load()` |

| 15 | `greaterThanOrEqualTo()` on string | 3 | `UserController.php:737` | **Already resolved** — refactored to string comparison |

| 16 | `security_code` on null | 3 | `UserController.php:397` | Added `if (!$user)` null check + redirect with error |

| 17 | `$ref` undefined + `is_safeguarding` | 4 | `StaffReportIncidentService.php` | Added else branch for count >= 1000, fixed `>=100` condition, fixed `($countData+1)` precedence, added `?? 0` on is_safeguarding |

| 18 | `Validator` not found | 2 | `ScheduleShiftController.php` | **Deploy only** — import exists on line 18 |

| 19 | `DB` not found | 2 | `CarerAvailabilityController.php` | **Deploy only** — import exists on line 13 |

| 20 | `DashboardController` doesn't exist | 2 | `routes/web.php:272` | Created stub `ServiceUserManagement/DashboardController.php` + blade view |

| 21 | Namespace fatal error | 2 | `SystemManagementController.php:2` | **Already resolved** — namespace correct in current code |

| — | `height_ft` undefined key | 2 | `SystemManagementController.php:173` | Added `?? null` on height_unit, height_ft, height_in, weight_unit, weight |

| — | `stafftasktype->type` on null | 2 | `StaffTaskController.php:158` | Changed to `$q->stafftasktype?->type ?? 'N/A'` |

---

### LOW Fixes (4 issues, ~34 hits total)

| # | Error | Hits | File | Fix |

|---|-------|------|------|-----|

| 22 | thunderingslap.com timeouts | 25 | `StaffService.php` | **Already resolved** — try/catch + 5s timeout from Apr 2 |

| 23 | Delete Client Care Task errors | 5 | `ClientCareTaskService.php:125` | Changed `find()` to `findOrFail()`, fixed `$data` → `$id` in error log |

| 24 | `StaffSupervisionForm` not found | 2 | `StaffSupervisionService.php` | **Deploy only** — model exists at `app/Models/Staff/StaffSupervisionForm.php` |

| 25 | `is_safeguarding` undefined key | 2 | `StaffReportIncidentService.php` | Fixed in #17 above |

---

### Files Modified (15)

| File | Changes |

|------|---------|

| `app/Http/Controllers/Api/Staff/ClientCareTaskApi.php` | Builder type guard, null-safe property access |

| `app/Http/Controllers/Api/Staff/IncidentManagementApi.php` | Safe array lookups with ?? fallback |

| `app/Http/Controllers/frontEnd/Roster/ScheduleShiftController.php` | try/catch on HomeArea query |

| `app/Http/Controllers/frontEnd/Roster/Client/ClientController.php` | PSR-4 class name updates |

| `app/Http/Controllers/frontEnd/Roster/Staff/CarerDetailsController.php` | Null check before load() |

| `app/Http/Controllers/frontEnd/Roster/Staff/StaffTaskController.php` | Null-safe on stafftasktype |

| `app/Http/Controllers/frontEnd/UserController.php` | Null check on password reset |

| `app/Http/Controllers/frontEnd/SystemManagementController.php` | Null fallbacks on height/weight |

| `app/Http/Controllers/backEnd/homeManage/clientManagementController.php` | PSR-4 class name updates |

| `app/Models/ClientTaskType.php` | Renamed from clientTaskType.php, class name fixed |

| `app/Models/ClientTaskCategory.php` | Renamed from clientTaskCategory.php, class name fixed |

| `app/Models/ClientCareTask.php` | Updated relationship class references |

| `app/Services/Staff/StaffReportIncidentService.php` | Fixed $ref, operator precedence, is_safeguarding |

| `app/Services/Staff/ClientCareTaskService.php` | findOrFail, fixed $data reference |

| `resources/views/frontEnd/roster/staff/staffTaskFormwebview.blade.php` | Null-safe on formTemplate |

### Files Created (3)

| File | Purpose |

|------|---------|

| `database/migrations/2026_04_07_000001_create_home_areas_table.php` | Migration for home_areas table |

| `app/Http/Controllers/frontEnd/ServiceUserManagement/DashboardController.php` | Stub controller for service user dashboard route |

| `resources/views/frontEnd/serviceUserManagement/dashboard.blade.php` | Stub blade view |

### Post-Deploy Checklist

1. Deploy all updated files to the live server

2. Run `php artisan migrate` to create `home_areas` table

3. Run `composer dump-autoload` to refresh autoload map (renamed PSR-4 files)

4. Clear the Laravel log: `> storage/logs/laravel.log`

5. Monitor log for 24-48 hours to confirm fixes

---

#### Documentation update — April 7, 2026

- Updated `larvellogsaudit.md` with full detailed fix descriptions for all 25 issues — includes before/after code snippets, root cause analysis, and investigation notes for every issue

---

#### ✅ Step 2 — N+1 Query Fixes

**Date:** April 7, 2026

**Audited all Phase 1 list views for N+1 query issues.** Most controllers already had proper eager loading. Found and fixed 4 issues:

| File | Method | Issue | Fix |

|------|--------|-------|-----|

| `app/Services/Staff/ClientCareTaskService.php` | `details()` | `find($id)` with no eager loading — accessing `clientTaskType`, `clientTaskCategorys`, `clients`, `carers` in controller triggered 4 extra queries per request | Added `->with(['clientTaskType:id,title', 'clientTaskCategorys:id,title', 'clients:id,name', 'carers:id,name'])` |

| `app/Http/Controllers/frontEnd/Roster/ScheduleShiftController.php` | `getMonthlyShifts()` | Accessed `$shift->staff->first_name` / `last_name` but User model only has `name` field — returned empty strings | Changed to `$shift->staff->name ?? ''` |

| `app/Http/Controllers/frontEnd/Roster/ScheduleShiftController.php` | `get90DaysData()` | Missing `home_id` scope — returned shifts from ALL homes (security + data issue) | Added `->where('home_id', Auth::user()->home_id)` |

| `app/Http/Controllers/frontEnd/Roster/Staff/CarerController.php` | `allShifts()` | `with()` missing `client` relationship — any future `$shift->client->name` access would N+1 | Added `'client'` to `with()` array |

**No issues found in:**

- `SosAlertController` — proper `with('staff')`

- `DolsAdminController` — proper `with('serviceUser')`

- `SafeguardingCaseController` — proper `with(['incidentType', 'clients', 'safeguarddetails'])`

- `HandoverController` — uses JOINs (no N+1)

- `RosterController::index()` — proper `with(['client', 'staff'])`

- `ScheduleShiftController::index()` — proper `with(['client', 'staff'])`

- `ScheduleShiftController::getWeeklyData()` — proper `with(['recurrence', 'documents', 'assessments'])`

- `ScheduleShiftController::scheduleShiftByGroup()` — proper `with(['shifts.client', 'shifts.recurrence', ...])`

- `CarerController::dayShifts()` — proper `with(['staff', 'client', 'recurrence', 'documents', 'assessments'])`

- `CarerController::weekShifts()` — proper `with(['staff', 'client', 'recurrence', 'documents', 'assessments'])`

- `StaffService::attachQualifications()` — uses batch `whereIn` (efficient)

**Files changed:**

- `app/Services/Staff/ClientCareTaskService.php` — eager loading on details()

- `app/Http/Controllers/frontEnd/Roster/ScheduleShiftController.php` — staff_name field fix + home_id scope

- `app/Http/Controllers/frontEnd/Roster/Staff/CarerController.php` — added client to with()

#### Documentation update — April 7, 2026

- Wrote full `N+1audit.md` with detailed before/after code for all 4 fixes + confirmation notes for all 12+ clean controllers

- Updated Claude Code memory `project_progress.md` — reflects Phase 1 build complete + both audits done, references `logs.md`, `larvellogsaudit.md`, `N+1audit.md` for future sessions
