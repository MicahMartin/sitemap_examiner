import { Client } from '@opensearch-project/opensearch';
import axios from 'axios';
import chalk from 'chalk';
import redis from 'redis';
import cliProgress from 'cli-progress';
import sax from 'sax';
import fs from 'fs';


console.log(chalk.yellow("connecting to cache"));
const cache = redis.createClient();
cache.connect();

console.log(chalk.yellow("connecting to open search"));
const openSearchClient = new Client({ node: "http://localhost:9200" });

const indexName = "products";
const indexExists = await openSearchClient.indices.exists({
  index: indexName,
});

if(indexExists){
  console.log(chalk.yellow("recreating open search product index"));
  await openSearchClient.indices.delete({index:indexName});
}

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
      number_of_replicas: 3,
    },
  },
};

openSearchClient.indices.create({
  index: indexName,
  body: config
});


export const getCache = async (key) => cache.get(key);
export const setCache = async (key, value, expiration) => cache.set(key, value, expiration);

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

const extractKeywordsFromUrl = (url) => {
  let cleanedUrl = url.replace(/^https:\/\/www\.christianbook\.com/, '');

  const skuIndex = cleanedUrl.indexOf('/pd/');
  cleanedUrl = cleanedUrl.slice(0, skuIndex);
  const uuidIndex = cleanedUrl.lastIndexOf('/');
  cleanedUrl = uuidIndex !== -1 ? cleanedUrl.slice(0, uuidIndex) : cleanedUrl;

  const keywords = cleanedUrl.replace(/-/g, ' ').split('/').filter(segment => segment !== '');

  return keywords;
}

const progressBar = new cliProgress.SingleBar({
  format: 'Parsing and Loading [{bar}] {percentage}% | ETA: {eta}s | {value}/{total} URLs',
  barCompleteChar: '\u2588',
  barIncompleteChar: '\u2591',
});;

// Function to fetch and store data from sitemap 
// We spend some extra time setting this up when server starts,
// But now we get constant lookup time when searching by sku
export const fetchAndStoreData = async () => {
  // Avoid loading the entire XML file into memory at once!
  try {
    const startTime = performance.now();
    // Check if sitemap4.xml exists on disk, if not, download and save it
    const SITEMAP_URL = process.env.SITEMAP_URL || "https://www.christianbook.com/sitemap4.xml";
    const SITEMAP_PATH = process.env.SITEMAP_PATH || "./data/sitemap4.xml";
    progressBar.start(fs.statSync(SITEMAP_PATH).size, 0);

    const parser = sax.createStream(false, { lowercase: true });

    if (!fs.existsSync(SITEMAP_PATH)) {
      const startTime = performance.now();
      console.log(chalk.green("Downloading sitemap!"));

      const { data } = await axios.get(SITEMAP_URL, { responseType: "arraybuffer" });
      fs.writeFileSync(SITEMAP_PATH, data);

      const endTime = performance.now();
      console.log(chalk.green(`Finished downloading sitemap, took ${(endTime - startTime) / 1000} seconds`));
    }

    let bytesProcessed = 0;
    const siteMap = fs.createReadStream(SITEMAP_PATH);
    siteMap.on('data', chunk => progressBar.update(bytesProcessed += chunk.length));
    let urlCounter = 0;
    let currentUrl = null;
    let insertBuffer = [];

    parser.on('opentag', node => {
      if (node.name === 'loc') currentUrl = '';
    });

    parser.on('text', text => {
      if (currentUrl !== null) currentUrl += text;
    });

    parser.on('end', async () => {
      await openSearchClient.bulk({
        index: indexName,
        body: insertBuffer, 
      });
      const endTime = performance.now();
      progressBar.stop();
      console.log(chalk.green(`imported ${urlCounter} URLs successfully, took ${(endTime - startTime) / 1000} seconds`));
    });

    parser.on('closetag', tagName => {
      if (tagName === 'loc' && currentUrl !== null) {
        const match = currentUrl.match(/\/pd\/([a-zA-Z0-9]+)/);

        if (match && match[1]) {
          const sku = match[1];
          urlCounter++;
          insertBuffer.push({ index: { _index: indexName } });
          insertBuffer.push({ 
            sku, 
            url: currentUrl, 
            keywords: extractKeywordsFromUrl(currentUrl),
          });
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

