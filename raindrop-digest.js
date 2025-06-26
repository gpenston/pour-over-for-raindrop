// raindrop-digest.js
import axios from 'axios';
import nodemailer from 'nodemailer';
import dayjs from 'dayjs';
import dotenv from 'dotenv';
dotenv.config();

const RAINDROP_TOKEN = process.env.RAINDROP_TOKEN;
const COLLECTION_ID = process.env.COLLECTION_ID;
const TO_EMAIL = process.env.TO_EMAIL;
const FROM_EMAIL = process.env.FROM_EMAIL;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

const getRaindropItems = async () => {
  const url = `https://api.raindrop.io/rest/v1/raindrops/${COLLECTION_ID}`;
  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${RAINDROP_TOKEN}` },
  });
  return response.data.items;
};

const formatItemsToHTML = (items) => {
  const styles = `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        margin: 0;
        padding: 2rem;
        background-color: #fff;
        color: #000;
      }
      h1 {
        font-family: 'New York', Georgia, serif;
        font-size: 2rem;
      }
      a {
        color: #007aff;
        text-decoration: none;
      }
      .item {
        margin-bottom: 3rem;
        border-bottom: 1px solid #eee;
        padding-bottom: 2rem;
      }
      .item img {
        width: 100%;
        border-radius: 12px;
      }
      .meta {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.9rem;
        color: #555;
        margin-top: 0.5rem;
      }
      .meta img {
        width: 16px;
        height: 16px;
      }
      .excerpt {
        margin-top: 0.75rem;
        font-size: 0.95rem;
      }
      @media (prefers-color-scheme: dark) {
        body {
          background-color: #000;
          color: #fff;
        }
        a { color: #4da3ff; }
        .meta { color: #aaa; }
        .item { border-color: #333; }
      }
    </style>
  `;

  const content = items.map((item) => {
    const domain = new URL(item.link).hostname.replace('www.', '');
    const favicon = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
    const timeSaved = dayjs(item.created).format('MMM D');
    const readTime = item.excerpt?.split(' ').length > 300 ? '3+ min read' : '1–2 min read';

    return `
      <div class="item">
        ${item.cover ? `<img src="${item.cover}" alt="cover">` : ''}
        <h2><a href="${item.link}" target="_blank">${item.title}</a></h2>
        ${item.excerpt ? `<div class="excerpt">${item.excerpt}</div>` : ''}
        <div class="meta">
          <img src="${favicon}" alt="icon">
          <a href="https://${domain}">${domain}</a> • Saved on ${timeSaved} • ${readTime}
        </div>
      </div>
    `;
  }).join('');

  return `
    <html>
      <head>${styles}</head>
      <body>
        <h1>Your Read Later Digest</h1>
        ${content}
      </body>
    </html>
  `;
};

const sendDigestEmail = async (html) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.mail.me.com',
    port: 587,
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: FROM_EMAIL,
    to: TO_EMAIL,
    subject: 'Your Read Later Digest',
    html
  });
};

const main = async () => {
  try {
    console.log('Fetching items...');
    const items = await getRaindropItems();
    console.log(`Total fetched: ${items.length}`);

    const recent = items.slice(0, 5);
    const older = items.slice(5).sort(() => 0.5 - Math.random()).slice(0, 2);
    const digest = [...recent, ...older];

    const html = formatItemsToHTML(digest);
    await sendDigestEmail(html);
    console.log('Email sent!');
  } catch (err) {
    console.error('Error sending digest:', err);
    process.exit(1);
  }
};

main();
