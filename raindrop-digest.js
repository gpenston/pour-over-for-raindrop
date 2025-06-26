import axios from 'axios';
import nodemailer from 'nodemailer';
import dayjs from 'dayjs';
import dotenv from 'dotenv';
dotenv.config();

const RAINDROP_TOKEN = process.env.RAINDROP_TOKEN;
const COLLECTION_ID = process.env.COLLECTION_ID;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const TO_EMAIL = process.env.TO_EMAIL;
const FROM_EMAIL = process.env.FROM_EMAIL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const getRaindropItems = async () => {
  const response = await axios.get(
    `https://api.raindrop.io/rest/v1/raindrops/${COLLECTION_ID}`,
    {
      headers: {
        Authorization: `Bearer ${RAINDROP_TOKEN}`,
      },
    }
  );

  const items = response.data.items;

  // Fetch each item's full metadata including notes
  const enrichedItems = await Promise.all(
    items.map(async (item) => {
      try {
        const itemResponse = await axios.get(
          `https://api.raindrop.io/rest/v1/raindrop/${item._id}`,
          {
            headers: {
              Authorization: `Bearer ${RAINDROP_TOKEN}`,
            },
          }
        );
        return {
          ...item,
          note: itemResponse.data.item.note || '',
        };
      } catch (e) {
        return {
          ...item,
          note: '',
        };
      }
    })
  );

  return enrichedItems;
};

const summarize = async (text) => {
  if (!text || !OPENAI_API_KEY) return null;
  try {
    const completion = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Summarize the following article excerpt in 1-2 sentences:',
          },
          { role: 'user', content: text },
        ],
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return completion.data.choices[0].message.content.trim();
  } catch (err) {
    console.error('Error generating summary:', err.message);
    return null;
  }
};

const updateRaindropNote = async (id, summary) => {
  if (!summary) return;
  try {
    await axios.put(
      `https://api.raindrop.io/rest/v1/raindrop/${id}`,
      { note: `—— AI Summary ——\n${summary}` },
      { headers: { Authorization: `Bearer ${RAINDROP_TOKEN}` } }
    );
  } catch (err) {
    console.error(`Failed to update Raindrop note for ${id}:`, err.message);
  }
};

const buildHTML = (items) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="color-scheme" content="light dark">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root {
      color-scheme: light dark;
      --bg: #ffffff;
      --text: #000000;
      --subtext: #555;
      --link: #007aff;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #1c1c1e;
        --text: #f5f5f7;
        --subtext: #888;
        --link: #4da8ff;
      }
    }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 2rem;
    }
    h1 {
      font-family: 'New York', Georgia, serif;
      font-size: 26px;
    }
    a { color: var(--link); text-decoration: none; }
    .item {
      margin-bottom: 2rem;
      background: var(--bg);
      padding: 1.25rem;
      border-radius: 12px;
    }
    .meta {
      color: var(--subtext);
      font-size: 0.875rem;
    }
    .summary {
      margin-top: 0.75rem;
      font-style: italic;
      color: var(--subtext);
      line-height: 1.4;
    }
    .original-link {
      font-size: 12px;
      color: var(--subtext);
      margin-top: 4px;
      display: block;
    }
    hr {
      border: none;
      border-top: 1px solid var(--subtext);
      margin: 2rem 0;
    }
  </style>
</head>
<body>
  <h1>Your Read Later Digest</h1>
  ${items
    .map((item) => {
      const domain = new URL(item.link).hostname.replace('www.', '');
      const favicon = `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;
      const previewUrl = `https://app.raindrop.io/my/${COLLECTION_ID}/item/${item._id}/preview`;
      const hasSummary = item.note && item.note.includes('—— AI Summary ——');
      const summaryContent = hasSummary ? item.note.replace('—— AI Summary ——', '').trim() : '';
      return `
        <div class="item">
          ${item.cover ? `<img src="${item.cover}" style="max-width:100%; border-radius:10px; margin-bottom:1rem;" />` : ''}
          <h2><a href="${previewUrl}">${item.title}</a></h2>
          <a class="original-link" href="${item.link}">(Original)</a>
          <div class="meta">
            <img src="${favicon}" style="width:16px;height:16px;vertical-align:middle;margin-right:4px;" />
            ${domain} · Saved on ${dayjs(item.created).format('MMM D')} · ${item.excerpt?.split(' ').length || 200 / 200} min read
          </div>
          ${summaryContent ? `<blockquote class="summary">${summaryContent}</blockquote>` : ''}
        </div>
        <hr />
      `;
    })
    .join('')}
</body>
</html>
  `;
};

const sendEmail = async (html) => {
  let transporter = nodemailer.createTransport({
    host: 'smtp.mail.me.com',
    port: 587,
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: FROM_EMAIL,
    to: TO_EMAIL,
    subject: `Your Read Later Digest: ${dayjs().format('MMM D')}`,
    html,
  });
};

const main = async () => {
  try {
    const allItems = await getRaindropItems();
    const recentItems = allItems.filter((item) =>
      dayjs(item.created) > dayjs().subtract(1, 'day')
    );
    const olderItems = allItems.filter((item) =>
      dayjs(item.created) <= dayjs().subtract(1, 'day')
    );
    const randomOld = olderItems.sort(() => 0.5 - Math.random()).slice(0, 2);
    const picks = [...recentItems.slice(0, 5), ...randomOld];

    for (let item of picks) {
      const summary = await summarize(item.excerpt || item.title);
      if (summary) {
        item.note = `—— AI Summary ——\n${summary}`;
        await updateRaindropNote(item._id, summary);
      }
    }

    const html = buildHTML(picks);
    await sendEmail(html);
  } catch (err) {
    console.error('Error sending digest:', err.message);
    process.exit(1);
  }
};

main();
