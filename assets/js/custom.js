/* ==========================================================================
   NATURE'S VILLAGE RESORT — CUSTOM.JS (COMBINED)
   Single bundled file loaded with `defer` on every page. (It was originally
   built to paste into WordPress as a code snippet; the site is now a
   standalone static build and the file is served from /assets/js/.)

   Combines, in this order:
     1. global.js          — Lucide icons, header scroll state, mobile drawer,
                              scroll-reveal, footer year, image fallback, FAB
     2. home.js             — hero parallax (Home page only)
     3. function-rooms.js   — venue lightbox gallery + inquiry form validation
                              (Function Rooms / Events page only)
     4. contact.js          — contact form validation (Contact page only)

   Every section below is a self-contained IIFE and checks for its own DOM
   elements before doing anything, so this single file is safe to load on
   EVERY page of the site — sections with nothing to attach to simply no-op.

   Must be loaded with `defer`, after the Lucide script tag.
   Project conventions and integration contracts live in operating-brief.md
   at the project root.
   ========================================================================== */


/* ==========================================================================
   1. GLOBAL — runs on every page
   ========================================================================== */
(function () {
  "use strict";

  /* Progressive enhancement flag — enables the reveal hidden-state only when
     JS is available, so no-JS visitors and crawlers still see all content. */
  document.documentElement.classList.add("nvr-js");

  /* ---- Shared scroll lock (window.NVR) ----
     Published on a namespace rather than kept local because TWO sections need
     the same counter: the mobile drawer here, and every dialog in section 3.
     While each kept its own, the drawer added `nvr-lock` directly and so never
     measured the scrollbar — which is the whole reason lockScroll exists, and
     meant opening the menu on a desktop browser with a classic scrollbar
     shunted the page sideways by its width. One counter, one measurement.

     Counted, not a bare classList.add/remove: the dialogs STACK — a room
     modal's thumbnail and a press modal's image both open the photo lightbox
     on top of themselves. An unconditional remove() when the top layer closes
     would hand scrolling back to the page while the dialog underneath is still
     open. Balance every lockScroll() with exactly one unlockScroll(). */
  var scrollLocks = 0;

  function lockScroll() {
    if (scrollLocks === 0) {
      /* Measure the scrollbar BEFORE it's suppressed and hand the width to
         CSS (see body.nvr-lock) so the page doesn't jump sideways as it
         locks. 0 where scrollbars are overlays and take no layout space. */
      var sbw = window.innerWidth - document.documentElement.clientWidth;
      document.documentElement.style.setProperty("--nvr-sbw", sbw + "px");
    }
    scrollLocks++;
    document.body.classList.add("nvr-lock");
  }

  function unlockScroll() {
    scrollLocks = Math.max(0, scrollLocks - 1);
    if (scrollLocks === 0) document.body.classList.remove("nvr-lock");
  }

  window.NVR = window.NVR || {};
  window.NVR.lockScroll = lockScroll;
  window.NVR.unlockScroll = unlockScroll;

  /* ---- Lucide icons ----
     Every icon on the site is a <i data-lucide> placeholder that this library
     replaces with an SVG. The library is a third-party CDN script, so it can
     fail independently of the page: unpkg unreachable, DNS blocked on a
     corporate or hotel network, or a tampered response rejected by the
     integrity hash in the <script> tag. In any of those cases the whole site
     silently loses its icons — nav, buttons, feature lists, the contact rows,
     the lightbox controls.

     So: try the mirror before giving up. jsDelivr serves byte-identical files
     for this version (verified), which is why the same integrity hash is
     applied to the fallback too — a mirror that doesn't match is a mirror we
     don't want to run. If every source fails the page is still fully usable,
     just unadorned; nothing here throws. */
  var ICON_FALLBACKS = [
    {
      src: "https://cdn.jsdelivr.net/npm/lucide@1.28.0/dist/umd/lucide.min.js",
      integrity: "sha384-VrnzGPiSyQxm3mI2VhlssyR85zugSHtxMkgO42qV3wUAbNk1oRdZkCWjXKOhuVu6"
    }
  ];

  function drawIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons({ attrs: { class: "nvr-ic" } });
      return true;
    }
    return false;
  }

  function initIcons(attempt) {
    if (drawIcons()) return;

    var i = attempt || 0;
    if (i >= ICON_FALLBACKS.length) return;   // out of mirrors — leave the page unadorned

    var source = ICON_FALLBACKS[i];
    var next = function () { initIcons(i + 1); };
    var script = document.createElement("script");
    script.src = source.src;
    script.integrity = source.integrity;
    script.crossOrigin = "anonymous";
    script.onload = next;      // loaded: next pass calls drawIcons and stops
    script.onerror = next;     // failed or integrity-rejected: try the one after
    document.head.appendChild(script);
  }

  /* ---- Header: transparent -> solid on scroll ---- */
  function initHeader() {
    var header = document.querySelector(".nvr-header");
    if (!header) return;
    var isOverlay = header.classList.contains("nvr-header--transparent");
    if (!isOverlay) return; // solid headers need no scroll handling
    var onScroll = function () {
      if (window.scrollY > 40) header.classList.add("is-scrolled");
      else header.classList.remove("is-scrolled");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---- Mobile drawer ---- */
  function initMobileNav() {
    var burger = document.querySelector(".nvr-burger");
    var drawer = document.querySelector(".nvr-mobile");
    var closeBtn = document.querySelector(".nvr-mobile__close");
    if (!burger || !drawer) return;

    // Inject dimming backdrop
    var backdrop = document.createElement("div");
    backdrop.className = "nvr-mobile-backdrop";
    document.body.appendChild(backdrop);

    var isOpen = function () { return drawer.classList.contains("is-open"); };

    var open = function () {
      drawer.classList.add("is-open");
      backdrop.classList.add("is-open");
      burger.classList.add("is-open");
      lockScroll();
      burger.setAttribute("aria-expanded", "true");
      drawer.setAttribute("aria-hidden", "false");
      /* The drawer covers the whole viewport INCLUDING the header, so the
         burger that still holds focus is now hidden behind it. Move focus in,
         to the one control that dismisses the panel.

         Not synchronously, and a double-rAF isn't enough either: the panel
         transitions `visibility` (0.45s), and until that transition actually
         starts the drawer still computes as `hidden` — focus() on anything
         inside a hidden subtree is refused outright, silently. So wait for the
         transition to fire, with the same belt-and-braces timeout the dialogs
         in section 3 pair with their transitionend listeners (reduced motion
         zeroes the duration, and a backgrounded tab may never fire it). */
      if (closeBtn && typeof closeBtn.focus === "function") {
        var focusIn = function () {
          drawer.removeEventListener("transitionend", focusIn);
          clearTimeout(focusTimer);
          if (isOpen()) closeBtn.focus();
        };
        var focusTimer = setTimeout(focusIn, 500);
        drawer.addEventListener("transitionend", focusIn);
      }
    };
    var close = function () {
      drawer.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      burger.classList.remove("is-open");
      unlockScroll();
      burger.setAttribute("aria-expanded", "false");
      drawer.setAttribute("aria-hidden", "true");
      /* Return focus to what opened it. Without this the closing panel takes
         the focused link's visibility with it and focus falls back to <body>,
         so the next Tab restarts from the top of the document. */
      if (typeof burger.focus === "function") burger.focus();
    };
    var toggle = function () {
      if (isOpen()) close(); else open();
    };

    burger.addEventListener("click", toggle);
    backdrop.addEventListener("click", close);
    if (closeBtn) closeBtn.addEventListener("click", close);
    drawer.querySelectorAll("a").forEach(function (a) {
      if (!a.hasAttribute("data-toggle")) a.addEventListener("click", close);
    });
    document.addEventListener("keydown", function (e) {
      if (!isOpen()) return;
      if (e.key === "Escape") { close(); return; }
      /* Focus trap — the same one every dialog in section 3 has. The drawer
         was the one overlay without it, so Tab walked straight out of the open
         menu and on through the page hidden behind it: the links a keyboard
         user reached next were ones they couldn't see. */
      if (e.key !== "Tab") return;
      var focusables = drawer.querySelectorAll("a[href], button:not([disabled])");
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      } else if (!drawer.contains(document.activeElement)) {
        e.preventDefault(); first.focus();
      }
    });
  }

  /* ---- Scroll reveal ---- */
  function initReveal() {
    var els = document.querySelectorAll(".nvr-reveal");
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---- Highlight the current page in the nav ----
     The header is a single shared snippet reused on every page, so it can't
     hardcode which link is "active." Instead, compare each nav link's target
     page against the current URL and add is-active on a match. Matches on
     the last non-empty path segment (works whether links use /page-slug/ or
     legacy page.html style, and ignores #hash targets). */
  function initActiveNav() {
    var here = window.location.pathname.replace(/\/index\.html?$/, "/");
    var hereSlug = here.split("/").filter(Boolean).pop() || "";

    function slugOf(href) {
      try {
        var url = new URL(href, window.location.origin);
        var path = url.pathname.replace(/\/index\.html?$/, "/");
        return path.split("/").filter(Boolean).pop() || "";
      } catch (e) {
        return "";
      }
    }

    document.querySelectorAll(".nvr-nav__item").forEach(function (item) {
      var link = item.querySelector(".nvr-nav__link");
      if (!link) return;
      var linkSlug = slugOf(link.getAttribute("href") || "");
      if (linkSlug && linkSlug === hereSlug) {
        item.classList.add("is-active");
        /* The brass underline says "you are here" visually; aria-current says
           it to a screen reader, which otherwise hears an ordinary link. */
        link.setAttribute("aria-current", "page");
      } else {
        item.classList.remove("is-active");
        link.removeAttribute("aria-current");
      }
    });
  }

  /* ---- Current year in footer ---- */
  function initYear() {
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  /* ---- Graceful image fallback ----
     Hotlinked photos can intermittently fail; degrade to a tasteful placeholder
     tone instead of a broken-image icon. Handles both future and already-failed loads. */
  function initImageFallback() {
    var mark = function (img) {
      if (img.getAttribute("src")) img.classList.add("nvr-img-broken");
    };
    document.querySelectorAll("img").forEach(function (img) {
      if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) mark(img);
      img.addEventListener("error", function () { mark(img); }, { once: true });
    });
  }

  /* ---- Floating booking button ---- */
  function initFab() {
    if (document.querySelector(".nvr-fab")) return;
    /* The button is appended to <body>, which put it outside every landmark —
       axe flagged `region` (moderate) on all 11 pages, meaning a screen-reader
       user navigating by landmark never reaches it. An <aside> is the correct
       home: it maps to the complementary landmark, and because the button is
       position:fixed the wrapper collapses to zero height and cannot affect
       layout. (.nvr-footer carries no transform/filter, so a fixed child would
       have survived there too — but a booking CTA is not footer information.) */
    var region = document.createElement("aside");
    region.className = "nvr-fab-region";
    region.setAttribute("aria-label", "Book a stay");
    var a = document.createElement("a");
    a.className = "nvr-fab";
    a.href = "https://staahmax.staah.net/be/index_be?propertyId=Mjk5Ng==&individual=true";
    a.target = "_blank";
    a.rel = "noopener";
    a.setAttribute("aria-label", "Book a Stay");
    a.innerHTML =
      '<span class="nvr-fab__ic" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M8 2v4M16 2v4M3 10h18"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="m9 16 2 2 4-4"/>' +
        '</svg>' +
      '</span>' +
      '<span class="nvr-fab__label">Book a Stay</span>';
    region.appendChild(a);
    document.body.appendChild(region);
  }

  /* ---- Fade transition between pages ----
     Fade-in on load is pure CSS (nvr-page-in keyframe). This just handles
     the fade-out: intercept plain left-clicks on same-tab, same-origin
     links, hold navigation for one short fade, then let it proceed. */
  function initPageTransitions() {
    var body = document.querySelector("body.nvr");
    if (!body) return;
    var reduceMotion = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return; // skip entirely — no artificial delay either

    body.classList.add("nvr-page-out");

    document.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var link = e.target.closest("a[href]");
      if (!link || link.hasAttribute("download")) return;
      if (link.target && link.target !== "_self") return;
      if (link.origin !== window.location.origin) return;
      /* Same-page hash jump (e.g. #venues) — let the browser scroll instantly. */
      if (link.pathname === window.location.pathname && link.hash) return;

      e.preventDefault();
      body.classList.add("is-leaving");
      setTimeout(function () { window.location.href = link.href; }, 280);
    });

    /* Coming BACK to a page restored from the back/forward cache replays the
       DOM exactly as it was left — mid-fade, with is-leaving still on the body.
       That restores a fully transparent page: a blank screen after pressing
       Back, with no event left to clear it. Reset on every pageshow. */
    window.addEventListener("pageshow", function () {
      body.classList.remove("is-leaving");
    });
  }

  function initAboutSlider() {
    var slider = document.querySelector(".about-slider");
    if (!slider) return;
    var imgs = slider.querySelectorAll(".about-slider__img");
    var dots = slider.querySelectorAll(".about-slider__dot");
    var current = 0;
    var timer;

    function show(index) {
      imgs[current].classList.remove("is-active");
      dots[current].classList.remove("is-active");
      current = index;
      imgs[current].classList.add("is-active");
      dots[current].classList.add("is-active");
    }

    function next() { show((current + 1) % imgs.length); }

    function restart() {
      clearInterval(timer);
      timer = setInterval(next, 4500);
    }

    dots.forEach(function (dot, i) {
      dot.addEventListener("click", function () {
        if (i === current) return;
        show(i);
        restart();
      });
    });

    restart();
  }

  function init() {
    initIcons();
    initFab();
    initHeader();
    initMobileNav();
    initActiveNav();
    initReveal();
    initYear();
    initImageFallback();
    initPageTransitions();
    initAboutSlider();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();


/* ==========================================================================
   2. HOME PAGE — hero background video + hero parallax
   No-ops on every page except Home (checks for .nvr-hero__media), and on both
   counts for anyone who asked for reduced motion: an autoplaying wallpaper
   video is exactly the thing that preference is about, so the hero stays the
   still photograph it has always been.
   ========================================================================== */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var media = document.querySelector(".nvr-hero__media");
  if (!media || reduce) return;

  /* ---- Hero background video ----
     Layers a muted, looping, self-hosted MP4 over the hero's poster photo. The
     poster is never touched: it is the LCP element, it is what a visitor sees
     for the first moment either way, and it is the fallback for every case
     where the video doesn't arrive — a missing or misnamed file, a network too
     slow to buffer, a browser that refuses muted autoplay, or a reduced-motion
     preference. Nothing here throws, and nothing here removes the photo.

     Self-hosted rather than a YouTube embed, which this replaced. That drops
     the channel watermark burned into the corner of every embed, the six
     third-party origins, the frame-src entry in the CSP, and the postMessage
     handshake that had to be reverse-engineered to know whether the thing was
     playing. A <video> just tells you: `playing` fires, or `error` does.

     Injected after `load` rather than at DOMContentLoaded, and never inlined
     into the markup: an <video autoplay> in the HTML would start pulling
     megabytes while the hero photograph it sits on top of is still painting,
     and it could not be withheld from someone who asked for reduced motion. */
  function initHeroVideo() {
    var src = media.getAttribute("data-hero-video");
    if (!src) return;

    /* Begin at a point other than 0 — the opening seconds of the source are
       skipped. Held here rather than baked into the file so the trim point can
       be changed without a re-encode; set it to 0 if the uploaded file has
       already been trimmed. */
    var startAt = parseFloat(media.getAttribute("data-hero-video-start")) || 0;

    var hero = media.parentNode;
    if (!hero || !hero.classList || !hero.classList.contains("nvr-hero")) return;
    if (hero.querySelector(".nvr-hero__video")) return;

    /* Metered connections opt out. The visitor still gets the poster, and this
       is a several-megabyte download that buys decoration, not information. */
    var conn = navigator.connection || navigator.webkitConnection;
    if (conn && conn.saveData) return;

    var video = document.createElement("video");
    video.className = "nvr-hero__video";
    video.muted = true;          /* property, not attribute: Safari only */
    video.defaultMuted = true;   /* honours autoplay policy on a fresh element */
    video.loop = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");     /* older iOS reads the attribute */
    video.preload = "auto";
    video.disablePictureInPicture = true;
    /* Deliberately NO poster attribute. The photograph sitting behind this
       element (z -2, same layer, earlier in the DOM) is the poster, so the
       video only has to render transparent until its first frame decodes —
       which is what happens with no poster set. An empty poster="" resolves
       against the document and hands the element the page's own URL as an
       image source; Chromium declines to fetch it, but there is no reason to
       leave that lying around for a browser that doesn't. */
    /* Decorative: the hero's meaning is in the heading and the photo's alt
       text, so keep this out of the accessibility tree and the tab order. */
    video.setAttribute("aria-hidden", "true");
    video.tabIndex = -1;
    video.src = src;

    var revealed = false;
    function reveal() {
      if (revealed) return;
      revealed = true;
      video.classList.add("is-ready");
      /* Flag the hero too, so the scrim can deepen for the video's bright
         daylight frames — see .nvr-hero.has-hero-video in styles.css. A class
         rather than a :has() selector on purpose: this is the rule keeping the
         headline legible, so it shouldn't rest on selector support, and the two
         states stay switched by one line of code. */
      if (hero.classList) hero.classList.add("has-hero-video");
    }

    /* Seeking needs the server to honour Range requests. Apache does by
       default, but a host that answers 200-with-the-whole-file instead of 206
       leaves the video permanently stuck at 0 — and an unbounded retry would
       then re-seek on every timeupdate forever and never reveal anything. So
       count the attempts and, once it is clear seeking isn't going to work,
       abandon the offset and play from the top rather than show nothing. */
    var seekTries = 0;
    function seekToStart() {
      if (startAt <= 0 || video.currentTime >= startAt) return;
      if (seekTries >= 6) {
        if (window.console && console.warn) {
          console.warn("[nvr] Hero video: could not seek to " + startAt + "s — the " +
            "server may not support HTTP Range requests. Playing from the start " +
            "instead.");
        }
        startAt = 0;
        return;
      }
      seekTries++;
      try { video.currentTime = startAt; } catch (err) { /* not seekable yet */ }
    }
    video.addEventListener("loadedmetadata", function () {
      /* Guard against a start point past the end of a re-cut file. */
      if (startAt >= video.duration) startAt = 0;
      seekToStart();
    });

    /* One handler covers both jobs. Reveal only once playback has passed the
       start point, so the skipped opening never flashes on screen; and because
       native `loop` always returns to 0, jump forward again on every wrap —
       otherwise the trimmed-off seconds would replay on each repeat, which is
       the exact flaw the YouTube version had with its start parameter. */
    video.addEventListener("timeupdate", function () {
      if (startAt > 0 && video.currentTime < startAt - 0.3) { seekToStart(); return; }
      if (!video.paused && video.currentTime >= startAt) reveal();
    });

    video.addEventListener("error", function () {
      if (window.console && console.warn) {
        var code = video.error ? video.error.code : "?";
        console.warn("[nvr] Hero video: could not load " + src + " (media error " +
          code + "). The hero is showing its poster photograph instead. Check " +
          "that the file exists at that path and that the server sends it as " +
          "video/mp4.");
      }
    });

    /* Between the poster (z -2) and the scrim (z -1): over the photo, under
       the gradient that keeps the headline legible. */
    var scrim = hero.querySelector(".nvr-hero__scrim");
    if (scrim) hero.insertBefore(video, scrim);
    else media.parentNode.insertBefore(video, media.nextSibling);

    /* Muted autoplay is allowed everywhere, but data-saver and battery-saver
       modes still refuse it. A rejection is not an error — it just means the
       poster stays, which is a finished state. */
    var attempt = video.play();
    if (attempt && typeof attempt.catch === "function") {
      attempt.catch(function () {
        if (window.console && console.info) {
          console.info("[nvr] Hero video: autoplay was refused by the browser; " +
            "showing the poster photograph instead.");
        }
      });
    }
  }

  if (document.readyState === "complete") initHeroVideo();
  else window.addEventListener("load", initHeroVideo, { once: true });

  /* ---- Hero parallax ---- */
  var ticking = false;
  function update() {
    var y = window.scrollY;
    if (y < window.innerHeight) {
      /* media is inset -8% (≈16% taller than hero), so this translate stays covered */
      media.style.transform = "translateY(" + (y * 0.12) + "px)";
    }
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
})();


/* ==========================================================================
   3. PHOTO LIGHTBOX GALLERY + DIALOGS + FUNCTION ROOMS INQUIRY FORM
   The lightbox is shared by Function Rooms (venues), Rooms (accommodations),
   and Restaurant (food) — no-ops on any page without a #nvr-lightbox element
   and at least one [data-gallery] trigger. The room, story, press and menu
   dialogs live in this same IIFE so they all share one counted scroll lock;
   each no-ops without its own element. The form validation below it is
   Function Rooms-only (checks for #events-form). Client-side validation
   only. Delivery is handled by the form's own `action` — see the FormSubmit
   integration contract in operating-brief.md before changing the endpoint.
   ========================================================================== */
(function () {
  "use strict";

  /* ---- Shared scroll lock ----
     Lives in section 1 on window.NVR so the mobile drawer and every dialog
     below share ONE counter and one scrollbar measurement — see the comment
     there for why the count has to be balanced rather than toggled. */
  var lockScroll = window.NVR.lockScroll;
  var unlockScroll = window.NVR.unlockScroll;

  /* The photo lightbox (z-1500) is the only layer that stacks ON TOP of the
     room/story/press dialogs — a thumbnail or a "view full size" button opens
     it over whichever dialog is already showing. While it is up it owns the
     keyboard, and the dialog underneath must keep its hands off: every one of
     these handlers listens on `document`, so without a guard one Escape closes
     both layers and the dialog's own Tab trap drags focus back out of the
     lightbox. */
  function lightboxIsOpen() {
    var lb = document.getElementById("nvr-lightbox");
    return !!lb && !lb.hidden;
  }

  /* ---- Lightbox gallery ---- */
  function initLightbox() {
    var lightbox = document.getElementById("nvr-lightbox");
    /* No upfront [data-gallery] check: triggers are handled by delegation
       further down, and on pages like Accommodations they don't exist yet
       at load time — they're built inside the room modal on demand. The
       lightbox element itself existing is enough reason to wire this up. */
    if (!lightbox) return;

    var imgEl = document.getElementById("nvr-lightbox-img");
    var titleEl = document.getElementById("nvr-lightbox-title");
    var counterEl = document.getElementById("nvr-lightbox-counter");
    /* The class, not the data attribute: [data-lightbox-close] is on the
       backdrop <div> as well, and the backdrop comes FIRST in the markup — so
       this used to resolve to an unfocusable div and the focus() call in open()
       below silently did nothing. Focus stayed on whatever opened the gallery,
       which left the Tab trap with no anchor to compare against and let the
       keyboard walk out into the page behind the open dialog. (The click
       wiring further down still binds every [data-lightbox-close], backdrop
       included — that part was right.) */
    var closeBtn = lightbox.querySelector("button.nvr-lightbox__close");
    var prevBtn = lightbox.querySelector("[data-lightbox-prev]");
    var nextBtn = lightbox.querySelector("[data-lightbox-next]");

    var gallery = [];   // current array of image URLs
    var title = "";     // current venue name
    var index = 0;      // current image index
    var lastFocused = null;

    function show(i, animate) {
      if (!gallery.length) return;
      index = (i + gallery.length) % gallery.length;
      var counterText = (index + 1) + " / " + gallery.length;

      if (!animate) {
        imgEl.src = gallery[index];
        imgEl.alt = title + " — photo " + (index + 1) + " of " + gallery.length;
        counterEl.textContent = counterText;
        return;
      }
      /* Crossfade: fade the current photo out, swap the src underneath while
         it's invisible, then fade the new one in. transitionend covers the
         normal case; the timeout is a fallback if the event never fires
         (tab backgrounded mid-transition, reduced-motion zeroing duration). */
      imgEl.classList.add("is-swapping");
      var swapped = false;
      function swap() {
        if (swapped) return;
        swapped = true;
        imgEl.src = gallery[index];
        imgEl.alt = title + " — photo " + (index + 1) + " of " + gallery.length;
        counterEl.textContent = counterText;
        imgEl.classList.remove("is-swapping");
      }
      imgEl.addEventListener("transitionend", swap, { once: true });
      setTimeout(swap, 260);
    }

    function open(card) {
      var data = card.getAttribute("data-gallery") || "";
      gallery = data.split("|").filter(function (s) { return s.trim() !== ""; });
      if (!gallery.length) return;
      title = card.getAttribute("data-title") || "Photo gallery";
      titleEl.textContent = title;

      /* Single-image galleries (the press modal opens one certificate at a
         time) get no prev/next and no "1 / 1" counter — paging controls
         that can only land back on the same image read as broken. */
      var multi = gallery.length > 1;
      lightbox.setAttribute("aria-label", multi ? title + " photo gallery" : title);
      if (prevBtn) prevBtn.hidden = !multi;
      if (nextBtn) nextBtn.hidden = !multi;
      if (counterEl) counterEl.hidden = !multi;

      /* Cards sharing one big gallery (e.g. a grid where every tile links to
         the same curated set) can say which photo THEY represent via
         data-index, so clicking tile #7 opens on photo #7 instead of
         always jumping back to the first image. */
      var startIndex = parseInt(card.getAttribute("data-index"), 10);
      if (isNaN(startIndex)) startIndex = 0;

      lastFocused = document.activeElement;
      show(startIndex, false);
      lightbox.hidden = false;
      lockScroll();
      document.addEventListener("keydown", onKeydown);
      /* Double rAF so the browser paints the display:none -> flex change
         first; adding .is-visible in the same frame would skip the
         opacity/transform transition entirely. */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { lightbox.classList.add("is-visible"); });
      });
      /* Move focus to the close button for keyboard users. */
      if (closeBtn && typeof closeBtn.focus === "function") closeBtn.focus();
    }

    function close() {
      lightbox.classList.remove("is-visible");
      unlockScroll();
      document.removeEventListener("keydown", onKeydown);
      var finished = false;
      var finish = function () {
        if (finished) return;
        finished = true;
        lightbox.hidden = true;
        imgEl.src = "";
        gallery = [];
      };
      lightbox.addEventListener("transitionend", finish, { once: true });
      setTimeout(finish, 400);
      if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    }

    function next() { show(index + 1, true); }
    function prev() { show(index - 1, true); }

    function onKeydown(e) {
      if (lightbox.hidden) return;
      switch (e.key) {
        case "Escape":     e.preventDefault(); close(); break;
        /* Arrows are inert on a single-image gallery — see open(). */
        case "ArrowRight": if (gallery.length > 1) { e.preventDefault(); next(); } break;
        case "ArrowLeft":  if (gallery.length > 1) { e.preventDefault(); prev(); } break;
        case "Tab":
          /* Simple focus trap: keep focus inside the dialog. */
          var focusables = lightbox.querySelectorAll("button:not([hidden])");
          if (!focusables.length) break;
          var first = focusables[0];
          var last = focusables[focusables.length - 1];
          if (!lightbox.contains(document.activeElement)) {
            /* Belt and braces for the case above: if focus is somehow still
               outside, pull it in rather than letting Tab continue into the
               page underneath. */
            e.preventDefault(); first.focus();
          } else if (e.shiftKey && document.activeElement === first) {
            e.preventDefault(); last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault(); first.focus();
          }
          break;
      }
    }

    /* Wire up cards via delegation (not a direct per-card listener) so
       [data-gallery] triggers created LATER — e.g. the room-modal thumbnail
       strip, built dynamically after a room card is clicked — open the
       lightbox too, with no extra wiring needed at creation time. */
    document.addEventListener("click", function (e) {
      var card = e.target.closest("[data-gallery]");
      if (card) open(card);
    });

    /* Wire up controls (delegated by data attributes) */
    lightbox.querySelectorAll("[data-lightbox-close]").forEach(function (el) {
      el.addEventListener("click", close);
    });
    if (prevBtn) prevBtn.addEventListener("click", prev);
    if (nextBtn) nextBtn.addEventListener("click", next);
  }

  /* ---- Detail modal (shared: Accommodations rooms, About story cards) ----
     Whole-card trigger: clicking anywhere on a .nvr-detail-card opens this,
     EXCEPT a real nested link (e.g. a room's "Check Availability" button),
     which has to keep behaving like a normal link. The modal's own
     thumbnail strip is built with [data-gallery] + data-index, so clicking
     a thumb opens the *photo* lightbox above (via its document-level
     delegation) at that exact photo — no separate wiring needed here. */
  var DEFAULT_BOOKING_URL = "https://staahmax.staah.net/be/index_be?propertyId=Mjk5Ng==&individual=true";
  var DEFAULT_BOOKING_LABEL = "Book a Stay";

  function initRoomModal() {
    var modal = document.getElementById("nvr-roommodal");
    var rooms = document.querySelectorAll(".nvr-detail-card");
    if (!modal || !rooms.length) return;

    var imgEl = document.getElementById("roommodal-img");
    var titleEl = document.getElementById("roommodal-title");
    var descEl = document.getElementById("roommodal-desc");
    var thumbsEl = document.getElementById("roommodal-thumbs");
    var featuresEl = document.getElementById("roommodal-features");
    var featuresHeadingEl = document.getElementById("roommodal-features-heading");
    var amenitiesEl = document.getElementById("roommodal-amenities");
    var stayPerksEl = document.getElementById("roommodal-stayperks");
    var noteEl = document.getElementById("roommodal-note");
    var ctaEl = document.getElementById("roommodal-cta");
    var ctaLabelEl = document.getElementById("roommodal-cta-label");
    var closeBtn = modal.querySelector(".nvr-roommodal__close");
    var lastFocused = null;

    function renderIcons() {
      if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons({ attrs: { class: "nvr-ic" } });
      }
    }

    function iconEl(name) {
      var i = document.createElement("i");
      i.setAttribute("data-lucide", name);
      return i;
    }

    function open(room) {
      var title = room.getAttribute("data-title") || "Details";
      var desc = room.getAttribute("data-desc") || "";
      var amenities = (room.getAttribute("data-amenities") || "")
        .split("|").filter(function (s) { return s.trim() !== ""; });
      var gallery = (room.getAttribute("data-detail-gallery") || "")
        .split("|").filter(function (s) { return s.trim() !== ""; });
      if (!gallery.length) return;
      var galleryAttr = gallery.join("|");

      titleEl.textContent = title;
      /* Split on "|" into separate paragraphs — same convention the story and
         press modals below already use. Needed from Sept 2026: Deluxe East and
         Premier share an opening paragraph and then each carry their own, so a
         single textContent would have printed a literal "|" between them.
         Hidden outright when a card has no description at all — several room
         cards dropped theirs in the same revision, and this element's own
         1.5rem bottom margin would otherwise leave a gap under the title. */
      var descParas = desc.split("|").map(function (s) { return s.trim(); })
        .filter(Boolean);
      descEl.innerHTML = "";
      descParas.forEach(function (para) {
        var para_el = document.createElement("p");
        para_el.textContent = para;
        descEl.appendChild(para_el);
      });
      descEl.hidden = !descParas.length;
      modal.setAttribute("aria-label", title + " — details");
      imgEl.src = gallery[0];
      imgEl.alt = title;

      featuresHeadingEl.textContent = room.getAttribute("data-features-heading") || "Inclusions";

      featuresEl.innerHTML = "";
      amenities.forEach(function (entry) {
        var sep = entry.indexOf(":");
        if (sep === -1) return;
        var li = document.createElement("li");
        li.appendChild(iconEl(entry.slice(0, sep)));
        li.appendChild(document.createTextNode(" " + entry.slice(sep + 1)));
        featuresEl.appendChild(li);
      });

      /* The stay-wide half of the inclusions list — and the check-in /
         check-out note under it — only make sense for room bookings. Other
         pages reusing this modal (e.g. function-room venues) opt out by
         simply not setting data-stay-perks, and are left with their own
         features list alone. */
      var showStayPerks = room.hasAttribute("data-stay-perks");
      stayPerksEl.hidden = !showStayPerks;
      if (noteEl) noteEl.hidden = !showStayPerks;
      /* Function-room venues dropped both their features and their description
         in Sept 2026, so the panel can end up with nothing in it at all -
         without this it still drew its top border and a bare heading. */
      amenitiesEl.hidden = !amenities.length && !showStayPerks;

      /* Title + gallery + CTA and nothing else: the strip is now the body's
         main content, so it gets the wider grid (see the --gallery rule). */
      modal.classList.toggle("nvr-roommodal--gallery",
        !descParas.length && amenitiesEl.hidden);

      /* Thumbnail strip only earns its keep with more than one photo —
         a single-image "story" card would otherwise show one redundant
         thumb duplicating the hero image above it. */
      thumbsEl.innerHTML = "";
      thumbsEl.hidden = gallery.length < 2;
      if (gallery.length > 1) {
        gallery.forEach(function (url, i) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.setAttribute("data-gallery", galleryAttr);
          btn.setAttribute("data-index", i);
          btn.setAttribute("data-title", title);
          var img = document.createElement("img");
          img.src = url;
          img.alt = title + " — photo " + (i + 1) + " of " + gallery.length;
          img.loading = "lazy";
          img.width = 150;
          img.height = 150;
          btn.appendChild(img);
          thumbsEl.appendChild(btn);
        });
      }

      ctaLabelEl.textContent = room.getAttribute("data-cta-label") || DEFAULT_BOOKING_LABEL;
      var ctaHref = room.getAttribute("data-cta-href") || DEFAULT_BOOKING_URL;
      ctaEl.href = ctaHref;
      if (ctaHref === DEFAULT_BOOKING_URL) {
        ctaEl.target = "_blank";
        ctaEl.rel = "noopener";
      } else {
        ctaEl.removeAttribute("target");
        ctaEl.removeAttribute("rel");
      }

      renderIcons();

      lastFocused = document.activeElement;
      modal.hidden = false;
      lockScroll();
      document.addEventListener("keydown", onKeydown);
      /* Double rAF: see the photo lightbox's open() above for why. */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { modal.classList.add("is-visible"); });
      });
      if (closeBtn && typeof closeBtn.focus === "function") closeBtn.focus();
    }

    function close() {
      modal.classList.remove("is-visible");
      unlockScroll();
      document.removeEventListener("keydown", onKeydown);
      var finished = false;
      var finish = function () {
        if (finished) return;
        finished = true;
        modal.hidden = true;
        imgEl.src = "";
      };
      modal.addEventListener("transitionend", finish, { once: true });
      setTimeout(finish, 400);
      if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    }

    function onKeydown(e) {
      if (modal.hidden) return;
      /* This dialog's own thumbnail strip opens the photo lightbox on top of
         it, and both handlers are on `document`. Without this guard a single
         Escape closed the lightbox AND this dialog — losing the room a guest
         was reading just for dismissing a zoom — and this Tab trap outfought
         the lightbox's, so its controls were unreachable by keyboard. Same
         guard the press dialog already carries; this one was missed. */
      if (lightboxIsOpen()) return;
      switch (e.key) {
        case "Escape": e.preventDefault(); close(); break;
        case "Tab":
          /* Simple focus trap: keep focus inside the dialog. */
          var focusables = modal.querySelectorAll("button:not([hidden]), a[href]");
          if (!focusables.length) break;
          var first = focusables[0];
          var last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault(); last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault(); first.focus();
          }
          break;
      }
    }

    modal.querySelectorAll("[data-roommodal-close]").forEach(function (el) {
      el.addEventListener("click", close);
    });

    /* Same-page CTA. The 20 venue cards on Events set data-cta-href="#inquire",
       so this button's job is to send the guest to the inquiry form further down
       the SAME page. As a plain link it set the hash and jumped — but this
       dialog stayed open on top of the destination with the scroll lock still
       applied, so the guest saw an unchanged modal and the site's main event CTA
       read as broken. Close first, then travel.

       Cross-page CTAs (About's story cards point at /facilities/#farm and
       /restaurant/) are left alone: navigating away disposes of the dialog
       anyway. Modified clicks are left alone for the same reason they are in the
       page-transition handler — a guest asking for a new tab means it. */
    if (ctaEl) {
      ctaEl.addEventListener("click", function (e) {
        if (e.defaultPrevented || e.button !== 0) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        var href = ctaEl.getAttribute("href") || "";
        if (href.charAt(0) !== "#" || href.length < 2) return;
        var target = document.getElementById(href.slice(1));
        if (!target) return;   // nothing to scroll to — let the browser try

        e.preventDefault();
        /* Drop the restore target before closing: close() would otherwise hand
           focus back to the card that opened the dialog, scrolling it into view
           and yanking the page back from the destination. */
        lastFocused = null;
        close();
        /* Focus the destination so a keyboard guest carries on from the form
           rather than from the top of the document. preventScroll keeps it from
           jumping ahead of the smooth scroll; the tabindex is what lets a plain
           <section> take focus at all — same trick the form success panels use. */
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    rooms.forEach(function (room) {
      room.addEventListener("click", function (e) {
        if (e.target.closest("a[href]")) return; // let any real nested link (e.g. the booking CTA) work normally
        open(room);
      });
      room.addEventListener("keydown", function (e) {
        if (e.target !== room) return; // let nested links/buttons handle their own keys
        /* Space as well as Enter — these carry role="button", and that is the
           key a screen-reader user reaches for. */
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(room); }
      });
    });
  }

  /* ---- Story modal (About page) ----
     Same whole-card-trigger idea as the room modal above, but a separate,
     simpler component on purpose (see .nvr-storymodal in styles.css) —
     an editorial read, not a booking card. No thumbnail strip, no photo
     lightbox hookup: each story card is illustrated by exactly one banner
     image, nothing to page through. */
  function initStoryModal() {
    var modal = document.getElementById("nvr-storymodal");
    var cards = document.querySelectorAll(".nvr-story-card");
    if (!modal || !cards.length) return;

    var imgEl = document.getElementById("storymodal-img");
    var eyebrowEl = document.getElementById("storymodal-eyebrow");
    var titleEl = document.getElementById("storymodal-title");
    var textEl = document.getElementById("storymodal-text");
    var highlightsWrapEl = document.getElementById("storymodal-highlights");
    var highlightsEl = document.getElementById("storymodal-highlights-list");
    var ctaEl = document.getElementById("storymodal-cta");
    var ctaLabelEl = document.getElementById("storymodal-cta-label");
    var closeBtn = modal.querySelector(".nvr-storymodal__close");
    var lastFocused = null;

    function renderIcons() {
      if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons({ attrs: { class: "nvr-ic" } });
      }
    }

    function iconEl(name) {
      var i = document.createElement("i");
      i.setAttribute("data-lucide", name);
      return i;
    }

    function open(card) {
      var title = card.getAttribute("data-title") || "";
      var eyebrow = card.getAttribute("data-eyebrow") || "";
      var paragraphs = (card.getAttribute("data-desc") || "")
        .split("|").map(function (s) { return s.trim(); }).filter(Boolean);
      var highlights = (card.getAttribute("data-highlights") || "")
        .split("|").filter(function (s) { return s.trim() !== ""; });
      var image = card.getAttribute("data-story-image") || "";

      eyebrowEl.textContent = eyebrow;
      eyebrowEl.hidden = !eyebrow;
      titleEl.textContent = title;
      modal.setAttribute("aria-label", title);
      imgEl.src = image;
      imgEl.alt = title;

      textEl.innerHTML = "";
      paragraphs.forEach(function (p) {
        var el = document.createElement("p");
        el.textContent = p;
        textEl.appendChild(el);
      });

      highlightsEl.innerHTML = "";
      highlights.forEach(function (entry) {
        var sep = entry.indexOf(":");
        if (sep === -1) return;
        var li = document.createElement("li");
        li.appendChild(iconEl(entry.slice(0, sep)));
        li.appendChild(document.createTextNode(" " + entry.slice(sep + 1)));
        highlightsEl.appendChild(li);
      });
      highlightsWrapEl.hidden = !highlights.length;

      ctaLabelEl.textContent = card.getAttribute("data-cta-label") || "Book a Stay";
      var ctaHref = card.getAttribute("data-cta-href") || DEFAULT_BOOKING_URL;
      ctaEl.href = ctaHref;
      if (ctaHref === DEFAULT_BOOKING_URL) {
        ctaEl.target = "_blank";
        ctaEl.rel = "noopener";
      } else {
        ctaEl.removeAttribute("target");
        ctaEl.removeAttribute("rel");
      }

      renderIcons();

      lastFocused = document.activeElement;
      modal.hidden = false;
      lockScroll();
      document.addEventListener("keydown", onKeydown);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { modal.classList.add("is-visible"); });
      });
      if (closeBtn && typeof closeBtn.focus === "function") closeBtn.focus();
    }

    function close() {
      modal.classList.remove("is-visible");
      unlockScroll();
      document.removeEventListener("keydown", onKeydown);
      var finished = false;
      var finish = function () {
        if (finished) return;
        finished = true;
        modal.hidden = true;
        imgEl.src = "";
      };
      modal.addEventListener("transitionend", finish, { once: true });
      setTimeout(finish, 400);
      if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    }

    function onKeydown(e) {
      if (modal.hidden) return;
      switch (e.key) {
        case "Escape": e.preventDefault(); close(); break;
        case "Tab":
          var focusables = modal.querySelectorAll("button:not([hidden]), a[href]");
          if (!focusables.length) break;
          var first = focusables[0];
          var last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault(); last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault(); first.focus();
          }
          break;
      }
    }

    modal.querySelectorAll("[data-storymodal-close]").forEach(function (el) {
      el.addEventListener("click", close);
    });

    cards.forEach(function (card) {
      card.addEventListener("click", function (e) {
        if (e.target.closest("a[href]")) return;
        open(card);
      });
      card.addEventListener("keydown", function (e) {
        if (e.target !== card) return;
        /* Space as well as Enter — these carry role="button", and that is the
           key a screen-reader user reaches for. */
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(card); }
      });
    });
  }

  /* ---- Press detail modal (Press Room) ----
     Every press item — feature story or certificate — is a <button> carrying
     its own data-*: kind, title, date, source, image, description and any
     supporting detail from the original release. One shared dialog renders
     whichever was clicked, so adding or reordering a press item stays an
     HTML-only change (the old certificate grid instead pinned each tile to
     a position in one shared image list via data-index, which meant
     reordering the grid silently opened the wrong certificate).

     The dialog's image is itself a [data-gallery] trigger, so "View full
     size" hands off to the photo lightbox stacked ON TOP of this dialog —
     hence the counted scroll lock, and hence the Escape guard below. */
  function initPressModal() {
    var modal = document.getElementById("nvr-pressmodal");
    var items = document.querySelectorAll("[data-press-item]");
    if (!modal || !items.length) return;

    var dialogEl = modal.querySelector(".nvr-pressmodal__dialog");
    var figureEl = document.getElementById("pressmodal-figure");
    var imgEl = document.getElementById("pressmodal-img");
    var kindEl = document.getElementById("pressmodal-kind");
    var titleEl = document.getElementById("pressmodal-title");
    var metaEl = document.getElementById("pressmodal-meta");
    var textEl = document.getElementById("pressmodal-text");
    var detailsEl = document.getElementById("pressmodal-details");
    var detailsHeadingEl = document.getElementById("pressmodal-details-heading");
    var detailsListEl = document.getElementById("pressmodal-details-list");
    var closeBtn = modal.querySelector(".nvr-pressmodal__close");
    var lastFocused = null;

    function renderIcons() {
      if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons({ attrs: { class: "nvr-ic" } });
      }
    }

    /* Icon + visually-hidden label + value. The label matters: on its own,
       "4 March 2025" next to a decorative icon tells a screen reader
       nothing about what the date IS. */
    function metaItem(icon, label, value) {
      var li = document.createElement("li");
      var i = document.createElement("i");
      i.setAttribute("data-lucide", icon);
      li.appendChild(i);
      var hidden = document.createElement("span");
      hidden.className = "nvr-visually-hidden";
      hidden.textContent = label + ": ";
      li.appendChild(hidden);
      li.appendChild(document.createTextNode(value));
      return li;
    }

    function open(item) {
      var title = item.getAttribute("data-title") || "";
      var kind = item.getAttribute("data-kind") || "";
      var date = item.getAttribute("data-date") || "";
      var source = item.getAttribute("data-source") || "";
      var image = item.getAttribute("data-image") || "";
      var imageAlt = item.getAttribute("data-image-alt") || title;
      var paragraphs = (item.getAttribute("data-desc") || "")
        .split("|").map(function (s) { return s.trim(); }).filter(Boolean);
      var details = (item.getAttribute("data-details") || "")
        .split("|").map(function (s) { return s.trim(); }).filter(Boolean);

      kindEl.textContent = kind;
      kindEl.hidden = !kind;
      titleEl.textContent = title;

      imgEl.src = image;
      imgEl.alt = imageAlt;
      figureEl.hidden = !image;
      /* One-image gallery per item — the lightbox hides its paging controls
         for these (see initLightbox), so there's no stale data-index to
         keep in sync with the grid's order. */
      figureEl.setAttribute("data-gallery", image);
      figureEl.setAttribute("data-title", title);
      figureEl.setAttribute("aria-label", "View " + title + " at full size");

      metaEl.innerHTML = "";
      if (date) metaEl.appendChild(metaItem("calendar", "Date", date));
      if (source) metaEl.appendChild(metaItem("landmark", "Source", source));
      metaEl.hidden = !metaEl.children.length;

      textEl.innerHTML = "";
      paragraphs.forEach(function (p) {
        var el = document.createElement("p");
        el.textContent = p;
        textEl.appendChild(el);
      });

      /* "Label:value" per entry, split on the FIRST colon only — several
         values (citations, quoted award categories) contain their own. */
      detailsListEl.innerHTML = "";
      details.forEach(function (entry) {
        var sep = entry.indexOf(":");
        if (sep === -1) return;
        var dt = document.createElement("dt");
        dt.textContent = entry.slice(0, sep).trim();
        var dd = document.createElement("dd");
        dd.textContent = entry.slice(sep + 1).trim();
        detailsListEl.appendChild(dt);
        detailsListEl.appendChild(dd);
      });
      detailsHeadingEl.textContent = item.getAttribute("data-details-heading") || "Details";
      detailsEl.hidden = !detailsListEl.children.length;

      renderIcons();

      /* The trigger itself, NOT document.activeElement: Safari doesn't focus
         a <button> on mouse-down, so activeElement is <body> there and the
         guest's place on the page would be lost the moment they close. */
      lastFocused = item;
      modal.hidden = false;
      /* Reset the scroll position: the dialog scrolls internally, so
         without this a long story leaves the next item opening halfway
         down its own description. */
      if (dialogEl) dialogEl.scrollTop = 0;
      lockScroll();
      document.addEventListener("keydown", onKeydown);
      /* Double rAF: see the photo lightbox's open() above for why. */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { modal.classList.add("is-visible"); });
      });
      if (closeBtn && typeof closeBtn.focus === "function") closeBtn.focus();
    }

    function close() {
      modal.classList.remove("is-visible");
      unlockScroll();
      document.removeEventListener("keydown", onKeydown);
      var finished = false;
      var finish = function () {
        if (finished) return;
        finished = true;
        modal.hidden = true;
        imgEl.src = "";
      };
      modal.addEventListener("transitionend", finish, { once: true });
      setTimeout(finish, 400);
      if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    }

    function onKeydown(e) {
      if (modal.hidden) return;
      /* The lightbox opened from this dialog listens on the document too.
         Without this guard one Escape closes BOTH — the guest loses the
         detail view they were reading just for dismissing the zoom. */
      if (lightboxIsOpen()) return;
      switch (e.key) {
        case "Escape": e.preventDefault(); close(); break;
        case "Tab":
          /* Simple focus trap: keep focus inside the dialog. */
          var focusables = modal.querySelectorAll("button:not([hidden]), a[href]");
          if (!focusables.length) break;
          var first = focusables[0];
          var last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault(); last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault(); first.focus();
          }
          break;
      }
    }

    modal.querySelectorAll("[data-pressmodal-close]").forEach(function (el) {
      el.addEventListener("click", close);
    });

    /* Real <button> triggers, so Enter/Space come free — no keydown handler
       needed here the way the div-based room/story cards need one. */
    items.forEach(function (item) {
      item.addEventListener("click", function () { open(item); });
    });
  }

  /* ---- Full menu booklet (Restaurant page) ----
     Renders the restaurant's official PDF page by page onto canvases and
     lays them out as a booklet: a two-page spread with a spine from tablet
     up, a single page below that. No-ops without #nvr-menubook.

     Why not an <iframe>/<embed> of the PDF: every browser's built-in viewer
     brings its own toolbar, its own scroll model and its own colours, none
     of which can be styled — the "small awkward frame" this is meant to
     avoid. Rendering to canvas costs a library but buys full control of the
     chrome, on-demand paging, and type that stays sharp at any size.

     The PDF stays the single source of truth: page count, page aspect ratio
     and every dish and price come from the file at runtime, so replacing it
     needs no code change here.

     Progressive enhancement: the trigger is a real <a> pointing at the PDF.
     Without JS (or with the library blocked) it just opens the PDF, which
     is also why modified clicks are deliberately left alone below. */
  /* Three mirrors of the same version, tried in order. One CDN being blocked
     by a network, an ad-blocker or a corporate proxy is the single most
     likely way this viewer dies in the wild, and it used to take the whole
     menu down with it. (The third is cdnjs's non-legacy build — slightly
     newer browser requirements, which is why it sorts last.) */
  var PDFJS_SOURCES = [
    { lib: "https://unpkg.com/pdfjs-dist@3.11.174/legacy/build/pdf.min.js",
      worker: "https://unpkg.com/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js" },
    { lib: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.min.js",
      worker: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js" },
    { lib: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
      worker: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js" }
  ];
  /* Ceiling on a rendered page's pixel width. A4 at ~2x on a large screen
     lands near 1600px; the cap only bites at full zoom on hi-DPI phones,
     where an uncapped canvas is a memory risk for no visible gain. */
  var MAX_PAGE_PX = 2400;
  var ZOOM_STEPS = [1, 1.5, 2];

  var pdfjsPromise = null;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = function () { reject(new Error("could not load " + src)); };
      document.head.appendChild(script);
    });
  }

  function loadPdfJs() {
    if (pdfjsPromise) return pdfjsPromise;

    pdfjsPromise = new Promise(function (resolve, reject) {
      if (window.pdfjsLib) { resolve(window.pdfjsLib); return; }

      /* Walk the mirrors until one actually yields a working library. */
      (function attempt(i) {
        if (i >= PDFJS_SOURCES.length) {
          reject(new Error("every pdf.js mirror failed"));
          return;
        }
        var source = PDFJS_SOURCES[i];
        loadScript(source.lib).then(function () {
          if (!window.pdfjsLib) throw new Error("script loaded but pdfjsLib is absent");
          try {
            /* Browsers refuse `new Worker(<cross-origin URL>)`, so hand pdf.js
               a same-origin blob that importScripts() the CDN copy instead
               (every mirror here sends Access-Control-Allow-Origin: *).
               Without this, pdf.js silently falls back to parsing on the main
               thread and the first page render janks the open animation. */
            var shim = new Blob(
              ["importScripts(" + JSON.stringify(source.worker) + ");"],
              { type: "application/javascript" }
            );
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(shim);
          } catch (err) {
            /* No Blob/URL support — let pdf.js take its own fallback path. */
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = source.worker;
          }
          resolve(window.pdfjsLib);
        }).catch(function () { attempt(i + 1); });
      })(0);
    });

    return pdfjsPromise;
  }

  function initMenuBook() {
    var modal = document.getElementById("nvr-menubook");
    var triggers = document.querySelectorAll("[data-menubook-open]");
    if (!modal || !triggers.length) return;

    var declaredPdf = modal.getAttribute("data-pdf");
    if (!declaredPdf) return;

    /* Candidate paths, most-correct first.

       Root-absolute is the right answer for THIS site and matches every
       other asset reference: .htaccess rewrites /restaurant/ onto
       restaurant.html, so a document-relative "assets/..." would resolve
       against /restaurant/ and 404. The relative candidate is the safety
       net for anyone opening the page straight out of a folder rather than
       from the site root. Whichever answers first is the one used, and the
       links on the page are rewritten to match. */
    var PDF_CANDIDATES = [declaredPdf];
    if (declaredPdf.charAt(0) === "/") PDF_CANDIDATES.push(declaredPdf.slice(1));

    var pdfUrl = null;          // resolved, confirmed-reachable URL
    var pdfProbe = null;        // in-flight resolution

    var dialog = modal.querySelector(".nvr-menubook__dialog");
    var stage = modal.querySelector(".nvr-menubook__stage");
    var book = modal.querySelector(".nvr-menubook__book");
    var leaves = modal.querySelectorAll(".nvr-menubook__leaf");
    var loaderEl = modal.querySelector(".nvr-menubook__loader");
    var fallbackEl = modal.querySelector(".nvr-menubook__fallback");
    var headingEl = modal.querySelector(".nvr-menubook__fallback h3");
    var bodyEl = modal.querySelector(".nvr-menubook__fallback p");
    var fallbackLink = modal.querySelector("[data-menubook-pdf-fallback]");
    var embedEl = null;   // browser-native PDF frame, built only if needed
    var footEl = modal.querySelector(".nvr-menubook__foot");
    var countEl = modal.querySelector(".nvr-menubook__count");
    var zoomValEl = modal.querySelector(".nvr-menubook__zoomval");
    var closeBtn = modal.querySelector(".nvr-menubook__close");
    var prevBtn = modal.querySelector("[data-menubook-prev]");
    var nextBtn = modal.querySelector("[data-menubook-next]");
    var zoomInBtn = modal.querySelector("[data-menubook-zoom-in]");
    var zoomOutBtn = modal.querySelector("[data-menubook-zoom-out]");

    var doc = null;         // pdf.js document proxy
    var pageCount = 0;
    var pageRatio = 0.707;  // width / height, replaced by the real page's
    var current = 1;        // leftmost page currently on screen
    var spread = false;
    var zoomIdx = 0;
    var zoom = 1;
    var booting = false;
    var busy = false;       // a page turn is mid-flight
    var lastFocused = null;
    var cache = {};         // page number -> { canvas, w } (w = CSS px it was rendered for)
    var pending = {};       // page number -> { w, p } in-flight render

    function reduced() {
      return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }

    function supported() {
      if (!window.Promise) return false;
      var probe = document.createElement("canvas");
      return !!(probe.getContext && probe.getContext("2d"));
    }

    /* ---- Locating the PDF ----
       Resolved once and cached. Knowing whether the FILE is missing (as
       opposed to the viewer being unavailable) is what lets this show an
       honest message instead of blaming the guest's browser — and it stops
       the fallback offering a button that leads to the same 404. */
    function reachable(url) {
      if (!window.fetch) return Promise.resolve(true);   // can't check; assume it's there
      return fetch(url, { method: "HEAD" }).then(function (res) {
        if (res.ok) return true;
        /* Some hosts refuse HEAD outright — re-ask for a single byte. */
        if (res.status === 405 || res.status === 501) {
          return fetch(url, { headers: { Range: "bytes=0-0" } })
            .then(function (r) { return r.ok || r.status === 206; })
            .catch(function () { return false; });
        }
        return false;
      }).catch(function () { return false; });
    }

    function resolvePdf() {
      if (pdfProbe) return pdfProbe;
      /* file:// has no HTTP to probe and fetch rejects on it outright — take
         the declared path and let the viewer surface any problem instead. */
      if (window.location.protocol === "file:") {
        pdfUrl = PDF_CANDIDATES[0];
        pdfProbe = Promise.resolve(pdfUrl);
        return pdfProbe;
      }
      pdfProbe = new Promise(function (resolve) {
        (function attempt(i) {
          if (i >= PDF_CANDIDATES.length) { resolve(null); return; }
          var candidate = PDF_CANDIDATES[i];
          reachable(candidate).then(function (ok) {
            if (!ok) { attempt(i + 1); return; }
            pdfUrl = candidate;
            applyPdfUrl(candidate);
            resolve(candidate);
          });
        })(0);
      });
      return pdfProbe;
    }

    /* Point every link at the path that actually answered, so the toolbar
       link, the fallback button and the no-JS trigger can't go stale. */
    function applyPdfUrl(url) {
      Array.prototype.forEach.call(
        document.querySelectorAll("[data-menubook-open], [data-menubook-pdf]"),
        function (el) {
          el.setAttribute("href", url);
          /* The file resolved, so any link a previous failed attempt hid is
             live again. */
          if (el.hasAttribute("data-menubook-pdf")) el.hidden = false;
        }
      );
    }

    function setDisabled(el, off) {
      if (!el) return;
      el.disabled = !!off;
    }

    /* ---- Rendering ---- */

    function renderPage(n, cssW) {
      var cached = cache[n];
      /* A canvas rendered wider than we need scales down cleanly — only
         re-render when we would otherwise be upscaling it. */
      if (cached && cached.w >= cssW * 0.94) return Promise.resolve(cached.canvas);
      if (pending[n]) {
        if (pending[n].w >= cssW * 0.94) return pending[n].p;
        /* In flight at too low a resolution (zoom pressed mid-render):
           let it land, then render again at the size now wanted. */
        return pending[n].p.then(function () { return renderPage(n, cssW); });
      }

      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var targetPx = Math.min(Math.round(cssW * dpr), MAX_PAGE_PX);

      var job = doc.getPage(n).then(function (page) {
        var base = page.getViewport({ scale: 1 });
        var viewport = page.getViewport({ scale: targetPx / base.width });
        var canvas = document.createElement("canvas");
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        /* Canvas is opaque to a screen reader, so label it and lean on the
           toolbar's PDF link for anyone who needs the actual text. */
        canvas.setAttribute("role", "img");
        canvas.setAttribute("aria-label", "Menu page " + n + " of " + pageCount);
        var ctx = canvas.getContext("2d", { alpha: false });
        /* alpha:false starts the surface black; paint the paper first. */
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return page.render({ canvasContext: ctx, viewport: viewport }).promise
          .then(function () {
            cache[n] = { canvas: canvas, w: targetPx / dpr };
            delete pending[n];
            return canvas;
          });
      }).catch(function (err) {
        delete pending[n];
        throw err;
      });

      pending[n] = { w: targetPx / dpr, p: job };
      return job;
    }

    /* ---- Layout ----
       Measured off the dialog's width and the stage's border-box height, not
       the stage's clientWidth: once zoomed, the stage grows a scrollbar, and
       measuring inside it would feed that back into the fit and oscillate. */
    function measure() {
      var cs = window.getComputedStyle(stage);
      return {
        w: Math.max(140, dialog.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)),
        h: Math.max(140, stage.offsetHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom))
      };
    }

    /* Two pages only when there is genuinely room for them: a 900px-wide but
       short window fits a spread on paper and renders it postage-stamp
       small, so the shape of the space decides, not width alone. Zooming
       drops to one page — scrolling around a two-page spread to read 9pt
       type is worse than paging through single ones. */
    function refreshMode() {
      var avail = measure();
      var wants = pageCount > 1 && zoom === 1 && avail.w >= 820 && (avail.w / avail.h) >= 1.15;
      if (wants !== spread) {
        spread = wants;
        /* Keep the page the guest was reading on screen: spreads always
           start on an odd page, so step back to this one's left leaf. */
        if (spread && current % 2 === 0) current -= 1;
      }
      return avail;
    }

    function fit(avail) {
      var count = spread ? 2 : 1;
      var ratio = pageRatio * count;   // the whole book's width / height
      var w = avail.w;
      var h = w / ratio;
      if (h > avail.h) { h = avail.h; w = h * ratio; }
      return { w: Math.floor(w * zoom), h: Math.floor(h * zoom), leaves: count };
    }

    function visiblePages() {
      if (!spread) return [current];
      var left = current % 2 === 1 ? current : current - 1;
      var pages = [left];
      if (left + 1 <= pageCount) pages.push(left + 1);
      return pages;
    }

    function updateChrome() {
      var pages = visiblePages();
      var first = pages[0];
      var last = pages[pages.length - 1];
      countEl.textContent = pages.length > 1
        ? "Pages " + first + "–" + last + " of " + pageCount
        : "Page " + first + " of " + pageCount;
      setDisabled(prevBtn, first <= 1);
      setDisabled(nextBtn, last >= pageCount);
      zoomValEl.textContent = Math.round(zoom * 100) + "%";
      setDisabled(zoomOutBtn, zoomIdx === 0);
      setDisabled(zoomInBtn, zoomIdx === ZOOM_STEPS.length - 1);
    }

    function draw() {
      var size = fit(refreshMode());
      book.style.width = size.w + "px";
      book.style.height = size.h + "px";
      book.classList.toggle("is-spread", size.leaves === 2);
      stage.classList.toggle("is-zoomed", zoom > 1);

      var pages = visiblePages();
      var leafW = size.w / size.leaves;
      return Promise.all(pages.map(function (n) { return renderPage(n, leafW); }))
        .then(function (canvases) {
          Array.prototype.forEach.call(leaves, function (leaf, i) {
            var canvas = canvases[i];
            if (!canvas) { leaf.hidden = true; leaf.innerHTML = ""; return; }
            leaf.hidden = false;
            /* appendChild moves a canvas that was in the other leaf, so a
               page sliding from the right leaf to the left needs no
               explicit removal — and skipping the swap when nothing changed
               avoids a repaint flicker on every resize tick. */
            if (leaf.firstChild !== canvas) {
              leaf.innerHTML = "";
              leaf.appendChild(canvas);
            }
          });
          updateChrome();
        });
    }

    /* Render the pages either side of the current view while the guest is
       reading, so a turn is an animation rather than a wait. */
    function prefetch() {
      if (!doc) return;
      var size = fit(measure());
      var leafW = size.w / size.leaves;
      var pages = visiblePages();
      var ahead = [pages[pages.length - 1] + 1, pages[0] - 1,
                   pages[pages.length - 1] + 2, pages[0] - 2];
      ahead.forEach(function (n) {
        if (n >= 1 && n <= pageCount) renderPage(n, leafW).catch(function () {});
      });
    }

    function centreScroll() {
      if (zoom === 1) { stage.scrollTop = 0; stage.scrollLeft = 0; return; }
      stage.scrollLeft = Math.max(0, (stage.scrollWidth - stage.clientWidth) / 2);
      stage.scrollTop = 0;
    }

    /* ---- Paging ---- */

    function goTo(target, dir) {
      if (busy || !doc) return;
      if (spread && target % 2 === 0) target -= 1;
      target = Math.min(pageCount, Math.max(1, target));
      if (target === current) return;

      busy = true;
      var out = dir > 0 ? "is-turn-next" : "is-turn-prev";
      var into = dir > 0 ? "is-turn-prev" : "is-turn-next";
      var skip = reduced();

      book.classList.add(out);
      window.setTimeout(function () {
        current = target;
        draw().then(function () {
          book.classList.remove(out);
          if (!skip) {
            /* Park the book at the incoming pose with transitions off, let
               the browser commit it, restore the transition, then release
               the pose so it animates in from the far side. Two forced
               reflows, because collapsing either one turns the entrance
               into a jump. */
            book.classList.add("is-instant", into);
            void book.offsetWidth;
            book.classList.remove("is-instant");
            void book.offsetWidth;
            book.classList.remove(into);
          }
          busy = false;
          prefetch();
        }).catch(function () {
          /* A page failed to render mid-turn. The document is clearly
             reachable (we got this far), so hand off to the browser's own
             renderer rather than stranding the guest on a blank spread. */
          busy = false;
          useEmbed();
        });
      }, skip ? 0 : 190);
    }

    function turn(dir) {
      if (!doc) return;
      goTo(current + dir * (spread ? 2 : 1), dir);
    }

    function setZoom(delta) {
      if (!doc) return;
      var next = Math.min(ZOOM_STEPS.length - 1, Math.max(0, zoomIdx + delta));
      if (next === zoomIdx) return;
      zoomIdx = next;
      zoom = ZOOM_STEPS[zoomIdx];
      draw().then(centreScroll).catch(function () {});
    }

    /* ---- States ---- */

    /* ---- Degrading, in order ----
       1. booklet          - the intended experience
       2. embedded PDF     - no library needed, the browser's own renderer
       3. open in a new tab - always works wherever a PDF can be opened at all
       4. honest message   - only when the file itself is unreachable
       Each step is only taken because the one above it genuinely failed. */

    function showOnly(which) {
      loaderEl.hidden = which !== "loading";
      book.hidden = which !== "book";
      footEl.hidden = which !== "book";
      fallbackEl.hidden = which !== "message";
      if (embedEl) embedEl.hidden = which !== "embed";
    }

    /* Can this browser actually paint a PDF inline? Without asking first,
       a browser with no PDF handler renders the frame as a blank white
       rectangle and says nothing — a worse outcome than simply offering
       the file. pdfViewerEnabled is the standard signal (Chrome 94+,
       Firefox 97+, Safari 16.4+); older engines get the plugin check. */
    function canEmbedPdf() {
      if (typeof navigator.pdfViewerEnabled === "boolean") return navigator.pdfViewerEnabled;
      return !!(navigator.mimeTypes && navigator.mimeTypes["application/pdf"]);
    }

    /* Step 2: hand the PDF to the browser's built-in viewer. No pdf.js, no
       CDN — if the file is reachable at all, this renders it.
       Skipped on small touch screens, where an embedded PDF is routinely
       refused outright or rendered as an unusable one-page sliver; there
       the direct link is genuinely the better experience. */
    function useEmbed() {
      var smallTouch = window.matchMedia
        && window.matchMedia("(max-width: 720px), (hover: none)").matches;
      if (smallTouch || !pdfUrl || !canEmbedPdf()) { failMessage("viewer"); return; }

      if (!embedEl) {
        embedEl = document.createElement("iframe");
        embedEl.className = "nvr-menubook__embed";
        embedEl.setAttribute("title", "The Village Restaurant menu (PDF)");
        stage.appendChild(embedEl);
      }
      /* #view=FitH so it opens fitted to the width of the frame rather than
         at whatever zoom the browser last remembered. */
      embedEl.src = pdfUrl + "#view=FitH";
      showOnly("embed");
    }

    /* Step 4. reason decides the wording: a missing file is the operator's
       problem to fix and must not be dressed up as the guest's browser
       being at fault. The precise cause goes to the console for whoever
       maintains the site. */
    function failMessage(reason) {
      var missing = reason === "missing";
      if (headingEl) {
        headingEl.textContent = missing
          ? "The menu isn't available right now"
          : "This browser can't show the booklet";
      }
      if (bodyEl) {
        bodyEl.textContent = missing
          ? "Sorry — we couldn't load the menu. Please call us on +63 922 851 2231 and we'll gladly talk you through it."
          : "You can still read the complete menu as a PDF — it opens in a new tab.";
      }
      /* Never offer a link that leads nowhere — and that means EVERY link
         to the file, the toolbar one included, not just this panel's. */
      var dead = missing || !pdfUrl;
      Array.prototype.forEach.call(
        modal.querySelectorAll("[data-menubook-pdf]"),
        function (el) { el.hidden = dead; }
      );
      showOnly("message");

      if (window.console && console.warn) {
        console.warn(missing
          ? "[menu] PDF not found. Expected it at " + PDF_CANDIDATES.join(" or ")
            + " — add the file to assets/docs/ (see assets/docs/README.txt)."
          : "[menu] pdf.js unavailable; offered the PDF directly instead.");
      }
    }

    function startBooklet(lib) {
      return lib.getDocument({ url: pdfUrl }).promise.then(function (loaded) {
        doc = loaded;
        pageCount = loaded.numPages;
        return loaded.getPage(1);
      }).then(function (page) {
        var vp = page.getViewport({ scale: 1 });
        pageRatio = vp.width / vp.height;
        showOnly("book");
        return draw().then(prefetch);
      });
    }

    function boot() {
      /* Reopening: the document and every rendered page are still cached,
         so just re-fit to whatever the viewport is now. */
      if (doc) { showOnly("book"); draw().catch(useEmbed); return; }
      if (booting) return;

      booting = true;
      showOnly("loading");

      /* Both requests go out together: the library and the file are
         independent, so checking them in series would only add latency. */
      var lib = supported()
        ? loadPdfJs().catch(function () { return null; })
        : Promise.resolve(null);

      Promise.all([resolvePdf(), lib]).then(function (results) {
        booting = false;
        if (!results[0]) { failMessage("missing"); return; }   // file itself is gone
        if (!results[1]) { useEmbed(); return; }               // no library, PDF is fine
        return startBooklet(results[1]).catch(function () { useEmbed(); });
      }).catch(function () {
        booting = false;
        useEmbed();
      });
    }

    /* ---- Open / close ---- */

    function focusables() {
      var all = modal.querySelectorAll("button, a[href]");
      var out = [];
      Array.prototype.forEach.call(all, function (el) {
        if (el.disabled || el.hasAttribute("hidden")) return;
        if (!el.offsetParent) return;   // inside a hidden panel (loader, fallback)
        out.push(el);
      });
      return out;
    }

    function onKeydown(e) {
      if (modal.hidden) return;
      switch (e.key) {
        case "Escape":    e.preventDefault(); close(); break;
        case "ArrowRight":
        case "PageDown":  e.preventDefault(); turn(1); break;
        case "ArrowLeft":
        case "PageUp":    e.preventDefault(); turn(-1); break;
        case "Home":      e.preventDefault(); goTo(1, -1); break;
        case "End":       e.preventDefault(); goTo(pageCount, 1); break;
        case "+":
        case "=":         e.preventDefault(); setZoom(1); break;
        case "-":
        case "_":         e.preventDefault(); setZoom(-1); break;
        case "Tab":
          var items = focusables();
          if (!items.length) break;
          var first = items[0];
          var last = items[items.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault(); last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault(); first.focus();
          }
          break;
      }
    }

    function open(trigger) {
      /* The trigger itself, not document.activeElement: Safari leaves
         activeElement on <body> after a mouse click, which would lose the
         guest's place on the page the moment they close. */
      lastFocused = trigger || document.activeElement;
      modal.hidden = false;
      lockScroll();
      document.addEventListener("keydown", onKeydown);
      /* Double rAF: see the photo lightbox's open() for why. */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { modal.classList.add("is-visible"); });
      });
      if (closeBtn && typeof closeBtn.focus === "function") closeBtn.focus();
      /* Layout is live the moment hidden is dropped — transforms don't
         affect the measurements fit() takes — so this can size itself now. */
      boot();
    }

    function close() {
      modal.classList.remove("is-visible");
      unlockScroll();
      document.removeEventListener("keydown", onKeydown);
      var finished = false;
      var finish = function () {
        if (finished) return;
        finished = true;
        modal.hidden = true;
      };
      modal.addEventListener("transitionend", finish, { once: true });
      window.setTimeout(finish, 400);
      if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    }

    /* ---- Wiring ---- */

    Array.prototype.forEach.call(triggers, function (trigger) {
      trigger.setAttribute("aria-haspopup", "dialog");
      /* Warm the library on intent rather than on page load: by the time a
         pointer crosses the button the script is usually already there, and
         guests who never open the menu never pay for it. */
      var warm = function () {
        if (supported()) loadPdfJs().catch(function () {});
        /* Resolve the file too, so the plain-link href is already corrected
           if a modified click opens it before the modal ever runs. */
        resolvePdf();
      };
      trigger.addEventListener("pointerenter", warm, { once: true });
      trigger.addEventListener("focus", warm, { once: true });
      trigger.addEventListener("click", function (e) {
        /* Modified clicks keep the plain-link behaviour (open the PDF in a
           new tab), which is what a guest asking for that expects. */
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        open(trigger);
      });
    });

    modal.querySelectorAll("[data-menubook-close]").forEach(function (el) {
      el.addEventListener("click", close);
    });
    if (prevBtn) prevBtn.addEventListener("click", function () { turn(-1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { turn(1); });
    if (zoomInBtn) zoomInBtn.addEventListener("click", function () { setZoom(1); });
    if (zoomOutBtn) zoomOutBtn.addEventListener("click", function () { setZoom(-1); });

    /* Swipe to turn, but only at 1x — once zoomed the same gesture is how
       you pan around the page. */
    var swipeX = 0, swipeY = 0, swiping = false;
    stage.addEventListener("touchstart", function (e) {
      swiping = zoom === 1 && e.touches.length === 1;
      if (!swiping) return;
      swipeX = e.touches[0].clientX;
      swipeY = e.touches[0].clientY;
    }, { passive: true });
    stage.addEventListener("touchend", function (e) {
      if (!swiping) return;
      swiping = false;
      var touch = e.changedTouches[0];
      var dx = touch.clientX - swipeX;
      var dy = touch.clientY - swipeY;
      if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
      turn(dx < 0 ? 1 : -1);
    }, { passive: true });

    var resizeTimer = null;
    window.addEventListener("resize", function () {
      if (modal.hidden || !doc) return;
      window.clearTimeout(resizeTimer);
      /* Debounced: a drag across the screen would otherwise re-render every
         page at a new resolution dozens of times a second. */
      resizeTimer = window.setTimeout(function () {
        draw().then(centreScroll).catch(function () {});
      }, 160);
    });
  }

  /* ---- Inquiry form validation ---- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function initForm() {
    var form = document.getElementById("events-form");
    var success = document.getElementById("events-success");
    if (!form) return;

    var required = [
      { id: "ev-name",    label: "your full name" },
      { id: "ev-email",   label: "your email address" },
      { id: "ev-type",    label: "an event type" },
      { id: "ev-message", label: "a short message" }
    ];

    function fieldOf(id) { return document.getElementById(id); }
    function errorOf(id) { return document.getElementById(id + "-error"); }

    function setError(id, message) {
      var field = fieldOf(id);
      var err = errorOf(id);
      if (field) field.setAttribute("aria-invalid", "true");
      if (err) { err.textContent = message; err.hidden = false; }
    }

    function clearError(id) {
      var field = fieldOf(id);
      var err = errorOf(id);
      if (field) field.removeAttribute("aria-invalid");
      if (err) { err.textContent = ""; err.hidden = true; }
    }

    /* Clear a field's error as soon as the guest starts correcting it. */
    ["ev-name", "ev-email", "ev-phone", "ev-type", "ev-venue",
     "ev-date", "ev-guests", "ev-message"].forEach(function (id) {
      var field = fieldOf(id);
      if (!field) return;
      var evt = (field.tagName === "SELECT") ? "change" : "input";
      field.addEventListener(evt, function () { clearError(id); });
    });

    function validate() {
      var firstInvalid = null;

      required.forEach(function (item) {
        clearError(item.id);
        var field = fieldOf(item.id);
        if (!field) return;
        if (!field.value.trim()) {
          setError(item.id, "Please enter " + item.label + ".");
          if (!firstInvalid) firstInvalid = field;
        }
      });

      /* Email format */
      var email = fieldOf("ev-email");
      if (email && email.value.trim() && !EMAIL_RE.test(email.value.trim())) {
        setError("ev-email", "Please enter a valid email address.");
        if (!firstInvalid) firstInvalid = email;
      }

      /* Guests: positive number when provided */
      var guests = fieldOf("ev-guests");
      if (guests && guests.value.trim()) {
        var n = Number(guests.value);
        if (!isFinite(n) || n < 1) {
          setError("ev-guests", "Please enter a valid number of guests.");
          if (!firstInvalid) firstInvalid = guests;
        }
      }

      return firstInvalid;
    }

    var submitBtn = form.querySelector('button[type="submit"]');
    var submitError = document.getElementById("events-form-submit-error");

    function showSuccess() {
      form.hidden = true;
      if (success) {
        success.hidden = false;
        if (window.lucide && typeof window.lucide.createIcons === "function") {
          window.lucide.createIcons({ attrs: { class: "nvr-ic" } });
        }
        success.setAttribute("tabindex", "-1");
        success.focus();
        success.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }

    function showSubmitError() {
      if (submitError) submitError.hidden = false;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var firstInvalid = validate();

      if (firstInvalid) {
        if (typeof firstInvalid.focus === "function") firstInvalid.focus();
        return;
      }

      if (submitError) submitError.hidden = true;
      if (submitBtn) submitBtn.disabled = true;

      /* Actually deliver the inquiry via Formspree (see form's action attribute). */
      fetch(form.action, {
        method: form.method || "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" }
      }).then(function (response) {
        if (response.ok) {
          showSuccess();
        } else {
          showSubmitError();
        }
      }).catch(function () {
        showSubmitError();
      }).finally(function () {
        if (submitBtn) submitBtn.disabled = false;
      });
    });
  }

  function init() {
    initLightbox();
    initRoomModal();
    initStoryModal();
    initPressModal();
    initMenuBook();
    initForm();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();


/* ==========================================================================
   4. CONTACT PAGE — contact form validation
   No-ops on every page except Contact (checks for #contact-form).
   Client-side validation only. Delivery is handled by the form's own
   `action` — see the FormSubmit integration contract in operating-brief.md
   before changing the endpoint.
   ========================================================================== */
(function () {
  "use strict";

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function init() {
    var form = document.getElementById("contact-form");
    var success = document.getElementById("contact-success");
    if (!form) return;

    /* Required fields validated on submit. */
    var required = [
      { id: "cf-name",    label: "your full name" },
      { id: "cf-email",   label: "your email address" },
      { id: "cf-subject", label: "a subject" },
      { id: "cf-message", label: "a short message" }
    ];

    function fieldOf(id) { return document.getElementById(id); }
    function errorOf(id) { return document.getElementById(id + "-error"); }

    function setError(id, message) {
      var field = fieldOf(id);
      var err = errorOf(id);
      if (field) field.setAttribute("aria-invalid", "true");
      if (err) {
        err.textContent = message;
        err.hidden = false;
      }
    }

    function clearError(id) {
      var field = fieldOf(id);
      var err = errorOf(id);
      if (field) field.removeAttribute("aria-invalid");
      if (err) {
        err.textContent = "";
        err.hidden = true;
      }
    }

    /* Clear a field's error as soon as the guest starts correcting it. */
    ["cf-name", "cf-email", "cf-phone", "cf-guests", "cf-checkin",
     "cf-checkout", "cf-subject", "cf-message"].forEach(function (id) {
      var field = fieldOf(id);
      if (!field) return;
      var evt = (field.tagName === "SELECT") ? "change" : "input";
      field.addEventListener(evt, function () { clearError(id); });
    });

    function validate() {
      var firstInvalid = null;

      required.forEach(function (item) {
        clearError(item.id);
        var field = fieldOf(item.id);
        if (!field) return;
        if (!field.value.trim()) {
          setError(item.id, "Please enter " + item.label + ".");
          if (!firstInvalid) firstInvalid = field;
        }
      });

      /* Email format */
      var email = fieldOf("cf-email");
      if (email && email.value.trim() && !EMAIL_RE.test(email.value.trim())) {
        setError("cf-email", "Please enter a valid email address.");
        if (!firstInvalid) firstInvalid = email;
      }

      /* Guests: positive number when provided */
      var guests = fieldOf("cf-guests");
      if (guests && guests.value.trim()) {
        var n = Number(guests.value);
        if (!isFinite(n) || n < 1) {
          setError("cf-guests", "Please enter a valid number of guests.");
          if (!firstInvalid) firstInvalid = guests;
        }
      }

      /* Dates: check-out should not precede check-in when both given */
      var ci = fieldOf("cf-checkin");
      var co = fieldOf("cf-checkout");
      if (ci && co && ci.value && co.value && co.value < ci.value) {
        setError("cf-checkout", "Check-out cannot be before check-in.");
        if (!firstInvalid) firstInvalid = co;
      }

      return firstInvalid;
    }

    var submitBtn = form.querySelector('button[type="submit"]');
    var submitError = document.getElementById("contact-form-submit-error");

    function showSuccess() {
      form.hidden = true;
      if (success) {
        success.hidden = false;
        /* Re-render any Lucide icons now revealed. */
        if (window.lucide && typeof window.lucide.createIcons === "function") {
          window.lucide.createIcons({ attrs: { class: "nvr-ic" } });
        }
        success.setAttribute("tabindex", "-1");
        success.focus();
        success.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }

    function showSubmitError() {
      if (submitError) submitError.hidden = false;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var firstInvalid = validate();

      if (firstInvalid) {
        if (typeof firstInvalid.focus === "function") firstInvalid.focus();
        return;
      }

      if (submitError) submitError.hidden = true;
      if (submitBtn) submitBtn.disabled = true;

      /* Actually deliver the message via Formspree (see form's action attribute). */
      fetch(form.action, {
        method: form.method || "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" }
      }).then(function (response) {
        if (response.ok) {
          showSuccess();
        } else {
          showSubmitError();
        }
      }).catch(function () {
        showSubmitError();
      }).finally(function () {
        if (submitBtn) submitBtn.disabled = false;
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
