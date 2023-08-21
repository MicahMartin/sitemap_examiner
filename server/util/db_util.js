import axios from 'axios';
import chalk from 'chalk';
import redis from 'redis';
import sqlite3 from 'sqlite3';
import sax from 'sax';
import fs from 'fs';

// Create a redis cache client instance using default redis port 6379
const cache = redis.createClient();
await cache.connect();

// Create a SQLite database and set up the products table
// We could definitely use redis for this too
// Using memory over disk for simplicitys sake
const db = new sqlite3.Database(':memory:');
db.prepare(`CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, sku TEXT UNIQUE, url TEXT)`).run();

export const getCache = async (key) => cache.get(key);
export const setCache = async (key, value, expiration) => cache.set(key, value, expiration);
export const getRowBySku = (sku) => {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM products WHERE sku = ?`, sku, (err, row) => {
      if(err){
        console.error(chalk.red(err));
        reject(err);
      } else {
        if (row) {
          resolve(row);
        } else {
          resolve(false); // Return false if no product is found
        }
      }
    });
  });
}

// Function to fetch and store data from sitemap 
// We spend some extra time setting this up when server starts,
// But now we get constant lookup time when searching by sku
export const fetchAndStoreData = async () => {
  // Avoid loading the entire XML file into memory at once!
  try {
    let urlCounter = 0;
    let currentUrl = null;
    const startTime = performance.now();
    // Setting strictness to false, dont validate since we're making the XML invalid by chunking it
    const parser = sax.createStream(false, { lowercase: true });

    parser.on('opentag', node => {
      if (node.name === 'loc') currentUrl = '';
    });

    parser.on('text', text => {
      if (currentUrl !== null) currentUrl += text;
    });

    parser.on('end', () => {
      const endTime = performance.now();
      console.log(chalk.green(`imported ${urlCounter} URLs successfully, took ${(endTime - startTime) / 1000} seconds`));
    });

    parser.on('closetag', tagName => {
      if (tagName === 'loc' && currentUrl !== null) {
        const match = currentUrl.match(/\/pd\/([a-zA-Z0-9]+)/);

        if (match && match[1]) {
          const sku = match[1];
          urlCounter++;
          const statement = db.prepare(`INSERT INTO products (sku, url) VALUES (?, ?)`);
          statement.run(sku, currentUrl);
          statement.finalize();
        }
        currentUrl = null;
      }
    });

    // Check if sitemap4.xml exists on disk, if not, download and save it
    const SITEMAP_URL = process.env.SITEMAP_URL || "https://www.christianbook.com/sitemap4.xml";
    const SITEMAP_PATH = process.env.SITEMAP_PATH || "./data/sitemap4.xml";
    if (!fs.existsSync(SITEMAP_PATH)) {
      const startTime = performance.now();
      console.log(chalk.green("Downloading sitemap!"));

      const { data } = await axios.get(SITEMAP_URL, { responseType: "arraybuffer" });
      fs.writeFileSync(SITEMAP_PATH, data);

      const endTime = performance.now();
      console.log(chalk.green(`Finished downloading sitemap, took ${(endTime - startTime) / 1000} seconds`));
    }

    const siteMap = fs.createReadStream(SITEMAP_PATH);
    siteMap.pipe(parser);
  } catch (error) {
    console.error(chalk.red('Error during sitemap ingestion:', error));
    throw(error);
  }
};

