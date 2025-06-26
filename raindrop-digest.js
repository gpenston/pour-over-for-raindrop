import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import nodemailer from 'nodemailer';
import dayjs from 'dayjs';

const RAINDROP_TOKEN = process.env.RAINDROP_TOKEN;
const COLLECTION_ID = process.env.COLLECTION_ID;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL;
const TO_EMAIL = process.env.TO_EMAIL;

async function getRaindropItems() {
  console.log('Fetching items...');
  const response = await axios.get(`https://api.raindrop.io/rest/v1/raindrops/${COLLECTION_ID}`, {
    headers: { Authorization: `Bearer ${RAINDROP_TOKEN}` },
  });
  return response.data.items;
}

function estimateReadingTime(text) {
  const wordsPerMinute = 200;
  const numberOfWords = text.split(/\s+/).length;
  const minutes = Math.ceil(numberOfWords / wordsPerMinute);
  return minutes;
}

function buildEmail(items) {
  const style = `
    <style>
      @media (prefers-color-scheme: dark) {
        body {
          background-color: #1c1c1e !important;
          color: #f2f2f7 !important;
        }
        a { color: #4ba3fa !important; }
        .source { color: #d1d1d6 !important; }
      }
      @media (prefers-color-scheme: light) {
        a { color: #1a0dab !important; }
        .source { color: #666666 !important; }
      }
    </style>
  `;

  const html = `
    <html>
      <head>
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
        ${style}
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px 20px; max-width: 640px; margin: auto;">
        <h1 style="font-family: 'New York', Georgia, serif;">Your Read Later Digest</h1>
        ${items.map(item => {
          const date = dayjs(item.created).format('MMM D');
          const readingTime = estimateReadingTime(item.excerpt || '') || '';
          const minutes = readingTime ? `\u2022 ${readingTime} min read` : '';
          return `
            <div style="margin-bottom: 48px;">
              <img src="${item.cover || ''}" alt="" style="width: 100%; border-radius: 16px; margin-bottom: 16px;" />
              <a href="${item.link}" style="display: block; font-size: 20px; font-weight: bold; color: #1a0dab; margin-bottom: 8px; text-decoration: none;">${item.title}</a>
              ${item.excerpt ? `<div style="margin-bottom: 8px; font-size: 16px; line-height: 1.5;">${item.excerpt}</div>` : ''}
              <div class="source" style="font-size: 14px; color: #666;">
                ${item.domain ? `<img src="https://www.google.com/s2/favicons?domain=${item.domain}&sz=32" style="vertical-align: middle; margin-right: 4px;"/>` : ''}
                ${item.domain ? `<a href="https://${item.domain}" style="color: #666; text-decoration: none;">${item.domain}</a>` : ''}
                ${item.domain ? ' • ' : ''}Saved on ${date} ${minutes}
              </div>
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin-top: 24px;" />
            </div>
          `;
        }).join('')}
      </body>
    </html>
  `;

  return html;
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
    const items = await getRaindropItems();
    const recent = items.slice(0, 5);
    const older = items.slice(5);
    const random = older.sort(() => 0.5 - Math.random()).slice(0, 2);

    const digestItems = [...recent, ...random];

    console.log(`Total fetched: ${items.length}`);
    console.log(`Recent items: ${recent.length}`);
    console.log(`Random items: ${random.length}`);

    const emailHtml = buildEmail(digestItems);

    console.log(`Sending email to: ${TO_EMAIL}`);
    await sendEmail(emailHtml);
  } catch (error) {
    console.error('Error sending digest:', error);
    process.exit(1);
  }
})();
