import { searchBySku, getCache, setCache, searchByKeywords } from './db_util.js';
import { load } from 'cheerio';
import axios from 'axios';

const scrapeHtml = (html) => {
  const $ = load(html);
  const title = $('.CBD-TitleWrapper > .CBD-ProductDetailTitle').text().trim();
  const author = $('.CBD-ProductDetailAuthor:contains("By:") a').first().text().trim();
  const price = $('.CBD-ProductDetailActionPrice').text().trim().match(/\$([\d.]+)/)[1]; 
  return { title, author, price };
};

const oneDay = 60 * 60 * 24;

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
