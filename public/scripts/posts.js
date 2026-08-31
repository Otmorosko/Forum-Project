/* eslint-env browser */
/* global DOMPurify */

const SafeDOMPurify = (typeof DOMPurify !== 'undefined' && DOMPurify)
  || (typeof window !== 'undefined' && window.DOMPurify)
  || {
    sanitize: (s) => String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;')
  };

function isPostsListPage() {
  const p = window.location.pathname.toLowerCase();
  return p.endsWith('/posts.html') || p.endsWith('posts.html');
}

function normalizeName(name) {
  return (name || '').toLowerCase().replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o').replace(/ś/g, 's')
    .replace(/ż/g, 'z').replace(/ź/g, 'z').replace(/\s+/g, '');
}

function parseDate(ts) {
  if (!ts) return null;
  if (typeof ts === 'string' || typeof ts === 'number') {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (ts.seconds) {
    const d = new Date(ts.seconds * 1000);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

async function fetchStructuredPosts() {
  const res = await fetch('/api/posts-structured', { cache: 'no-store' });
  if (res.ok) return await res.json();

  const fallback = await fetch('data/categories.json', { cache: 'no-store' });
  if (fallback.ok) return await fallback.json();

  throw new Error('Could not load structured posts');
}

async function fetchFlatPosts() {
  const res = await fetch('/api/posts', { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

function getFiltersFromUrl() {
  const url = new URL(window.location.href);
  const categoryIdRaw = url.searchParams.get('categoryId');
  const subcategoryIdRaw = url.searchParams.get('subcategoryId');
  return {
    category: url.searchParams.get('category') || '',
    subcategory: url.searchParams.get('subcategory') || '',
    categoryId: categoryIdRaw !== null && categoryIdRaw !== '' ? String(categoryIdRaw) : '',
    subcategoryId: subcategoryIdRaw !== null && subcategoryIdRaw !== '' ? String(subcategoryIdRaw) : '',
  };
}

async function resolveFilterIds(filters) {
  const resolved = { ...filters };

  // Resolve categoryId from category name when missing
  if (!resolved.categoryId && resolved.category) {
    try {
      const res = await fetch('/api/categories', { cache: 'no-store' });
      if (res.ok) {
        const categories = await res.json();
        const match = categories.find((c) => normalizeName(c.name) === normalizeName(resolved.category));
        if (match && match.id !== undefined && match.id !== null) {
          resolved.categoryId = String(match.id);
        }
      }
    } catch {
      // ignore and keep name-based filtering
    }
  }

  // Resolve subcategoryId from subcategory name when missing
  if (!resolved.subcategoryId && resolved.subcategory && resolved.categoryId !== '') {
    try {
      const subRes = await fetch(`/api/subcategories?categoryId=${encodeURIComponent(resolved.categoryId)}`, { cache: 'no-store' });
      if (subRes.ok) {
        const subcategories = await subRes.json();
        const subMatch = subcategories.find((s) => normalizeName(s.name) === normalizeName(resolved.subcategory));
        if (subMatch && subMatch.id !== undefined && subMatch.id !== null) {
          resolved.subcategoryId = String(subMatch.id);
        }
      }
    } catch {
      // ignore and keep name-based filtering
    }
  }

  return resolved;
}

function safeAppend(parent, child) {
  if (!parent || !child) return;
  parent.appendChild(child);
}

function buildThreadLink(post) {
  if (post && post.id) {
    return `thread.html?id=${encodeURIComponent(post.id)}`;
  }
  const qTitle = encodeURIComponent(post?.title || '');
  const qAuthor = encodeURIComponent(post?.author || '');
  const qTs = encodeURIComponent(post?.timestamp || '');
  return `thread.html?title=${qTitle}&author=${qAuthor}&ts=${qTs}`;
}

function createPostCard(post) {
  const card = document.createElement('article');
  card.className = 'post-card';

  const title = document.createElement('h4');
  title.className = 'post-title';
  const link = document.createElement('a');
  link.href = buildThreadLink(post);
  link.textContent = post?.title ? String(post.title) : 'Bez tytułu';
  title.appendChild(link);
  safeAppend(card, title);

  const meta = document.createElement('div');
  meta.className = 'post-meta';
  const d = parseDate(post?.timestamp);
  meta.textContent = `${post?.author || 'Anonim'}${d ? ` • ${d.toLocaleString('pl-PL')}` : ''}`;
  safeAppend(card, meta);

  const content = document.createElement('div');
  content.className = 'post-content';
  const clean = SafeDOMPurify.sanitize(String(post?.content || ''), {
    ALLOWED_TAGS: ['b', 'i', 'strong', 'em', 'a', 'p', 'ul', 'ol', 'li', 'br', 'img'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'rel', 'target', 'title', 'class', 'style']
  });
  content.innerHTML = clean;
  safeAppend(card, content);

  return card;
}

function buildSubcategoryCard(category, sub) {
  const categoryName = category?.name || '';
  const categoryId = category?.id !== undefined && category?.id !== null ? String(category.id) : '';
  const subcategoryId = sub?.id !== undefined && sub?.id !== null ? String(sub.id) : '';

  const card = document.createElement('div');
  card.className = 'forum-card';

  const left = document.createElement('div');
  left.className = 'forum-card-left';
  const iconImg = document.createElement('img');
  iconImg.className = 'forum-icon';
  iconImg.src = `icons/${sub?.icon || 'icons8-announcement-50.png'}`;
  iconImg.alt = sub?.name || 'Ikona kategorii';
  left.appendChild(iconImg);
  card.appendChild(left);

  const center = document.createElement('div');
  center.className = 'forum-card-center';

  const title = document.createElement('div');
  title.className = 'forum-card-title';
  const tLink = document.createElement('a');
  const params = new URLSearchParams({
    category: categoryName,
    subcategory: sub?.name || '',
  });
  if (categoryId !== '') params.set('categoryId', categoryId);
  if (subcategoryId !== '') params.set('subcategoryId', subcategoryId);
  tLink.href = `posts.html?${params.toString()}`;
  tLink.textContent = sub?.name || 'Subcategory';
  tLink.style.color = 'inherit';
  tLink.style.textDecoration = 'none';
  title.appendChild(tLink);
  center.appendChild(title);

  const subtitle = document.createElement('div');
  subtitle.className = 'forum-card-subtitle';
  subtitle.textContent = categoryName || '';
  center.appendChild(subtitle);

  const stats = document.createElement('div');
  stats.className = 'forum-card-stats';
  stats.innerHTML = `<div class="stat-count">${sub?.threadsCount || 0} Wątki</div><div class="stat-replies">${sub?.repliesCount || 0} Odpowiedzi</div>`;
  center.appendChild(stats);
  card.appendChild(center);

  const right = document.createElement('div');
  right.className = 'forum-card-right';
  if (sub?.lastThread) {
    const ltTitle = document.createElement('div');
    ltTitle.className = 'forum-card-lasttitle';
    const ltLink = document.createElement('a');
    ltLink.href = buildThreadLink(sub.lastThread);
    ltLink.textContent = sub.lastThread.title || 'Zobacz wątek';
    ltLink.style.color = 'inherit';
    ltLink.style.textDecoration = 'none';
    ltTitle.appendChild(ltLink);
    right.appendChild(ltTitle);

    const ltMeta = document.createElement('div');
    ltMeta.className = 'forum-card-lastmeta';
    const d = parseDate(sub.lastThread.timestamp);
    ltMeta.textContent = `${d ? d.toLocaleDateString('pl-PL') : ''} • ${sub.lastThread.author || ''}`;
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

function renderCategories(root, categories) {
  root.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'categories-wrapper';
  safeAppend(root, wrapper);

  categories.forEach((category, cIdx) => {
    const catHeader = document.createElement('h2');
    catHeader.className = 'category-header collapsible';
    catHeader.textContent = category?.name || `Category ${cIdx + 1}`;

    const arrow = document.createElement('span');
    arrow.className = 'arrow';
    arrow.textContent = '▼';
    catHeader.appendChild(arrow);
    safeAppend(wrapper, catHeader);

    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'cards-container';
    safeAppend(wrapper, cardsContainer);

    if (cIdx > 0) {
      cardsContainer.classList.add('collapsed');
      arrow.classList.add('collapsed');
      arrow.textContent = '►';
    }

    catHeader.addEventListener('click', () => {
      const isCollapsed = cardsContainer.classList.contains('collapsed');
      cardsContainer.classList.toggle('collapsed', !isCollapsed);
      arrow.classList.toggle('collapsed', !isCollapsed);
      arrow.textContent = isCollapsed ? '▼' : '►';
    });

    const subcats = Array.isArray(category?.subcategories) ? category.subcategories : [];
    subcats.forEach((sub) => safeAppend(cardsContainer, buildSubcategoryCard(category, sub)));
  });
}

function setPostsTitle(filters) {
  const h1 = document.getElementById('postsPageTitle');
  if (!h1) return;
  if (filters.category && filters.subcategory) {
    h1.textContent = `Wątki: ${filters.category} / ${filters.subcategory}`;
  } else if (filters.category) {
    h1.textContent = `Wątki: ${filters.category}`;
  } else {
    h1.textContent = 'Lista Postów';
  }
}

function filterPosts(posts, filters) {
  return posts.filter((p) => {
    const postCategory = String(p?.category ?? '');
    const postSubcategory = String(p?.subcategory ?? '');

    const categoryByName = filters.category && normalizeName(postCategory) === normalizeName(filters.category);
    const categoryById = filters.categoryId !== '' && postCategory === filters.categoryId;
    const categoryOk = (!filters.category && filters.categoryId === '') || categoryByName || categoryById;

    const subcategoryByName = filters.subcategory && normalizeName(postSubcategory) === normalizeName(filters.subcategory);
    const subcategoryById = filters.subcategoryId !== '' && postSubcategory === filters.subcategoryId;
    const subcategoryOk = (!filters.subcategory && filters.subcategoryId === '') || subcategoryByName || subcategoryById;

    return categoryOk && subcategoryOk;
  });
}

function renderFlatList(root, posts) {
  root.innerHTML = '';
  if (!posts.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Brak postów do wyświetlenia.';
    safeAppend(root, empty);
    return;
  }
  posts.forEach((post) => safeAppend(root, createPostCard(post)));
}

async function loadAndRenderPosts() {
  let root = document.getElementById('posts-container');
  if (!root) {
    root = document.createElement('div');
    root.id = 'posts-container';
    (document.querySelector('main') || document.body).appendChild(root);
  }

  try {
    if (isPostsListPage()) {
      const rawFilters = getFiltersFromUrl();
      const filters = await resolveFilterIds(rawFilters);
      setPostsTitle(filters);
      const posts = await fetchFlatPosts();
      renderFlatList(root, filterPosts(posts, filters));
      return;
    }

    const structured = await fetchStructuredPosts();
    const categories = Array.isArray(structured?.categories) ? structured.categories : (Array.isArray(structured) ? structured : []);
    renderCategories(root, categories);
  } catch (error) {
    console.error('Failed to load posts:', error);
    root.innerHTML = '<p>Nie udało się załadować danych.</p>';
  }
}

document.addEventListener('DOMContentLoaded', loadAndRenderPosts);