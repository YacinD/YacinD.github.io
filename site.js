(function (window, document) {
  const NS = 'yacind.github.io';
  const OWNER_FLAG = 'yd-site-owner';
  const OWNER_COOKIE = 'yd_owner=1';
  const TICK_MS = 10000;

  function dayStamp(d) {
    const date = d || new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function readOwner() {
    try {
      if (localStorage.getItem(OWNER_FLAG) === '1') return true;
    } catch (err) {}
    return document.cookie.split(';').some(part => part.trim() === OWNER_COOKIE);
  }

  function markOwnerDevice() {
    try { localStorage.setItem(OWNER_FLAG, '1'); } catch (err) {}
    document.cookie = `${OWNER_COOKIE}; Max-Age=315360000; Path=/; SameSite=Lax`;
    document.documentElement.classList.add('is-owner');
  }

  function bootstrapOwner() {
    const params = new URLSearchParams(location.search);
    const host = location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1' || location.protocol === 'file:';
    const markedInUrl = params.has('me') || location.hash === '#me';

    if (isLocal || markedInUrl || readOwner()) markOwnerDevice();

    if (markedInUrl) {
      const hash = location.hash === '#me' ? '' : location.hash;
      history.replaceState({}, '', location.pathname + hash);
    }

    return readOwner();
  }

  function abacus(endpoint, key) {
    return fetch(`https://abacus.jasoncameron.dev/${endpoint}/${NS}/${encodeURIComponent(key)}`)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(data => {
        const value = Number(data && data.value);
        return Number.isFinite(value) ? value : 0;
      });
  }

  function trackPage(kind) {
    const isOwner = bootstrapOwner();
    if (isOwner) return;

    const day = dayStamp();
    const lifeFlag = kind === 'blog' ? 'yd-unique-blog' : 'yd-unique-visit';
    const dayFlag = `yd-day-${kind}-${day}`;
    const lifeKey = kind === 'blog' ? 'blog-visits' : 'visits';
    const dailyKey = `${kind === 'blog' ? 'b' : 'h'}-${day}`;
    const tickKey = `${kind === 'blog' ? 'bt' : 'ht'}-${day}`;

    let countedLife = false;
    let countedDay = false;
    try {
      countedLife = localStorage.getItem(lifeFlag) === '1';
      countedDay = localStorage.getItem(dayFlag) === '1';
    } catch (err) {}

    if (!countedLife) {
      abacus('hit', lifeKey).then(() => {
        try { localStorage.setItem(lifeFlag, '1'); } catch (err) {}
      }).catch(() => {});
    }

    if (!countedDay) {
      abacus('hit', dailyKey).then(() => {
        try { localStorage.setItem(dayFlag, '1'); } catch (err) {}
      }).catch(() => {});
    }

    let lastTick = Date.now();
    const sendTick = () => {
      lastTick = Date.now();
      abacus('hit', tickKey).catch(() => {});
    };

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') sendTick();
    }, TICK_MS);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && Date.now() - lastTick > 4000) sendTick();
    });

    window.addEventListener('pagehide', () => {
      window.clearInterval(timer);
      if (Date.now() - lastTick > 4000) {
        try {
          navigator.sendBeacon(`https://abacus.jasoncameron.dev/hit/${NS}/${encodeURIComponent(tickKey)}`);
        } catch (err) {}
      }
    });
  }

  function mountAnalyticsButton() {
    if (!readOwner()) return;
    if (document.querySelector('.nav-analytics')) return;
    const nav = document.querySelector('nav');
    if (!nav) return;
    const link = document.createElement('a');
    link.className = 'nav-analytics';
    link.href = 'analytics.html';
    link.textContent = 'View analytics';
    const logo = nav.querySelector('.nav-logo');
    if (logo && logo.nextSibling) nav.insertBefore(link, logo.nextSibling);
    else nav.appendChild(link);
  }

  function mountNavToggle() {
    const nav = document.querySelector('nav');
    const links = nav && nav.querySelector('.nav-links');
    if (!nav || !links || nav.querySelector('.nav-toggle')) return;

    const btn = document.createElement('button');
    btn.className = 'nav-toggle';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Open menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span></span><span></span><span></span>';
    nav.insertBefore(btn, links);

    const close = () => {
      nav.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'Open menu');
    };

    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });

    links.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  }

  window.YD = {
    NS,
    TICK_MS,
    bootstrapOwner,
    readOwner,
    trackPage,
    abacus,
    dayStamp,
    mountAnalyticsButton,
    mountNavToggle
  };

  document.addEventListener('DOMContentLoaded', () => {
    bootstrapOwner();
    mountNavToggle();
  });
})(window, document);
