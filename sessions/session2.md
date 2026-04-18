# Session 2 — Landing Page Version Comparison

- **Date:** 2026-04-18
- **Branch:** main
- **Working Directory:** /Users/vedangvaidya/Desktop/Omega Life/CareRoster

---

## User Request

> "Take a look at `landing/v2-scroll-journey.html`, `landing/v3-hero-sarah.html`, and `landing/v3.5-hero-sarah.html`"

The user asked for a review/comparison of the three landing page versions.

---

## Actions Taken

### 1. Read & Analysed All Three Files

- **v2-scroll-journey.html** (4,228 lines) — read first 2,000 lines via initial Read, then confirmed structure
- **v3-hero-sarah.html** (1,663 lines) — read header + key sections
- **v3.5-hero-sarah.html** (1,583 lines) — read header + key sections
- Ran `wc -l` on all three files to confirm sizes
- Ran `diff v3 v3.5` to identify exact differences (80 lines of screenshot-related code removed)

### 2. Produced Comparison Summary

Delivered a structured comparison of all three versions:

| Version | Lines | Key Differences |
|---------|-------|-----------------|
| **v2-scroll-journey** | 4,228 | Full kitchen sink: hero with Sarah + Alex SVG characters (3D parallax tilt, float animation), "Falling Sarah" transition, 3D scroll screenshot section (dashboard with perspective), full 8-scene horizontal scroll journey with parallax BG/FG layers, ground plane, walking character, scene cards, float UIs, info buttons, overlays, modules section, progress dots. 755 lines of CSS. |
| **v3-hero-sarah** | 1,663 | Streamlined fork of v2. Same hero with Sarah + Alex. Removes 3D scroll screenshot section. Same journey engine but **adds browser-chrome screenshots** (`.scene-screenshot` with fake browser dots/URL bar + real app screenshots from `/screenshots/`) positioned left side of each journey scene. |
| **v3.5-hero-sarah** | 1,583 | Identical to v3 but **removes all `scene-screenshot` elements** and their CSS. Clean journey scenes with only cards + float UIs. 80 lines shorter than v3. |

**Key structural insight:** v2 → v3 removed the hero 3D screenshot and added in-scene screenshots. v3 → v3.5 reverted the in-scene screenshots, leaving the cleanest journey layout.

---

## Files Modified

None — this was a read-only analysis session.

---

## Session Status at End

### Done
- Full comparison of all three landing page versions delivered to user
- Identified the evolutionary path: v2 (full) → v3 (added scene screenshots) → v3.5 (removed scene screenshots)

### What's Next
- User has not yet indicated a direction — awaiting decision on which version to build on, combine, or iterate
- No changes made to any files
