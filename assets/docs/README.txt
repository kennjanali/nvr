Nature's Village Resort — /assets/docs
======================================

Public documents linked from the site. Anything in here is served directly
by Apache (see .htaccess — real files bypass the clean-URL rewrite), so use
lowercase, hyphenated filenames with no spaces.

Files
-----
the-village-restaurant-menu.pdf
    The Village Restaurant's official menu. Source of truth for the booklet
    viewer on /restaurant/ — the modal renders THIS file page by page with
    pdf.js, and the toolbar "PDF" link points at it too. Nothing on the
    restaurant page re-types its dishes or prices.

Adding / updating the menu
--------------------------
Double-click  qa\add-menu-pdf.cmd  — it finds the newest "Village Resto
Menu" PDF in your Downloads folder and copies it here under the right name.
You can also drag any PDF onto that script to use that file instead.

Or do it by hand: copy the PDF here and name it exactly
the-village-restaurant-menu.pdf

Keep the filename. The viewer reads the page count and page aspect ratio
from the PDF at runtime, so a menu with more or fewer pages needs no code
change.

If the file is missing, the restaurant page does not break: the menu button
still opens, and it shows a short apology with the reservations number. The
precise cause is logged to the browser console for whoever maintains the
site.

If browsers serve a stale copy after a replacement, add a cache-buster to
the two references in restaurant.html (the trigger link's href and the
modal's data-pdf attribute), e.g.:

    /assets/docs/the-village-restaurant-menu.pdf?v=2026-08
