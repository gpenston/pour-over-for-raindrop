// raindrop-digest.js
import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import nodemailer from 'nodemailer';
import dayjs from 'dayjs';

const RAINDROP_TOKEN = process.env.RAINDROP_TOKEN;
const COLLECTION_ID = process.env.COLLECTION_ID;
const ARCHIVE_COLLECTION_ID = process.env.ARCHIVE_COLLECTION_ID;
const TO_EMAIL = process.env.TO_EMAIL;
const FROM_EMAIL = process.env.FROM_EMAIL;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

const getRaindropItems = async () => {
  const url = `https://api.raindrop.io/rest/v1/raindrops/${COLLECTION_ID}?perpage=100&sort=-created`;
  const headers = { Authorization: `Bearer ${RAINDROP_TOKEN}` };
  const response = await axios.get(url, { headers });
  return response.data.items || [];
};

const buildEmailHTML = (items) => {
  const styles = `
    <style>
      @media (prefers-color-scheme: dark) {
        body { background: #000; color: #fff; }
        a { color: #4ea8ff; }
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif;
        margin: 2em;
        line-height: 1.5;
        color: #111;
      }
      .item {
        margin-bottom: 2em;
        padding-bottom: 1em;
        border-bottom: 1px solid #ccc;
      }
      .item h2 {
        margin: 0;
        font-size: 1.2em;
      }
      .item p {
        margin: 0.5em 0 0 0;
      }
      .source-link {
        font-size: 0.9em;
        color: #666;
      }
    </style>
  `;

  const entries = items.map(item => {
    const safeTitle = item.title || item.link;
    const safeDescription = item.excerpt ? item.excerpt.trim() : '';
    const previewUrl = `https://app.raindrop.io/my/${item.collection?.$id || COLLECTION_ID}/item/${item._id}/preview`;
    const originalLink = item.link;
    const domain = new URL(originalLink).hostname.replace('www.', '');

    return `
      <div class="item">
        <h2><a href="${previewUrl}">${safeTitle}</a></h2>
        ${safeDescription ? `<p>${safeDescription}</p>` : ''}
        <p class="source-link"><a href="${originalLink}" target="_blank">Original ↗</a> &middot; ${domain}</p>
      </div>
    `;
  }).join('\n');

  return `<!DOCTYPE html>
    <html>
      <head>${styles}</head>
      <body>
        <h1>Raindrop Daily Digest</h1>
        ${entries}
      </body>
    </html>`;
};

const sendEmail = async (html) => {
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: true,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });

  const info = await transporter.sendMail({
    from: FROM_EMAIL,
    to: TO_EMAIL,
    subject: 'Your Raindrop Daily Digest',
    html
  });

  console.log('Email sent:', info.messageId);
};

const main = async () => {
  try {
    console.log('Fetching items...');
    const allItems = await getRaindropItems();
    console.log('Total fetched:', allItems.length);

    const now = dayjs();
    const recentItems = allItems.filter(item => dayjs(item.created) > now.subtract(36, 'hour')).slice(0, 5);
    const olderItems = allItems.filter(item => dayjs(item.created) <= now.subtract(7, 'day'));
    const randomItems = olderItems.sort(() => 0.5 - Math.random()).slice(0, 2);

    console.log('Recent items:', recentItems.length);
    console.log('Random items:', randomItems.length);

    const digestItems = [...recentItems, ...randomItems];
    if (digestItems.length === 0) {
      console.log('No items to include. Skipping email.');
      return;
    }

    const html = buildEmailHTML(digestItems);
    console.log('Sending email to:', TO_EMAIL);
    await sendEmail(html);
  } catch (error) {
    console.error('Error sending digest:', error);
    process.exit(1);
  }
};

main();
