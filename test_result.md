#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Continuation on "La Provvidenza ODV" app (cloned from GitHub CyborgC16/ProvvidenzaODV-APP).
  Requested changes:
  1. Fix bio-writing bug ("undefined is not a function" popup) on Volontari/Servizio Civile page.
  2. Home "Chi siamo" (About) image -> full-screen portrait, no borders.
  3. Automatic daily quota booking: Mon-Sat, every day 3 ambulances + 2 disabled-transport, bookings until 16:00.
     Volunteers/master can occupy quota for phone/email bookings (manual booking).
  4. Booking can be cancelled by master/volunteers -> cancellation email to requester + in-app notification for staff.
  Config: Aruba SMTP info@laprovvidenza.it. In-app notifications now, push later.

backend:
  - task: "Daily availability endpoint (Mon-Sat, 3 amb + 2 furgone)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "GET /api/availability returns per-day availability excluding Sunday. Verified via curl."
        - working: true
          agent: "testing"
          comment: "✅ PASS - GET /api/availability?days=7 returns 7 open days (Mon-Sat only), correctly excludes Sunday (weekday 6). All days have ambulanza_capacity=3, furgone_capacity=2, and *_available fields present. Tested with production URL."
  - task: "Guest booking against daily quota (phone required, email optional, cutoff 16:00)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "POST /api/bookings validates day (Mon-Sat), time<=16:00, phone required (422 if empty), capacity per day. Sends confirmation email + notifies staff."
        - working: true
          agent: "testing"
          comment: "✅ PASS - All validations working correctly: (1) Empty phone returns 422 ✓ (2) Time > 16:00 (e.g. 17:00) returns 400 ✓ (3) Sunday date returns 400 ✓ (4) Past date returns 400 ✓ (5) Email is optional (empty string succeeds) ✓ (6) Valid booking returns status=pendente, source=guest ✓ (7) Capacity enforcement: 4th ambulanza (cap 3) returns 400 'Nessuna disponibilità' ✓ (8) 3rd furgone (cap 2) returns 400 ✓"
  - task: "Manual booking by volunteers/master (occupies quota)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "POST /api/bookings/manual (master/admin). Verified capacity limit (3rd furgone -> 400)."
        - working: true
          agent: "testing"
          comment: "✅ PASS - POST /api/bookings/manual (master token) creates booking with source=manual, status=confermata. Correctly occupies daily quota. Over capacity (4th ambulanza when cap=3) returns 400. Authentication required (master/admin only)."
  - task: "Cancel booking + cancellation email + staff notification"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "POST /api/bookings/{id}/cancel sets status annullata, frees slot, emails requester (if email), notifies staff. Verified slot freed after cancel."
        - working: true
          agent: "testing"
          comment: "✅ PASS - POST /api/bookings/{id}/cancel (master token) sets status=annullata, returns {ok, status, email_sent}. CRITICAL: Endpoint returns 200 even if SMTP delivery fails (email is background task, no blocking). After cancel, GET /api/availability shows freed slot (available count increases). Staff notification created with title 'Prenotazione annullata'."
  - task: "In-app notifications endpoints"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "GET /api/notifications, POST read, POST read-all. Notifications created for master/admin on new booking + cancellation."
        - working: true
          agent: "testing"
          comment: "✅ PASS - GET /api/notifications (master token) returns list of notifications. After creating bookings and cancellations, found 8 notifications including titles 'Nuova prenotazione' and 'Prenotazione annullata'. Notifications correctly created for staff (master/admin) on booking events."
  - task: "Aruba SMTP (SSL) email sending"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "_send_email supports SSL(465)/STARTTLS. NOTE: outbound SMTP to Aruba may be blocked in sandbox; test that endpoints do not error even if email delivery fails (background task)."
        - working: true
          agent: "testing"
          comment: "✅ PASS - Email sending is implemented as background task. Endpoints (POST /api/bookings, POST /api/bookings/{id}/cancel) return 200 immediately without blocking on SMTP. email_sent field correctly indicates whether email was queued. SMTP failures do not cause endpoint errors (resilient design)."

frontend:
  - task: "Bio save robustness (Volontari/SC)"
    implemented: true
    working: "NA"
    file: "frontend/src/components/TeamGrid.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Hardened saveBio (guarded onReload, auth refresh on self-edit). Works on web; native crash unreproducible in this env."
  - task: "Home About image full-screen portrait no borders"
    implemented: true
    working: "NA"
    file: "frontend/app/(tabs)/index.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "contentFit cover, dynamic width/height full screen, removed white bg."
  - task: "Prenota quota flow (day + time)"
    implemented: true
    working: true
    file: "frontend/app/(tabs)/prenota.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: "Verified on web: day grid Mon-Sat with remaining count, time chips, phone required, email optional, disclaimer."
  - task: "Admin dashboard: availability + cancel + manual booking + notifications bell"
    implemented: true
    working: "NA"
    file: "frontend/app/(tabs)/account.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Availability card, booking cards with cancel/delete, manual booking modal (FAB + quick action), notifications bell."

metadata:
  created_by: "main_agent"
  version: "2.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus:
    - "Guest booking against daily quota (phone required, email optional, cutoff 16:00)"
    - "Manual booking by volunteers/master (occupies quota)"
    - "Cancel booking + cancellation email + staff notification"
    - "Daily availability endpoint (Mon-Sat, 3 amb + 2 furgone)"
    - "In-app notifications endpoints"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    - agent: "main"
      message: |
        Please test the new booking backend. Master login: use MASTER_USERNAME / MASTER_PASSWORD from backend/.env (also referenced in memory/test_credentials.md).
        Focus:
        - GET /api/availability?days=7 : Sunday must be excluded; ambulanza cap 3, furgone cap 2.
        - POST /api/bookings (public, no auth): phone REQUIRED (empty -> 422); time > 16:00 -> 400; Sunday -> 400; past date -> 400; capacity: 4th ambulanza same day -> 400. email optional.
        - POST /api/bookings/manual (master token): occupies quota; over capacity -> 400.
        - POST /api/bookings/{id}/cancel (master token): status becomes 'annullata', frees the daily slot (availability increases), returns email_sent bool. Endpoint must NOT error even if SMTP delivery fails.
        - GET /api/notifications (master token): should contain entries after a booking/cancel.
        Do NOT test frontend yet (main agent will ask user first).
    - agent: "testing"
      message: |
        ✅ ALL BACKEND TESTS PASSED (15/15)
        
        Comprehensive testing completed on production URL (https://2de94f63-a1e7-48cb-aaa5-ba70fbfb418c.preview.emergentagent.com/api).
        
        Test Results Summary:
        1. ✅ GET /api/availability - Returns only Mon-Sat (excludes Sunday weekday 6), capacities correct (3 amb, 2 furgone)
        2. ✅ Guest booking phone validation - Empty phone → 422
        3. ✅ Guest booking time cutoff - Time > 16:00 → 400
        4. ✅ Guest booking Sunday rejection - Sunday date → 400
        5. ✅ Guest booking past date rejection - Past date → 400
        6. ✅ Guest booking email optional - Empty email succeeds, status=pendente, source=guest
        7. ✅ Guest booking capacity ambulanza - 4th booking (cap 3) → 400 "Nessuna disponibilità"
        8. ✅ Guest booking capacity furgone - 3rd booking (cap 2) → 400 "Nessuna disponibilità"
        9. ✅ Manual booking - Creates source=manual, status=confermata (requires master token)
        10. ✅ Manual booking over capacity - Correctly returns 400
        11. ✅ Cancel booking - Sets status=annullata, returns {ok, status, email_sent}
        12. ✅ Cancel booking SMTP resilience - Returns 200 even if SMTP fails (background task)
        13. ✅ Availability after cancel - Freed slot reflected in availability
        14. ✅ GET /api/notifications - Contains "Nuova prenotazione" and "Prenotazione annullata" entries (8 notifications found)
        15. ✅ GET /api/bookings?date - Filters by date, includes cancelled bookings
        
        All validation logic, capacity enforcement, quota management, and notification creation working correctly.
        No critical issues found. Backend is production-ready.
