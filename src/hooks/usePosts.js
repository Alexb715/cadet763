import { useEffect, useState } from 'react';
import { fetchPosts } from '../api/posts.js';
import { POSTS as MOCK_POSTS } from '../data.js';

// Loads news posts from the backend (GET /api/posts, which is fed by the
// Facebook poller). Initialises with the bundled sample posts so the section
// is never empty on first paint, and keeps them as a fallback when the backend
// is unreachable or has no posts yet (e.g. before FB_PAGE_TOKEN is configured).
export function usePosts() {
  const [posts, setPosts] = useState(MOCK_POSTS);
  const [loading, setLoading] = useState(true);
  // 'mock' until a non-empty backend response replaces it.
  const [source, setSource] = useState('mock');

  useEffect(() => {
    let alive = true;
    fetchPosts()
      .then((list) => {
        if (!alive) return;
        if (Array.isArray(list) && list.length) {
          setPosts(list);
          setSource('backend');
        }
      })
      .catch(() => { /* keep sample posts on error */ })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  return { posts, loading, source };
}
