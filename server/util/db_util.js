import { Client } from '@opensearch-project/opensearch';
import axios from 'axios';
import chalk from 'chalk';
import redis from 'redis';
import cliProgress from 'cli-progress';
import sax from 'sax';
import fs from 'fs';

/** Utility functions for server
 * @module db_util
 */


const cache = redis.createClient();
const openSearchClient = new Client({ node: "http://localhost:9200" });

const indexName = "products";

/**
 * Initialization function for the db and cache
 * @async
 * @name db_util/initDb
 * @method
 * @memberof module:db_util
 * @inner
 */
export const initDb = async () => {
  console.log(chalk.yellow("connecting to cache"));
  cache.connect();


  console.log(chalk.yellow("checking open search for preexisting index"));
  const indexExists = await openSearchClient.indices.exists({
    index: indexName,
  });

  if(indexExists){
    console.log(chalk.yellow("deleting open search product index"));
    await openSearchClient.indices.delete({index:indexName});
  }

  // Setting up the open search mappings
  // We definitely want to index on the sku for constant time lookups
  const config = {
    mappings: {
      properties: {
        sku: {
          type: 'keyword',
        },
        url: { type: 'text' },
        keywords: { type: 'text' },
      },
    },
    settings: {
      index: {
        number_of_shards: 4,
        number_of_replicas: 2,
      },
    },
  };

  console.log(chalk.yellow("creating open search product index"));
  await openSearchClient.indices.create({
    index: indexName,
    body: config
  });
}

/**
 * Utility function to get a value from the cache by key
 * @async
 * @name db_util/getCache
 * @method
 * @memberof module:db_util
 * @inner
 * @param {string} key - The key to retrieve from the cache
 * @returns {Promise<string|null>} The cached value if found or null
 */
export const getCache = async (key) => cache.get(key);

/**
 * Utility function to set a value in the cache with an optional expiration time
 * @async
 * @name db_util/setCache
 * @method
 * @memberof module:db_util
 * @inner
 * @param {string} key - The key to set in the cache
 * @param {string} value - The value to store in the cache
 * @param {number|null} expiration - Optional expiration time in seconds
 * @returns {Promise<string>} A promise indicating success
 */
export const setCache = async (key, value, expiration) => cache.set(key, value, expiration);

/**
 * Utility function to flush the entire cache or a specific cache item
 * @async
 * @name db_util/flushCache
 * @method
 * @memberof module:db_util
 * @inner
 * @param {string} [cacheKey=''] - The key of the cache item to flush (optional)
 * @returns {Promise<void>} A promise containing result
 */
export const flushCache = async (cacheKey = '') => {
  try {
    if(cacheKey === '') {
      await cache.flushAll();
      console.log(chalk.green('Redis cache flushed successfully.'));
    }else {
      await cache.del(cacheKey);
      console.log(chalk.green(`Redis cache item with key "${cacheKey}" flushed successfully.`));
    }

  } catch (error) {
    console.error(chalk.red('Error flushing Redis cache:', error));
  }
};

/**
 * Utility function to search for a product by SKU in OpenSearch
 * @async
 * @name db_util/searchBySku
 * @method
 * @memberof module:db_util
 * @inner
 * @param {string} sku - The SKU to look for
 * @returns {Promise<object|null>} The product details if found, or null
 */
export const searchBySku = async (sku) => {
  const query = {
    query:{
      term: {
        sku
      }
    }
  };

  const res = await openSearchClient.search({
    index: indexName,
    body: query,
  });
  return res.body.hits.hits[0];
}

/**
 * Utility function to search for products by keywords in OpenSearch
 * @async
 * @name db_util/searchByKeywords
 * @method
 * @memberof module:db_util
 * @inner
 * @param {string} keywords - The keywords to look for
 * @returns {Promise<object[]>} promise containing array of products matching the keywords
 */
export const searchByKeywords = async (keywords) => {
  const keywordsArray = keywords.split(' ');
  const query = {
    query: {
      bool: {
        should: keywordsArray.map(keyword => ({
          fuzzy: {
            keywords: {
              value: keyword,
              fuzziness: 'AUTO',
              max_expansions: 50
            }
          }
        }))
      }
    }
  };

  const res = await openSearchClient.search({
    index: indexName,
    body: query,
  });
  return res.body.hits.hits.map(hit => hit._source);
};

/**
 * Parses keywords from a URL path
 * @name db_util/extractKeywordsFromUrl
 * @method
 * @memberof module:db_util
 * @inner
 * @param {string} url - The URL to extract keywords from
 * @returns {string[]} An array of extracted keywords
 */
const extractKeywordsFromUrl = (url) => {
  let cleanedUrl = url.replace(/^https:\/\/www\.christianbook\.com/, '');

  const skuIndex = cleanedUrl.indexOf('/pd/');
  cleanedUrl = cleanedUrl.slice(0, skuIndex);
  const uuidIndex = cleanedUrl.lastIndexOf('/');
  cleanedUrl = uuidIndex !== -1 ? cleanedUrl.slice(0, uuidIndex) : cleanedUrl;

  const keywords = cleanedUrl.replace(/-/g, ' ').split('/').filter(segment => segment !== '');

  return keywords;
}

/**
 * Utility function to fetch and store data from sitemap to OpenSearch index
 * We spend some extra time setting this up when server starts,
 * But now we get constant lookup time when searching by sku
 * @async
 * @name db_util/fetchAndStoreData
 * @method
 * @memberof module:db_util
 * @inner
 */
export const fetchAndStoreData = async () => {
  // Avoid loading the entire XML file into memory at once!
  console.log(chalk.yellow("importing xml to open search"));
  try {
    let startTime = performance.now();
    let endTime = performance.now();
    // Check if sitemap4.xml exists on disk, if not, download and save it
    const SITEMAP_URL = process.env.SITEMAP_URL || "https://www.christianbook.com/sitemap4.xml";
    const SITEMAP_PATH = process.env.SITEMAP_PATH || "./data/sitemap4.xml";
    const parser = sax.createStream(false, { lowercase: true });

    if (!fs.existsSync(SITEMAP_PATH)) {
      console.log(chalk.green("Downloading sitemap!"));

      const { data } = await axios.get(SITEMAP_URL, { responseType: "arraybuffer" });
      fs.writeFileSync(SITEMAP_PATH, data);

      endTime = performance.now();
      console.log(chalk.green(`Finished downloading sitemap, took ${(endTime - startTime) / 1000} seconds`));
    }

    // progress bar for the console
    // const progressBar = new cliProgress.SingleBar({
    //   format: `${chalk.yellow("Parsing Sitemap Xml...")} ${chalk.magenta('[{bar}]')} ${chalk.yellow('{percentage}%')} | ETA: {eta}s | {value}/{total} URLs`,
    //   barCompleteChar: '\u2588',
    //   barIncompleteChar: '\u2591',
    // });

    startTime = performance.now();
    // progressBar.start(fs.statSync(SITEMAP_PATH).size, 0);

    let bytesProcessed = 0;
    const siteMap = fs.createReadStream(SITEMAP_PATH);
    // siteMap.on('data', chunk => progressBar.update(bytesProcessed += chunk.length));
    let urlCounter = 0;
    let insertCounter = 0;
    let currentUrl = null;
    const bufferMax = 12500;
    let insertBuffers = [[]];
    let currentBuffer = 0;

    parser.on('opentag', node => {
      if (node.name === 'loc') currentUrl = '';
    });

    parser.on('text', text => {
      if (currentUrl !== null) currentUrl += text;
    });

    parser.on('end', async () => {
      // call multiple bulk inserts with promise all
      // progressBar.stop();
      endTime = performance.now();
      console.log(chalk.green(`parsed ${urlCounter} URLs, took ${(endTime - startTime) / 1000} seconds`));
      const promiseArray = [];
      console.log(chalk.yellow(`creating ${insertBuffers.length} bulk insert requests`));

      for (let i = 0; i < insertBuffers.length; i++) {
        promiseArray.push(openSearchClient.bulk({
          index: indexName,
          body: insertBuffers[i], 
        }));
      }

      startTime = performance.now();
      await Promise.all(promiseArray);
      endTime = performance.now();
      console.log(chalk.green(`resolved ${insertBuffers.length} bulk insert requests, took ${(endTime - startTime) / 1000} seconds`));
      console.log(chalk.magentaBright(`server ready!`));
    });

    parser.on('closetag', tagName => {
      if (tagName === 'loc' && currentUrl !== null) {
        const match = currentUrl.match(/\/pd\/([a-zA-Z0-9]+)/);

        if (match && match[1]) {
          const sku = match[1];
          urlCounter++;
          // split the data into multiple buffers so we can do multiple inserts async
          insertBuffers[currentBuffer].push({ index: { _index: indexName } });
          insertBuffers[currentBuffer].push({ 
            sku, 
            url: currentUrl, 
            keywords: extractKeywordsFromUrl(currentUrl),
          });
          if(insertCounter++ === bufferMax){
            insertBuffers.push([]);
            insertCounter = 0;
            currentBuffer++;
          }
        }
        currentUrl = null;
      }
    });

    siteMap.pipe(parser);
  } catch (error) {
    console.error(chalk.red('Error during sitemap ingestion:', error));
    throw(error);
  }
};

