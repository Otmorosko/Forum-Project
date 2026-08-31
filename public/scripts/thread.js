function getPostIdFromUrl() {
  const url = new URL(window.location.href);
  return url.searchParams.get('id');
}

function getFallbackQueryFromUrl() {
  const url = new URL(window.location.href);
  return {
    title: url.searchParams.get('title') || '',
    author: url.searchParams.get('author') || '',
    ts: url.searchParams.get('ts') || '',
  };
}

function formatTimestamp(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('pl-PL');
}

async function loadThread() {
  const titleEl = document.querySelector('.thread-title');
  const metaEl = document.getElementById('threadMeta');
  const contentEl = document.getElementById('threadContent');

  const id = getPostIdFromUrl();
  const fallback = getFallbackQueryFromUrl();

  try {
    let post = null;

    if (id) {
      const res = await fetch(`/api/posts/${encodeURIComponent(id)}`, { cache: 'no-store' });
      if (res.ok) {
        post = await res.json();
      }
    }

    // Fallback dla starszych linków bez id
    if (!post && (fallback.title || fallback.author || fallback.ts)) {
      const listRes = await fetch('/api/posts', { cache: 'no-store' });
      if (!listRes.ok) {
        throw new Error(`HTTP ${listRes.status}`);
      }
      const posts = await listRes.json();
      post = posts.find((p) =>
        String(p.title || '') === fallback.title &&
        String(p.author || '') === fallback.author &&
        String(p.timestamp || '') === fallback.ts
      );
    }

    if (!post) {
      throw new Error('Post not found');
    }
    titleEl.textContent = post.title || 'Bez tytułu';
    metaEl.textContent = `${formatTimestamp(post.timestamp)} • ${post.author || 'Anonim'}`;

    // Treść jest sanityzowana po stronie backendu przed zapisem
    contentEl.innerHTML = post.content || '';
  } catch (error) {
    titleEl.textContent = 'Nie udało się załadować wątku';
    metaEl.textContent = '';
    contentEl.textContent = 'Spróbuj ponownie później.';
    console.error('Thread load error:', error);
  }
}

document.addEventListener('DOMContentLoaded', loadThread);
