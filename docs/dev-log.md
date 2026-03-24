# Development log

Engineering decisions and implementation handoff notes. Newest entries first.

---

## 2026-03-24 — Commitment History (lineage) API + UI

### Goal

Expose **week-by-week commitment history** along the `carriedFrom` chain so users see **newest first** (current week at top, older weeks below), with **paginated loading** and a **single shared History drawer**. **Visibility and permissions** must match **`GET /api/v1/commitments/{id}`** exactly—no new rules.

### Product rules (frozen)

| Topic | Decision |
|--------|----------|
| Entry point | **Single primary entry** to full history: opens shared **History** drawer (from IC section, manager strip, and later drill-downs). |
| Section label | **“History”** — one-line placeholder when empty so the slot is understood (e.g. “No multi-week history yet”). |
| My Team | **“My rolling work”** (or final copy) **collapsed by default**; **collapse state persisted** in **`localStorage`**. |
| Ordering | **Newest first** (current / anchor commitment at top; walk `carriedFrom` backward to build chain, **reverse** for display). |
| Pagination | Initial load: **current + up to 6 prior** snapshots (7 rows max). **“See more”** loads **12** older snapshots per click until exhausted. |
| Density | Reuse existing **row/card** Tailwind patterns (`bg-surface-lowest`, `bg-surface-container-low`, `rounded-sm`, etc.); **no new chart types** in v1. |
| Deep links | **Optional v1** (`?history=<commitmentId>` or similar); reuse existing router/modal patterns where possible. |
| Scope | Ship **together**: **IC** (My Week bottom + drawer) **and** **manager** collapsed strip—not two separate releases. |

---

### Backend — files to add or touch

#### New types

| File | Purpose |
|------|---------|
| `backend/src/main/java/com/compass/platform/domain/commit/dto/CommitmentLineageResponse.java` | Wrapper: `List<CommitmentLineageNode> nodes`, `boolean hasMore`, optional `String nextCursor` (or `UUID nextCursorCommitmentId` — see pagination). |
| `backend/src/main/java/com/compass/platform/domain/commit/dto/CommitmentLineageNode.java` | One snapshot per week: at minimum `commitmentId`, `cycleId`, `cycleLabel`, `startsAt`, `endsAt` (ISO strings or `Instant`), `title`, bullet list (reuse shape of `CommitmentResponse.TaskBulletResponse` or embed `CommitmentResponse` subset), `reconciliationStatus`, `reconciliationNote`, `userId`, `userDisplayName`. Align fields with `CommitmentMapper` / `CommitmentResponse` so the UI matches list/detail elsewhere. |

#### Service logic

| File | Purpose |
|------|---------|
| `backend/src/main/java/com/compass/platform/domain/commit/CommitmentService.java` | Add **`getLineage(UUID anchorCommitmentId, AppUser actor, CommitmentLineageQuery query)`** (or split query params). Behavior: (1) **`getById(anchorCommitmentId, actor)`** — reuses existing visibility (fail 403/404 same as today). (2) Walk **backward** via `Commitment.getCarriedFrom()` until `null`, loading parents as needed (lazy JPA may require `commitmentRepository.findById` per hop or a dedicated query—implement efficiently, avoid N+1 if trivial batch is possible). (3) For **each** commitment in the chain, **`visibilityEnforcer.canViewCommitment(actor, commitment)`** — if any node fails, **`AccessDeniedException`** (same posture as viewing a commitment you cannot see). (4) Build ordered list **oldest → newest** internally, then apply **pagination slice** for response: **newest-first** page semantics (first page = last 7 nodes in chain if count ≥ 7; see algorithm below). (5) Return **`hasMore`** if older nodes exist beyond this page; **`nextCursor`** = id of the **oldest** commitment **included** in this page (client sends it to fetch the next chunk going further back). |

**Pagination algorithm (explicit):**

1. Resolve full chain backward from anchor: `[C0 oldest … Cn anchor]` where `Cn` is anchor and `C0.carriedFrom == null`.
2. Reverse to newest-first: `[Cn, Cn-1, …, C0]`.
3. **Page 1:** `limit = 7` → take `[Cn … Cmax]` first 7 elements.
4. **Page 2+:** client sends `cursor` = oldest id **from previous response** (smallest index in the newest-first list that was last included). Server finds index `k` of that id in the newest-first list; return next **12** nodes `k+1 … k+12`, `hasMore` if `k+12 < length`, `nextCursor` = id at `k+12` (or last id returned).

Alternatively implement **offset** in the newest-first array if cursor lookup is awkward—document the chosen approach in JavaDoc.

#### HTTP

| File | Purpose |
|------|---------|
| `backend/src/main/java/com/compass/platform/domain/commit/CommitmentController.java` | **`GET /api/v1/commitments/{id}/lineage`** with query params e.g. **`limit`** (default 7, max e.g. 50), **`cursor`** (optional, UUID of oldest commitment from prior page). Returns **`ApiResponse<CommitmentLineageResponse>`**. Read-only; **`@Transactional(readOnly = true)`** on controller class already—ensure new method does not open write tx. |

#### Tests

| File | Purpose |
|------|---------|
| `backend/src/test/java/com/compass/platform/domain/commit/CommitmentLineageServiceTest.java` (or under existing `CommitmentServiceTest`) | Unit tests: chain length 1 (anchor only); chain length 3; pagination first page 7; second page 12; `hasMore` false at end. |
| `backend/src/test/java/com/compass/platform/integration/CommitmentApiTest.java` (or new integration test class) | **`GET /lineage` returns 200** for owner; **403/404** when same as **`GET /commitments/{id}`** for forbidden/missing; optional cross-user manager case if test harness supports it. |

#### Do **not** change

- **`VisibilityEnforcer`** rules—only **call** existing methods.
- **`Commitment` entity** schema unless a missing index forces it (unlikely).

---

### Frontend — files to add or touch

#### Types & API

| File | Purpose |
|------|---------|
| `frontend/src/types/commitment.types.ts` | Add **`CommitmentLineageNode`**, **`CommitmentLineageResponse`** (or inline in API file) matching backend JSON (`camelCase` from Jackson). |
| `frontend/src/api/commitments.api.ts` | **`getCommitmentLineage(id: string, params?: { limit?: number; cursor?: string })`** → `Promise<CommitmentLineageResponse>`. Base path: **`/api/v1/commitments/${id}/lineage`**. |

#### Hooks

| File | Purpose |
|------|---------|
| `frontend/src/hooks/useCommitmentLineage.ts` (new) | **`useQuery`** (TanStack Query) keyed by `['commitment-lineage', commitmentId, cursor]` for paged chunks **or** one hook that merges pages in state: initial `limit=7`, append on “See more” with `cursor` = oldest id from last response. Expose **`fetchNextPage`**, **`hasMore`**, **`isLoading`**. |

#### UI components (new feature folder)

| File | Purpose |
|------|---------|
| `frontend/src/features/commitment-history/HistoryDrawer.tsx` (or `CommitmentHistoryDrawer.tsx`) | **Headless UI** or existing **`ConfirmDialog` / drawer pattern** if one exists—else modal panel consistent with app. Renders **`CommitmentLineageTimeline`** inside; receives **`commitmentId`**, **`onClose`**, **`open`**. |
| `frontend/src/features/commitment-history/CommitmentLineageTimeline.tsx` | Vertical list: **newest at top**; each row matches **CarryForwardPanel** / **CommitmentCard** styling (surface, bullets read-only, recon note block). **“See more history”** button at bottom when `hasMore`; calls **`fetchNextPage`**. Loading skeleton using existing patterns. |
| `frontend/src/features/commitment-history/MyRollingWorkSection.tsx` (new) | **My Team only:** collapsible header **“My rolling work”**, **`localStorage` key** e.g. **`compass.myRollingWork.collapsed`** (`'true'` / `'false'`). When expanded, lists current user’s commitments that have lineage (or opens History from rows)—**product decision:** either list commitments with **“History”** button per row **or** single summary—**prefer** aligning with IC: show compact rows + **History** opens same drawer. |

#### Integration points

| File | Purpose |
|------|---------|
| `frontend/src/features/my-week/MyWeekPage.tsx` | At **bottom** of main content (below commitment list / reconciliation): **“History”** section—if no qualifying commitments, **one line** under heading per spec. For each commitment with `carriedFromCommitmentId != null` **or** always show section with placeholder—**implement per product:** show section with placeholder always **or** only when any chain exists—**handoff:** **always show “History” heading + one line** when empty; when non-empty, list entries with control to open **HistoryDrawer** for `commitment.id`. |
| `frontend/src/features/my-team/MyTeamPage.tsx` | **Below** cycle selector, **above** `DashboardFilters` / team content: render **`MyRollingWorkSection`** (collapsed by default, `localStorage`). Only for roles that already see My Team (**manager+**). Data: filter **`useCommitments(activeCycleId)`** to **`userId === auth.userId`** for “my” commitments in that cycle; **History** uses anchor id = that commitment’s id. |

#### Optional / later (not blocking v1)

| File | Purpose |
|------|---------|
| `frontend/src/features/briefing/*`, `observatory/*`, `portfolio/*` | Add **“History”** drill that opens **`HistoryDrawer`** with same `commitmentId`. |

#### Tests

| File | Purpose |
|------|---------|
| `frontend/src/features/commitment-history/__tests__/CommitmentLineageTimeline.test.tsx` | Renders nodes newest-first; “See more” triggers fetch. |
| `frontend/src/lib/__tests__/...` or component test | **`localStorage`** key for My Team collapse (optional). |

---

### API reference (for agents)

```http
GET /api/v1/commitments/{id}/lineage?limit=7
GET /api/v1/commitments/{id}/lineage?limit=12&cursor={uuid}
```

- **`id`** — anchor commitment (typically current week’s row).  
- **`limit`** — max nodes to return (7 first page, 12 subsequent per product).  
- **`cursor`** — oldest commitment id from the previous page (newest-first ordering).  
- **Auth:** same JWT as rest of API.  
- **403/404:** same as `GET /api/v1/commitments/{id}`.

---

### Acceptance checklist

- [ ] Lineage nodes include **cycle label** and **reconciliation** fields where available.  
- [ ] **Newest first** in UI; **See more** loads older chunks.  
- [ ] **History** drawer is **one component** used from My Week and My Team.  
- [ ] **My Team** “My rolling work” **collapsed by default**; state in **`localStorage`**.  
- [ ] Empty state: **“History”** section with **single explanatory line**.  
- [ ] No new permission model; integration test proves forbidden access matches single-commitment GET.  
- [ ] **ApiReferenceTable** in `frontend/src/features/architecture/ApiReferenceTable.tsx` updated with new route (if that table is maintained).  

---

### Out of scope (v1)

- New charts or observatory redesign.  
- Deep link query param (optional follow-up).  
- Briefing/Observatory/Portfolio entry points (reuse drawer when needed).  
- Backend refactor of `computeCarryForwardChains` to share lineage builder (optional cleanup later).

---

### Related code (read before implementing)

- Chain walk logic reference: `AnalyticsService.computeCarryForwardChains` (backward walk)—lineage should be **full nodes**, not summary.  
- Clone / link: `CommitmentService.cloneForCarryForward`, `Commitment.carriedFrom`.  
- Visibility: `CommitmentService.getById` + `VisibilityEnforcer.canViewCommitment`.  
- Styles: `CarryForwardPanel.tsx`, `CommitmentCard.tsx`, `global.css` tokens.
