import { getRowBySku, getCache, setCache } from './db_util.js';
import { load } from 'cheerio';
import axios from 'axios';

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
  const row = await getRowBySku(sku);

  if(!row){
    return false;
  }

  // Check redis Cache before requesting from Christianbook
  const cachedResult = await getCache(sku);
  if (cachedResult) {
    // Retrieve JSON from redis and parse it
    return JSON.parse(cachedResult);
  } else {
    // TODO: processing this in parallel with multiple workers would be nice
    // but splitting HTML would make it invalid, not sure if cheerio would be able to parse it?
    const { data } = await axios.get(row.url);
    const payload = scrapeHtml(data);

    // Add payload to cache with a one-day expiration
    // No magic numbers!
    const oneDay = 60 * 60 * 24;
    setCache(sku, JSON.stringify(payload), { EX: oneDay });
    return payload;
  }
};
