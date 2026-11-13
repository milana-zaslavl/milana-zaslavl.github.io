(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function getJSON(name) {
    return fetch('data/' + name + '.json').then(function (r) {
      if (!r.ok) throw new Error(name);
      return r.json();
    }).catch(function () {
      // открыто двойным кликом (file://) — берём копию данных
      if (window.SITE_DATA && window.SITE_DATA[name]) return window.SITE_DATA[name];
      throw new Error(name);
    });
  }

  /* ---------- Настройки: телефон, часы, ссылки ---------- */
  function applySettings(s) {
    var telegram = telegramUrl(s.telegram);

    $$('[data-bind]').forEach(function (n) { n.textContent = s[n.dataset.bind] || ''; });

    var links = {
      dikidi: s.dikidi,
      reviews: s.reviews,
      phone: 'tel:' + s.phone,
      email: 'mailto:' + s.email,
      instagram: s.instagram,
      telegram: telegram
    };
    $$('[data-link]').forEach(function (a) {
      var href = links[a.dataset.link];
      if (href) a.setAttribute('href', href);
    });

    // Telegram ещё не указан — прячем всё, что на него ведёт
    if (!telegram) $$('[data-needs="telegram"]').forEach(function (n) { n.hidden = true; });

    // Кнопка сертификата: Telegram, а если его нет — звонок
    var cert = $('#certBtn');
    if (telegram) {
      cert.href = telegram + '?text=' + encodeURIComponent('Здравствуйте! Хочу заказать подарочный сертификат');
    } else {
      cert.href = 'tel:' + s.phone;
      cert.textContent = 'Заказать по телефону';
      cert.removeAttribute('target');
      var small = $('.cert__small');
      if (small) small.textContent = 'Позвоните нам — оформим сертификат на любую услугу.';
    }

    $('#routeBtn').href = 'https://yandex.by/maps/?text=' + encodeURIComponent(s.mapQuery) + '&rtext=~' + encodeURIComponent(s.mapQuery);

    // Тёмная карта грузится лениво, когда блок подъезжает к экрану
    var map = $('#map');
    function loadMap() {
      if (map.firstChild) return;
      var f = document.createElement('iframe');
      f.src = 'https://yandex.by/map-widget/v1/?text=' + encodeURIComponent(s.mapQuery) + '&z=17';
      f.title = 'Карта: ' + s.address;
      map.appendChild(f);
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { loadMap(); io.disconnect(); }
      }, { rootMargin: '300px' });
      io.observe(map);
    } else {
      loadMap();
    }
  }

  function telegramUrl(v) {
    if (!v) return '';
    v = String(v).trim();
    if (/^https?:\/\//.test(v)) return v;
    return 'https://t.me/' + v.replace(/^@/, '');
  }

  /* ---------- Прайс ---------- */
  function priceText(item) {
    return item.label || 'от ' + item.price + ' BYN';
  }
  function timeText(item) {
    return item.duration ? item.duration + ' мин' : '';
  }

  function renderServices(data) {
    var tabs = $('#tabs'), panels = $('#panels');
    tabs.textContent = '';
    panels.textContent = '';

    data.sections.forEach(function (sec, i) {
      var tab = el('button', 'tab', sec.tab || sec.title);
      tab.type = 'button';
      tab.id = 'tab-' + sec.id;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', 'panel-' + sec.id);
      tabs.appendChild(tab);

      var panel = el('div', 'panel is-collapsed');
      panel.id = 'panel-' + sec.id;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      panel.appendChild(el('h3', null, sec.title));
      var body = el('div', 'panel__body');
      body.id = 'body-' + sec.id;

      sec.groups.forEach(function (g) {
        var group = el('div', 'group');
        if (g.title) group.appendChild(el('div', 'group__title', g.title));
        var ul = el('ul', 'rows');
        g.items.forEach(function (it) {
          var li = el('li', 'row');
          var name = el('span', 'row__name', it.name);
          if (it.note) name.appendChild(el('span', 'row__note', it.note));
          li.appendChild(name);
          li.appendChild(el('span', 'row__time', timeText(it)));
          li.appendChild(el('span', 'row__price', priceText(it)));
          ul.appendChild(li);
        });
        group.appendChild(ul);
        body.appendChild(group);
      });

      if (sec.note) body.appendChild(el('p', 'panel__note', sec.note));
      panel.appendChild(body);

      // На телефоне прайс свёрнут, его можно развернуть кнопкой
      var toggle = el('button', 'panel__toggle', 'Показать весь прайс');
      toggle.type = 'button';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', body.id);
      toggle.addEventListener('click', function () {
        var open = panel.classList.toggle('is-collapsed') === false;
        toggle.setAttribute('aria-expanded', open);
        toggle.textContent = open ? 'Свернуть' : 'Показать весь прайс';
        if (!open) panel.scrollIntoView({ block: 'nearest' });
      });
      panel.appendChild(toggle);
      panels.appendChild(panel);
    });

    var all = $$('.tab', tabs);
    function select(idx, focus) {
      all.forEach(function (t, j) {
        var on = j === idx;
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
        $('#panel-' + data.sections[j].id).hidden = !on;
      });
      if (focus) all[idx].focus();
    }
    all.forEach(function (t, j) {
      t.addEventListener('click', function () { select(j); });
      t.addEventListener('keydown', function (e) {
        var n = all.length;
        if (e.key === 'ArrowRight') { e.preventDefault(); select((j + 1) % n, true); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); select((j - 1 + n) % n, true); }
      });
    });
    select(0);
  }

  /* ---------- Мастера ---------- */
  function renderMasters(data, dikidi) {
    var box = $('#mastersList');
    box.textContent = '';
    data.masters.forEach(function (m) {
      var card = el('article', 'master');
      var ph = el('div', 'master__photo');
      if (m.photo) {
        var img = document.createElement('img');
        img.src = m.photo;
        img.alt = 'Мастер ' + m.name + ', ' + m.role.toLowerCase();
        img.width = 700; img.height = 875; img.loading = 'lazy';
        if (m.photoPosition) img.style.objectPosition = m.photoPosition;
        ph.appendChild(img);
      } else {
        ph.classList.add('master__photo--empty');
        ph.setAttribute('aria-hidden', 'true');
        ph.textContent = m.name.charAt(0);
      }
      var body = el('div', 'master__body');
      body.appendChild(el('h3', null, m.name));
      body.appendChild(el('p', 'master__role', m.role));
      body.appendChild(el('span', 'master__exp', 'Стаж ' + m.experience));
      if (m.note) body.appendChild(el('p', 'master__note', m.note));
      var a = el('a', 'btn btn--accent', 'Записаться');
      a.href = dikidi; a.target = '_blank'; a.rel = 'noopener';
      a.setAttribute('aria-label', 'Записаться к мастеру: ' + m.name);
      body.appendChild(el('span', 'master__spacer'));
      body.appendChild(a);
      card.appendChild(ph); card.appendChild(body);
      box.appendChild(card);
    });
  }

  function initSlider() {
    var box = $('#mastersList'), prev = $('#mPrev'), next = $('#mNext');
    function step() {
      var card = $('.master', box);
      return card ? card.getBoundingClientRect().width + 22 : 300;
    }
    function update() {
      prev.disabled = box.scrollLeft < 4;
      next.disabled = box.scrollLeft + box.clientWidth >= box.scrollWidth - 4;
    }
    prev.addEventListener('click', function () { box.scrollBy({ left: -step(), behavior: 'smooth' }); });
    next.addEventListener('click', function () { box.scrollBy({ left: step(), behavior: 'smooth' }); });
    box.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- Меню и мелочи ---------- */
  var burger = $('#burger'), nav = $('#nav');
  burger.addEventListener('click', function () {
    var open = nav.classList.toggle('is-open');
    header.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
  });
  $$('a', nav).forEach(function (a) {
    a.addEventListener('click', function () {
      nav.classList.remove('is-open');
      header.classList.remove('menu-open');
      burger.setAttribute('aria-expanded', 'false');
    });
  });
  // «Всплывающие» карточки: появляются, когда блок доезжает до экрана
  var reveal = $$('.why li');
  if ('IntersectionObserver' in window && reveal.length) {
    document.documentElement.classList.add('js-reveal');
    var seen = new IntersectionObserver(function (items) {
      items.forEach(function (it) {
        if (it.isIntersecting) { it.target.classList.add('is-in'); seen.unobserve(it.target); }
      });
    }, { threshold: 0.2 });
    reveal.forEach(function (n, i) {
      n.style.transitionDelay = (i % 3) * 120 + 'ms';
      seen.observe(n);
    });
  }

  var header = $('.header');
  var toTop = $('#to-top');
  toTop.addEventListener('click', function () {
    var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
  });
  function onScroll() {
    header.classList.toggle('is-scrolled', window.scrollY > 40);
    toTop.hidden = window.scrollY < 400;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  $('#year').textContent = new Date().getFullYear();

  /* ---------- Загрузка данных ---------- */
  Promise.all([getJSON('settings'), getJSON('services'), getJSON('masters')])
    .then(function (r) {
      applySettings(r[0]);
      renderServices(r[1]);
      renderMasters(r[2], r[0].dikidi);
      initSlider();
    })
    .catch(function () {
      $('#panels').textContent = 'Не удалось загрузить данные. Позвоните нам: +375 29 910-46-20.';
    });
})();
