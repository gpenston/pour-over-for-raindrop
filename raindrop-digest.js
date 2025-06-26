// raindrop-digest.js
import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import nodemailer from 'nodemailer';

const RAINDROP_TOKEN = process.env.RAINDROP_TOKEN;
const COLLECTION_ID = process.env.COLLECTION_ID;
const TO_EMAIL = process.env.TO_EMAIL;
const FROM_EMAIL = process.env.FROM_EMAIL;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

const getRaindropItems = async () => {
  const res = await axios.get(`https://api.raindrop.io/rest/v1/raindrops/${COLLECTION_ID}`, {
    headers: {
      Authorization: `Bearer ${RAINDROP_TOKEN}`
    }
  });
  return res.data.items;
};

const formatItem = (item) => {
  const previewUrl = `https://app.raindrop.io/my/${COLLECTION_ID}/item/${item._id}/preview`;
  const link = `<a href="${previewUrl}" style="font-size: 18px; font-weight: 600; color: #0077cc; text-decoration: none;">${item.title}</a>`;
  const original = `<div style="font-size: 13px; color: #777; margin-top: 2px;"><em>(<a href="${item.link}" style="color: #777">Original</a>)</em></div>`;
  const description = item.excerpt ? `<div style="font-size: 14px; color: #444; margin: 8px 0 0 0;">${item.excerpt}</div>` : '';
  const cover = item.cover ? `<img src="${item.cover}" alt="cover" style="width: 100%; max-width: 600px; border-radius: 12px; margin-top: 20px;">` : '';
  return `
    <div style="margin-bottom: 40px;">
      ${cover}
      <div style="margin-top: 12px;">
        ${link}
        ${description}
        ${original}
      </div>
    </div>
  `;
};

const sendEmail = async (html) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: FROM_EMAIL,
    to: TO_EMAIL,
    subject: `Your Read Later Digest: ${new Date().toLocaleDateString()}`,
    html
  });
};

const run = async () => {
  try {
    console.log('Fetching items...');
    const items = await getRaindropItems();
    console.log(`Total fetched: ${items.length}`);

    const sorted = items.sort((a, b) => new Date(b.created) - new Date(a.created));
    const recent = sorted.slice(0, 5);
    const older = sorted.slice(5);
    const random = older.sort(() => 0.5 - Math.random()).slice(0, 2);

    console.log(`Recent items: ${recent.length}`);
    console.log(`Random items: ${random.length}`);

    const allItems = [...recent, ...random];
    const itemsHtml = allItems.map(formatItem).join('');

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 32px; background: var(--background-color, #fff); color: var(--text-color, #000);">
        <h1 style="font-size: 28px; margin-bottom: 32px;">Your Read Later Digest</h1>
        ${itemsHtml}
      </div>
    `;

    console.log(`Sending email to: ${TO_EMAIL}`);
    await sendEmail(html);
  } catch (err) {
    console.error('Error sending digest:', err);
    process.exit(1);
  }
};

run();
