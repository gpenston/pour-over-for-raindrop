// raindrop-digest.js
import axios from 'axios';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
dotenv.config();

const RAINDROP_TOKEN = process.env.RAINDROP_TOKEN;
const COLLECTION_ID = process.env.COLLECTION_ID;
const TO_EMAIL = process.env.TO_EMAIL;
const FROM_EMAIL = process.env.FROM_EMAIL;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

const fetchRaindrops = async () => {
  const url = `https://api.raindrop.io/rest/v1/raindrops/${COLLECTION_ID}`;
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${RAINDROP_TOKEN}`
    }
  });
  return response.data.items;
};

const formatItem = (item) => {
  const url = new URL(item.link);
  const domain = url.hostname.replace('www.', '');
  const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  const date = new Date(item.created).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
  return `
    <div style="margin-bottom: 32px;">
      <img src="${item.cover}" alt="cover" style="width:100%; border-radius:12px; margin-bottom:12px;" />
      <h2 style="font-family: 'New York', Georgia, serif; font-size: 24px; margin: 0 0 8px 0;">
        <a href="${item.link}" style="color:#0077FF; text-decoration:none;">${item.title}</a>
      </h2>
      <p style="margin:0 0 4px 0; font-size: 14px; color: #888;">
        <img src="${favicon}" width="16" height="16" style="vertical-align:middle; margin-right:4px;" />
        ${domain} &middot; Saved on ${date}
      </p>
    </div>
  `;
};

const buildEmail = (items) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          padding: 40px;
          background: #fff;
          color: #000;
        }
        @media (prefers-color-scheme: dark) {
          body {
            background: #1c1c1e;
            color: #fff;
          }
          a {
            color: #59a6ff !important;
          }
          p {
            color: #aaa;
          }
        }
      </style>
    </head>
    <body>
      <h1 style="font-family: 'New York', Georgia, serif; font-size: 32px; margin-bottom: 24px;">Your Read Later Digest</h1>
      ${items.map(formatItem).join('')}
    </body>
    </html>
  `;
};

const sendEmail = async (html) => {
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
    const items = await fetchRaindrops();
    console.log(`Total fetched: ${items.length}`);

    const sorted = [...items].sort((a, b) => new Date(b.created) - new Date(a.created));
    const recent = sorted.slice(0, 5);
    const older = sorted.slice(5);
    const random = older.sort(() => 0.5 - Math.random()).slice(0, 2);

    console.log(`Recent items: ${recent.length}`);
    console.log(`Random items: ${random.length}`);

    const emailHTML = buildEmail([...recent, ...random]);
    console.log(`Sending email to: ${TO_EMAIL}`);
    await sendEmail(emailHTML);
    console.log('Email sent.');
  } catch (err) {
    console.error('Error sending digest:', err);
    process.exit(1);
  }
};

main();
