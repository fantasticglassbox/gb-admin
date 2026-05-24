# Glassbox V2 — Product Requirements Document

**Status:** Draft · v0.1 · 2026-05-24
**Owners:** Product, Engineering
**Repos:** [gb-media](https://github.com/fantasticglassbox/gb-media) · [gb-core](https://github.com/fantasticglassbox/gb-core) · [gb-admin](https://github.com/fantasticglassbox/gb-admin)
**Technical RFCs:** [gb-core/docs/RFC.md](https://github.com/fantasticglassbox/gb-core/blob/core-new/docs/RFC.md) · [gb-media/docs/RFC.md](https://github.com/fantasticglassbox/gb-media/blob/master/docs/RFC.md)

---

## 1. TL;DR

Glassbox is a **DOOH (Digital Out-Of-Home) ad network for the Indonesian market**: partners sell ad slots, merchants host screens in their venues, and the platform takes a revenue-share cut on each play. V1 ships today and works end-to-end. V2 turns it into a sellable product at scale by adding self-serve booking, campaign hierarchy, Indonesia-native payment + tax + notifications, multi-zone layouts, and the operational depth needed to manage a fleet of hundreds of devices without growing the support team linearly.

V2 ships as **additive endpoints under `/v2/`** alongside V1. No big-bang rewrite. V1 keeps serving customers for the entire V2 build. Per-tenant cutover when V2 reaches feature parity.

## 2. Why now

| Signal | Implication |
|---|---|
| V1 has the player + CMS done, but no advertiser self-serve | Sales scales linearly with ops headcount |
| Indonesia DOOH demand is mostly direct (Dentsu, GroupM, Mindshare) — programmatic is nascent | We need agency-friendly tooling, not RTB |
| Indonesian SMEs (warung, kost, café) want hybrid screens: their menu + paid ads | Multi-zone layouts unlock the F&B segment |
| Tax + payment compliance (e-Faktur, Xendit/Midtrans) is non-negotiable for B2B sales | Cannot invoice PT-tier customers without it |
| Device fleet will hit ~1000 in 2026; current per-device monitoring is coarse | Need real heartbeat dashboard + remote ops |

## 3. Personas

| Persona | Goals | Frustrations with V1 |
|---|---|---|
| **Brand advertiser** (e.g. Indomaret, Bank Mandiri marketing) | Reach customers in mall / convenience stores; quantify impressions; pay easily | No self-serve. Submits creative via email to ops. Waits days for invoice. Doesn't know if ad actually played. |
| **Agency planner** (Dentsu Indonesia, GroupM) | Plan campaigns across networks; bulk-upload creative; pull reports for clients | No API. Manual spreadsheet exports. No campaign hierarchy — just flat "ads". |
| **Partner** (independent sales rep / sub-reseller) | Sell to local advertisers; track commission; manage own client roster | Partner role exists but only sees their own revenue dashboard — can't manage clients/campaigns. |
| **Merchant** (venue owner: mall, warung, kost, salon) | Get reliable screens with paid content + own promos; see revenue share | Can see their screens but cannot upload own menu/promo content (single-zone only). Revenue dashboard exists but no payout history. |
| **Ops / Account Manager** (internal Glassbox staff) | Onboard devices; resolve advertiser/merchant tickets; troubleshoot screens | Existing admin CMS is strong on CRUD but weak on monitoring. Hard to answer "why isn't this screen showing the ad?" |
| **Finance** (internal Glassbox staff) | Reconcile revenue; generate invoices; handle PPN + PPh 23 + e-Faktur | Manual everything. No invoice generation in app. |
| **Viewer** (person walking past a screen) | Not directly addressed. Foot traffic data is what we sell. | n/a |

## 4. V1 → V2 functional delta

### Already shipping in V1 (preserved in V2)
- Advertisement CRUD with approval workflow (DRAFT → PUBLISHED → REJECTED → INACTIVE)
- Asset upload + management
- Per-merchant + per-partner revenue dashboards
- Device list + status filtering
- Per-device "what's currently playing" view
- Crashlytics integration on player
- FCM push: PUBLISH / UNPUBLISH / DEVICE_CHECK
- Local-cache + cooperative-sleep scheduler on player
- Heartbeat (5-min) + proof-of-play (12-h batched) on player → backend tables ready
- POS modules removed (cart/order/bill/modifier/menu/category/session) — out of scope

### New in V2

#### 4.1 Campaign hierarchy
Replace flat `Advertisement` rows with `Advertiser → Campaign → Creative → Placement`:
- **Advertiser** — the company paying (Indomaret, BCA). Multiple campaigns.
- **Campaign** — a time-boxed initiative (e.g. "Lebaran Promo 2026"). Holds budget, goals, targeting.
- **Creative** — the actual media asset (the MP4 / JPG). One campaign can have multiple creatives (A/B variants, different formats).
- **Placement** — where the campaign runs (venue × dayparting × pricing tier).

Today's `Advertisement` model collapses all four into one row. V2 splits them; gb-media reports proof-of-play against `creative_id` AND `campaign_id` for richer reporting.

#### 4.2 Inventory + rate cards + self-serve booking flow
- **Inventory model**: each venue (mall corridor, warung counter, Indomaret POS) has a published rate card (Rp/play × daypart × multipliers).
- **Booking flow** inside the advertiser-role view: pick venues by city/category, pick dates, see calculated cost, pay via Xendit/Midtrans VA, get e-Faktur invoice.
- Replaces ops-team-uploads-on-behalf-of-advertiser. Targeted at SME advertisers initially; agencies still use API.

#### 4.3 Indonesia-native commercial layer
- **Payments**: Xendit VA + Midtrans + QRIS. Stripe NOT integrated.
- **Tax**: PPN 11% + PPh 23 2% withholding, NPWP required on invoices, e-Faktur integration (via Klikpajak or OnlinePajak).
- **Currency**: IDR primary; USD/SGD/MYR for cross-border agency clients.
- **Notifications**: WhatsApp Business API as primary channel (campaign approved, device offline, payment due). Email as fallback.
- **Localization**: full Bahasa Indonesia UI in gb-admin, English toggle.

#### 4.4 Multi-zone layouts (2-zone v1)
- Add `LayoutType` to device settings: `FULLSCREEN | SPLIT_70_30_H | SPLIT_80_20_V`
- `Creative` gets `zone: MAIN | SECONDARY` (default MAIN, back-compat)
- Carousel becomes 2 independent zone renderers when layout != FULLSCREEN
- Proof-of-play events carry `zone` field
- Unlocks the F&B segment (menu + ad combo), Indomaret-style POS displays

#### 4.5 Per-device monitoring + remote ops
- Real-time device fleet map + list in gb-admin
- Per-device drill-down: heartbeat trend, current ad, recent error timeline, last-seen, cache state
- Remote actions via FCM: `SCREENSHOT`, `REBOOT`, `SET_VOLUME`, `SET_BRIGHTNESS`, `EXPORT_LOGS`, `FORCE_REFRESH`
- Offline-alert rules (e.g. "alert on >1h offline")

#### 4.6 Content compliance for Indonesia
- New per-creative flags: `requires_halal_venue`, `contains_tobacco`, `contains_alcohol`, `political`, `gambling`
- Per-venue policy: `halal_only`, `permitted_categories`
- Booking flow enforces match (cannot book a halal-only venue with non-halal creative)
- Election-window auto-mute (for periodic Pemilu / Pilkada regulated quiet periods)

#### 4.7 Timezone-aware scheduling
- Today gb-media uses device-local clock implicitly. V2 schedules ads in venue-local time and converts to UTC for delivery.
- WIB / WITA / WIT support; daylight saving not relevant in ID but pattern works globally.

#### 4.8 OTA updates
- gb-media uses Android In-App Update API for foreground prompts
- Backend exposes "minimum version" check; player gracefully refuses to serve outdated versions

#### 4.9 Audit log
- Real audit trail: who did what to which entity, with timestamp + IP
- Surfaced in gb-admin (ops view) for support and security

#### 4.10 Reporting depth
- Per-campaign pacing ("on track to spend Rp X by end of period")
- Per-venue rollups
- Share-of-voice per advertiser per venue
- CSV + PDF + e-Faktur XML exports

## 5. V2 API surface (`/v2/` prefix)

All V2 endpoints follow consistent rules:
- Response envelope: `{ "data": ..., "meta": { "cursor": ..., "has_more": ... }, "errors": [...] }`
- Cursor pagination (no offset, no count) on list endpoints
- Idempotency-Key header required on every POST/PUT/DELETE
- `Sunset` and `Deprecation` headers per RFC 8594 for any endpoint scheduled to retire
- All datetimes ISO-8601 UTC; timezone display handled client-side
- Errors follow RFC 7807 problem-detail shape

See [gb-core RFC](https://github.com/fantasticglassbox/gb-core/blob/core-new/docs/RFC.md) for the full endpoint inventory and shapes.

## 6. Wireframes

Living HTML mockups (clickable, navigate between surfaces): `gb-admin/docs/wireframes/index.html`. Covers 12 surfaces:

**Android TV player (5):** boot/splash, single-zone playback, 2-zone playback, idle state, hidden admin panel.

**Web CMS (7):** admin dashboard, campaigns list (hierarchy), campaign builder (booking flow), device fleet map, device detail (heartbeat + remote ops), reports, billing/invoices.

Wireframes are **structural, not visual** — finalize visual design after stakeholder review of flows.

## 7. Success metrics (12-month post-V2-launch)

| Metric | V1 baseline | V2 target |
|---|---|---|
| Time from advertiser sign-up to first ad live | ~5 business days (manual flow) | ≤ 1 hour self-serve |
| Invoice generation lag (period close → invoice sent) | ~3 days manual | < 1 hour automated |
| Device incident MTTR (offline → resolved) | unmeasured | < 30 min for top-quartile incidents |
| Ad reporting freshness (play → visible in CMS) | none (no reports) | < 24 hours |
| % of revenue from self-serve advertisers | 0% | ≥ 25% |
| WhatsApp notification open rate vs email | n/a | track for comparison |
| Multi-zone venue adoption (of F&B segment) | 0% | ≥ 40% |
| Agency API monthly active users | 0 | ≥ 3 named agencies |

## 8. Out of scope for V2

Explicitly NOT shipping in V2 (deferred to V3+):

- **Programmatic DOOH / OpenRTB integrations.** Indonesia DOOH RTB is nascent; direct sales is the norm. Revisit when local SSPs mature.
- **Camera-based audience demographic AI.** PDP Law concerns + ethical complexity. Use proxy data (foot-traffic feeds from mall operators) instead.
- **Multi-region deployment.** Single AWS ap-southeast-1 region is sufficient for Indonesia.
- **SSO (SAML/OIDC) for enterprise advertisers.** Rare in Indonesia outside multinationals.
- **In-browser creative editor.** Advertisers/agencies bring finished MP4/JPG. No banner builder.
- **N-zone (>2) layouts.** 2-zone covers the F&B + Indomaret case; richer layouts await venue research.
- **Dynamic content feeds** (live weather, stocks, news in zones). Static playlists only.
- **Native iOS player.** Android TV / Android tablets only. iOS is a separate effort if/when needed.

## 9. Risks & mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| e-Faktur integration via 3rd party slips schedule | Medium | High | Pick vendor (Klikpajak vs OnlinePajak) in Sprint 4; have direct-DJP fallback path scoped |
| Xendit/Midtrans webhook flakiness causes payment ghosts | Medium | Medium | Idempotency on both ends; reconciliation cron daily; manual ops override |
| Agency API takes longer than 1 sprint | High | Medium | API-spec first, mock backend in Sprint 3; can ship UI without final integration |
| TV fleet rejects new v2 client mid-rollout | Low | Critical | Canary device first (1 unit), 24h soak, then 5% fleet, 25%, 100%. Per-tenant rollback flag. |
| Compliance category enforcement misses an edge case | Medium | High (regulatory) | Manual review queue for tobacco/alcohol/political ads; auto-rejection is advisory only |
| Bahasa translation quality fails native test | Medium | Medium | Single Bahasa-native reviewer signs off all UI copy before each release |
| Public Indonesian election windows (Pemilu 2029) trigger emergency content block | Low (date-known) | Critical | Build election-mute as a first-class scheduler concept now, not as a panic patch |

## 10. Open questions

1. **Which payment vendor first** — Xendit (most B2B-friendly, generous free tier) or Midtrans (broader consumer reach)? Probably Xendit; confirm with Finance.
2. **Which e-Faktur vendor** — Klikpajak (modern API, ~Rp 500K/month tier) vs OnlinePajak (legacy but established) vs Pajakku (cheapest)?
3. **Initial customer profile** — mall operator (Lippo/Pakuwon), agency (Dentsu Indonesia), or direct brand (Indomaret, GoTo, Mandiri)? Each pulls different features forward.
4. **First merchant types** — start with malls only, or include F&B / convenience stores from launch (which makes 2-zone Phase 1, not Phase 2)?
5. **Pricing model** — fixed CPM, dayparted multipliers, or auction within direct deals? Affects rate-card UI complexity.
6. **Election window policy** — define "regulated quiet period" rules with legal counsel before Sprint 10.

## 11. Phased rollout

| Sprint | Weeks | Deliverable |
|---|---|---|
| 0 | 1 | V2 API skeleton (routes/auth/DTO/pagination/error envelope) |
| 1 | 2-3 | V2 auth + V2 ads list + V2 heartbeat + V2 playback-events |
| 2 | 4-5 | gb-media v2 client (falls back to v1 if v2 returns 404) |
| 3 | 6-8 | Campaign hierarchy + advertiser/agency role views |
| 4 | 9-10 | Booking flow + inventory + rate cards |
| 5 | 11-12 | Xendit + Midtrans + e-Faktur invoicing |
| 6 | 13-14 | WhatsApp notifications + per-device monitoring UI |
| 7 | 15-16 | 2-zone layouts (Android + CMS + API) |
| 8 | 17-18 | Bahasa i18n pass on every V2 screen |
| 9 | 19-20 | Reporting depth + exports |
| 10 | 21-22 | Compliance flags (halal/tobacco/election lock) |
| 11 | 23+ | V1 deprecation (per-tenant cutover, sunset announcements) |

**Total: ~5–6 months** to full feature parity + new features, with V1 continuously live.

## 12. Glossary

| Term | Meaning |
|---|---|
| **DOOH** | Digital Out-Of-Home (advertising on physical screens in public/commercial spaces) |
| **CPM** | Cost per Mille (per 1,000 impressions) |
| **Daypart** | Time-of-day segment (morning rush, lunch, etc.) used for differentiated pricing |
| **Proof-of-play** | Verifiable record that a specific ad ran on a specific device at a specific time |
| **Heartbeat** | Periodic health ping from a device to backend |
| **NPWP** | Indonesian tax identification number |
| **PPN** | Indonesian VAT (currently 11%) |
| **PPh 23** | Indonesian withholding tax on services (2%) |
| **e-Faktur** | Indonesian government e-tax-invoice system (mandatory for taxable enterprises) |
| **QRIS** | Indonesian unified QR-code payment standard |
| **VA** | Virtual Account (bank account number generated per invoice for payment matching) |
| **Pemilu / Pilkada** | Indonesian general / regional elections (trigger regulated political-ad windows) |
| **Halal venue** | Venue with halal-only content policy (mosques, Islamic schools, halal-only F&B) |
