import Database from 'better-sqlite3';
import { parseString } from 'xml2js';
import { load } from 'cheerio';
import axios from 'axios';
import redis from 'redis';
import fs from 'fs';

// Create a Redis cache client instance using default redis port 6379
const cache = redis.createClient();
await cache.connect();

// Create an in-memory SQLite database and set up the products table
// We could definitely use redis for this too
const db = new Database(':memory:', {});
db.pragma('journal_mode = WAL');
db.prepare(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    sku TEXT UNIQUE,
    url TEXT
  )
`).run();

// Function to fetch and store data from sitemap
// We spend some extra time setting this up when server starts,
// But now we get constant lookup time when searching by sku
export const fetchAndStoreData = async () => {
  const SITEMAP_URL = process.env.SITEMAP_URL || "https://www.christianbook.com/sitemap4.xml";
  try {
    // Check if sitemap4.xml exists on disk, if not, download and save it
    if (!fs.existsSync("./data/sitemap4.xml")) {
      const { data } = await axios.get(SITEMAP_URL, { responseType: "arraybuffer" });
      fs.writeFileSync("./data/sitemap4.xml", data);
    }

    const siteMap = fs.readFileSync("./data/sitemap4.xml");
    parseString(siteMap, async (err, result) => {
      if (err) {
        console.error('XML parsing error:', err);
        return;
      }

      // Prepare an SQL statement for inserting or updating product data
      const insertStatement = db.prepare(`
        INSERT INTO products (sku, url)
        VALUES (?, ?)
      `);

      // Use a transaction for batch processing
      db.transaction(() => {
        const pattern = /\/pd\/([a-zA-Z0-9]+)/;
        const productUrls = result.urlset.url.map(url => url.loc[0]);

        for (const productUrl of productUrls) {
          const match = productUrl.match(pattern);
          let sku = '';

          if (match && match[1]) {
            sku = match[1];
            insertStatement.run(sku, productUrl);
          }
        }
      }).call();
      console.log('Data imported successfully');
    });
  } catch (error) {
    console.error('Error:', error);
  }
};

// Scrape product details from HTML
const scrapeHtml = (html) => {
  //FIXME: These HTML selectors are pretty fragile. This code is probably error prone
  const $ = load(html);
  const title = $('.CBD-TitleWrapper > .CBD-ProductDetailTitle').text().trim();
  //FIXME: Doesnt work when theres more than one author :(
  const author = $('.CBD-ProductDetailAuthor:contains("By:") a').first().text().trim();
  const price = $('.CBD-ProductDetailActionPrice').text().trim().match(/\$([\d.]+)/)[1]; 
  return { title, author, price };
};

// Retrieve product details by SKU
export const getBySku = async (sku) => {
  // prepared statement to grab url by sku
  const row = db.prepare(`
    SELECT * 
    FROM products 
    WHERE sku = ?
  `).get(sku);

  // Check Redis Cache before requesting from Christianbook
  const cachedResult = await cache.get(sku);
  if (cachedResult) {
    // Retrieve JSON from Redis and parse it
    return JSON.parse(cachedResult);
  } else {
    // FIXME: Chunking so we dont have to load the whole page?
    const { data } = await axios.get(row.url);
    const payload = scrapeHtml(data);

    // Add payload to cache with a one-day expiration
    // No magic numbers!
    const oneDay = 60 * 60 * 24;
    await cache.set(sku, JSON.stringify(payload), { EX: oneDay });
    return payload;
  }
};
