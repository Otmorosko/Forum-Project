/* eslint-env browser */
/* global DOMPurify */

try {
  console.log('posts.js loaded');
} catch (err) {
  /* eslint-disable-next-line no-console */
  console.debug('posts.js load ignored error', err);
}

/* eslint-disable no-console */
// Safe DOMPurify fallback
const SafeDOMPurify = (typeof DOMPurify !== 'undefined' && DOMPurify)
  || (typeof window !== 'undefined' && window.DOMPurify)
  || {
    sanitize: (s) => {
      // very small fallback: escape angle brackets
      return String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  };

async function fetchPosts() {
  try {
    const res = await fetch('data/categories.json', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      return json;
    }
  } catch {
    // fallback do API jeśli plik nie istnieje
  }
  // Potem API (fallback)
  const endpoints = ['/api/posts-structured', '/api/posts'];
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, { cache: 'no-store' });
      if (!res.ok) continue;
      const json = await res.json();
      return json;
    } catch {
      // try next endpoint
    }
  }
  throw new Error('Could not load posts');
}

// Instrumental log for debugging
function instrumentLog(tag, obj) {
  try {
    console.log('[posts][debug]', tag, obj);
  } catch (err) {
    /* eslint-disable-next-line no-console */
    console.debug('[posts][debug] log failed', err);
  }
}

// Robust safeAppend: always ensure parent exists and never call parent.appendChild on null
function safeAppend(parent, child, ctx) {
  try {
    if (!child) {
      instrumentLog('safeAppend: missing child', { ctx });
      return parent;
    }
    if (!parent) {
      instrumentLog('safeAppend: parent IS NULL — creating fallback. ctx=', ctx);
      parent = document.createElement('div');
      parent.className = 'posts-fallback-container';
      const main = document.querySelector('main') || document.body;
      main.appendChild(parent);
    }
    if (!(child instanceof Node)) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = String(child);
      parent.appendChild(wrapper);
    } else {
      parent.appendChild(child);
    }
    return parent;
  } catch (err) {
    console.error('[posts][safeAppend][ERROR]', { parent, child, ctx }, err);
    throw err;
  }
}

// Ensure createPostCard never returns null
function createPostCard(post) {
  try {
    const card = document.createElement('article');
    card.className = 'post-card';

    const title = document.createElement('h4');
    title.textContent = post && post.title ? String(post.title) : 'Untitled';
    safeAppend(card, title);

    const meta = document.createElement('div');
    meta.className = 'post-meta';
    const author = document.createElement('span');
    author.textContent = post && post.author ? String(post.author) : 'Anon';
    const date = document.createElement('time');
    if (post && post.timestamp) {
      try {
        const ts = (post.timestamp && post.timestamp.seconds) ? new Date(post.timestamp.seconds * 1000) : new Date(post.timestamp);
        date.textContent = ts.toLocaleString('pl-PL');
      } catch (err) {
        /* eslint-disable-next-line no-console */
        console.debug('posts.js caught error', err);
        date.textContent = '';
      }
    } else {
      date.textContent = '';
    }
    safeAppend(meta, author);
    safeAppend(meta, document.createTextNode(' • '));
    safeAppend(meta, date);
    safeAppend(card, meta);

    const content = document.createElement('div');
    content.className = 'post-content';
    const raw = (post && post.content) ? String(post.content) : '';
    const clean = SafeDOMPurify.sanitize(raw, {
      ALLOWED_TAGS: ['b','i','strong','em','a','p','ul','ol','li','br','img'],
      ALLOWED_ATTR: ['href','src','alt','rel','target','title','class','style']
    });
    content.innerHTML = clean;
    safeAppend(card, content);

    return card;
  } catch (err) {
    console.error('createPostCard error', post, err);
    // fallback simple node so callers get something
    const fallback = document.createElement('div');
    fallback.textContent = 'Invalid post';
    return fallback;
  }
}

// helper: build a stat card similar to the screenshot
function buildSubcategoryCard(categoryName, sub, counts) {
  const card = document.createElement('div');
  card.className = 'forum-card';

  const left = document.createElement('div');
  left.className = 'forum-card-left';

  const iconImg = document.createElement('img');
  iconImg.className = 'forum-icon';

  // Mapowanie nazw podkategorii na dostępne pliki ikon
  const iconMap = {
    'Zapowiedzi modyfikacji': 'icons8-announcement-50.png',
    'Zapowiedzi Modyfikacji': 'icons8-announcement-50.png',
    'Ukończone modyfikacje': 'icons8-check-50.png',
    'Ukończone Modyfikacje': 'icons8-check-50.png',
    'Dyskusje techniczne': 'icons8-automation-64.png',
    'Dyskusje Techniczne': 'icons8-automation-64.png',
    'Poradniki': 'icons8-books-50.png',
    'Pomoc techniczna': 'icons8-automation-64.png'
  };

  let iconFile = iconMap[sub?.name?.trim()] || 'icons8-announcement-50.png';
  iconImg.src = `icons/${iconFile}`;
  iconImg.alt = sub?.name || 'Ikona kategorii';

  left.appendChild(iconImg);
  card.appendChild(left);

  // center: title + subtitle + stats
  const center = document.createElement('div');
  center.className = 'forum-card-center';

  const title = document.createElement('div');
  title.className = 'forum-card-title';
  title.textContent = sub && sub.name ? String(sub.name) : 'Subcategory';
  center.appendChild(title);

  const subtitle = document.createElement('div');
  subtitle.className = 'forum-card-subtitle';
  subtitle.textContent = sub && sub.description ? String(sub.description) : (categoryName || '');
  center.appendChild(subtitle);

  const stats = document.createElement('div');
  stats.className = 'forum-card-stats';
  const threadsCount = typeof sub.threadsCount === 'number' ? sub.threadsCount : 0;
  const repliesCount = typeof sub.repliesCount === 'number' ? sub.repliesCount : 0;
  stats.innerHTML = `<div class="stat-count">${threadsCount} Wątki</div><div class="stat-replies">${repliesCount} Odpowiedzi</div>`;
  center.appendChild(stats);

  card.appendChild(center);

  // right: last thread info
  const right = document.createElement('div');
  right.className = 'forum-card-right';
  if (counts.lastThread) {
    const lt = counts.lastThread;
    const ltTitle = document.createElement('div');
    ltTitle.className = 'forum-card-lasttitle';
    ltTitle.textContent = lt.title || '';
    right.appendChild(ltTitle);

    const ltMeta = document.createElement('div');
    ltMeta.className = 'forum-card-lastmeta';
    const dateStr = lt.timestamp ? (new Date((lt.timestamp.seconds || lt.timestamp) * (lt.timestamp.seconds ? 1000 : 1))).toLocaleDateString('pl-PL') : '';
    ltMeta.textContent = `${dateStr} • ${lt.author || ''}`;
    right.appendChild(ltMeta);
  } else {
    const empty = document.createElement('div');
    empty.className = 'forum-card-lasttitle';
    empty.textContent = 'Brak wątków';
    right.appendChild(empty);
  }
  card.appendChild(right);

  return card;
}

// Move rendering logic into a named function that accepts root and categories
function renderCategoriesAsCards(rootParam, categoriesParam) {
  const wrapper = document.createElement('div');
  wrapper.className = 'categories-wrapper';
  safeAppend(rootParam, wrapper, { path: 'categories-wrapper' });

  categoriesParam.forEach((category, cIdx) => {
    // category header
    const catHeader = document.createElement('h2');
    catHeader.className = 'category-header collapsible';
    catHeader.textContent = category && category.name ? String(category.name) : `Category ${cIdx+1}`;

    // Dodaj przycisk strzałki
    const arrow = document.createElement('span');
    arrow.className = 'arrow';
    arrow.textContent = '▼';
    catHeader.appendChild(arrow);

    safeAppend(wrapper, catHeader, { path: `categories[${cIdx}].header` });

    // kontener na karty podkategorii
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'cards-container';
    safeAppend(wrapper, cardsContainer, { path: `categories[${cIdx}].cardsContainer` });

    // domyślnie schowane poza pierwszą kategorią
    if (cIdx > 0) {
      cardsContainer.classList.add('collapsed');
      arrow.classList.add('collapsed');
      arrow.textContent = '►';
    }

    // obsługa kliknięcia nagłówka
    catHeader.addEventListener('click', () => {
      const isCollapsed = cardsContainer.classList.contains('collapsed');
      if (isCollapsed) {
        cardsContainer.classList.remove('collapsed');
        arrow.textContent = '▼';
        arrow.classList.remove('collapsed');
      } else {
        cardsContainer.classList.add('collapsed');
        arrow.textContent = '►';
        arrow.classList.add('collapsed');
      }
    });

    const subcats = Array.isArray(category.subcategories) ? category.subcategories : [];
    subcats.forEach((sub, sIdx) => {
      // ...tworzenie kart podkategorii...
      const card = buildSubcategoryCard(category.name, sub, sub);
      safeAppend(cardsContainer, card, { path: `categories[${cIdx}].subcategories[${sIdx}]` });
    });
  });
}

// Robust renderStructured that uses safeAppend everywhere and logs issues
function renderStructured(root, data) {
  try {
    instrumentLog('renderStructured start', { rootExists: !!root, dataShape: Array.isArray(data) ? `array(${data.length})` : Object.keys(data||{}) });
    if (!root) {
      instrumentLog('renderStructured: root is null — creating fallback root', null);
      root = document.createElement('div');
      root.id = 'posts-container';
      (document.querySelector('main') || document.body).appendChild(root);
    }
    root.innerHTML = '';

    // flat array of posts
    if (Array.isArray(data) && data.length && (data[0] && (data[0].title !== undefined || data[0].content !== undefined))) {
      data.forEach((p, idx) => {
        instrumentLog('renderStructured: appending flat post', { idx, title: p && p.title });
        safeAppend(root, createPostCard(p), { path: `flat[${idx}]` });
      });
      return;
    }

    // build categories array (from structured response or flat)
    const categories = (data && Array.isArray(data.categories)) ? data.categories : (Array.isArray(data) ? data : []);
    instrumentLog('renderStructured: categories count', { count: categories.length });

    if (categories.length) {
      // use the named function here (no undefined root/data issues)
      renderCategoriesAsCards(root, categories);
      return;
    }

    // fallback: try render raw array/object as flat posts
    instrumentLog('renderStructured: no categories found, attempting to render raw array or object', data);
    if (Array.isArray(data)) {
      data.forEach(p => safeAppend(root, createPostCard(p)));
    }
  } catch (err) {
    console.error('[posts][renderStructured][ERROR] data shape:', data, err);
    throw err;
  }
}

// rozszerzona lista selektorów, usuwa lub ukrywa typowe statyczne bloki
function hidePlaceholders() {
  const selectors = [
    '.placeholder', '.forum-placeholder', '#placeholder-posts',
    '.static-categories', '#static-categories', '.static-category-list',
    '.forum-static-list', '#forum-list'
  ];
  selectors.forEach(s => {
    document.querySelectorAll(s).forEach(n => {
      
      try {
        n.dataset._wasPlaceholder = '1';
        
        if (n.parentNode) n.parentNode.removeChild(n);
        else n.style.display = 'none';
      } catch {
        
        try { n.style.display = 'none'; } catch { /* intentionally empty */ }
      }
    });
  });
}


async function loadAndRenderPosts() {
  console.log('loadAndRenderPosts start');
  
  try { hidePlaceholders(); } catch (err) { console.warn('hidePlaceholders failed', err); }

  const containerId = 'posts-container';
  let root = document.getElementById(containerId);

  if (!root) {
    root = document.createElement('div');
    root.id = containerId;
    const main = document.querySelector('main') || document.body;
    main.insertBefore(root, main.firstChild);
  }

  try {
    const data = await fetchPosts();
    console.log('[posts] fetched shape:', Array.isArray(data) ? `array(${data.length})` : Object.keys(data || {}));
    renderStructured(root, data);
  } catch (err) {
    console.error('Failed to load posts:', err);
    const demo = [{ title: 'Demo post', author: 'System', timestamp: Date.now(), content: '<p>Demo content</p>' }];
    renderStructured(root, demo);
  }
}

document.addEventListener('DOMContentLoaded', loadAndRenderPosts);

function normalizeName(name) {
  return (name || '').toLowerCase().replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o').replace(/ś/g, 's')
    .replace(/ż/g, 'z').replace(/ź/g, 'z').replace(/\s+/g, '');
}

// Expose normalizeName for external usage (and reference it so linters don't flag it as unused)
if (typeof window !== 'undefined') {
  try {
    window.normalizeName = normalizeName;
  } catch {
    /* ignore errors in non-browser or restricted contexts */
  }
}