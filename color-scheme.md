# Color Tokens — Nature's Village Resort

## Tokens

```css
--nvr-forest: #66491c;
--nvr-moss: #8aa54c;
--nvr-sage: #bccb95;
--nvr-brass: #9bb058;
--nvr-brass-ink: #5c6b28;
--nvr-gold-light: #ddeab0;
--nvr-clay: #96631f;
--nvr-sage-brass: #455226;
--nvr-sage-brass-deep: #2f3919;
--nvr-ink: #34301f;
--nvr-charcoal: #453f29;
--nvr-stone: #6f6f50;
--nvr-cream: #f8faf0;
--nvr-linen: #f1f5e2;
--nvr-paper: #fdfef8;
--nvr-line: #e3e8cd;
--nvr-white: #ffffff;
--nvr-overlay-rgb: 27, 42, 36;
```

| Token | Hex | Role |
|---|---|---|
| `--nvr-sage-brass-deep` | `#2F3919` | Darkest green. Nav/footer bg |
| `--nvr-sage-brass` | `#455226` | Dark green. Hover on dark sections |
| `--nvr-brass-ink` | `#5C6B28` | Deep brass. Buttons with white text |
| `--nvr-moss` | `#8AA54C` | Base brand green. Links, icons |
| `--nvr-brass` | `#9BB058` | Accent green |
| `--nvr-sage` | `#BCCB95` | Light green. Tags, badges |
| `--nvr-gold-light` | `#DDEAB0` | Palest green-gold. Tinted backgrounds |
| `--nvr-forest` | `#66491C` | Dark brown. CTA buttons with white text |
| `--nvr-clay` | `#96631F` | Base clay. Secondary buttons with white text |
| `--nvr-ink` | `#34301F` | Darkest neutral. Heading/body text |
| `--nvr-charcoal` | `#453F29` | Dark neutral. Secondary headings |
| `--nvr-stone` | `#6F6F50` | Mid neutral. Muted/secondary text |
| `--nvr-line` | `#E3E8CD` | Borders, dividers |
| `--nvr-linen` | `#F1F5E2` | Section background tint |
| `--nvr-cream` | `#F8FAF0` | Card/panel background |
| `--nvr-paper` | `#FDFEF8` | Page background |
| `--nvr-white` | `#FFFFFF` | High-contrast text on dark bg only |
| `--nvr-overlay-rgb` | `27, 42, 36` | Dark scrim over hero images |

---

## Contrast Rules

**White or light text (`--nvr-white`, `--nvr-cream`) — safe backgrounds only:**
- `--nvr-sage-brass-deep` (13.8:1)
- `--nvr-forest` (8.3:1)
- `--nvr-sage-brass` (8.5:1)
- `--nvr-brass-ink` (5.9:1)
- `--nvr-clay` (5.1:1)

**Dark text (`--nvr-ink`, `--nvr-charcoal`) — safe backgrounds only:**
- `--nvr-paper`, `--nvr-cream`, `--nvr-linen`, `--nvr-line`, `--nvr-white`
- `--nvr-sage`, `--nvr-gold-light`
- `--nvr-moss`, `--nvr-brass` (mid-tone greens — dark text only, not white)

**Never do this:**
- ❌ White text on `--nvr-moss` (2.78:1 — fails)
- ❌ White text on `--nvr-brass` (similar lightness to moss — fails)
- ❌ White text on `--nvr-sage` or `--nvr-gold-light` (too light — fails)
- ❌ `--nvr-stone` text on `--nvr-line`/`--nvr-linen`/`--nvr-cream` (both mid-light — low contrast)
- ❌ `--nvr-charcoal` or `--nvr-ink` on `--nvr-forest`/`--nvr-clay`/`--nvr-brass-ink`/`--nvr-sage-brass`/`--nvr-sage-brass-deep` (dark-on-dark — fails)

**Quick pairing table:**

| Background | Use this text |
|---|---|
| `--nvr-sage-brass-deep`, `--nvr-sage-brass`, `--nvr-forest`, `--nvr-brass-ink`, `--nvr-clay` | `--nvr-white` or `--nvr-cream` |
| `--nvr-moss`, `--nvr-brass`, `--nvr-sage`, `--nvr-gold-light` | `--nvr-ink` |
| `--nvr-paper`, `--nvr-cream`, `--nvr-linen`, `--nvr-line`, `--nvr-white` | `--nvr-ink` or `--nvr-charcoal` |

---

## Gap

Only 2 brown tokens exist (`forest`, `clay`) — no light/mid tint for hover states or tinted backgrounds. If needed, add:
- `--nvr-clay-light: #E8D5B7` (tinted backgrounds)
- `--nvr-clay-mid: #C99A4A` (hover state)
