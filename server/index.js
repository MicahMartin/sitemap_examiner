import { 
  validateRequest, 
  fetchAndStoreData, 
  closeDb, 
  getBySku 
} from './util/server_util.js';
import express from 'express';
import packageJson from './package.json' assert { type: "json" };

// Fetch and store data before starting the server
await fetchAndStoreData();
const server = express();

// Define middleware functions
const middleware = [validateRequest];

// Define a route for handling product requests by SKU
server.get("/product/:sku", middleware, async (req, res, next) => {
  try {
    const sku = req.params["sku"];
    const product = await getBySku(sku);
    // Set HTTP status code to 404 if product is not found
    if (!product) {
      res.status(404);
      res.json({ message: "404 sku not found" });
    }
    res.json(product); // Send the retrieved product details as JSON response
  } catch (e) {
    next(e); // Call the error handling middleware in case of an exception
  }
});

// Define a route for the status page
server.get("/status", async (req, res) => {
  const statusObj = {
    server_port: PORT,
    server_version: packageJson.version, // Include the server version from package.json in the status object
  };

  res.json(statusObj);
});

// Define a global error handling middleware
server.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ status: err.status, message: err.message });
});

const PORT = process.env.PORT || 8032;
server.listen(PORT);

// Attach an exit event listener to close the database connection before exiting
process.on('exit', function() {
  closeDb();
});
