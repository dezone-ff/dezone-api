const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function checkGitHub(u) {
  try {
    const r = await fetch(`https://api.github.com/users/${encodeURIComponent(u)}`, {
      headers: { 'User-Agent': UA, Accept: 'application/vnd.github+json' }
    });
    if (r.status === 404) return { status: 'available' };
    if (r.status === 403) return { status: 'unavailable', note: 'Rate limited' };
    if (r.status === 200) {
      const d = await r.json();
      return { status: 'taken', nickname: d.name || d.login, verified: false };
    }
    return { status: 'error' };
  } catch (e) { return { status: 'error', note: e.message }; }
}

async function checkReddit(u) {
  try {
    const r = await fetch(`https://www.reddit.com/user/${encodeURIComponent(u)}/about.json`, {
      headers: { 'User-Agent': 'dezone-ff-tools/1.0' }
    });
    if (r.status === 404) return { status: 'available' };
    if (r.status === 200) {
      const d = await r.json();
      const data = d && d.data;
      if (!data || !data.name) return { status: 'available' };
      if (data.is_suspended) return { status: 'taken', note: 'Suspended' };
      return {
        status: 'taken',
        nickname: (data.subreddit && data.subreddit.title) || data.name,
        verified: !!data.verified
      };
    }
    return { status: 'unavailable', note: 'Blocked by Reddit' };
  } catch (e) { return { status: 'unavailable', note: 'Blocked' }; }
}

async function checkTikTok(u) {
  try {
    const r = await fetch(`https://www.tiktok.com/@${encodeURIComponent(u)}`, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
      redirect: 'follow'
    });
    if (r.status === 404) return { status: 'available' };
    const html = await r.text();
    if (html.includes('"statusCode":10221') || html.includes("Couldn't find this account")) {
      return { status: 'available' };
    }
    const verified = /"verified":true/.test(html);
    const m = html.match(/"nickname":"([^"]+)"/);
    return { status: 'taken', nickname: m ? m[1] : null, verified };
  } catch (e) { return { status: 'unavailable', note: 'Blocked by TikTok' }; }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const username = (req.query.username || '').toString().trim().replace(/^@/, '');

  if (!username) return res.status(400).json({ error: 'No username provided' });
  if (!/^[a-zA-Z0-9._-]{1,30}$/.test(username)) {
    return res.status(400).json({ error: 'Invalid username format' });
  }

  const [github, reddit, tiktok] = await Promise.all([
    checkGitHub(username),
    checkReddit(username),
    checkTikTok(username)
  ]);

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  return res.status(200).json({
    username,
    results: { GitHub: github, TikTok: tiktok, Reddit: reddit }
  });
};
