# -*- coding: utf-8 -*-
"""Applies the changes that were queued while the project sat in a Defender-protected
folder. Run once from C:\\dev\\nvr-custom. Every edit asserts its match count, so a
mismatch aborts the whole run rather than half-applying."""
import io, os, re, sys

ROOT = r"C:\dev\nvr-custom"
LF = chr(10)
CR = chr(13)
cache, log = {}, []
fails = 0


def load(fn):
    p = os.path.join(ROOT, fn)
    if p not in cache:
        cache[p] = io.open(p, encoding='utf-8', newline='').read()
    return p


def sub(fn, old, new, n, label):
    global fails
    p = load(fn)
    nl = CR + LF if (CR + LF) in cache[p] else LF
    o, w = old.replace(LF, nl), new.replace(LF, nl)
    got = cache[p].count(o)
    if (n is not None and got != n) or (n is None and got == 0):
        log.append('FAIL  %-22s %-30s want %s got %d' % (fn, label, n, got))
        fails += 1
        return
    cache[p] = cache[p].replace(o, w)
    log.append('ok    %-22s %-30s x%d' % (fn, label, got))


def resub(fn, pat, rep, label):
    global fails
    p = load(fn)
    new, k = re.subn(pat, rep, cache[p])
    if k == 0:
        log.append('FAIL  %-22s %-30s got 0' % (fn, label))
        fails += 1
        return
    cache[p] = new
    log.append('ok    %-22s %-30s x%d' % (fn, label, k))


# ============ A. asset reorganisation ============
# Only the percent-encoded form is ever a path; the plain text form is the venue's
# display name (data-title / alt / emailed <option> values) and must not change.
sub('function-rooms.html', 'Padre%20Pio%20Pavilion', 'Padre-Pio-Pavilion', None, 'A1 pavilion path')
sub('assets/css/styles.css', 'Padre%20Pio%20Pavilion', 'Padre-Pio-Pavilion', None, 'A1 pavilion path (css)')
for i in range(1, 6):
    sub('function-rooms.html', 'padre-pio-pavilion-%d.webp' % i,
        'padre-pio-pavilion-whole-%d.webp' % i, None, 'A2 pavilion whole-%d' % i)
resub('restaurant.html', r'Restaurant/Food/web/(the-village-restaurant-\d+)-(?:full|thumb)\.webp',
      r'Restaurant/Food/\1.webp', 'A3 food gallery -> masters')
sub('about.html', '/assets/images/nvr-12.webp', '/assets/images/Others/nvr-12.webp', 2, 'A4 nvr-12 -> Others')
sub('function-rooms.html', 'East-Garden/east-garden-2.webp', 'East-Garden/east-garden-6.webp', None, 'A5 east-garden 2->6')
sub('function-rooms.html', 'East-Garden/east-garden-3.webp', 'East-Garden/east-garden-7.webp', None, 'A5 east-garden 3->7')
sub('function-rooms.html',
    '|/assets/images/Function%20Venue/Indoor/Our-Lady-of-Guadalupe-Hall/our-lady-of-guadalupe-hall-5.webp',
    '', 1, 'A6 drop guadalupe-5')
sub('accommodations.html', 'Rooms/Lolas-House/lolas-house.webp',
    'Rooms/Lolas-House/lolas-house-1.webp', 2, 'A7 lolas-house -> -1')

# ============ B. content updates ============
RES = '/assets/images/Rooms/The-Village-Residences/the-village-residences-'
FARM = '/assets/images/Organic%20Farm/'
PP = '/assets/images/Pool%20and%20Park/Pool%26Park-'

sub('accommodations.html', 'aria-label="View details for The Village Residence"',
    'aria-label="View details for The Village Residences"', 1, 'B1 residences aria-label')
sub('accommodations.html', 'data-title="The Village Residence"',
    'data-title="The Village Residences"', 1, 'B1 residences data-title')
sub('accommodations.html', 'data-detail-gallery="/assets/images/Rooms/Premier/premier-rooms-1.webp">',
    'data-detail-gallery="' + RES + '1.webp|' + RES + '2.webp|' + RES + '3.webp">', 1, 'B1 residences gallery')
sub('accommodations.html',
    '<img src="/assets/images/Rooms/Premier/premier-rooms-1.webp" alt="The Village Residence, a private retreat at Nature\'s Village Resort" loading="lazy" width="600" height="450">',
    '<img src="' + RES + '1.webp" alt="A bedroom in The Village Residences at Nature\'s Village Resort, with twin beds and garden-facing windows" loading="lazy" width="600" height="450">',
    1, 'B1 residences card img')
sub('accommodations.html', '<h3 class="nvr-card__title">The Village Residence</h3>',
    '<h3 class="nvr-card__title">The Village Residences</h3>', 1, 'B1 residences h3')
sub('accommodations.html',
    'Lolas-House/lolas-house-10.webp|/assets/images/Rooms/Lolas-House/lolas-house-pool.webp"',
    'Lolas-House/lolas-house-10.webp|/assets/images/Rooms/Lolas-House/lolas-house-11.webp|/assets/images/Rooms/Lolas-House/lolas-house-pool.webp"',
    1, 'B2 lolas gallery +11')

sub('facilities.html',
    '<img src="/assets/images/Home/organic-farm.webp" alt="The on-site organic farm at Nature\'s Village Resort" loading="lazy" width="1000" height="667">',
    '<img src="' + FARM + 'Farm-3.webp" alt="Rows of lettuce growing in the organic farm at Nature\'s Village Resort, lit by late afternoon sun" loading="lazy" width="1000" height="667">',
    1, 'B3 facilities farm')
sub('facilities.html',
    '<img src="/assets/images/Home/pool-1.webp" alt="The swimming pool at Salvacion Park" loading="lazy" width="1000" height="667">',
    '<img src="' + PP + '4.webp" alt="The open lawn and palm-lined walkways of Salvacion Park" loading="lazy" width="1000" height="667">',
    1, 'B3 facilities park')
sub('facilities.html',
    '<img src="/assets/images/Home/pool-2.webp" alt="Poolside greenery and lounging areas" loading="lazy" width="600" height="400">',
    '<img src="' + PP + '2.webp" alt="Loungers and shade umbrellas along the pool, framed by palms" loading="lazy" width="600" height="400">',
    1, 'B3 facilities pool')
sub('index.html',
    '<img src="/assets/images/Home/organic-farm.webp" alt="The organic farm at Nature\'s Village Resort" loading="lazy" width="800" height="600">',
    '<img src="' + FARM + 'Farm-1.webp" alt="The organic farm at Nature\'s Village Resort" loading="lazy" width="800" height="600">',
    1, 'B4 index farm tile')
sub('index.html',
    '<img src="/assets/images/Home/pool-1.webp" alt="Salvacion Park and pool" loading="lazy" width="600" height="450">',
    '<img src="' + PP + '1.webp" alt="Salvacion Park and pool" loading="lazy" width="600" height="450">',
    1, 'B4 index park tile')
sub('about.html', 'data-story-image="/assets/images/Home/organic-farm.webp"',
    'data-story-image="' + FARM + 'Farm-1.webp"', 1, 'B5 about story image')
sub('about.html',
    '<img src="/assets/images/Home/organic-farm.webp" alt="Rows of organic crops growing on the farm at Nature\'s Village Resort" loading="lazy" width="600" height="450">',
    '<img src="' + FARM + 'Farm-1.webp" alt="Rows of organic crops growing on the farm at Nature\'s Village Resort" loading="lazy" width="600" height="450">',
    1, 'B5 about card img')

D, E = '<span class="dine-menu__desc">', '</span>'
sub('restaurant.html',
    D + 'Ilonggo pork dumpling soup, named for the Molo district \u2014 delicate wrappers in a clear chicken broth.' + E,
    D + 'Molo\u2019s signature soup \u2014 delicate wonton-like dumplings, flavorful pork filling, and a warm, fragrant chicken broth.' + E,
    1, 'B6 Pancit Molo')
sub('restaurant.html',
    D + 'Native vegetables stewed with shrimp paste \u2014 squash, okra, eggplant and bitter gourd.' + E,
    D + 'A wholesome mix of squash, okra, eggplant, and bitter gourd, slowly cooked to bring out their natural flavors.' + E,
    1, 'B6 Pinakbet')
sub('restaurant.html',
    D + 'A clear, unhurried broth of whatever the garden gives that morning \u2014 the lightest thing on the table.' + E,
    D + 'A fresh medley of shrimp, squash, okra, eggplant, and greens cooked in a clear, comforting broth.' + E,
    1, 'B6 Laswa')

print(LF.join(log))
if fails:
    print(LF + '%d edit(s) FAILED - nothing written' % fails)
    sys.exit(1)
for p, txt in cache.items():
    io.open(p, 'w', encoding='utf-8', newline='').write(txt)
print(LF + 'wrote %d files' % len(cache))

# the menu PDF has a doubled extension; every link points at the single-.pdf name
bad = os.path.join(ROOT, 'assets', 'docs', 'the-village-restaurant-menu.pdf.pdf')
good = os.path.join(ROOT, 'assets', 'docs', 'the-village-restaurant-menu.pdf')
if os.path.exists(bad) and not os.path.exists(good):
    os.rename(bad, good)
    print('renamed menu PDF -> the-village-restaurant-menu.pdf')
