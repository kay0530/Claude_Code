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
npm run dev     # Vite on port 5189 (configured in vite.config.js)
npm run build   # Production build to dist/
npm run preview # Preview production build
npm run lint    # ESLint
```

## File Structure

```
23_om-dispatch/
├── package.json
├── vite.config.js              # Vite config (port 5189, React + Tailwind plugins)
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
│   │   │   ├── MultiJobPlanPanel.jsx       # Multi-job/multi-day plan display
│   │   │   ├── RecommendationPanel.jsx     # AI recommendation results display
│   │   │   ├── StretchIndicator.jsx        # Workload stretch indicator badge
│   │   │   └── StretchRiskPanel.jsx        # AI-powered stretch risk analysis
│   │   ├── jobs/
│   │   │   ├── JobListView.jsx     # Job list with status filters
│   │   │   ├── JobCreateForm.jsx   # New job creation form
│   │   │   ├── JobEditForm.jsx     # Job edit form (same layout as create)
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

### Manpower (人工/ニンク) Based System

Session 10で8軸スキルシステムから人工ベースに完全移行済み。

**基本概念:**
- 各メンバーは案件タイプ別に人工値を持つ（0.5〜1.2）
- 案件は「基本必要人工数(baseManpower)」を持つ（例: パワまる現調=2.0、工事=2.5）
- 条件により必要人工数が増減する（additive/multiplicative）
- チームの人工合算が必要人工数を満たす必要がある
- **制約**: 1.0以上の人工値を持つメンバーを最低1人含める（qualifiedCount制約）

### Scoring Weights (manpower-based)
- Manpower充足度: **40%** (team total / required)
- Qualified count: **20%** (1.0以上メンバー数)
- Vehicle efficiency: **15%**
- Team size efficiency: **15%** (少人数で充足するほど高スコア)
- Stretch penalty: **10%** (人工不足時の減点)

### Process
1. `filterAvailableMembers()` — exclude members with calendar conflicts (uses `job.preferredDate`)
2. `generateTeamCombinations()` — all combos within min/max personnel
3. `scoreTeam()` for each combo:
   - `getTeamTotalManpower()` — 案件タイプ別の人工合算
   - `countQualifiedMembers()` — 1.0以上メンバー数チェック
   - `checkVehicleConstraints()` — HiAce capacity, Yodogawa separate vehicle
   - Manpower充足度スコア (10点満点)
   - Stretch判定: totalManpower < requiredManpower
4. Sort by score descending, return top 5

### Multi-Job Dispatch (rankMultiJobPlans)
- 複数案件を同時に差配（メンバー重複なし制約）
- バックトラッキングで全割当パターンを生成
- 各パターンのスコア平均で上位5プランを返却

### Multi-Day Dispatch (rankMultiDayPlans) — Session 11追加
- 同一日で全案件を差配できない場合、複数日に分散
- **アルゴリズム**:
  1. まず`rankMultiJobPlans`で同一日プランを試行 → 成功すれば`planType: 'single-day'`で返却
  2. 失敗時 → 複数日分散モード:
     - 各案件の`preferredDate`以降の営業日を生成（最大10日）
     - `generateDayAssignments()`: バックトラッキングで日付割当パターン列挙（枝刈り: 同日人工 <= チーム総人工×1.1、最大200パターン）
     - `evaluateDayAssignment()`: 日ごとに`rankMultiJobPlans`を適用
  3. スコアリング: `avgTeamScore - dayCountPenalty(0.5/日) + dateProximityBonus(0.3/一致)`
  4. 上位5プランを返却
- **データ構造**: `MultiDayPlan` — `planType`, `totalDays`, `daySchedules[]`
- **後方互換**: 同一日成功時は`daySchedules`に1日分のみ格納

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

### Session 8: Calendar UI — Outlook-style Layout & Full-width
- Switched MSAL auth from popup to redirect flow (`msalService.js`, `AuthContext.jsx`, `Header.jsx`)
- Added JST timezone header (`Prefer: outlook.timezone="Asia/Tokyo"`) to Graph API calls (`graphCalendarService.js`)
- Restructured CalendarView.jsx to Outlook-style layout:
  - Single scroll container with CSS sticky header (member names stay visible on vertical scroll)
  - CSS sticky time column (stays visible on horizontal scroll)
  - Viewport-constrained height: `calc(100vh - 104px)` for internal scroll instead of page scroll
  - Auto-scroll to 8:00 on mount
- EventBlock.jsx: `line-clamp-2` for events >= 50px tall (was `truncate`)
- MainLayout.jsx: Conditionally removes `max-w-7xl` constraint for calendar view → full-width layout
- Removed `min-w-[250px]` from member columns → `flex-1` auto-sizing to fit all members without horizontal scrollbar
- Azure AD App: Client ID `85420e2f-eb38-4a8e-931f-4be552f953b0`, Tenant ID `61b80e23-6dd9-4dc6-b355-d7f210b12ef5`
- Commits: `8749fd4` (sticky headers), `1e9a6eb` (full-width auto-fit)

### Session 9: 人工(ニンク)ベース差配システムへの移行設計

**概要**: 8軸スキルシステムから、よりシンプルな「人工」ベースの差配システムへ移行する設計セッション。

#### 設計決定事項

**新しい差配ルール:**
- 各メンバーは案件タイプ別に人工値を持つ（0.5〜1.2）
- 案件は「基本必要人工数」を持つ（例: パワまる現地調査=2.0、パワまる工事=3.0）
- チームの人工合算が必要人工数を満たす必要がある
- **制約**: 必ず1.0以上の人を最低1人含める（0.8×4人=3.2人工でもNG）
- 条件によって必要人工数が増減する（複合可能）
- 例: 1.2人工の人 + 0.8人工の人 = 2.0人工（合算）

**案件タイプの変更:**
- リパワリング工事、草刈りを削除 → Excelの8種類のみ
- 基本必要人工: 現調2.0 / 工事3.0 / 年次2.0 / 駆け付け1.0 / 洗浄3.0 / パネル脱着4.0 / パネル撤去4.0 / その他TBD

**8軸スキルシステム:**
- 差配ロジックからは削除（人工ベースに完全移行）
- スキルデータ自体はバックアップとしてどこかに残す（後で使うかも）
- レーダーチャートもシステムからは非表示

**成果物形式:** Excel（設計・確認用）→ 確定後アプリに実装

#### メンバー人工値（O&Mメンバー人工.xlsxより）

| メンバー | パワまる現調 | パワまる工事 | 年次点検 | 駆け付け | 洗浄 | パネル脱着 | パネル撤去 | その他 |
|----------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 廣木 | 0.8 | 0.8 | 1.0 | 1.0 | 0.6 | 0.8 | 0.8 | - |
| 淀川 | 1.2 | 1.2 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | - |
| 田野 | 0.6 | 0.7 | 1.0 | 1.0 | 0.7 | 1.0 | 1.0 | - |
| BOLD | 0.6 | 0.6 | 0.6 | 0.6 | 0.6 | 0.6 | 0.6 | - |
| 笹沼 | 0.7 | 0.7 | 0.6 | 0.6 | 0.6 | 0.6 | 0.6 | - |
| 山崎 | 1.0 | 1.0 | 0.8 | 0.8 | 0.9 | 0.7 | 0.7 | - |
| 太田 | 1.0 | 1.0 | 0.8 | 0.8 | 0.8 | 0.7 | 0.7 | - |
| 和埜 | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | - |

#### 条件別人工増減（パワまる現地調査ドラフト）

| 条件 | 人工増減 | 備考 |
|------|:---:|------|
| レイアウト図なし | +0.5 | 図面なしで現場確認に追加工数 |
| 回路図面なし | +0.5 | 回路確認に追加工数 |
| 屋根上 | +1.0 | 安全要員追加 |
| 高圧（500kW未満） | +0.5 | 高圧対応 |
| 高圧（500kW以上） | +1.0 | 大型高圧対応 |
| 回路組換あり | +1.0 | 組換作業の追加工数 |
| オプティマイザーあり | +0.5 | 機器確認の追加 |
| ソーラーフロンティア | +0.5 | 特殊パネル対応 |

他の案件タイプの条件はユーザーがExcelに記入予定。

#### 作成済みファイル
- `23_om-dispatch/人工条件一覧表.xlsx` — 条件記入用Excelテンプレート（9シート構成）
  - シート1: メンバー人工（既存データ転記済み）
  - シート2: パワまる現地調査（8条件ドラフト入り）
  - シート3-9: 他の案件タイプ（空欄テンプレート、ユーザー記入待ち）
- `23_om-dispatch/O&Mメンバー人工.xlsx` — 元データ（メンバー人工値）

#### 次セッションでやること
1. **ユーザーがExcelに条件を記入完了** → Excelを読み込み
2. **アプリ実装（Agent Teams推奨）**:
   - `src/data/members.js`: 8軸スキル → 案件タイプ別人工値(`manpowerByJobType`)
   - `src/data/jobTypes.js`: `requiredSkillTotal`/`primarySkills` → `baseManpower`。リパワリング・草刈り削除
   - `src/data/conditions.js`: 時間乗数 → 人工増減値(`manpowerAdjustment`)、案件タイプ別条件に再構成
   - `src/services/dispatchEngine.js`: スキルスコア → 人工合算チェック + 1.0制約
   - `src/services/claudeService.js`: AI差配プロンプトを人工ベースに更新
   - `src/data/skillCategories.js`: バックアップ退避、差配ロジックから除外
   - UI: MemberCard, SkillRadarChart, DispatchView, JobCreateForm等の更新
3. **検証**: dev server (port 5189) で差配テスト

#### 新ディスパッチアルゴリズム（概要）
```
1. 案件の基本人工数を取得
2. 選択条件の人工増減を合算 → 必要人工数を算出
3. カレンダーで空きメンバーをフィルタ
4. チーム組み合わせ生成
5. 各チームをチェック:
   a. 人工合算 >= 必要人工数
   b. 1.0以上メンバーが1人以上
   c. 車両制約（既存ロジック維持）
6. 有効チームをスコア順にランク（人工充足度、車両、移動距離）
```

#### プランファイル
- `~/.claude/plans/serialized-petting-puppy.md` に詳細プランあり

### Session 10: 人工(ニンク)ベース差配システム実装 + 複数案件同時差配 + 案件編集

**概要**: Session 9で設計した人工ベース差配を実装。8軸スキルシステムから完全移行。

#### 変更の概要
- **人工ベース移行**: `ManpowerByJobType`型追加。メンバーが案件タイプごとに人工値(0.5〜1.2)を持つ
- **差配エンジン書き換え**: `scoreTeam()`を人工合算ベースに。`calculateRequiredManpower()`で条件増減計算
- **複数案件同時差配**: `rankMultiJobPlans()` — 最大3案件をメンバー重複なしで差配。`MultiJobPlanPanel.jsx`でUI表示
- **案件編集**: `JobEditForm.jsx`追加。JobListViewに編集ボタン追加
- **条件のjobType紐付け**: 条件がjobTypeIdで特定の案件タイプに紐付くように変更
- **SkillRadarChart**: 人工テーブル表示に変更（レーダーチャートは残存だが差配には不使用）

#### 変更ファイル (主要)
- `src/data/members.js` — `manpowerByJobType`プロパティ追加（8軸skills削除）
- `src/data/jobTypes.js` — `baseManpower`追加、`requiredSkillTotal`/`primarySkills`削除
- `src/data/conditions.js` — `jobTypeId`追加、`adjustmentType`/`adjustmentValue`で人工増減
- `src/services/dispatchEngine.js` — `scoreTeam()`を人工ベースに全面書き換え
- `src/utils/skillUtils.js` — `getMemberManpower()`, `getTeamTotalManpower()`, `countQualifiedMembers()`, `calculateRequiredManpower()`追加
- `src/components/dispatch/MultiJobPlanPanel.jsx` — 新規（複数案件プラン表示）
- `src/components/jobs/JobEditForm.jsx` — 新規（案件編集フォーム）

### Session 11: 複数日分散スケジューリング (Multi-Day Dispatch)

**概要**: 3案件パワまる工事（各2.5人工=計7.5）がチーム人工7.2を超えて同一日に差配不可となる問題を解決。
`preferredDate`を起点に複数の営業日にまたがる分散スケジューリング機能を実装。

#### 設計思想
- 同一日で全案件を差配可能 → 従来通り`single-day`プランを返す（後方互換）
- 同一日不可能 → `preferredDate`以降の営業日に分散。同一メンバーを別日に再利用可能
- ユーザーの「希望日は目安。その日以降で組めればOK」という要件に基づく

#### 変更ファイル
- `src/services/dispatchEngine.js`:
  - `rankMultiDayPlans()` (+60行): メインのマルチデイ関数。single-day試行→multi-day fallback
  - `generateDayAssignments()` (+50行): バックトラッキングで日付割当パターン列挙（枝刈り付き）
  - `evaluateDayAssignment()` (+80行): 日ごとのチーム編成最適化 + スコアリング
  - `getEarliestPreferredDate()`: 最早希望日ヘルパー
  - `filterAvailableMembers()`のバグ修正: `job.scheduledDate`(存在しない) → `job.preferredDate`
  - import追加: `generateBusinessDays`, `formatDayLabel`, `toISODate`
- `src/utils/dateUtils.js`:
  - `generateBusinessDays(startDate, count)` — 営業日リスト生成（土日除外）
  - `formatDayLabel(dateStr)` — "3/10(月)" 形式のラベル
- `src/hooks/useDispatchEngine.js`:
  - `rankMultiJobPlans` → `rankMultiDayPlans`に切り替え
  - 返り値の`daySchedules`構造に対応するaugmentation更新
- `src/components/dispatch/MultiJobPlanPanel.jsx`:
  - `PlanCard`にmulti-day/single-day分岐追加
  - 新コンポーネント`DayScheduleBlock` — 日付ごとのセクション表示（日付ヘッダー+案件リスト+待機メンバー数）
  - パープルバッジ「N日間のスケジュール」表示
- `src/components/dispatch/DispatchView.jsx`:
  - 案件ごとに`preferredDate`表示（未設定時はオレンジ警告テキスト）
  - `executeMultiAssignment`をmulti-day対応（`daySchedules`ループ + `scheduledDate`設定）
  - 結果なしメッセージ更新
- `src/types/index.js`:
  - `MultiDayPlan` typedef追加
  - `DaySchedule` typedef追加

#### 動作検証状況
- ビルド: `npm run build` 成功（254 modules）
- devサーバー: HMR動作確認済み
- **機能テスト未完**: 3案件パワまる工事の差配実行まで到達したが、プレビュー環境のtarget closed問題で結果画面のキャプチャに失敗
- **次セッションで要検証**: ディスパッチで3件選択 → 差配実行 → multi-dayプランが表示されるか確認

### Session 12: バグ修正 + 全機能テスト完了

**概要**: Session 11で実装した複数日分散差配のバグ修正2件と、全機能の動作テストを実施。

#### バグ修正

**Fix #1: `rankMultiDayPlans` パラメータ順序の不一致**
- `useDispatchEngine.js` から `rankMultiDayPlans()` を呼ぶ際、引数の順序がエンジン側の関数シグネチャと一致していなかった
- 修正: `conditionsMap` パラメータを正しい位置に配置

**Fix #2: データ構造augmentationの不一致**
- `useDispatchEngine.js` のaugmentationコードがエンジンの出力構造と不整合
- エンジン: `daySchedules[].jobAssignments[].{team, job, jobType, leadCandidate}`
- UI期待: `daySchedules[].assignments[].{teamMemberIds, leadMemberId, jobTitle, jobTypeName}`
- 修正: augmentation内で `jobAssignments` → `assignments` のマッピングを正しく実装

#### 動作テスト結果

| テスト項目 | 結果 | 詳細 |
|---|---|---|
| 2件案件同時差配 | OK | パワまる現調B + パワまる工事A → 5プラン生成、スコア7.2-7.4/10、「同日実施」バッジ |
| 3件案件マルチデイ差配 | OK | パワまる現調B + 工事A + 工事B → 5プラン生成、スコア8.1/10、「2日間のスケジュール」バッジ |
| マルチデイ日程表示 | OK | パープル色の日付ヘッダー（3/10(火)、3/11(水)等）、日ごとの案件リスト表示 |
| チーム詳細表示 | OK | メンバーアバター、リーダーバッジ(✓)、車両表示（ハイエース + 淀川車両） |
| 案件編集フォーム | OK | 4ステップウィザード（種別→条件→詳細→確認）全ステップ動作 |
| 無効jobType エラー | OK | 削除済みリパワリング参照 → 「案件種別が見つかりません」エラー正常表示 |
| メンバー人工テーブル | OK | 全8名の案件別人工値が正しく表示（レーダーチャート + 人工テーブル併記） |

#### 変更ファイル
- `src/hooks/useDispatchEngine.js`: Fix #1 (パラメータ順序) + Fix #2 (augmentation構造)

### Session 13: スキルベース→人工ベース再復元 + メンバー人工編集UI + サンプル案件

**概要**: Git操作（monorepo→専用repo同期）でスキルベースのコードに戻ってしまった問題を3セッションかけて修正。全ファイルを人工ベースに再移行し、メンバー人工値の編集機能とサンプル案件データを追加。

**背景**: Session 10-12で実装した人工ベースシステムが、リポジトリ同期時にスキルベースに先祖返り。ワークツリー（`magical-curie`）で全ファイルを再修正。

#### 変更内容

**1. データ層（Session前半で完了）**
- `src/data/members.js` — `manpowerByJobType`復元、`jt_other`を全員0.5→1.0に変更
- `src/data/jobTypes.js` — `baseManpower`復元、`requiredSkillTotal`/`primarySkills`/`aiComplexity`削除
- `src/data/conditions.js` — `jobTypeId`/`adjustmentType`/`adjustmentValue`復元
- `src/data/sampleJobs.js` — **新規**: 6件のサンプル案件（現調A/B、工事A/B、年次、洗浄）
- `src/utils/skillUtils.js` — `calculateRequiredManpower()`等の人工ユーティリティ復元
- `src/utils/dateUtils.js` — `generateBusinessDays`/`formatDayLabel`復元

**2. エンジン・サービス層（Session前半で完了）**
- `src/services/dispatchEngine.js` — 人工ベース`scoreTeam()`全面復元
- `src/services/claudeService.js` — AI差配プロンプト人工ベース復元
- `src/hooks/useDispatchEngine.js` — `rankMultiDayPlans`呼び出し復元

**3. UI層（本セッション中心）**
- `src/components/jobs/JobCreateForm.jsx` — `calculateRequiredManpower(selectedType.baseManpower, ...)` に修正（NaNバグ修正）
- `src/components/jobs/TimeEstimator.jsx` — `calculateRequiredManpower(baseManpower, ...)` に修正（NaNバグ修正）
- `src/components/jobs/JobEditForm.jsx` — 人工ベース復元
- `src/components/jobs/ConditionSelector.jsx` — `jobTypeId`フィルタ + `adjustmentValue`表示
- `src/components/settings/JobTypeEditor.jsx` — `baseManpower`フィールドに変更
- `src/components/settings/ConditionEditor.jsx` — `adjustmentType`/`adjustmentValue`/`jobTypeId`に変更
- `src/components/settings/ApiKeySettings.jsx` — モデル説明文更新
- `src/components/members/MemberCard.jsx` — 人工テーブル表示（変更なし、既に正しい）
- `src/components/members/MemberEditModal.jsx` — **新規**: メンバー人工値編集モーダル
- `src/components/members/MemberListView.jsx` — MemberEditModal統合（`key`プロパティで再マウント）
- `src/components/dispatch/RecommendationPanel.jsx` — 人工ベース表示復元
- `src/components/dispatch/StretchIndicator.jsx` — 人工ベース復元
- `src/components/dispatch/DispatchView.jsx` — テキスト修正
- `src/context/AppContext.jsx` — `DEFAULT_JOBS`インポート追加
- `src/types/index.js` — JSDoc型定義を人工ベースに更新

**4. NaNバグ修正（重要）**
- **原因**: `calculateRequiredManpower(baseManpower, conditions)`は第1引数に数値を期待するが、呼び出し側がオブジェクトを渡していた
- `TimeEstimator.jsx`: `calculateRequiredManpower({ baseManpower }, ...)` → `calculateRequiredManpower(baseManpower, ...)`
- `JobCreateForm.jsx`: `calculateRequiredManpower(selectedType, ...)` → `calculateRequiredManpower(selectedType.baseManpower, ...)`

**5. メンバー人工編集機能**
- `MemberEditModal.jsx`: モーダルUI（スライダー + 数値入力 + レベルバッジ + 一括設定ボタン）
- `MemberListView.jsx`: カードクリック → 編集モーダル表示、保存 → `UPDATE_MEMBER` dispatch
- `key={editingMember?.id}` で正しい初期値を保証（useStateの再初期化問題回避）

**6. サンプル案件データ**
- `src/data/sampleJobs.js`: 6件のDEFAULT_JOBS（パワまる現調A/B、工事A/B、年次、洗浄）
- `AppContext.jsx`: `loadFromStorage(STORAGE_KEYS.jobs, DEFAULT_JOBS)` でデフォルト読み込み

#### ブラウザ検証結果（全ページOK）
| テスト項目 | 結果 |
|---|---|
| ダッシュボード | ✅ 6件表示 |
| 案件一覧 | ✅ 6件サンプル案件 |
| 案件作成 Step 1 | ✅ 8種別の人工表示 |
| 案件作成 Step 2 | ✅ 必要人工合計 正常（条件追加で2.0→3.0） |
| メンバー一覧 | ✅ 人工テーブル、「他」が1.0 |
| メンバー編集 | ✅ スライダー+数値入力、保存→即時反映 |
| ディスパッチ | ✅ 案件ドロップダウンに6件 |
| 設定 > 案件種別管理 | ✅ 人工ベース表示 |
| 設定 > 条件管理 | ✅ +0.5人工/+1人工バッジ |

#### ワークツリー情報
- ワークツリー: `23_om-dispatch/.claude/worktrees/magical-curie/23_om-dispatch/`
- devサーバー: Bash経由 `npx vite --port 5183`（preview_startはWindows PATH問題で不可）
- ビルド: 252 modules、成功

#### 次セッションでやること
1. ~~**ワークツリーのマージ**: `magical-curie` ワークツリーの変更をメインブランチにマージ~~
2. **OM_dispatch専用リポへの同期**: Claude_Code monorepo → OM_dispatch リポにpush
3. **GitHub Pagesデプロイ**: 変更をデプロイして本番環境で動作確認
4. ~~**差配実行テスト**: サンプル案件で実際にディスパッチを実行し、チーム編成結果を確認~~
5. ~~**カレンダー連携統合**: `calendarEvents`が`[]`で渡される問題の修正（Known Issues #9）~~

### Session 15: カレンダー連携ディスパッチ + マルチデイ修正

**ワークツリー**: `kind-wescoff` (branch: `claude/kind-wescoff`)

#### 完了した変更

**1. カレンダー連携ディスパッチ (commit: 1072495)**
- `filterAvailableMembers()` を `findAvailableSlots()` (calendarService.js) ベースに書き換え
- `scoreTeam()` に `calendarFit` スコア (15%重み) 追加
- `rankTeams()` に `_meta` (excludedMembers情報) 追加
- NaNバグ修正: `s.end - s.start` → `s.durationMinutes || 0`
- UI: 除外メンバー情報ボックス (amber) + カレンダースコア列追加
- AI差配プロンプトにカレンダー情報追加

変更ファイル (6件):
- `src/services/dispatchEngine.js` — エンジン全般
- `src/hooks/useDispatchEngine.js` — excludedMembers state
- `src/services/claudeService.js` — AIプロンプト更新
- `src/hooks/useClaudeApi.js` — calendarEvents引数追加
- `src/components/dispatch/DispatchView.jsx` — 除外メンバーUI
- `src/components/dispatch/RecommendationPanel.jsx` — カレンダースコア列

**2. マルチデイ差配 "0名稼働" バグ修正 (commit: 4d1da86)**
- `evaluateDayAssignment()` が生パターンデータ `{jobId, date, jobIndex}` をそのまま渡していた
- 修正: `jobsWithTypes` を引数追加、日ごとに `rankMultiJobPlans()` を実行してチーム編成を算出
- スコアリングも実際のチームスコア平均 + 日付近接ボーナスに改善

変更ファイル: `src/services/dispatchEngine.js` のみ

#### 動作テスト結果

| テスト | 結果 |
|---|---|
| 単一案件差配 (パワまる現調A) | ✅ 5チーム推奨、4名カレンダー除外、カレンダースコア表示 |
| 複数案件マルチデイ差配 (現調A+工事A) | ✅ 2日間スケジュール、チーム名・人工・車両正常表示 |
| コンソールエラー | ✅ なし |

#### 未修正の問題 (次セッションで対応)

**マルチデイ差配でカレンダー競合を無視している問題**:
- `evaluateDayAssignment()` 内の `rankMultiJobPlans()` 呼び出しで、各ジョブの `preferredDate` が割当日ではなく元の希望日のまま
- `filterAvailableMembers()` は `job.preferredDate` でカレンダーをチェックするため、実際の割当日の予定が考慮されない
- **修正方針**: `evaluateDayAssignment()` 内で、日ごとのジョブの `preferredDate` を割当日で上書きしてから `rankMultiJobPlans()` を呼ぶ
- 修正箇所: `dispatchEngine.js` の `evaluateDayAssignment()` (line ~428)
```javascript
// 現在:
const dayJobsWithTypes = items.map(item => jobsWithTypes[item.jobIndex]);
// 修正後:
const dayJobsWithTypes = items.map(item => ({
  ...jobsWithTypes[item.jobIndex],
  job: { ...jobsWithTypes[item.jobIndex].job, preferredDate: date },
}));
```

### Session 16: マルチデイ差配バグ修正 (カレンダー競合 + チーム編成)

**ワークツリー**: `charming-yalow` (branch: `claude/charming-yalow`)

#### 修正内容

**Bug #1: `filterAvailableMembers()` フィールド名不一致 (dispatchEngine.js L199-207)**
- `event.memberId === member.id && event.date === jobDate` → フィールドが存在しないため常にtrue
- 修正: `event.memberEmail` vs `member.outlookEmail` + `event.start?.substring(0,10)` vs `jobDate` + `event.isBusy` チェック

**Bug #2: `evaluateDayAssignment()` がチーム編成せず (dispatchEngine.js L387-441)**
- 生パターンデータ `{jobId, date, jobIndex}` をそのまま返していた
- 修正: 日ごとに `rankMultiJobPlans()` を呼んで実際のチーム編成を算出
- `preferredDate` を割当日で上書きしてカレンダー競合を正しくチェック

**Bug #3: `rankMultiDayPlans()` パラメータ不足 (dispatchEngine.js L334)**
- `evaluateDayAssignment(pattern, members, settings, calendarEvents)` → `jobsWithTypes` が欠落
- 修正: `evaluateDayAssignment(pattern, members, jobsWithTypes, settings, calendarEvents)`

**Bug #4: `useDispatchEngine` カレンダー未連携 (useDispatchEngine.js)**
- `rankTeams()` と `rankMultiDayPlans()` に `[]` をハードコードで渡していた
- 修正: `useCalendar()` から `calendarEvents` を取得して渡す

#### 検証結果

| テスト | 結果 |
|---|---|
| 単一案件差配 (パワまる現調A) | OK — 4名カレンダー除外、5チーム推奨、カレンダースコア表示 |
| 3件マルチデイ差配 (現調A+工事A+工事B) | OK — 3日間スケジュール生成、各日チーム編成+人工+車両正常 |
| コンソールエラー | なし |

#### 変更ファイル
- `src/services/dispatchEngine.js`: 4箇所修正
- `src/hooks/useDispatchEngine.js`: CalendarContext連携 + dependency array修正

### Session 18: カレンダー連携複数案件差配の完成 (excludedMembers + calendarFit修正)

**ワークツリー**: `agitated-austin` (branch: `claude/agitated-austin`)

#### 修正内容

**1. filterAvailableMembers() → 除外メンバー情報を返す (dispatchEngine.js)**
- 戻り値を `Array<member>` → `{ available: Array<member>, excluded: Array<{ member, conflictEvents }> }` に変更
- 除外されたメンバーとその競合イベントを追跡

**2. scoreTeam() → calendarFitスコア修正 (dispatchEngine.js)**
- CLAUDE.md仕様に合わせ `teamSize: 15%` → `calendarFit: 15%` に変更
- チームメンバーのカレンダー空き状況を0-10点でスコアリング
- スコアウェイト: Manpower 40%, Qualified 20%, CalendarFit 15%, Vehicle 15%, Stretch 10%

**3. rankTeams() → _meta.excludedMembers 追加 (dispatchEngine.js)**
- 返却配列に `_meta = { excludedMembers: [...] }` を付与
- UI側で除外メンバーバナーが正しく表示されるようになった

**4. rankMultiJobPlans() → 除外メンバー集計 (dispatchEngine.js)**
- `allExcludedIds` Set で除外メンバーIDを追跡
- `_meta.excludedMembers` を返却

**5. rankMultiDayPlans() → 除外メンバー伝播 (dispatchEngine.js)**
- single-day/multi-day 両パスで `_meta` を伝播

**6. useDispatchEngine.js → 複数案件でexcludedMembers取得**
- `runMultiJobDispatch()` 内で `plans._meta.excludedMembers` を取得・セット

**7. DispatchView.jsx → 除外メンバーバナー改善**
- テキスト: 「カレンダーにより除外されたメンバー」→「Outlookカレンダーの予定により差配対象外」
- サブタイトル説明文追加
- レイアウト修正: `flex items-center` → `flex items-start` + `<div>` ラッパー

**8. vite.config.js → ポート5189に変更**

#### 変更ファイル
- `src/services/dispatchEngine.js`: 5箇所修正 (filterAvailableMembers, scoreTeam, rankTeams, rankMultiJobPlans, rankMultiDayPlans)
- `src/hooks/useDispatchEngine.js`: excludedMembers取得追加
- `src/components/dispatch/DispatchView.jsx`: バナーUI改善
- `vite.config.js`: ポート5180→5189

#### ビルド結果
- `npm run build`: 成功（255 modules, 9.60s）

## Known Issues & TODOs

1. Calendar data defaults to static JSON; live Outlook API available when Azure AD configured
2. `temp_*.json` filenames are temporary; consider renaming to permanent format
3. 廣木's event count (~110) may be lower than expected vs other members (100-160)
4. No automated tests
5. Travel time estimation uses placeholder values in most cases
6. Claude_Code monorepoとOM_dispatch専用リポの同期が手動
7. Azure AD App Registration required for MS365 live API features (see Azure AD Requirements section)
8. ~~複数日分散差配の機能テスト未完~~ — **Session 12で全テスト完了**
9. ~~`calendarEvents`が常に`[]`で渡されている~~ — **Session 15でカレンダー連携ディスパッチ実装済み**
10. ~~**マルチデイ差配がカレンダー競合を無視**~~ — **Session 16で修正完了**: filterAvailableMembers データ構造修正、evaluateDayAssignment でrankMultiJobPlans呼び出し+preferredDate上書き、useDispatchEngine CalendarContext連携

## Important Rules for Claude

1. **Language**: Respond in Japanese (per global CLAUDE.md)
2. **Agent Teams**: Ask user at session start if they want to use Agent Teams (per global CLAUDE.md)
3. **DATA_VERSION**: After modifying any `temp_*.json` data file, ALWAYS bump DATA_VERSION in CalendarContext.jsx
4. **MS365 MCP**: Use `list-calendars` with `top: 50` (default 10 misses 廣木)
5. **Large fetches**: Split date ranges into 3 batches (~3 weeks each) to avoid API limits
6. **No react-router**: All navigation is via `navigate(viewKey, params)` prop drilling
7. **Output files**: Store generated files in `Claude_Code_Demo/` with numbered folders (per global CLAUDE.md)
8. **Commit style**: English, conventional commit format (feat:, fix:, refactor:, etc.)
9. **MS365 Auth**: MSAL uses redirect flow (switched from popup in Session 8)
10. **人工ベース移行**: Session 10で実装完了。Session 11で複数日分散差配を追加
11. **複数日分散差配**: `rankMultiDayPlans()`を使用。`preferredDate`起点で営業日に分散。Session 12で全テスト完了
