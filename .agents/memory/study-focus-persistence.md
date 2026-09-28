---
name: Study Focus persistence
description: The product decision behind local-first progress storage and the planned path to cross-device sync.
---

Study Focus should feel useful before requiring an account: tasks, page counts, timer progress, XP, plant history, and journal entries can begin as local-first state. Cross-device sync is a later layer, not a prerequisite for the first focused session.

**Why:** The app's core promise is reducing friction at the moment a student starts studying. Requiring backend setup or authentication before that moment would work against the product's calm, immediate experience.

**How to apply:** Keep local storage as the fast cache, but sync the complete state to the API for published persistence. Load server state before uploading local state so an empty cache cannot overwrite saved progress. Cross-device sync still requires user identity or authentication.