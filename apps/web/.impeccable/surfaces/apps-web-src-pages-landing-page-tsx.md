---
version: 1
slug: "apps-web-src-pages-landing-page-tsx"
primary_target: "apps/web/src/pages/landing-page.tsx"
related_targets:
  [
    "apps/web/src/components/marketing/landing-hero.tsx",
    "apps/web/src/components/marketing/landing-features-index.tsx",
    "apps/web/src/components/marketing/landing-auth-actions.tsx",
    "apps/web/src/components/marketing/landing-index.ts",
    "apps/web/src/components/marketing-page-shell.tsx",
  ]
---

# `/` landing — Persuade

**Mode:** Persuade  
**Approved comp:** `.impeccable/mocks/landing-index-pulled-open.png` (delegated pick; cover + fullbleed are alternates)

**Audience / job:** Agency operator or knowledge worker evaluating Orch. Understand Canvas + Agency OS + visible agent, then create an account. Returning users sign in.

**Action:** Primary Get started → `/login?mode=sign-up`. Secondary Sign in → `/login?mode=sign-in`. Authenticated: Open workspace → `/canvas`. Tertiary See pricing → `#pricing`.

**Proof:** Existing marketing vignettes (canvas nodes, tracker rows, agent tool traces). Label sample data. No invented logos or metrics.

**Direction:** Instrument Index. Hero is manifesto + CTAs with a parent-scoped bottom GradualBlur that signals scroll. Features holds the 01/02/03 collapsibles and product proofs. Pricing untouched. Footer is a centered lockup with one horizontal nav row.

**Memorable moment:** Scroll past the hero fade into Agency pulled open on real tracker rows.

**Constraints:** Established DESIGN.md world. Motion ≤3 (WebThreads, index row morph). Index open/close morphs via grid-template-rows (not fade). Same-page hashes smooth-scroll to target. GradualBlur is parent-targeted on the hero only, never page-fixed, so the footer stays readable. No icon-card grid, gradient text, liquid glass, emerald spotlight, Magnet. Pricing markup stays. Footer follows the centered studio composition (lockup, inline nav, dotted rule, copyright + theme toggle). No invented socials.

## Comp inventory

| Region                    | Medium                                                 |
| ------------------------- | ------------------------------------------------------ |
| Hero atmosphere           | WebThreads + parent GradualBlur at bottom              |
| Lockup                    | Existing MarketingBrandLockup                          |
| Headline / sub            | Semantic HTML; Poppins already loaded                  |
| Primary / secondary CTAs  | shadcn Button + Link (not raster)                      |
| Open-row product inset    | Features index LandingAgencyPreview / vignette / agent |
| Features exclusive expand | shadcn Collapsible + local open-id state               |
| Footer                    | Centered lockup + horizontal nav + dotted rule         |
| Pricing                   | Untouched existing component                           |

No raster produce entries. Do not trace invented comp nav or glass.

**Unresolved:** None for this pass.
