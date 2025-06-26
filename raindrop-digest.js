// raindrop-digest.js (final version with dark mode fix and updated link color)

import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import nodemailer from 'nodemailer';
import dayjs from 'dayjs';

const COLLECTION_ID = process.env.COLLECTION_ID;
const RAINDROP_TOKEN = process.env.RAINDROP_TOKEN;
const TO_EMAIL = process.env.TO_EMAIL;
const FROM_EMAIL = process.env.FROM_EMAIL;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

async function getRaindropItems() {
  const url = `https://api.raindrop.io/rest/v1/raindrops/${COLLECTION_ID}?perpage=50&sort=-created`;
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${RAINDROP_TOKEN}`,
    },
  });
  return response.data.items;
}

function buildEmailHtml(items) {
  const fontFamily = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;
  const linkColor = `#4ba3fa`; // Sampled from screenshot

  return `
    <html>
      <head>
        <style>
          body {
            font-family: ${fontFamily};
            margin: 0;
            padding: 32px;
            background: #fff;
            color: #000;
          }

          @media (prefers-color-scheme: dark) {
            body {
              background: #000;
              color: #fff;
            }
            a {
              color: ${linkColor};
            }
          }

          h1 {
            font-family: 'New York', Georgia, serif;
            font-size: 24px;
            margin-bottom: 32px;
          }

          h2 {
            font-size: 16px;
            margin-bottom: 6px;
          }

          p {
            font-size: 14px;
            line-height: 1.5;
            margin: 0;
            margin-top: 4px;
          }

          a {
            color: ${linkColor};
            text-decoration: none;
            font-weight: 600;
          }

          .item {
            margin-bottom: 48px;
          }

          .meta {
            font-size: 12px;
            color: #666;
            margin-top: 8px;
          }

          .divider {
            border-top: 1px solid #ccc;
            margin: 32px 0;
          }

          img.preview {
            width: 100%;
            max-width: 600px;
            border-radius: 12px;
            margin-bottom: 12px;
          }
        </style>
      </head>
      <body>
        <h1>Your Read Later Digest</h1>
        ${items.map(item => `
          <div class="item">
            ${item.cover ? `<img class="preview" src="${item.cover}" alt="">` : ''}
            <a href="${item.link}"><h2>${item.title}</h2></a>
            ${item.excerpt ? `<p>${item.excerpt}</p>` : ''}
            <div class="meta">
              ${item.domain ? `<img src="https://icons.duckduckgo.com/ip3/${item.domain}.ico" width="14" height="14" style="vertical-align:middle; margin-right:4px;">` : ''}
              ${item.domain ? `<a href="https://${item.domain}">${item.domain}</a>` : ''}
              ${item.created ? ` · Saved on ${dayjs(item.created).format('MMM D')}` : ''}
              ${item.time ? ` · ${item.time}` : ''}
            </div>
            <div class="divider"></div>
          </div>
        `).join('')}
      </body>
    </html>
  `;
}

async function sendDigestEmail(html) {
  const transporter = nodemailer.createTransport({
    service: 'iCloud',
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

async function main() {
  console.log('Fetching items...');
  const items = await getRaindropItems();
  console.log(`Total fetched: ${items.length}`);

  const recentItems = items.slice(0, 5);
  const remainingItems = items.slice(5);
  const randomItems = remainingItems.sort(() => 0.5 - Math.random()).slice(0, 2);

  const html = buildEmailHtml([...recentItems, ...randomItems]);
  console.log(`Sending email to: ${TO_EMAIL}`);

  try {
    await sendDigestEmail(html);
  } catch (err) {
    console.error('Error sending digest:', err);
    process.exit(1);
  }
}

main();
