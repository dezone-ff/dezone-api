import { FreeFireAPI } from 'ffapis';

export default async function handler(req, res) {
  const { uid } = req.query;
  if (!uid) return res.status(400).json({ error: 'UID required' });

  try {
    const api = new FreeFireAPI();
    const profile = await api.getPlayerProfile(uid);
    res.status(200).json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch player', details: error.message });
  }
}