import { searchBySku, getCache, setCache, searchByKeywords } from './db_util.js';
import { load } from 'cheerio';
import axios from 'axios';

/** Utility functions for server
 * @module server_util
 */

/**
 * Scrape product details from HTML using Cheerio.
 * @name server_util/scrapeHtml
 * @method
 * @memberof module:server_util
 * @inner
 * @param {string} html - The HTML content to scrape.
 * @returns {object} An object containing the scraped product details.
 */
const scrapeHtml = (html) => {
  // These HTML selectors are fragile. This is probably error prone
  // TODO: Explore scraping html in chunks so we dont process entire file
  const $ = load(html);
  const title = $('.CBD-TitleWrapper > .CBD-ProductDetailTitle').text().trim();
  const author = $('.CBD-ProductDetailAuthor:contains("By:") a').first().text().trim();
  const price = $('.CBD-ProductDetailActionPrice').text().trim().match(/\$([\d.]+)/)[1]; 
  return { title, author, price };
};

const oneDay = 60 * 60 * 24;

/**
 * Retrieve a product by SKU, either from cache or by searching.
 * @name server_util/getBySku
 * @async
 * @method
 * @memberof module:server_util
 * @inner
 * @param {string} sku - The SKU of the product to retrieve.
 * @returns {Promise<object|boolean>} The product details if found, or false if not found.
 */
export const getBySku = async (sku) => {
  const cachedResult = await getCache(sku);

  if (cachedResult) {
    return JSON.parse(cachedResult);
  } else {
    const product = await searchBySku(sku);
    console.log(product);

    if(!product){
      return false;
    }

    console.log(product);
    const { data } = await axios.get(product._source.url);
    const result = scrapeHtml(data);

    setCache(sku, JSON.stringify(result), { EX: oneDay });
    return result;
  }
};

/**
 * Retrieve products by keywords, either from cache or by searching.
 * @async
 * @method
 * @param {string} keywords - The keywords to search for.
 * @returns {Promise<object[]>} An array of products matching the keywords.
 */
export const getByKeywords = async (keywords) => {
  const keywordsCacheKey = `keywords:${keywords}`;
  const cachedResult = await getCache(keywordsCacheKey);

  if (cachedResult) {
    return JSON.parse(cachedResult);
  } else {
    const results = await searchByKeywords(keywords);
    console.log(results);

    setCache(keywordsCacheKey, JSON.stringify(results), { EX: oneDay});
    return results;
  }
};
