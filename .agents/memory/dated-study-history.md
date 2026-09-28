---
name: Dated study history
description: The invariant for daily progress, rollover, and missed-day records.
---

Every local calendar date gets its own study record. XP, page counts, completed sessions, and focus duration are daily values rather than cumulative totals. When the app is reopened after one or more dates have passed, it backfills zero-activity records for the missed dates before creating the current day.

**Why:** Cumulative snapshots made the next day repeat the previous day’s sessions and XP, while a closed app could not record a missed day until the user returned.

Each day record also keeps task snapshots in most-recently-touched order. New plan tasks should appear at the top, and deleting or editing a live task must not erase a task already saved in a past day.

**How to apply:** Any new study metric must be reset at date rollover, added to the current date’s record only, and displayed from that record in Plant history. Task activity should update the current day’s snapshot without mutating older records.