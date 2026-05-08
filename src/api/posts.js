import { api, USE_BACKEND } from './client.js';
import { POSTS as MOCK_POSTS } from '../data.js';

// Real Facebook integration needs a backend with a Page Access Token —
// the browser cannot call the Meta Graph API directly without leaking secrets.
// Backend should expose GET /api/posts that proxies and caches Graph responses.

export async function fetchPosts() {
  if (USE_BACKEND) {
    return api('/posts');
  }
  return MOCK_POSTS;
}
