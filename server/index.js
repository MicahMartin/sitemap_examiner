import express from 'express';
import {validateRequest, fetchAndStoreData, closeDb, getBySku} from './util/server_util.js';
import packageJson from './package.json' assert { type: "json" };


await fetchAndStoreData();

const server = express();
const middleware = [validateRequest];

server.get("/product/:sku", middleware, async (req, res, next) => {
  try {
    const sku = req.params["sku"];
    const product = await getBySku(sku);
    if(!product){
      res.status(404);
      res.json({message: "404 sku not found"});
    }
    res.json(product);
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

const PORT = process.env.PORT || 8032;
server.listen(PORT);

process.on('exit', function() {
  console.log('About to close');
  closeDb();
});
