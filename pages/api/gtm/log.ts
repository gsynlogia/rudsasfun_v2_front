import fs from 'fs';
import path from 'path';

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;
    const reservationNumber = payload?.data?.reservationNumber || 'pending';
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');

    const baseDir = path.join(process.cwd(), 'tests_scripts', 'gtm', datePart);
    await fs.promises.mkdir(baseDir, { recursive: true });
    const filePath = path.join(baseDir, `${reservationNumber}.txt`);

    const existing = fs.existsSync(filePath) ? await fs.promises.readFile(filePath, 'utf-8') : '';
    const appendData = (existing ? `${existing}\n` : '') + JSON.stringify(payload);
    await fs.promises.writeFile(filePath, appendData, 'utf-8');

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('GTM log error:', error);
    return res.status(500).json({ error: 'Failed to log GTM event' });
  }
}