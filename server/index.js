import packageJson from './package.json' assert { type: "json" };
import { fetchAndStoreData } from './util/db_util.js';
import { getBySku } from './util/server_util.js';
import express from 'express';
import chalk from 'chalk';
import cors from 'cors';

// Fetch and store data before starting the server
console.log(chalk.yellow("Server Starting!"));
fetchAndStoreData();
const server = express();
server.use(cors());

// Define a route for handling product requests by SKU
server.get("/product/:sku", async (req, res, next) => {
  try {
    const sku = req.params["sku"];
    const product = await getBySku(sku);
    // Set HTTP status code to 404 if product is not found
    if (!product) {
      res.status(404);
      res.json({ message: `404 product with sku:${sku} not found` });
    } else {
      res.json(product); // Send the retrieved product details as JSON response
    }
  } catch (e) {
    next(e); // Call the error handling middleware in case of an exception
  }
});

// Define a route for the status page
server.get("/status", (req, res) => {
  const statusObj = {
    server_port: PORT,
    server_version: packageJson.version,
  };

  res.json(statusObj);
});

// Define a global error handling middleware
server.use((err, req, res, next) => {
  console.error(chalk.red(err));
  res.status(err.status || 500).json({ status: err.status, message: err.message });
});

const PORT = process.env.PORT || 8032;
server.listen(PORT);
