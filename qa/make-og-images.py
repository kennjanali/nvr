"""Build the six 1200x630 share cards the <head> of every page points at.

Each source is the photo named in that page's own og:image:alt, centre-cropped
to the 1.91:1 card ratio scrapers expect. JPEG, not WebP, and with the
dimensions already declared in the markup: scrapers other than Facebook are
unreliable with WebP, and the declared size lets them lay the card out before
the image finishes downloading.
"""
import os
from PIL import Image

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), os.pardir))
OUT = 'assets/images/og'
W, H = 1200, 630
CARDS = {
    # og-default  — "The pool ... framed by palms with shaded loungers along the water"
    'og-default.jpg':        'assets/images/Home/pool-1.webp',
    # og-accommodations — "Interior of a Superior Room"
    'og-accommodations.jpg': 'assets/images/Rooms/Superior/superior-rooms-1.webp',
    # og-facilities — "Rows of organic crops growing on the farm"
    'og-facilities.jpg':     'assets/images/Home/organic-farm.webp',
    # og-function-rooms — "Alfredo Hall ... set with round banquet tables"
    'og-function-rooms.jpg': 'assets/images/Function Venue/Indoor/Alfredo-Hall/alfredo-hall-1.webp',
    # og-restaurant — "The entrance to The Village Restaurant, in warm carved hardwood"
    'og-restaurant.jpg':     'assets/images/Restaurant/the-village-restaurant-front.webp',
    # og-testimonials — "A lush garden pathway"
    'og-testimonials.jpg':   'assets/images/Pool and Park/Pool&Park-4.webp',
}
os.makedirs(OUT, exist_ok=True)
target = W / H
for name, src in CARDS.items():
    im = Image.open(src).convert('RGB')
    w, h = im.size
    if w / h > target:                      # too wide -> trim the sides
        nw = int(round(h * target)); box = ((w - nw) // 2, 0, (w - nw) // 2 + nw, h)
    else:                                   # too tall -> trim top and bottom
        nh = int(round(w / target)); box = (0, (h - nh) // 2, w, (h - nh) // 2 + nh)
    im = im.crop(box).resize((W, H), Image.LANCZOS)
    dst = os.path.join(OUT, name)
    im.save(dst, 'JPEG', quality=84, optimize=True, progressive=True)
    print('%-24s %5dx%-5d -> %s (%.0f KB)  from %s'
          % (name, w, h, '%dx%d' % im.size, os.path.getsize(dst) / 1024, src))
