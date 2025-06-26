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

const getRaindropItems = async () => {
  const response = await axios.get(`https://api.raindrop.io/rest/v1/raindrops/${COLLECTION_ID}`, {
    headers: { Authorization: `Bearer ${RAINDROP_TOKEN}` },
  });
  return response.data.items || [];
};

const formatDate = (dateString) => {
  const options = { month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

const estimateReadingTime = (excerpt) => {
  const words = excerpt?.split(/\s+/).length || 0;
  const minutes = Math.ceil(words / 200);
  return minutes > 0 ? `${minutes} min read` : '';
};

const generateEmailHTML = (items) => {
  const styles = `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
        background-color: #fff;
        color: #000;
        padding: 20px;
      }
      @media (prefers-color-scheme: dark) {
        body {
          background-color: #000;
          color: #fff;
        }
        .card {
          background-color: #111;
          border-color: #333;
        }
        .divider {
          border-color: #333;
        }
      }
      h1 {
        font-family: 'New York', Georgia, serif;
        font-size: 28px;
        font-weight: bold;
      }
      .card {
        margin: 40px 0;
        padding-bottom: 20px;
        border-bottom: 1px solid #eee;
      }
      .title {
        font-size: 18px;
        font-weight: 600;
        margin: 20px 0 8px;
        color: #0077ee;
        font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
      }
      .meta {
        font-size: 14px;
        color: gray;
        margin: 0 0 12px;
      }
      .excerpt {
        font-size: 15px;
        line-height: 1.5;
        margin-bottom: 16px;
      }
      .image {
        max-width: 100%;
        border-radius: 16px;
      }
      .divider {
        border-top: 1px solid #eee;
        margin: 24px 0;
      }
      a {
        color: #0077ee;
        text-decoration: none;
      }
    </style>
  `;

  const itemsHTML = items.map((item) => {
    const { link, title, excerpt, cover, domain, created, time } = item;
    const sourceFavicon = `https://www.google.com/s2/favicons?sz=32&domain_url=${domain}`;
    const formattedDate = formatDate(created);
    const readingTime = estimateReadingTime(excerpt);
    return `
      <div class="card">
        ${cover ? `<img src="${cover}" class="image" alt="cover image" />` : ''}
        <div class="title"><a href="${link}">${title}</a></div>
        ${excerpt ? `<div class="excerpt">${excerpt}</div>` : ''}
        <div class="meta">
          <img src="${sourceFavicon}" width="16" height="16" style="vertical-align: middle; margin-right: 6px;" />
          <a href="https://${domain}">${domain}</a> &bull; Saved on ${formattedDate}${readingTime ? ` &bull; ${readingTime}` : ''}
        </div>
      </div>
    `;
  }).join('\n');

  return `
    <html>
    <head>${styles}</head>
    <body>
      <h1>Your Read Later Digest</h1>
      ${itemsHTML}
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
      pass: SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: FROM_EMAIL,
    to: TO_EMAIL,
    subject: 'Your Read Later Digest',
    html,
  });
};

const runDigest = async () => {
  try {
    console.log('Fetching items...');
    const items = await getRaindropItems();
    console.log(`Total fetched: ${items.length}`);

    const recentItems = items.slice(0, 5);
    const randomItems = items.slice(5).sort(() => 0.5 - Math.random()).slice(0, 2);
    console.log(`Recent items: ${recentItems.length}`);
    console.log(`Random items: ${randomItems.length}`);

    const digestItems = [...recentItems, ...randomItems];
    const html = generateEmailHTML(digestItems);
    console.log(`Sending email to: ${TO_EMAIL}`);
    await sendEmail(html);
  } catch (error) {
    console.error('Error sending digest:', error);
    process.exit(1);
  }
};

runDigest();
