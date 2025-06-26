// raindrop-digest.js — modern layout with favicons and editorial styling
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

const getFavicon = (link) => {
  const { hostname } = new URL(link);
  return `https://www.google.com/s2/favicons?sz=32&domain=${hostname}`;
};

const buildHTML = async (items) => {
  const head = `
    <style>
      :root {
        color-scheme: light dark;
        --bg: #ffffff;
        --text: #1c1c1e;
        --subtext: #555;
        --link: #0a84ff;
      }

      @media (prefers-color-scheme: dark) {
        :root {
          --bg: #1c1c1e;
          --text: #f5f5f7;
          --subtext: #999;
          --link: #4da8ff;
        }
      }

      body {
        margin: 0;
        padding: 2rem;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 16px;
        background: var(--bg);
        color: var(--text);
      }

      .container {
        max-width: 600px;
        margin: 0 auto;
      }

      h2 { font-family: 'New York', Georgia, serif;
        font-size: 26px;
        font-weight: 500;
        margin-bottom: 1.5rem;
      }

      .card {
        margin-bottom: 2.5rem;
      }

      .card img.preview {
        max-width: 100%;
        border-radius: 8px;
        margin-bottom: 0.75rem;
      }

      .card a {
        font-weight: 600;
        font-size: 17px;
        color: var(--link);
        text-decoration: none;
      }

      .excerpt {
        font-size: 15px;
        margin-top: 0.3rem;
      }

      blockquote.summary {
        font-size: 14px;
        font-style: italic;
        color: var(--subtext);
        margin-top: 0.5rem;
        margin-bottom: 0.5rem;
        border-left: 3px solid var(--subtext);
        padding-left: 1em;
      }

      .meta {
        font-size: 13px;
        color: var(--subtext);
        margin-top: 0.4rem;
      }

      .tags {
        margin-top: 0.4rem;
      }

      .tags span {
        background: #333;
        color: #bbb;
        font-size: 12px;
        border-radius: 4px;
        padding: 2px 6px;
        margin-right: 5px;
      }

      hr {
        border: none;
        border-top: 1px solid var(--subtext);
        margin: 2rem 0;
      }
    </style>
  `;

  const body = await Promise.all(items.map(async (item, index) => {
    const url = new URL(item.link);
    const domain = url.hostname.replace(/^www\./, '');
    const title = item.title || item.link;
    const excerpt = item.excerpt || '';
    const date = new Date(item.created).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const readTime = excerpt ? estimateReadTime(excerpt) : '';
    const tags = item.tags?.length ? item.tags.map(tag => `<span>${tag}</span>`).join('') : '';
    const image = item.cover || (item.media && item.media[0]?.link);
    const summary = await summarize(item);
    const favicon = getFavicon(item.link);

    return `
      <div class="card">
        ${image ? `<img src="${image}" alt="" class="preview" />` : ''}
        <a href="${item.link}">${title}</a>
        ${excerpt ? `<div class="excerpt">${excerpt}</div>` : ''}
        ${summary ? `<blockquote class="summary">${summary}</blockquote>` : ''}
        <div class="meta">
          <img src="${favicon}" style="width:16px;height:16px;vertical-align:middle;margin-right:6px;"/>
          ${domain} · Saved on ${date}${readTime ? ` · ${readTime}` : ''}
        </div>
        ${tags ? `<div class="tags">${tags}</div>` : ''}
      </div>
      ${index < items.length - 1 ? '<hr />' : ''}
    `;
  }));

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${head}
      </head>
      <body>
        <div class="container">
          <h2>Your Read Later Digest</h2>
          ${body.join('')}
        </div>
      </body>
    </html>
  `;
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
