// raindrop-digest.js
import axios from 'axios';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import dayjs from 'dayjs';

dotenv.config();

const COLLECTION_ID = process.env.COLLECTION_ID;
const ARCHIVE_COLLECTION_ID = process.env.ARCHIVE_COLLECTION_ID;
const RAINDROP_TOKEN = process.env.RAINDROP_TOKEN;
const EMAIL_TO = process.env.EMAIL_TO;
const EMAIL_FROM = process.env.EMAIL_FROM;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;

async function getRaindropItems(collectionId) {
  const res = await axios.get(`https://api.raindrop.io/rest/v1/raindrops/${collectionId}`, {
    headers: {
      Authorization: `Bearer ${RAINDROP_TOKEN}`
    }
  });
  return res.data.items;
}

function buildPreviewLink(item) {
  return `https://app.raindrop.io/my/${item.collection.$id}/item/${item._id}/preview`;
}

function formatDate(date) {
  return dayjs(date).format('MMM D, YYYY');
}

function formatHTML(items) {
  const fontStack = "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif";

  const itemsHTML = items.map(item => {
    const previewUrl = buildPreviewLink(item);
    const originalLink = item.link;
    const title = item.title || originalLink;
    const description = item.excerpt || '';
    const domain = new URL(originalLink).hostname.replace('www.', '');
    const created = formatDate(item.created);

    return `
      <div style="margin-bottom: 24px;">
        <h2 style="margin: 0 0 4px; font-size: 20px; line-height: 1.3;">
          <a href="${previewUrl}" style="color: inherit; text-decoration: none;">${title}</a>
        </h2>
        <p style="margin: 4px 0 8px; font-size: 16px; line-height: 1.5; color: inherit;">
          ${description}
        </p>
        <div style="font-size: 14px; color: #666;">
          ${domain} · ${created}<br />
          <a href="${originalLink}" style="font-size: 13px; color: #888;">Original</a>
        </div>
      </div>
    `;
  }).join('\n');

  return `
    <html>
    <head>
      <style>
        :root {
          color-scheme: light dark;
        }
        body {
          font-family: ${fontStack};
          font-size: 16px;
          line-height: 1.5;
          padding: 32px;
          margin: 0;
          background-color: #fff;
          color: #000;
        }
        @media (prefers-color-scheme: dark) {
          body {
            background-color: #000;
            color: #fff;
          }
        }
        a {
          color: inherit;
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <h1 style="font-size: 24px; margin-bottom: 24px;">Your Raindrop Digest</h1>
      ${itemsHTML}
    </body>
    </html>
  `;
}

async function sendEmail(html) {
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT == 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: EMAIL_FROM,
    to: EMAIL_TO,
    subject: 'Your Daily Raindrop Digest',
    html
  });
}

function pickRandom(items, count) {
  const copy = [...items];
  const result = [];
  while (result.length < count && copy.length > 0) {
    const index = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(index, 1)[0]);
  }
  return result;
}

function getRecentAndRandom(items) {
  const sorted = [...items].sort((a, b) => new Date(b.created) - new Date(a.created));
  const recent = sorted.slice(0, 5);
  const remaining = sorted.slice(5);
  const random = pickRandom(remaining, 2);
  return [...recent, ...random];
}

async function main() {
  try {
    console.log('Fetching items...');
    const items = await getRaindropItems(COLLECTION_ID);
    const selectedItems = getRecentAndRandom(items);
    const html = formatHTML(selectedItems);
    await sendEmail(html);
    console.log('Digest sent.');
  } catch (error) {
    console.error('Error sending digest:', error);
  }
}

main();
