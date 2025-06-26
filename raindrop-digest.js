// raindrop-digest.js
import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import nodemailer from 'nodemailer';
import dayjs from 'dayjs';

const RAINDROP_API_URL = 'https://api.raindrop.io/rest/v1';
const TOKEN = process.env.RAINDROP_TOKEN;
const COLLECTION_ID = process.env.COLLECTION_ID;
const ARCHIVE_ID = process.env.ARCHIVE_ID;

const headers = {
  Authorization: `Bearer ${TOKEN}`
};

async function getRaindropItems(collectionId) {
  const res = await axios.get(`${RAINDROP_API_URL}/raindrops/${collectionId}`, { headers });
  return res.data.items;
}

function pickRandom(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function formatDate(timestamp) {
  return dayjs(timestamp).format('MMM D');
}

function buildPreviewUrl(collection, item) {
  return `https://app.raindrop.io/my/${collection}/item/${item._id}/preview`;
}

function generateEmailHTML(items) {
  return `
  <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'San Francisco', 'Helvetica Neue', sans-serif;
          background-color: #fff;
          color: #000;
          padding: 2em;
        }
        @media (prefers-color-scheme: dark) {
          body {
            background-color: #000;
            color: #fff;
          }
        }
        .item {
          margin-bottom: 2em;
        }
        .item h2 {
          margin-bottom: 0.2em;
        }
        .description {
          font-family: 'New York', Georgia, serif;
          font-size: 1em;
          margin: 0.2em 0 0.6em;
        }
        .meta {
          font-size: 0.9em;
          color: #666;
        }
        @media (prefers-color-scheme: dark) {
          .meta {
            color: #aaa;
          }
        }
        a {
          color: inherit;
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <h1>Today’s Raindrop Digest</h1>
      ${items.map(item => {
        const previewUrl = buildPreviewUrl(item.collection.$id, item);
        return `
        <div class="item">
          <h2><a href="${previewUrl}">${item.title}</a></h2>
          ${item.excerpt ? `<div class="description">${item.excerpt}</div>` : ''}
          <div class="meta">
            ${item.domain || ''} – Saved ${formatDate(item.created)}
            <br/><a href="${item.link}" style="font-size:0.85em">(Original link)</a>
          </div>
        </div>`;
      }).join('')}
    </body>
  </html>
  `;
}

async function moveToArchive(itemIds) {
  await axios.request({
    method: 'PUT',
    url: `${RAINDROP_API_URL}/raindrops/${ARCHIVE_ID}`,
    headers,
    data: {
      items: itemIds.map(id => ({ _id: id }))
    }
  });
}

async function sendEmail(html) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.mail.me.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_TO,
    subject: 'Your Raindrop Digest',
    html
  });
}

(async () => {
  try {
    console.log('Fetching items...');
    const items = await getRaindropItems(COLLECTION_ID);

    const sorted = items.sort((a, b) => new Date(b.created) - new Date(a.created));
    const recent = sorted.slice(0, 5);
    const older = pickRandom(sorted.slice(5), 2);

    console.log(`Total fetched: ${items.length}`);
    console.log(`Recent items: ${recent.length}`);
    console.log(`Random items: ${older.length}`);

    const all = [...recent, ...older];
    const html = generateEmailHTML(all);

    console.log(`Sending email to: ${process.env.EMAIL_TO}`);
    await sendEmail(html);

    const allIds = all.map(i => i._id);
    await moveToArchive(allIds);
  } catch (err) {
    console.error('Error sending digest:', err);
    process.exit(1);
  }
})();
