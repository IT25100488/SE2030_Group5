# Guest Home Page UI

Guests (not signed in) land on a public home page modelled on the reference real-estate video. Signed-in users and all admin flows behave exactly as before.

## Video features implemented
| Video feature | On our home page |
|---|---|
| Sky hero, building rising, big headline | "Find your floor." hero with search bar |
| Scroll zooms into the building, then the brand wordmark appears filled with the photo | Pinned hero zooms into the tower, clouds sweep in, "FLOW" wordmark filled with the photo |
| Text that fills from grey to dark as you scroll | Statement, headings, sell copy |
| Aerial image that expands open | Clip-path reveal image |
| "This isn't just about real estate" with chevron image strips sliding in | Same, using live listing photos |
| Pinned "Real Estate. Rewired." with steps that light up one by one | "Buying, simplified." Find it / See it / Hold it / Own it |
| "Don't Rent Your Career" with drifting images | "Selling? We'll bring the buyers." (list apartment / join as agent) |
| Testimonial with photo, quote and dots | Real reviews from the API, photo of the reviewed apartment, dots, auto-advance |
| Dark Buy / Sell / Rent rows where a photo opens behind the word | Buy / Sell / Tour / Ask (opens on hover, keyboard focus, or when centred on phones) |
| "Support Beyond Buying and Selling" card strip | "Help beyond the purchase." scrollable cards with arrow buttons |
| Pink "Blog & Resources" list with Read more | "Guides & notices": public announcements + guides, opening a reading dialog |
| Full-bleed closing photo, footer slides over it | Curtain footer with newsletter field and giant wordmark |

## Files added
- `frontend/src/components/GuestHome.jsx` — the page. No business logic; every control calls an existing App handler.
- `frontend/src/components/GuestHome.css` — styles, prefixed `.gh`.

## Files changed
- `frontend/src/App.jsx` — `home` tab (default for guests; sign-out returns there); search presets for Module 2; handlers for join-as-agent and newsletter; old footer hidden only on the home tab.
- `frontend/src/components/Navbar.jsx` — "Home" tab for guests; light style over the hero; `home` after sign-out. On phones (≤640px) tab labels become icons (labels kept for screen readers) so the bar no longer overflows — this fixes a pre-existing overflow on every page.
- `frontend/src/components/Module2Search.jsx` — optional props `initialKeyword`, `initialPropertyType`, `initialMaxPrice`, `initialListingId` (no effect when not passed).
- `frontend/index.html` — adds the Schibsted Grotesk font.
- `frontend/dist`, `backend/src/main/resources/static` — rebuilt so Spring Boot also serves the new UI.

## What each control does
| Control | Goes to |
|---|---|
| Hero search, Buy row, Browse buttons, footer Explore links | Explore Residences (filters pre-filled where given) |
| Listing card, reviewed-apartment link, Repayment calculator card | That apartment's detail view (includes the finance simulator) |
| City rows, footer locations | Existing city filter |
| Sell row, List your apartment | Register as Owner/Agent (signed-in sellers/agents → Property Management) |
| Join as an agent | Register (choose Real Estate Agent) |
| Tour row, Private tours card, tour guide | Buyer sign-in prompt |
| Ask row, Support desk card, Ask a question, Customer inquiries | Customer Inquiries (Module 5) |
| Listing alerts card, newsletter field, Sign in | Auth modal (newsletter validates the email first) |
| Guides & notices → Read more | Reading dialog (Esc or Close to dismiss) with a follow-up action |
| Purchase terms / Privacy / Broker directory | Existing legal dialogs |
| Staff portal | Existing admin login |

Guide content matches the backend rules: 10% standard deposit (5% promotional, 2% off for full settlement), finance verification, refunds of 100% within 2 days, 85% on days 3–7, none after 7 days.

## Accessibility & motion
Keyboard focus is visible on every control; the scroll animations switch off and pinned sections become normal sections for users with "reduce motion" enabled.

## Running
If `npm run dev` fails after unzipping, run `npm install` once inside `frontend/` (node_modules may be from another OS).
