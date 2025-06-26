// raindrop-digest.js (enhanced version)
import axios from 'axios';
import nodemailer from 'nodemailer';
import dayjs from 'dayjs';

const {
  RAINDROP_TOKEN,
  COLLECTION_ID,
  ARCHIVE_COLLECTION_ID,
  SMTP_USER,
  SMTP_PASS,
  TO_EMAIL,
  FROM_EMAIL,
  GH_PAT,
} = process.env;

const GITHUB_WEBHOOK_URL = 'https://api.github.com/repos/gpenston/raindrop-digest/dispatches';
const WEBHOOK_SECRET = 'digest123'; // feel free to change this

const fetchBookmarks = async () => {
  const res = await axios.get(
    `https://api.raindrop.io/rest/v1/raindrops/${COLLECTION_ID}`,
    {
      headers: {
        Authorization: `Bearer ${RAINDROP_TOKEN}`,
      },
      params: {
        perpage: 100,
        sort: '-created',
      },
    }
  );

  const recent = [];
  const older = [];
  const cutoff = dayjs().subtract(7, 'day');

  for (const item of res.data.items) {
    const created = dayjs(item.created);
    if (created.isAfter(cutoff) && recent.length < 5) {
      recent.push(item);
    } else {
      older.push(item);
    }
  }

  // pick 2 random older items
  const shuffled = older.sort(() => 0.5 - Math.random());
  const randomOlder = shuffled.slice(0, 2);

  return [...recent, ...randomOlder];
};

const estimateReadTime = (text) => {
  const words = text.split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return minutes <= 1 ? '1 min read' : `${minutes} min read`;
};

const buildHTML = (items) => {
  if (!items.length) return '<p>No new Read Later items this week.</p>';

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 1em; line-height: 1.6;">
      <h2>Your Read Later Digest</h2>
      ${items.map(item => {
        const url = new URL(item.link);
        const domain = url.hostname.replace(/^www\./, '');
        const title = item.title || item.link;
        const excerpt = item.excerpt || '';
        const date = new Date(item.created).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const readTime = excerpt ? estimateReadTime(excerpt) : '';
        const tags = item.tags?.length ? item.tags.map(tag => `<span style="background:#eee;border-radius:4px;padding:2px 6px;margin-right:5px;font-size:12px;color:#555;">${tag}</span>`).join('') : '';
        const image = item.cover || (item.media && item.media[0]?.link);
        const markReadLink = `https://api.github.com/repos/gpenston/raindrop-digest/dispatches`;
        const payload = JSON.stringify({
          event_type: 'mark_as_read',
          client_payload: {
            raindrop_id: item._id,
            token: WEBHOOK_SECRET
          }
        });

        return `
          <div style="margin-bottom: 2em;">
            ${image ? `<img src="${image}" alt="" style="max-width:100%;border-radius:8px;margin-bottom:0.75em;" />` : ''}
            <a href="${item.link}" style="font-size: 17px; font-weight: 600; color: #0077cc; text-decoration: none;">${title}</a>
            <div style="font-size: 14px; color: #444; margin-top: 0.3em;">${excerpt}</div>
            <div style="font-size: 12px; color: #888; margin-top: 0.4em;">${domain} · Saved on ${date}${readTime ? ` · ${readTime}` : ''}</div>
            ${tags ? `<div style="margin-top: 0.4em;">${tags}</div>` : ''}
            <form action="${markReadLink}" method="POST">
              <input type="hidden" name="payload" value='${payload.replace(/'/g, '&apos;')}' />
              <button type="submit" style="margin-top:8px;font-size:12px;padding:4px 8px;background:#eee;border:none;border-radius:4px;color:#333;cursor:pointer;">Mark as Read</button>
            </form>
          </div>`;
      }).join('')}
    </div>`;
};

const sendEmail = async (html, subject) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.mail.me.com',
    port: 587,
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { ciphers: 'SSLv3' },
  });

  await transporter.sendMail({ from: FROM_EMAIL, to: TO_EMAIL, subject, html });
};

const main = async () => {
  try {
    const items = await fetchBookmarks();
    const html = buildHTML(items);
    const subject = `Your Read Later Digest: ${dayjs().subtract(7, 'day').format('MMM D')} – ${dayjs().format('MMM D')}`;
    await sendEmail(html, subject);
    console.log('Digest sent successfully.');
  } catch (err) {
    console.error('Error sending digest:', err);
    process.exit(1);
  }
};

main();
