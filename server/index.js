import express from 'express';
import {validateRequest, getSiteMap} from './util/server_util.js';
import packageJson from './package.json' assert { type: "json" };


const PORT = process.env.PORT || 8032;
const SITEMAP_URL = process.env.SITEMAP_URL || "https://www.christianbook.com/sitemap4.xml";
const siteMap = await getSiteMap(SITEMAP_URL);
console.log(siteMap);

const server = express();
const middleware = [validateRequest];

server.get("/product/:sku", middleware, async (req, res) => {
  try {
    const sku = req.params["sku"];
    res.json(sku);
  } catch (e) {
    next(e);
  }
});

// Status Page
server.get("/status", async (req, res) => {
  const statusObj = {
    server_port: PORT,
    server_version: packageJson.version,
  };

  res.json(statusObj);
});

// Error Page
server.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ status: err.status, message: err.message });
});

server.listen(PORT);
