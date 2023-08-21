import { getRowBySku, getCache, setCache } from './db_util.js';
import { load } from 'cheerio';
import axios from 'axios';

const scrapeHtml = (html) => {
  const $ = load(html);
  const title = $('.CBD-TitleWrapper > .CBD-ProductDetailTitle').text().trim();
  const author = $('.CBD-ProductDetailAuthor:contains("By:") a').first().text().trim();
  const price = $('.CBD-ProductDetailActionPrice').text().trim().match(/\$([\d.]+)/)[1]; 
  return { title, author, price };
};

export const getBySku = async (sku) => {
  const row = await getRowBySku(sku);

  if(!row){
    return false;
  }

  const cachedResult = await getCache(sku);
  if (cachedResult) {
    return JSON.parse(cachedResult);
  } else {
    console.log(row);
    const { data } = await axios.get(row.url);
    const payload = scrapeHtml(data);

    const oneDay = 60 * 60 * 24;
    setCache(sku, JSON.stringify(payload), { EX: oneDay });
    return payload;
  }
};
