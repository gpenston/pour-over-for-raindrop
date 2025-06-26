import axios from 'axios';
import nodemailer from 'nodemailer';
import dayjs from 'dayjs';
import dotenv from 'dotenv';

dotenv.config();

async function getRaindropItems() {
  const response = await axios.get(
    `https://api.raindrop.io/rest/v1/raindrops/${process.env.RAINDROP_COLLECTION}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.RAINDROP_TOKEN}`,
      },
    }
  );

  const items = response.data.items;

  const enrichedItems = await Promise.all(
    items.map(async (item) => {
      try {
        const itemResponse = await axios.get(
          `https://api.raindrop.io/rest/v1/raindrop/${item._id}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.RAINDROP_TOKEN}`,
            },
          }
        );
        return {
          ...item,
          note: itemResponse.data.item.note || '',
          excerpt: itemResponse.data.item.excerpt || '',
        };
      } catch (e) {
        return { ...item, note: '', excerpt: '' };
      }
    })
  );

  return enrichedItems;
}

function buildEmailHTML(items) {
  const today = dayjs().format('MMM DD, YYYY');

  const emailBody = `
  <html>
  <head>
    <style>
      @media (prefers-color-scheme: dark) {
        body {
          background-color: #1e1e1e;
          color: #ffffff;
        }
        .container {
          background-color: #2c2c2e;
        }
        .link {
          color: #7db4ff;
        }
        .meta {
          color: #ccc;
        }
      }

      @media (prefers-color-scheme: light) {
        body {
          background-color: #ffffff;
          color: #000000;
        }
        .container {
          background-color: #f2f2f7;
        }
        .link {
          color: #007aff;
        }
        .meta {
          color: #555;
        }
      }

      .container {
        font-family: -apple-system, BlinkMacSystemFont, 'San Francisco', 'Helvetica Neue', sans-serif;
        max-width: 720px;
        margin: 0 auto;
        padding: 2rem;
        border-radius: 12px;
      }
      h1 {
        font-family: 'New York', Georgia, serif;
      }
      .item {
        margin-bottom: 3rem;
      }
      .item img {
        max-width: 100%;
        border-radius: 12px;
      }
      .excerpt {
        font-family: 'New York', Georgia, serif;
        font-size: 1rem;
        font-style: italic;
        margin-top: 0.75rem;
      }
      .meta {
        font-size: 0.875rem;
      }
      .original-link {
        font-size: 0.8rem;
        display: block;
        margin-top: 0.25rem;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Your Read Later Digest</h1>
      ${items
        .map(
          (item) => `
          <div class="item">
            ${item.cover ? `<img src="${item.cover}" alt="" />` : ''}
            <h2><a class="link" href="https://app.raindrop.io/my/${item.collection.id}/item/${item._id}/preview">${item.title}</a></h2>
            ${item.excerpt ? `<div class="excerpt">${item.excerpt}</div>` : ''}
            <div class="meta">
              <a href="${item.link}" class="original-link">(Original)</a><br/>
              ${new URL(item.link).hostname} • Saved on ${dayjs(item.created).format('MMM DD')} • ${item.readTime || '1'} min read
            </div>
          </div>
        `
        )
        .join('')}
    </div>
  </body>
  </html>
  `;

  return emailBody;
}

async function sendEmail(digestHTML) {
  let transporter = nodemailer.createTransport({
    host: 'smtp.mail.me.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `George Penston <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_TO,
    subject: `Your Read Later Digest: ${dayjs().format('MMM DD')}`,
    html: digestHTML,
  });
}

(async () => {
  try {
    console.log("Fetching items...");
    const items = await getRaindropItems();
    console.log(`Fetched ${items.length} items`);
    const digestHTML = buildEmailHTML(items);
    console.log("Sending email...");
    await sendEmail(digestHTML);
    console.log("Digest sent successfully!");
  } catch (error) {
    console.error("Error sending digest:", error);
    process.exit(1);
  }
})();
