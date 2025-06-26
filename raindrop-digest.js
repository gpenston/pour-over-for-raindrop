// raindrop-digest.js with GPT summaries saved to Raindrop notes
import axios from 'axios';
import nodemailer from 'nodemailer';
import dayjs from 'dayjs';

const {
  RAINDROP_TOKEN,
  COLLECTION_ID,
  SMTP_USER,
  SMTP_PASS,
  TO_EMAIL,
  FROM_EMAIL,
  OPENAI_API_KEY
} = process.env;

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

  const shuffled = older.sort(() => 0.5 - Math.random());
  const randomOlder = shuffled.slice(0, 2);

  return [...recent, ...randomOlder];
};

const estimateReadTime = (text) => {
  const words = text.split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return minutes <= 1 ? '1 min read' : `${minutes} min read`;
};

const summarize = async (item) => {
  const title = item.title;
  const excerpt = item.excerpt;
  const id = item._id;

  if (!OPENAI_API_KEY || !excerpt) return null;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes articles in 1–2 sentences for a weekly email digest.'
          },
          {
            role: 'user',
            content: `Title: ${title}\nExcerpt: ${excerpt}`
          }
        ],
        max_tokens: 80,
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const summary = response.data.choices[0].message.content.trim();
    const noteUpdate = `—— AI Summary ——\n${summary}`;

    await axios.put(
      `https://api.raindrop.io/rest/v1/raindrop/${id}`,
      { note: noteUpdate },
      {
        headers: {
          Authorization: `Bearer ${RAINDROP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return summary;
  } catch (err) {
    console.error(`Error summarizing or updating Raindrop for ID ${id}:`, err.message);
    return null;
  }
};

const buildHTML = async (items) => {
  if (!items.length) return '<p>No new Read Later items this week.</p>';

  const htmlBlocks = await Promise.all(items.map(async (item) => {
    const url = new URL(item.link);
    const domain = url.hostname.replace(/^www\./, '');
    const title = item.title || item.link;
    const excerpt = item.excerpt || '';
    const date = new Date(item.created).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const readTime = excerpt ? estimateReadTime(excerpt) : '';
    const tags = item.tags?.length ? item.tags.map(tag => `<span style="background:#ddd;border-radius:4px;padding:2px 6px;margin-right:5px;font-size:12px;color:#444;">${tag}</span>`).join('') : '';
    const image = item.cover || (item.media && item.media[0]?.link);
    const summary = await summarize(item);

    return `
      <div style="margin-bottom: 2em;">
        ${image ? `<img src="${image}" alt="" style="max-width:100%;border-radius:8px;margin-bottom:0.75em;" />` : ''}
        <a href="${item.link}" style="font-size: 17px; font-weight: 600; color: #0077cc; text-decoration: none;">${title}</a>
        <div style="font-size: 14px; color: var(--text-color); margin-top: 0.3em;">${excerpt}</div>
        ${summary ? `<div style="font-size: 13px; color: var(--text-color); margin-top: 0.5em; font-style: italic;">Summary: ${summary}</div>` : ''}
        <div style="font-size: 12px; color: var(--subtext-color); margin-top: 0.4em;">${domain} · Saved on ${date}${readTime ? ` · ${readTime}` : ''}</div>
        ${tags ? `<div style="margin-top: 0.4em;">${tags}</div>` : ''}
      </div>`;
  }));

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 1em; line-height: 1.6; background: var(--bg-color); color: var(--text-color);">
      <style>
        @media (prefers-color-scheme: dark) {
          :root {
            --bg-color: #1c1c1e;
            --text-color: #f5f5f7;
            --subtext-color: #a1a1aa;
          }
        }
        @media (prefers-color-scheme: light) {
          :root {
            --bg-color: #ffffff;
            --text-color: #1c1c1e;
            --subtext-color: #555;
          }
        }
      </style>
      <h2>Your Read Later Digest</h2>
      ${htmlBlocks.join('')}
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
    const html = await buildHTML(items);
    const subject = `Your Read Later Digest: ${dayjs().subtract(7, 'day').format('MMM D')} – ${dayjs().format('MMM D')}`;
    await sendEmail(html, subject);
    console.log('Digest sent successfully.');
  } catch (err) {
    console.error('Error sending digest:', err);
    process.exit(1);
  }
};

main();
