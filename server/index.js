import packageJson from './package.json' assert { type: "json" };
import { fetchAndStoreData, flushCache, initDb } from './util/db_util.js';
import { getByKeywords, getBySku } from './util/server_util.js';
import express from 'express';
import chalk from 'chalk';
import cors from 'cors';


/** Express router providing search related routes
 * @module routers
 */

/**
 * Server configuration and route definitions
 */
console.log(chalk.yellow("Server Starting!"));
const server = express();
server.use(cors());

/**
 * Fetch and store data before starting the server
 */
await initDb();
fetchAndStoreData();

/**
 * Route for handling product requests by SKU
 * @name server/product
 * @method
 * @memberof module:routers
 * @inner
 * @param {string} req.params.sku - SKU of the product to retrieve
 */
server.get("/product/:sku", async (req, res, next) => {
  try {
    const sku = req.params["sku"];
    const product = await getBySku(sku);
    if (!product) {
      res.status(404);
      res.json({ message: `404 product with sku:${sku} not found` });
    } else {
      res.json(product);
    }
  } catch (e) {
    next(e);
  }
});

/**
 * Route for searching products by keywords
 * @name server/search
 * @method
 * @memberof module:routers
 * @inner
 * @param {string} req.query.keywords - Keywords to search for
 */
server.get("/search", async (req, res, next) => {
  try {
    const keywords = req.query.keywords;
    const products = await getByKeywords(keywords);
    if (!products) {
      res.status(404);
      res.json({ message: `404 product with keywords:${keywords} not found` });
    } else {
      res.json(products);
    }
  } catch (e) {
    next(e);
  }
});

/**
 * Route for fetching server status
 * @name server/status
 * @method
 * @memberof module:routers
 * @inner
 */
server.get("/status", (req, res) => {
  const statusObj = {
    server_port: PORT,
    server_version: packageJson.version,
  };
  res.json(statusObj);
});

/**
 * Route for flushing cache items
 * @name server/flush_cache
 * @method
 * @memberof module:routers
 * @inner
 * @param {string} req.query.cacheKey - Key of the cache item to flush
 */
server.get("/flush_cache", (req, res, next) => {
  try {
    const cacheKey = req.query.cacheKey;
    if (!cacheKey) {
      flushCache();
      res.json({ message: `entire cache flushed` });
    } else {
      flushCache(cacheKey);
      res.json({ message: `cache item ${cacheKey} flushed` });
    }
  } catch (e) {
    next(e);
  }
});

/**
 * Global error handling middleware
 */
server.use((err, req, res, next) => {
  console.error(chalk.red(err));
  res.status(err.status || 500).json({ status: err.status, message: err.message });
});

const PORT = process.env.PORT || 8032;
server.listen(PORT);
