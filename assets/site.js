/* Shared behaviour for every page on mojud.life: theme, sticky header, mobile menu,
   copy buttons and the demo-video dialog. Each part checks that its elements exist. */
(function () {
  var root = document.documentElement;
  if (!root.lang) root.lang = 'en';

  /* Theme: light by default, dark when the visitor picks it */
  try {
    var saved = localStorage.getItem('mojud-theme');
    if (saved && !root.hasAttribute('data-theme')) root.setAttribute('data-theme', saved);
  } catch (e) {}
  var themeBtn = document.getElementById('theme-btn');
  if (themeBtn) {
    var isDark = function () { return root.getAttribute('data-theme') === 'dark'; };
    var syncTheme = function () { themeBtn.setAttribute('aria-label', isDark() ? 'Switch to light theme' : 'Switch to dark theme'); };
    themeBtn.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('mojud-theme', next); } catch (e) {}
      syncTheme();
    });
    syncTheme();
  }

  /* Header border once the page scrolls */
  var head = document.querySelector('.site-head');
  if (head) {
    var onScroll = function () { head.classList.toggle('is-stuck', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* Mobile menu */
  var menuBtn = document.getElementById('menu-btn');
  var nav = document.getElementById('site-nav');
  if (menuBtn && nav) {
    var setMenu = function (open) {
      nav.classList.toggle('open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
    };
    menuBtn.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); menuBtn.focus(); }
    });
  }

  /* Copy contact details */
  var copyStatus = document.getElementById('copy-status');
  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    var timer;
    function done(msg) {
      btn.textContent = msg;
      btn.classList.add('is-done');
      if (copyStatus) copyStatus.textContent = btn.getAttribute('data-what') + (msg === 'Copied' ? ' copied' : ' selected; press Ctrl+C to copy');
      clearTimeout(timer);
      timer = setTimeout(function () { btn.textContent = 'Copy'; btn.classList.remove('is-done'); }, 1800);
    }
    btn.addEventListener('click', function () {
      var selectIt = function () {
        var range = document.createRange();
        range.selectNodeContents(btn.previousElementSibling);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        done('Selected');
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(btn.getAttribute('data-copy')).then(function () { done('Copied'); }, selectIt);
      } else {
        selectIt();
      }
    });
  });

  /* Demo videos open in a dialog; the file only loads when asked for */
  var player = document.getElementById('player');
  if (player && player.showModal) {
    var video = player.querySelector('video');
    var title = player.querySelector('.player-title');
    var opener = null;
    document.querySelectorAll('[data-video]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        opener = btn;
        title.textContent = btn.getAttribute('data-video-title') || '';
        video.src = btn.getAttribute('data-video');
        player.showModal();
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
      });
    });
    var close = function () { player.close(); };
    player.querySelector('.player-close').addEventListener('click', close);
    player.addEventListener('click', function (e) { if (e.target === player) close(); });
    player.addEventListener('close', function () {
      video.pause();
      video.removeAttribute('src');
      video.load();
      if (opener) opener.focus();
    });
  }

  /* Live sun (home page): the shadow on the wall is cast by the real sun, where the visitor is.
     Time comes from the visitor's clock; the place from their time zone (or geolocation if they
     already allowed it for this site; we never ask). After dark the pointer is the lamp. */
  var wall = document.getElementById('wall');
  if (wall) {
    var stamp = document.getElementById('sun-stamp');
    var D = Math.PI / 180;
    var PLACES = { /* IANA zone: [lat, lon] for the zones most visitors are in */
      'Asia/Kolkata': [22, 78], 'Asia/Calcutta': [22, 78], 'Asia/Dubai': [25, 55], 'Asia/Karachi': [25, 67], 'Asia/Dhaka': [24, 90],
      'Asia/Kathmandu': [28, 85], 'Asia/Colombo': [7, 80], 'Asia/Singapore': [1, 104], 'Asia/Kuala_Lumpur': [3, 102], 'Asia/Bangkok': [14, 100],
      'Asia/Jakarta': [-6, 107], 'Asia/Manila': [14, 121], 'Asia/Hong_Kong': [22, 114], 'Asia/Shanghai': [31, 121], 'Asia/Tokyo': [36, 140],
      'Asia/Seoul': [37, 127], 'Asia/Riyadh': [24, 47], 'Asia/Qatar': [25, 51], 'Asia/Tehran': [35, 51], 'Asia/Jerusalem': [32, 35], 'Asia/Tashkent': [41, 69],
      'Europe/London': [51, 0], 'Europe/Dublin': [53, -6], 'Europe/Paris': [49, 2], 'Europe/Berlin': [52, 13], 'Europe/Madrid': [40, -4],
      'Europe/Rome': [42, 12], 'Europe/Amsterdam': [52, 5], 'Europe/Zurich': [47, 8], 'Europe/Stockholm': [59, 18], 'Europe/Moscow': [56, 38], 'Europe/Istanbul': [41, 29],
      'Africa/Cairo': [30, 31], 'Africa/Lagos': [6, 3], 'Africa/Nairobi': [-1, 37], 'Africa/Johannesburg': [-26, 28],
      'America/New_York': [41, -74], 'America/Toronto': [44, -79], 'America/Chicago': [42, -88], 'America/Denver': [40, -105], 'America/Phoenix': [33, -112],
      'America/Los_Angeles': [34, -118], 'America/Vancouver': [49, -123], 'America/Mexico_City': [19, -99], 'America/Sao_Paulo': [-23, -47],
      'America/Argentina/Buenos_Aires': [-35, -58], 'America/Bogota': [5, -74], 'America/Lima': [-12, -77],
      'Australia/Sydney': [-34, 151], 'Australia/Melbourne': [-38, 145], 'Australia/Perth': [-32, 116], 'Australia/Brisbane': [-27, 153], 'Pacific/Auckland': [-37, 175]
    };
    var REGION = { Asia: 25, Europe: 50, America: 38, Africa: 5, Australia: -30, Pacific: -20, Indian: -10, Atlantic: 30 };
    var place = (function () {
      var zone = '';
      try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
      if (PLACES[zone]) return PLACES[zone].slice();
      var lat = REGION[zone.split('/')[0]];
      return [lat == null ? 22 : lat, -new Date().getTimezoneOffset() / 4]; /* 15° of longitude per hour of offset */
    })();
    try {
      if (navigator.permissions && navigator.geolocation) {
        navigator.permissions.query({ name: 'geolocation' }).then(function (p) {
          if (p.state !== 'granted') return;
          navigator.geolocation.getCurrentPosition(function (pos) {
            place = [pos.coords.latitude, pos.coords.longitude];
            tick();
          }, function () {}, { maximumAge: 3600000, timeout: 8000 });
        }, function () {});
      }
    } catch (e) {}

    /* NOAA solar position: elevation and azimuth (degrees, azimuth clockwise from north) */
    function sun(d, lat, lon) {
      var doy = Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 864e5);
      var hr = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
      var g = 2 * Math.PI / 365 * (doy + (hr - 12) / 24);
      var eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
      var decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
      var ha = ((hr * 60 + eq + 4 * lon) / 4 - 180) * D;
      var la = lat * D;
      var el = Math.asin(Math.sin(la) * Math.sin(decl) + Math.cos(la) * Math.cos(decl) * Math.cos(ha));
      var az = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(la) - Math.tan(decl) * Math.cos(la)) / D + 180;
      return { el: el / D, az: ((az % 360) + 360) % 360 };
    }
    var STOPS = [ /* sun height → wall, shadow, ink, ink-2 */
      [55, '#F8F0E2', '#8C6D52', '#2B2119', '#4B3D31'],
      [20, '#F5E4C7', '#875F3E', '#2B2119', '#4B3D31'],
      [6, '#F0CD9D', '#7B5A40', '#2B2119', '#4B3D31'],
      [0, '#E6B47C', '#6E4B35', '#2B2119', '#4B3D31'],
      [-4, '#9C7A6C', '#4A3531', '#F3E8D8', '#DACBBA'],
      [-9, '#2B2320', '#0E0A09', '#EDE1CF', '#CDBFAC']
    ];
    function hex(h) { return [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); }
    function mix(a, b, t) {
      var A = hex(a), B = hex(b);
      return 'rgb(' + A.map(function (v, i) { return Math.round(v + (B[i] - v) * t); }).join(', ') + ')';
    }
    function tone(el) {
      if (el >= STOPS[0][0]) return STOPS[0].slice(1);
      for (var i = 0; i < STOPS.length - 1; i++) {
        var a = STOPS[i], b = STOPS[i + 1];
        if (el <= a[0] && el >= b[0]) {
          var t = (a[0] - el) / (a[0] - b[0]);
          return [1, 2, 3, 4].map(function (k) { return mix(a[k], b[k], t); });
        }
      }
      return STOPS[STOPS.length - 1].slice(1);
    }
    var layers = { near: 0.35, mid: 0.7, far: 1, sign: 1.3 };
    var blurBase = { near: 1.2, mid: 3.5, far: 7, sign: 9 };
    var opBase = { near: 0.42, mid: 0.34, far: 0.26, sign: 0.2 };
    var px = 0.72, py = 0.2, k = 0;
    var html = document.documentElement;

    function tick() {
      var d = new Date();
      var s = sun(d, place[0], place[1]);
      var c = tone(s.el);
      html.style.setProperty('--sun-shade', c[0]);
      html.style.setProperty('--sun-shadow', c[1]);
      html.style.setProperty('--ink', c[2]);
      html.style.setProperty('--ink-2', c[3]);
      k = Math.min(1, Math.max(0, (-2 - s.el) / 6));      /* 0 = sun, 1 = lamp */
      var low = Math.min(1, Math.max(0, (18 - s.el) / 18)); /* low sun: softer, longer */
      var sx = -Math.sin(s.az * D) * 7;                      /* east → shadows slide left, west → right */
      var sy = Math.tan(Math.min(72, Math.max(0, s.el)) * D) * 5; /* high sun → shadows fall lower */
      Object.keys(layers).forEach(function (name) {
        var z = layers[name], el = wall.querySelector('.leaf.' + name);
        if (!el) return;
        el.style.setProperty('--tx', (sx * z * (1 - k)).toFixed(2) + '%');
        el.style.setProperty('--ty', (sy * z * (1 - k)).toFixed(2) + '%');
        el.style.setProperty('--s', (1 + (1 / (1 - z * 0.2) - 1) * k).toFixed(3));
        el.style.setProperty('--b', (blurBase[name] * (1 + low * 1.4) * (1 - k) + z * 13 * k).toFixed(1) + 'px');
        el.style.setProperty('--o', Math.min(0.9, opBase[name] * (1 - 0.15 * low)).toFixed(2));
      });
      wall.style.setProperty('--lamp', k.toFixed(2));
      if (stamp) {
        var time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        var dir = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(s.az / 45) % 8];
        stamp.textContent = time + ' · ' + (s.el >= 1 ? 'sun ' + Math.round(s.el) + '° up in the ' + dir
          : s.el >= -2 ? 'sun on the horizon, ' + dir : 'after dark, the lamp follows you');
      }
    }
    function lamp() {
      wall.style.setProperty('--lx', (px * 100).toFixed(1) + '%');
      wall.style.setProperty('--ly', (py * 100).toFixed(1) + '%');
      wall.style.setProperty('--ox', ((0.25 + px) / 1.5 * 100).toFixed(2) + '%');
      wall.style.setProperty('--oy', ((0.25 + py) / 1.5 * 100).toFixed(2) + '%');
    }
    var raf = null;
    function pointer(x, y) {
      px = Math.min(1, Math.max(0, x / window.innerWidth));
      py = Math.min(1, Math.max(0, y / window.innerHeight));
      if (raf) return;
      raf = requestAnimationFrame(function () { raf = null; lamp(); });
    }
    document.addEventListener('mousemove', function (e) { if (k > 0) pointer(e.clientX, e.clientY); }, { passive: true });
    document.addEventListener('touchmove', function (e) { var t = e.touches[0]; if (k > 0 && t) pointer(t.clientX, t.clientY); }, { passive: true });
    lamp();
    tick();
    setInterval(tick, 30000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) tick(); });
  }
})();
