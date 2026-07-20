---
name: browser-bookmarks-db
description: >-
  Edit web browser bookmarks directly in their on-disk databases: Chromium-family
  (Chromium, Chrome, Edge, Brave — JSON Bookmarks file) and Firefox (places.sqlite).
  Use this whenever the user wants to classify, move, add, rename, dedupe, or bulk-edit
  bookmarks programmatically, sync bookmarks between browsers, or asks anything about
  the internal bookmark storage of a browser — even if they don't say "database".
  Covers the traps: browser-overwrites-on-exit, process detection by path, Chromium
  checksum, Firefox tag rows, and Firefox Sync counters.
---

# Editing browser bookmarks in their internal databases

Both engines keep bookmarks in a single user-profile file you can edit directly —
**but only while the browser is fully closed**. The #1 failure mode: the browser holds
the whole tree in memory and **rewrites the file on exit**, silently destroying your
edit. An edit that "worked" (verified in the file!) gets clobbered minutes later when
the user closes their browser. So the order is always:

1. **Verify the browser is closed — by process *path*, not name.**
2. Back up the file(s).
3. Edit with a script that asserts its assumptions (abort > guess).
4. Verify by re-reading the store.
5. Have the user open the browser and confirm visually. Exit 0 ≠ bookmarks moved.

## Step 1 — browser really closed?

Chromium-family browsers all run as `chrome.exe` or their brand name — name checks
lie. Match the executable path against the profile you're about to edit:

```powershell
# any process belonging to THIS browser install?
Get-Process | Where-Object { $_.Path -like "*\Chromium\*" }        # adjust folder
Get-Process -Name firefox -ErrorAction SilentlyContinue
```

Graceful close (session restores on next launch): `taskkill /IM firefox.exe` (no `/F`),
then poll until the process list is empty. Ask before closing the user's browser.

## Chromium family — `Bookmarks` JSON

Path: `%LOCALAPPDATA%\<Vendor>\User Data\Default\Bookmarks` where `<Vendor>` is
`Chromium`, `Google\Chrome`, `Microsoft\Edge`, `BraveSoftware\Brave-Browser`.
Same format for all. Use Python `json` (PowerShell `ConvertTo-Json` mangles deep trees).

Structure: `roots.bookmark_bar / roots.other / roots.synced`, each a folder node:
`{"type": "folder", "name", "id", "guid", "date_added", "date_modified", "children": []}`;
url nodes: `{"type": "url", "name", "url", "id", "guid", "date_added"}`.

Rules:
- **Delete the top-level `"checksum"` key** after editing — the browser recomputes it.
  Leaving a stale one in can make the browser discard the file.
- New node ids: string ints, unique across ALL roots → `max(id) + 1` over the whole tree.
- New guids: `str(uuid.uuid4())`.
- Timestamps: Chrome epoch (1601-01-01) in **microseconds**:
  `str(int((time.time() + 11644473600) * 1_000_000))`.
- Move = relocate the whole node object; keep its id/guid/date_added.
- If the browser was open during the edit, the symptom afterwards is: your moved items
  reappear at their old spot **with new ids**, and any folder you created survives but
  **empty**. Redo the edit with the browser closed.

## Firefox — `places.sqlite`

Path: `%APPDATA%\Mozilla\Firefox\Profiles\<xxxx>.default-release\places.sqlite`.
Locked (exclusive) while Firefox runs; free to edit once closed. Back up the `-wal`
and `-shm` siblings too. Python `sqlite3` works fine.

Schema you need — `moz_bookmarks`:
`id, type (1=bookmark, 2=folder), fk → moz_places.id (URL), parent, position,
title, dateAdded, lastModified (both µs Unix), guid, syncStatus, syncChangeCounter`.

Roots by guid: `root________`, `menu________` (Bookmarks Menu), `toolbar_____`
(toolbar), `unfiled_____` (Other), `mobile______`, and `tags________`.

Rules:
- **Tag trap:** Firefox tags are stored as *bookmark rows* whose parent folders hang
  off the `tags________` root. A URL search returns them alongside real bookmarks.
  Never move/delete them — that corrupts tagging. Filter:
  ```sql
  AND b.parent NOT IN (SELECT id FROM moz_bookmarks
                       WHERE parent = (SELECT id FROM moz_bookmarks WHERE guid='tags________'))
  ```
- Find real bookmarks: `JOIN moz_places p ON b.fk = p.id WHERE p.url LIKE '%…%'`.
- New guids: exactly 12 chars of `[A-Za-z0-9_-]`.
- After moving: renumber `position` (0..n-1, ordered) for every affected parent.
- **Firefox Sync:** bump `syncChangeCounter` (+1) on every row you touch *and* on the
  affected parent folders, and refresh `lastModified` — otherwise Sync may revert or
  duplicate your change. New rows: `syncStatus=1, syncChangeCounter=1`.

## Script hygiene

- `assert` every assumption (expected match count, target folder exists, no duplicate
  destination) so a surprise aborts cleanly instead of half-writing.
- Print what moved and run a verify query/parse at the end — show the user evidence.
- Timestamped backups beside the original (`<file>.pre-<task>.bak`).

## Cross-browser note

The two stores are independent — a classification done in one browser does not appear
in the other. Repeat the operation per browser (folder trees often mirror each other
if the user syncs manually).
