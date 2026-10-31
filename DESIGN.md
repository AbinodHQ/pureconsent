# Secure Shield

The user-selected palette is applied as a light workspace with dark navigation.

| Role | Token | Usage |
| --- | --- | --- |
| Deep Slate | `#0B0F19` | Sidebar, primary text, neutral widget buttons |
| Royal Indigo | `#4F46E5` | Primary actions and brand accent |
| Emerald Shield | `#10B981` | Operational status dots; darker `#047857` for readable green text |
| Alpine Frost | `#F8FAFC` | Main canvas, alternating table rows |
| Light Zinc | `#F1F5F9` | Segments, secondary surfaces |
| Amber Alert | `#F59E0B` | Warning role; darker `#92400E` text on pale amber |

Typography: 16px base; 14–16px main interface copy; 12–13px secondary metadata; 30–33px page headings. Essential text uses Slate 600 or darker on light surfaces. Controls have visible keyboard outlines and generally 40–44px minimum targets.

Mobile statistics become full-width rows instead of compressed three-column cards. Forms use one column on narrow screens. The consent widget uses white, neutral grays, and dark buttons, with identical accept/reject styling.

Theme overrides are in `app/secure-shield.css`; structural responsive layout is in `app/globals.css`. Widget styling is isolated within `public/consent.js`.

Operational indicators describe the observed state, such as configuration or connection. They do not imply a legal compliance certification.

Legal pages use the shared `document-page` layout, Brand, LanguageSwitcher and contextual navigation links. Keep long German paragraphs and addresses readable on mobile; use semantic headings and an address element for provider identity. Page titles and descriptions must follow the selected website language.
