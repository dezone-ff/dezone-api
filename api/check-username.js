module.exports = async function handler(req, res) {
  // Allow your app to call this from the browser
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Username required' });

  const results = {};

  // --- GitHub (official free API) ---
  try {
    const gh = await fetch(`https://api.github.com/users/${username}`);
    if (gh.status === 404) {
      results.github = { status: 'available' };
    } else if (gh.ok) {
      const data = await gh.json();
      results.github = { status: 'taken', verified: data.site_admin || false };
    } else {
      results.github = { status: 'error' };
    }
  } catch (e) {
    results.github = { status: 'error' };
  }

  // --- Reddit (public JSON endpoint) ---
  try {
    const rd = await fetch(`https://www.reddit.com/user/${username}/about.json`, {
      headers: { 'User-Agent': 'DEZONE-Verifier/1.0' }
    });
    if (rd.status === 404) {
      results.reddit = { status: 'available' };
    } else if (rd.ok) {
      results.reddit = { status: 'taken' };
    } else {
      results.reddit = { status: 'error' };
    }
  } catch (e) {
    results.reddit = { status: 'error' };
  }

  // --- TikTok (free community API - no key needed) ---
  try {
    const tk = await fetch(`https://tiktok-user-info-api.onrender.com/api/user/${username}`);
    const data = await tk.json();
    if (data.status === 'success') {
      results.tiktok = { 
        status: 'taken', 
        verified: data.data.verified || false,
        nickname: data.data.nickname || username
      };
    } else {
      results.tiktok = { status: 'available' };
    }
  } catch (e) {
    results.tiktok = { status: 'error' };
  }

  // --- Twitter/X (best-effort, no free API) ---
  results.twitter = { status: 'unavailable', note: 'Free API not available' };

  // --- Instagram (best-effort, no free API) ---
  results.instagram = { status: 'unavailable', note: 'Free API not available' };

  res.status(200).json({ username, results });
};