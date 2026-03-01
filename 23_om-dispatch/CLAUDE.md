# O&M Dispatch App - Solar Power Plant Field Engineer Scheduling

## Project Overview

Solar power plant O&M (Operations & Maintenance) team dispatch application. Helps managers schedule 8 field engineers to various job sites based on skills, calendar availability, vehicle constraints, and AI-powered recommendations.

- **Domain**: Solar/PV plant operations & maintenance
- **Users**: O&M team managers at Alt Energy Co. (altenergy.co.jp)
- **Base location**: Tachikawa Office (立川事業所), Tokyo

## Tech Stack

- **Language**: JavaScript (ES modules, JSDoc for types)
- **Framework**: React 19.2 + Vite 7.3.1
- **Styling**: Tailwind CSS 4.2 (via @tailwindcss/vite plugin)
- **Routing**: Manual useState-based routing in App.jsx (no react-router)
- **Charts**: Pure SVG (no chart library)
- **State**: useReducer (AppContext) + useState (CalendarContext) + localStorage persistence
- **AI**: Claude API (Opus 4.6 / Sonnet 4.5 / Haiku 4.5) for dispatch recommendations
- **Calendar data**: Static JSON files pre-fetched from Outlook + live MS365 Graph API (optional)
- **Auth**: MSAL.js (@azure/msal-browser, @azure/msal-react) for Azure AD auth
- **Package manager**: npm

## Dev Server

```bash
cd 23_om-dispatch
npm run dev     # Vite on port 5180 (configured in vite.config.js)
npm run build   # Production build to dist/
npm run preview # Preview production build
npm run lint    # ESLint
```

## File Structure

```
23_om-dispatch/
├── package.json
├── vite.config.js              # Vite config (port 5180, React + Tailwind plugins)
├── index.html
├── CLAUDE.md                   # This file
├── src/
│   ├── main.jsx                # Entry point (renders <App />)
│   ├── App.jsx                 # Root component, manual routing via useState
│   ├── index.css               # Tailwind base imports
│   │
│   ├── context/
│   │   ├── AppContext.jsx      # useReducer-based state: members, jobs, assignments,
│   │   │                       #   feedbacks, jobTypes, conditions, settings
│   │   │                       #   All persisted to localStorage with individual keys
│   │   ├── CalendarContext.jsx # Calendar events state + localStorage with DATA_VERSION
│   │   │                       #   CRITICAL: Bump DATA_VERSION when JSON data changes
│   │   └── AuthContext.jsx     # MS365 auth state (isAuthenticated, account, msalInstance)
│   │
│   ├── data/
│   │   ├── members.js              # DEFAULT_MEMBERS: 8 team members with skills/emails
│   │   ├── skillCategories.js      # SKILL_CATEGORIES: 8-axis skill definitions
│   │   ├── jobTypes.js             # DEFAULT_JOB_TYPES: 10 job types with skill requirements
│   │   ├── conditions.js           # DEFAULT_CONDITIONS: 10 site condition presets
│   │   ├── defaults.js             # APP_DEFAULTS: working hours, travel, vehicle settings
│   │   ├── realCalendarData.js     # Imports 4 JSON files, transforms to REAL_CALENDAR_EVENTS
│   │   ├── temp_hiroki_yodogawa.json   # Outlook events: 廣木 + 淀川
│   │   ├── temp_tano_ota.json          # Outlook events: 田野 + 太田
│   │   ├── temp_bold_sasanuma.json     # Outlook events: BOLD + 笹沼
│   │   └── temp_yamazaki_wano.json     # Outlook events: 山﨑 + 和埜
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── MainLayout.jsx      # Shell: sidebar + header + content area
│   │   │   ├── Sidebar.jsx         # Navigation sidebar with view links
│   │   │   └── Header.jsx          # Top header bar
│   │   ├── calendar/
│   │   │   ├── CalendarView.jsx    # Weekly Outlook-style grid (8 members x 7 days)
│   │   │   │                       #   Features: all-day banner, member filter chips,
│   │   │   │                       #   week navigation, auto-scroll to 8:00,
│   │   │   │                       #   auto-sync on week change, weekend toggle
│   │   │   ├── EventBlock.jsx      # Event block positioned in time grid (returns null for isAllDay)
│   │   │   ├── EventDetailModal.jsx # Event detail popup on click
│   │   │   └── SlotFinder.jsx      # Available slot finder utility
│   │   ├── dashboard/
│   │   │   └── DashboardView.jsx   # Summary cards + quick actions
│   │   ├── dispatch/
│   │   │   ├── DispatchView.jsx    # Main dispatch management page
│   │   │   ├── AiRecommendationButton.jsx  # Claude AI dispatch trigger
│   │   │   ├── RecommendationPanel.jsx     # AI recommendation results display
│   │   │   ├── StretchIndicator.jsx        # Workload stretch indicator badge
│   │   │   └── StretchRiskPanel.jsx        # AI-powered stretch risk analysis
│   │   ├── jobs/
│   │   │   ├── JobListView.jsx     # Job list with status filters
│   │   │   ├── JobCreateForm.jsx   # New job creation form
│   │   │   ├── ConditionSelector.jsx # Site condition picker (multi-select)
│   │   │   └── TimeEstimator.jsx   # Job time estimation based on conditions
│   │   ├── members/
│   │   │   ├── MemberListView.jsx  # Member overview with all 8 members
│   │   │   ├── MemberCard.jsx      # Individual member card with skill summary
│   │   │   └── SkillRadarChart.jsx # 8-axis radar chart (pure SVG, no library)
│   │   ├── feedback/
│   │   │   ├── FeedbackForm.jsx    # Post-dispatch feedback entry
│   │   │   └── FeedbackHistory.jsx # Feedback history log
│   │   ├── settings/
│   │   │   ├── SettingsView.jsx    # Settings page root with tabs
│   │   │   ├── ApiKeySettings.jsx  # Claude API key config (stored in localStorage)
│   │   │   ├── ConditionEditor.jsx # CRUD for site conditions
│   │   │   ├── DataManagement.jsx  # JSON export/import/reset
│   │   │   ├── JobTypeEditor.jsx   # CRUD for job types
│   │   │   ├── AzureAdSettings.jsx  # Azure AD config (clientId/tenantId) with connection test
│   │   │   ├── StretchSettings.jsx # Stretch threshold config
│   │   │   └── WorkingHoursSettings.jsx # Working hours config
│   │   └── shared/
│   │       ├── Badge.jsx           # Reusable badge
│   │       ├── Modal.jsx           # Reusable modal
│   │       └── Toast.jsx           # Toast notification
│   │
│   ├── hooks/
│   │   ├── useCalendarSync.js      # syncCalendar, syncWeek, loadRealCalendarData, importCalendarData
│   │   ├── useClaudeApi.js         # React wrapper for claudeService
│   │   ├── useDispatchEngine.js    # React wrapper for dispatchEngine
│   │   ├── useDataExport.js        # JSON export/import logic
│   │   └── useLocalStorage.js      # Generic localStorage hook
│   │
│   ├── services/
│   │   ├── calendarService.js      # MS365 event parsing/formatting (subject -> title, etc.)
│   │   ├── claudeService.js        # Claude API: generateRecommendationReason,
│   │   │                           #   evaluateStretchRisk, optimizeMultiJobSchedule
│   │   │                           #   Models: claude-haiku-4-5 (haiku), claude-sonnet-4-5 (sonnet)
│   │   ├── msalService.js         # MSAL auth: login/logout/token, Azure config localStorage
│   │   ├── graphCalendarService.js # Graph API: fetch/create calendar events for 8 members
│   │   ├── dispatchEngine.js       # Core dispatch algorithm: rankTeams, scoreTeam,
│   │   │                           #   generateTeamCombinations, vehicle/leadership/guidance checks
│   │   └── travelService.js        # Travel time estimation (haversine + road correction)
│   │
│   ├── utils/
│   │   ├── dateUtils.js            # toISODate, formatDateJa, getWeekDatesSundayStart, etc.
│   │   ├── constants.js            # App-wide constants
│   │   ├── idGenerator.js          # Unique ID generation (nanoid-like)
│   │   └── skillUtils.js           # Skill calculation utilities
│   │
│   └── types/
│       └── index.js                # JSDoc type definitions
```

## Routing System

Manual routing in App.jsx via useState (no react-router):

```jsx
const [activeView, setActiveView] = useState('dashboard');
function navigate(view, params = {}) { setActiveView(view); setViewParams(params); }
```

| View key | Component | Description |
|---|---|---|
| `dashboard` | DashboardView | Main dashboard |
| `jobs` | JobListView | Job list |
| `job-create` | JobCreateForm | New job form |
| `dispatch` | DispatchView | Dispatch management |
| `calendar` | CalendarView | Weekly calendar |
| `members` | MemberListView | Member list |
| `feedback` | FeedbackHistory | Feedback history |
| `settings` | SettingsView | Settings |

## 8 O&M Team Members

| ID | Name (JA) | Email | Type | Skills Avg | Color | Flags |
|---|---|---|---|---|---|---|
| hiroki_n | 廣木 憲文 | norifumi.hiroki@altenergy.co.jp | regular | 4.5 | #3B82F6 | |
| ota_t | 太田 賢宏 | takahiro.ota@altenergy.co.jp | regular | 4.75 | #EF4444 | |
| sasanuma_k | 笹沼 和宏 | kazuhiro.sasanuma@altenergy.co.jp | regular | 3.25 | #F59E0B | |
| tano_h | 田野 勇人 | hayato.tano@altenergy.co.jp | regular | 5.0 | #10B981 | |
| wano_t | 和埜 達斗 | tatsuto.wano@altenergy.co.jp | regular | 1.875 | #8B5CF6 | needsGuidance |
| yamazaki_k | 山崎 魁人 | kaito.yamazaki@altenergy.co.jp | regular | 4.375 | #EC4899 | |
| bold_j | BOLD JIGJIDSUREN | jigjidsuren.bold@altenergy.co.jp | regular | 3.5 | #F97316 | |
| yodogawa_t | 淀川 大地 | taichi.yodogawa@altenergy.co.jp | freelancer | 6.625 | #06B6D4 | hasVehicle, highest skills |

## 8-Axis Skill System

Skills rated 1-8 per member. Defined in `skillCategories.js`:

| Key | Japanese | English |
|---|---|---|
| electrical | 電気・設備知識 | Electrical Knowledge |
| technical | 技術力（施工・修理） | Technical Skills |
| onSiteJudgment | 現場判断力 | On-site Judgment |
| safetyManagement | 安全管理意識 | Safety Management |
| qualityAccuracy | 品質・正確性 | Quality & Accuracy |
| communication | コミュニケーション力 | Communication |
| leadership | リーダーシップ | Leadership |
| adaptability | 応用力 | Adaptability |

## 10 Job Types

Defined in `jobTypes.js`. Each has: nameJa, baseTimeHours, requiredSkillTotal, primarySkills[], minPersonnel, maxPersonnel, aiComplexity ('haiku' or 'sonnet').

| ID | Name | Hours | Personnel | AI Model |
|---|---|---|---|---|
| jt_pawamaru_survey | パワまる現地調査 | 4 | 2-3 | haiku |
| jt_pawamaru_construction | パワまる工事 | 8 | 3-4 | sonnet |
| jt_annual_inspection | 年次点検 | 6 | 2-3 | haiku |
| jt_emergency_inspection | 駆け付け点検 | 3 | 1-2 | haiku |
| jt_repowering | リパワリング工事 | 16 | 3-4 | sonnet |
| jt_panel_detach | パネル脱着工事 | 8 | 3-4 | haiku |
| jt_panel_removal | パネル撤去工事 | 10 | 3-4 | sonnet |
| jt_cleaning | 洗浄 | 6 | 2-3 | haiku |
| jt_mowing | 草刈り | 4 | 2-3 | haiku |
| jt_other | その他 | 4 | 2-3 | sonnet |

## Dispatch Engine Algorithm (dispatchEngine.js)

### Scoring Weights
- Skill match: **35%** (weighted by primarySkills vs secondary)
- Availability: **25%** (placeholder - currently fixed at 8)
- Travel distance: **15%** (haversine + road correction)
- Leadership: **10%** (max leadership skill in team)
- Guidance: **15%** (mentoring capability for needsGuidance members)

### Process
1. `filterAvailableMembers()` - exclude members with calendar conflicts
2. `generateTeamCombinations()` - all combos within min/max personnel
3. `scoreTeam()` for each combo:
   - `checkVehicleConstraints()` - HiAce capacity (4), Yodogawa drives alone
   - `calculateTeamSkillScore()` - primary skills weight 1.0, secondary 0.3
   - `calculateStretchScore()` - stretch mode penalty if below required
   - `evaluateLeaderSuitability()` - max leadership skill
   - `evaluateGuidanceCapability()` - Wano needs guide with avgSkill >= 4.5
4. Sort by score descending, return top 5

### Vehicle Constraints
- HiAce max capacity: 4 persons (configurable)
- Yodogawa (freelancer, hasVehicle: true) always drives alone
- Team with Yodogawa: HiAce for others + Yodogawa's vehicle
- Two HiAce vehicles if team > 4 (without Yodogawa)

## Claude AI Integration (claudeService.js)

- API key stored in localStorage (`om-dispatch-claude-api-key`)
- Uses `anthropic-dangerous-direct-browser-access` header for browser-side calls
- Model selection via `selectModel(aiComplexity)`:
  - `'opus'` → `claude-opus-4-6` (AI dispatch)
  - `'sonnet'` → `claude-sonnet-4-5-20250514`
  - default → `claude-haiku-4-5-20251001`
- Four AI functions:
  1. `generateRecommendationReason()` - explain why team was recommended
  2. `evaluateStretchRisk()` - risk assessment for stretch assignments (always uses Sonnet)
  3. `optimizeMultiJobSchedule()` - multi-job same-day optimization (always uses Sonnet)
  4. `aiDispatchTeams()` - **AI-powered team composition** (always uses Opus)

### AI Dispatch (`aiDispatchTeams`)

Replaces rule-based `rankTeams()` with Claude Opus AI for comprehensive team optimization:

- **Input**: members, job, jobType, conditions, settings
- **Output**: `{ recommendations[], content, error, usage, model }`
- **Flow**: `useDispatchEngine.js` checks `hasApiKey` → tries AI dispatch → falls back to rule-based on failure
- **JSON response**: Up to 5 team recommendations with `memberIds`, `leadMemberId`, `aiReasoning`, `breakdown`, `vehicleArrangement`, `mentoringPairs`
- **UI**: Indigo "AI推薦理由" label in `RecommendationPanel.jsx`, mode indicator badge in `DispatchView.jsx`
- **Fallback**: Rule-based engine used when API key not configured or AI call fails

## Outlook Calendar Integration

### Architecture Overview
```
MS365 MCP (get-specific-calendar-view)
  ↓ fetched once, saved as JSON
src/data/temp_*.json (4 files, 2 members each)
  ↓ Vite native JSON import
src/data/realCalendarData.js (transforms to REAL_CALENDAR_EVENTS)
  ↓ initial load
CalendarContext.jsx (state + localStorage persistence with DATA_VERSION)
  ↓ consumed by
CalendarView.jsx / useCalendarSync.js
```

### DATA_VERSION Cache Strategy

**CRITICAL RULE: Always bump DATA_VERSION in CalendarContext.jsx after modifying any temp_*.json file.**

- Current DATA_VERSION: **7**
- Located in: `src/context/CalendarContext.jsx` line 9
- localStorage key: `om-dispatch-calendar-events`
- On load: stored version !== DATA_VERSION -> clear cache, reload from REAL_CALENDAR_EVENTS
- Format: `{ version: number, events: array }`

### Calendar Data Format (temp_*.json)

Flat JSON format used in the 4 data files:

```json
{
  "memberKey": "hiroki_n",
  "memberEmail": "norifumi.hiroki@altenergy.co.jp",
  "title": "Event Title",
  "start": "2026-02-28T09:00:00",
  "end": "2026-02-28T10:00:00",
  "isAllDay": false,
  "isBusy": true,
  "location": "Site Name",
  "organizerName": "Organizer Name",
  "organizerEmail": "organizer@email.com",
  "attendees": [{"name": "...", "email": "...", "type": "required", "response": "accepted"}]
}
```

All-day events use **date-only** format: `"start": "2026-03-05"`, `"end": "2026-03-06"` (no time portion).

### Data File Pairing (2 members per JSON file)
| File | Members |
|---|---|
| temp_hiroki_yodogawa.json | 廣木 憲文 + 淀川 大地 |
| temp_tano_ota.json | 田野 勇人 + 太田 賢宏 |
| temp_bold_sasanuma.json | BOLD JIGJIDSUREN + 笹沼 和宏 |
| temp_yamazaki_wano.json | 山﨑 魁人 + 和埜 達斗 |

### Current Data Coverage
- Period: 2026-01-26 to 2026-03-31 (approx 2 months)
- Total events: ~841 across all 8 members
- Data was fetched in 3 date-range batches per member pair to avoid MS365 API limits

### Re-Fetching Calendar Data
When re-fetching via MS365 MCP:
- Use `list-calendars` with `top: 50` (default 10 is insufficient; 廣木's calendar is at position ~20)
- Use `get-specific-calendar-view` with batch splits (~3 weeks per request)
- Save output to corresponding temp_*.json file
- **ALWAYS bump DATA_VERSION after updating JSON files**

## All-Day Event Handling

Special treatment required because date-only strings cause NaN in time parsing:

1. **EventBlock.jsx**: Returns `null` for `isAllDay` events (prevents NaN from `new Date("2026-03-05")` time parsing)
2. **CalendarView.jsx**: Dedicated all-day banner section:
   - `getAllDayEventsForMemberDate()` filters `isAllDay === true`, compares date ranges
   - `getEventsForMemberDate()` excludes `isAllDay === true`
   - `hasAnyAllDayEvents` memoized flag controls banner visibility
   - Banner sits between date headers and scrollable time grid

## MS365 Live API Integration (Optional)

### Architecture Overview
```
User → AzureAdSettings (configure clientId/tenantId)
     → Header "MS365 連携" button → MSAL popup login
     → CalendarView "Outlook同期" → Graph API fetch all 8 members
     → DispatchView "Outlookに登録" → Graph API create events
```

### Authentication (msalService.js)
- **Flow**: MSAL popup (SPA, no backend required)
- **Config storage**: localStorage (`om-dispatch-azure-client-id`, `om-dispatch-azure-tenant-id`)
- **Scopes**: `Calendars.ReadWrite`, `User.Read`
- **Token**: Silent acquisition with popup fallback
- **Functions**: `createMsalInstance()`, `login()`, `logout()`, `getAccessToken()`, `loadAzureConfig()`, `saveAzureConfig()`

### Graph API Calendar Operations (graphCalendarService.js)
- `fetchMemberCalendarEvents(token, email, start, end)` → single member events with pagination
- `fetchAllMembersCalendarEvents(token, members, start, end)` → all 8 members via Promise.allSettled
- `createCalendarEvent(token, email, eventData)` → create single event
- `createDispatchCalendarEvents(token, assignment, job, members)` → bulk create for dispatch team
- Uses `MEMBER_EMAIL_MAP` for email→memberKey mapping
- `$select` optimization: only fetches needed fields
- `$top=500` for large calendars

### Auth State (AuthContext.jsx)
- React context: `{ isAuthenticated, account, msalInstance, loading, error }`
- Wraps with MsalProvider when MSAL instance available
- Auto-loads config from localStorage on mount

### UI Integration Points
| Component | Feature | When Visible |
|---|---|---|
| Header.jsx | MS365連携 login/status | Always |
| CalendarView.jsx | "Outlook同期" button | When authenticated |
| DispatchView.jsx | "Outlookに登録" button | After dispatch confirmation, when authenticated |
| SettingsView.jsx | MS365連携 tab | Always |
| AzureAdSettings.jsx | Azure AD config form | Settings → MS365連携 tab |

### Azure AD Requirements
- Azure Portal → App registrations → New registration
- Platform: SPA (Single-page application)
- Redirect URI: `https://kay0530.github.io/OM_dispatch/` (production) or `http://localhost:5180/OM_dispatch/` (dev)
- API permissions: Microsoft Graph → Delegated → `Calendars.ReadWrite`, `User.Read`
- Save Client ID and Tenant ID → enter in app Settings → MS365連携

## CalendarView Member Display Order

Defined as `MEMBER_ORDER` constant in CalendarView.jsx (matches Outlook column order):
```
hiroki_n, yodogawa_t, tano_h, bold_j, sasanuma_k, yamazaki_k, ota_t, wano_t
```

## State Management

### AppContext (useReducer)

Manages: members, jobTypes, conditions, jobs, assignments, feedbacks, settings.

Each stored independently in localStorage with prefix `om-dispatch-`:

| localStorage Key | Default Source |
|---|---|
| om-dispatch-members | DEFAULT_MEMBERS |
| om-dispatch-job-types | DEFAULT_JOB_TYPES |
| om-dispatch-conditions | DEFAULT_CONDITIONS |
| om-dispatch-jobs | [] |
| om-dispatch-assignments | [] |
| om-dispatch-feedbacks | [] |
| om-dispatch-settings | APP_DEFAULTS |
| om-dispatch-calendar-events | REAL_CALENDAR_EVENTS (versioned) |
| om-dispatch-claude-api-key | (user-entered) |
| om-dispatch-azure-client-id | (user-entered Azure AD) |
| om-dispatch-azure-tenant-id | (user-entered Azure AD) |

### Reducer Actions
Members: SET_MEMBERS, UPDATE_MEMBER
Job Types: SET_JOB_TYPES, ADD_JOB_TYPE, UPDATE_JOB_TYPE, DELETE_JOB_TYPE
Conditions: SET_CONDITIONS, ADD_CONDITION, UPDATE_CONDITION, DELETE_CONDITION
Jobs: ADD_JOB, UPDATE_JOB, DELETE_JOB
Assignments: ADD_ASSIGNMENT, UPDATE_ASSIGNMENT
Feedbacks: ADD_FEEDBACK
Settings: UPDATE_SETTINGS
Data: IMPORT_DATA, RESET

### CalendarContext (useState)

Provides: events, loading, lastSynced, syncError, setEvents, addEvents, clearEvents, getEventsForMember, getEventsForDate.

**Key design decision**: `setEvents` (full replace) is preferred over `addEvents` to prevent stale data mixing across syncs.

## APP_DEFAULTS (defaults.js)

```javascript
{
  workingHours: { start: '09:00', end: '18:00', extendedStart: '08:00', extendedEnd: '19:00' },
  earliestDeparture: '06:00',
  latestWorkStart: '10:00',
  stretchMode: { enabled: true, defaultMultiplier: 1.2, maxMultiplier: 1.5 },
  baseLocation: { name: '立川事業所', latitude: 35.6975, longitude: 139.4140 },
  hiaceCapacity: 4,
  accommodationThreshold: { travelMinutes: 180, returnTimeLimit: '20:00' },
  roadCorrectionFactor: 1.4,
  averageSpeedKmh: 40,
  highwaySpeedKmh: 70,
  highwayCorrectionFactor: 1.2,
}
```

## Development History

### Session 1: Initial Scaffold
- React + Vite + Tailwind project structure
- All UI components (dashboard, calendar, jobs, members, dispatch, settings)
- 8-axis skill radar chart (pure SVG)
- Dispatch engine with skill-based matching

### Session 2: Feature Enhancement
- Feedback system (form + history)
- Stretch risk indicators
- Enhanced dispatch algorithm with vehicle/leadership/guidance scoring
- Data export/import functionality

### Session 3: Calendar Integration Basics
- CalendarContext and useCalendarSync
- Initial mock data implementation
- Calendar weekly view with time grid

### Session 4: Real Outlook Data Integration
- Removed all mock data
- Fetched real Outlook calendar data for all 8 members via MS365 MCP
- Implemented DATA_VERSION cache invalidation strategy
- Added all-day event support (banner + EventBlock null guard)
- Migrated from hardcoded JS events to JSON import architecture
- Fixed pagination (廣木), batch fetching (BOLD/笹沼), date format (isAllDay)
- Current DATA_VERSION: 7

### Session 5: Firebase & GitHub Pages Deployment
- Added Firebase/Firestore integration for multi-device real-time sync
- Configured GitHub Pages deployment via GitHub Actions
- Fixed working-day date display logic
- Initial deploy to Claude_Code monorepo's GitHub Pages
- Committed and pushed 73 files

### Session 6: AI Dispatch with Opus & Dedicated Repository
- Replaced rule-based dispatch with Claude Opus AI (`aiDispatchTeams()`)
- Added `selectModel()` with opus/sonnet/haiku support
- Updated `useDispatchEngine.js` for async AI dispatch with rule-based fallback
- Added AI推薦理由 display in `RecommendationPanel.jsx`
- Added AI/rule mode indicator + token usage badge in `DispatchView.jsx`
- Fixed response shape mismatch bug (double JSON parse → direct use of `recommendations`)
- Created dedicated OM_dispatch repository (https://github.com/kay0530/OM_dispatch)
- Set up GitHub Pages at https://kay0530.github.io/OM_dispatch/
- Changed vite.config.js base path from `/Claude_Code/` to `/OM_dispatch/`

### Session 7: MS365 Outlook Calendar API Integration (Current)
- Added MSAL.js authentication (popup flow for GitHub Pages SPA compatibility)
- Created `msalService.js` for Azure AD auth (login/logout/silent token acquisition)
- Created `graphCalendarService.js` for Graph API calendar CRUD operations
- Created `AuthContext.jsx` for React auth state management
- Added `AzureAdSettings.jsx` for Azure AD clientId/tenantId configuration
- CalendarView: "Outlook同期" button for live calendar data sync
- DispatchView: "Outlookに登録" button to write dispatch results to Outlook
- Header: MS365 connection status indicator
- SettingsView: Added MS365連携 tab
- All existing offline functionality preserved as fallback
- Required Azure AD App Registration with SPA platform + Calendars.ReadWrite scope
- 25 files changed, +1,236 lines

## Deployment

### Repositories
- **Claude_Code (monorepo)**: https://github.com/kay0530/Claude_Code — contains `23_om-dispatch/` as subdirectory
- **OM_dispatch (専用)**: https://github.com/kay0530/OM_dispatch — standalone repo for GitHub Pages

### GitHub Pages
- **URL**: https://kay0530.github.io/OM_dispatch/
- **Deploy method**: GitHub Actions (`.github/workflows/deploy.yml`)
- **Trigger**: Push to `main` branch → auto build & deploy
- **Vite base path**: `/OM_dispatch/` (in vite.config.js)
- **Note**: Environment protection rules removed from `github-pages` environment to allow Actions deploy

### Keeping Repos in Sync
When making changes to `23_om-dispatch/` in the Claude_Code monorepo, also push to OM_dispatch repo for deployment.

## Known Issues & TODOs

1. Calendar data defaults to static JSON; live Outlook API available when Azure AD configured
2. `temp_*.json` filenames are temporary; consider renaming to permanent format
3. 廣木's event count (~110) may be lower than expected vs other members (100-160)
4. No automated tests
5. Travel time estimation uses placeholder values in most cases
6. Availability score in dispatch engine is hardcoded to 8 (full calendar integration pending)
7. `filterAvailableMembers()` uses `memberId` matching which may not align with `memberEmail` in events
8. Claude_Code monorepoとOM_dispatch専用リポの同期が手動
9. Azure AD App Registration required for MS365 live API features (see Azure AD Requirements section)

## Important Rules for Claude

1. **Language**: Respond in Japanese (per global CLAUDE.md)
2. **Agent Teams**: Ask user at session start if they want to use Agent Teams (per global CLAUDE.md)
3. **DATA_VERSION**: After modifying any `temp_*.json` data file, ALWAYS bump DATA_VERSION in CalendarContext.jsx
4. **MS365 MCP**: Use `list-calendars` with `top: 50` (default 10 misses 廣木)
5. **Large fetches**: Split date ranges into 3 batches (~3 weeks each) to avoid API limits
6. **No react-router**: All navigation is via `navigate(viewKey, params)` prop drilling
7. **Output files**: Store generated files in `Claude_Code_Demo/` with numbered folders (per global CLAUDE.md)
8. **Commit style**: English, conventional commit format (feat:, fix:, refactor:, etc.)
9. **MS365 Auth**: MSAL uses popup flow only (no redirect) for GitHub Pages SPA compatibility
