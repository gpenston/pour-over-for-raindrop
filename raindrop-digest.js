// raindrop-digest.js
import axios from 'axios';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const RAINDROP_TOKEN = process.env.RAINDROP_TOKEN;
const COLLECTION_ID = process.env.COLLECTION_ID;
const TO_EMAIL = process.env.TO_EMAIL;
const FROM_EMAIL = process.env.FROM_EMAIL;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

async function getRaindropItems() {
  const response = await axios.get(`https://api.raindrop.io/rest/v1/raindrops/${COLLECTION_ID}`, {
    headers: {
      Authorization: `Bearer ${RAINDROP_TOKEN}`,
    },
  });
  return response.data.items;
}

function formatItemHTML(item) {
  const previewUrl = `https://app.raindrop.io/my/${COLLECTION_ID}/item/${item._id}/preview`;
  const originalUrl = item.link;
  const description = item.description ? `<div style="margin: 6px 0 10px; font-style: italic; color: #888">${item.description}</div>` : '';
  const domain = new URL(item.link).hostname.replace('www.', '');
  const date = new Date(item.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const readTime = item.excerpt?.match(/(\d+ min read)/)?.[1] || '';

  return `
    <div style="margin-bottom: 40px;">
      <a href="${previewUrl}" style="text-decoration: none; color: inherit;">
        <img src="${item.cover}" alt="cover image" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px;"/>
      </a>
      <h3 style="margin: 12px 0 4px; font-size: 18px; line-height: 1.4;">
        <a href="${previewUrl}" style="color: #2e7eed; text-decoration: none;">${item.title}</a>
      </h3>
      ${description}
      <div style="font-size: 13px; color: #666;">
        (<a href="${originalUrl}" style="color: #999">Original</a>) &nbsp;
        <span>${domain}</span> • <span>Saved on ${date}</span>${readTime ? ` • <span>${readTime}</span>` : ''}
      </div>
    </div>
  `;
}

function buildEmailHTML(items) {
  const itemBlocks = items.map(formatItemHTML).join('\n');
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; padding: 20px; max-width: 600px; margin: auto;">
      <h1 style="font-size: 24px; margin-bottom: 20px;">Your Read Later Digest</h1>
      ${itemBlocks}
      <hr style="margin-top: 40px;"/>
      <div style="font-size: 12px; color: #999; text-align: center;">Sent via Raindrop Digest</div>
    </div>
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
    const items = await getRaindropItems();

    const sorted = items.sort((a, b) => new Date(b.created) - new Date(a.created));
    const recent = sorted.slice(0, 5);
    const older = sorted.slice(5);
    const random = older.sort(() => 0.5 - Math.random()).slice(0, 2);

    const finalItems = [...recent, ...random];

    console.log('Total fetched:', items.length);
    console.log('Recent items:', recent.length);
    console.log('Random items:', random.length);

    const html = buildEmailHTML(finalItems);

    console.log('Sending email to:', TO_EMAIL);
    await sendEmail(html);
  } catch (err) {
    console.error('Error sending digest:', err);
    process.exit(1);
  }
})();
