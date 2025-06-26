// raindrop-digest.js
import axios from 'axios';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { formatDistanceToNow } from 'date-fns';

dotenv.config();

const COLLECTION_ID = process.env.COLLECTION_ID;
const ARCHIVE_ID = process.env.ARCHIVE_ID;
const RAINDROP_TOKEN = process.env.RAINDROP_TOKEN;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT);
const EMAIL_TO = process.env.EMAIL_TO;
const EMAIL_FROM = process.env.EMAIL_FROM;

if (!COLLECTION_ID) {
  console.error('❌ COLLECTION_ID is missing. Set it in your env or GitHub Secrets.');
  process.exit(1);
}

async function getRaindropItems() {
  const url = `https://api.raindrop.io/rest/v1/raindrops/${COLLECTION_ID}`;
  const res = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${RAINDROP_TOKEN}`,
    },
  });
  return res.data.items;
}

function buildPreviewLink(item) {
  return `https://app.raindrop.io/my/${COLLECTION_ID}/item/${item._id}/preview`;
}

function buildOriginalLink(item) {
  return item.link;
}

function buildHTMLDigest(recent, older) {
  const renderItem = (item) => {
    const timeAgo = formatDistanceToNow(new Date(item.created), { addSuffix: true });
    const previewLink = buildPreviewLink(item);
    const originalLink = buildOriginalLink(item);
    const description = item.excerpt || '';
    const domain = new URL(item.link).hostname.replace('www.', '');
    const sourceIcon = `https://www.google.com/s2/favicons?domain=${domain}`;

    return `
      <div style="padding: 24px 0; border-bottom: 1px solid var(--border-color);">
        <a href="${previewLink}" style="font-family: 'New York', Georgia, serif; font-size: 20px; font-weight: 600; color: var(--text-color); text-decoration: none;">${item.title}</a>
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; color: var(--muted-color); margin-top: 2px;">
          <img src="${sourceIcon}" alt="" style="vertical-align: middle; height: 14px; margin-right: 4px;">${domain} • Saved ${timeAgo}
        </div>
        ${description ? `<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 16px; color: var(--text-color); margin-top: 8px; line-height: 1.5;">${description}</div>` : ''}
        <div style="margin-top: 8px;"><a href="${originalLink}" style="font-size: 13px; color: var(--link-color); font-family: -apple-system, BlinkMacSystemFont, sans-serif;">Original →</a></div>
      </div>
    `;
  };

  const itemsHTML = [...recent, ...older].map(renderItem).join('');

  return `
    <html>
    <head>
      <meta name="color-scheme" content="light dark">
      <style>
        :root {
          color-scheme: light dark;
          --text-color: #000;
          --muted-color: #666;
          --link-color: #007aff;
          --border-color: #e0e0e0;
          background-color: #fff;
        }
        @media (prefers-color-scheme: dark) {
          :root {
            --text-color: #fff;
            --muted-color: #aaa;
            --link-color: #0a84ff;
            --border-color: #333;
            background-color: #000;
          }
        }
        body {
          margin: 0;
          padding: 40px;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          background-color: var(--background-color);
        }
      </style>
    </head>
    <body>
      <h1 style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 24px; color: var(--text-color);">Your Daily Raindrop Digest</h1>
      ${itemsHTML}
    </body>
    </html>
  `;
}

async function sendEmail(subject, html) {
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: true,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: EMAIL_FROM,
    to: EMAIL_TO,
    subject,
    html,
  });
}

(async () => {
  try {
    console.log('Fetching items...');
    const items = await getRaindropItems();
    const sorted = items.sort((a, b) => new Date(b.created) - new Date(a.created));

    const recent = sorted.slice(0, 5);
    const olderPool = sorted.slice(10);
    const older = olderPool.sort(() => 0.5 - Math.random()).slice(0, 2);

    const html = buildHTMLDigest(recent, older);
    await sendEmail('Your Daily Raindrop Digest', html);
    console.log('Digest sent!');
  } catch (error) {
    console.error('Error sending digest:', error);
    process.exit(1);
  }
})();
