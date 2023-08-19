import axios from 'axios';
import { load } from 'cheerio';
import Database from 'better-sqlite3';
import { parseString } from 'xml2js';
import fs from 'fs';

// We could use redis for both data store & cache, didn't really need mysql
const db = new Database(':memory:', {});
db.pragma('journal_mode = WAL');
db.prepare(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    sku TEXT UNIQUE,
    url TEXT
  )
`).run();

// store data in sqlite with a sku column for constant lookup time
export const fetchAndStoreData = async () => {
  const SITEMAP_URL = process.env.SITEMAP_URL || "https://www.christianbook.com/sitemap4.xml";
  try {
    // Check if sitemap4.xml exists on disk, 
    // if it doesn't then download it
    if(!fs.existsSync("./data/sitemap4.xml")){
      const { data } = await axios.get(SITEMAP_URL, {
        responseType: "arraybuffer",
      });
      fs.writeFileSync("./data/sitemap4.xml", data);
    }

    const siteMap = fs.readFileSync("./data/sitemap4.xml");
    parseString(siteMap, async (err, result) => {
      if (err) {
        console.error('XML parsing error:', err);
        return;
      }


      // TODO: Add condition to check if item already exists
      const insertStatement = db.prepare(`
        REPLACE INTO products (sku, url)
        VALUES (?, ?)
      `);

      // sqlite uses transactions for batch processing
      db.transaction(() => {
        const pattern = /\/pd\/([a-zA-Z0-9]+)/;
        const productUrls = result.urlset.url.map(url => url.loc[0]);
        for (const productUrl of productUrls) {
          const match = productUrl.match(pattern);
          let sku = '';

          if (match && match[1]){
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

const scrapeHtml = (html) => {
  const $ = load(html);
  // TODO: More specific HTML selector. 
  // this code is fragile and probalby error prone.
  const title = $('.CBD-TitleWrapper > .CBD-ProductDetailTitle').text();
  const author = $('.CBD-ProductDetailAuthor > .CBD-ProductDetailAuthorLink').first().text().trim();
  const price = $('.CBD-ProductDetailActionPrice').text().trim().match(/\$([\d.]+)/)[1]; 
  return {title, author, price};
 };

export const getBySku = async (sku) => {
  // Get the URL from our sku DB
  const row = db.prepare(`
    SELECT * 
    FROM products 
    WHERE sku = ?
    `).get(sku);
  // Check Redis Cache before requesting from christianbook
  let isCached = false;
  if(isCached){
    return {};
  } else {
    const { data } = await axios.get(row.url);
    const payload = scrapeHtml(data);
    // Add payload to cache
    return payload;
  }
}


export const closeDb = () => db.close(); 

// Validate API requests
export const validateRequest = (req, res, next) => {
  console.debug("validating request");
  if (!true) {
    // Validation didn't pass
    throw({ status: 401, message: "Validation failed" });
  }
  next();
};
