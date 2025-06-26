// raindrop-digest.js
import axios from 'axios';
import dayjs from 'dayjs';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const RAINDROP_TOKEN = process.env.RAINDROP_TOKEN;
const COLLECTION_ID = process.env.COLLECTION_ID;
const TO_EMAIL = process.env.TO_EMAIL;
const FROM_EMAIL = process.env.FROM_EMAIL;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

async function getRaindropItems() {
  const url = `https://api.raindrop.io/rest/v1/raindrops/${COLLECTION_ID}`;
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${RAINDROP_TOKEN}`,
    },
  });
  return response.data.items;
}

function pickRecentAndRandom(items, recentCount = 5, randomCount = 2) {
  const sorted = [...items].sort(
    (a, b) => new Date(b.created) - new Date(a.created)
  );
  const recent = sorted.slice(0, recentCount);
  const remaining = sorted.slice(recentCount);
  const random = [];
  const used = new Set();

  while (random.length < randomCount && remaining.length > 0) {
    const i = Math.floor(Math.random() * remaining.length);
    if (!used.has(i)) {
      random.push(remaining[i]);
      used.add(i);
    }
  }
  return [...recent, ...random];
}

function formatItem(item) {
  const link = item.link;
  const title = item.title || '(Untitled)';
  const domain = new URL(link).hostname.replace('www.', '');
  const domainIcon = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
  const excerpt = item.excerpt || '';
  const created = dayjs(item.created).format('MMM D');
  const time = item.extra?.time || '';
  const timeText = time ? ` • ${time} min read` : '';
  const cover = item.cover ? `<img src="${item.cover}" alt="cover image" style="max-width: 100%; border-radius: 12px; margin: 1rem 0;">` : '';

  return `
    <div style="margin-bottom: 3rem;">
      ${cover}
      <a href="${link}" style="font-size: 1.25rem; font-weight: 600; text-decoration: none; color: #0077ee; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        ${title}
      </a>
      <div style="color: #666; font-size: 0.9rem; margin: 0.5rem 0;">
        <img src="${domainIcon}" width="16" height="16" style="vertical-align: middle; margin-right: 6px;">
        <a href="https://${domain}" style="color: #666; text-decoration: none;">${domain}</a>
        <span style="margin-left: 6px;"> • Saved on ${created}${timeText}</span>
      </div>
      <div style="margin-top: 0.5rem; font-size: 0.95rem; line-height: 1.5; color: #444;">${excerpt}</div>
      <hr style="margin-top: 2rem; opacity: 0.2;">
    </div>
  `;
}

function createEmailHtml(items) {
  const articlesHtml = items.map(formatItem).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Read Later Digest</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          padding: 2rem;
          background: #fff;
          color: #000;
        }
        @media (prefers-color-scheme: dark) {
          body {
            background: #121212;
            color: #f0f0f0;
          }
          a {
            color: #4dabf7;
          }
        }
      </style>
    </head>
    <body>
      <h1 style="font-family: 'New York', Georgia, serif; font-size: 2rem; font-weight: bold;">Your Read Later Digest</h1>
      ${articlesHtml}
    </body>
    </html>
  `;
}

async function sendEmail(html) {
  const transporter = nodemailer.createTransport({
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
    subject: 'Your Read Later Digest',
    html,
  });
}

(async () => {
  try {
    console.log('Fetching items...');
    const allItems = await getRaindropItems();
    console.log(`Total fetched: ${allItems.length}`);
    const picked = pickRecentAndRandom(allItems);
    console.log(`Recent items: ${picked.slice(0, 5).length}`);
    console.log(`Random items: ${picked.slice(5).length}`);

    const html = createEmailHtml(picked);
    console.log(`Sending email to: ${TO_EMAIL}`);
    await sendEmail(html);
    console.log('Email sent!');
  } catch (err) {
    console.error('Error sending digest:', err);
    process.exit(1);
  }
})();
