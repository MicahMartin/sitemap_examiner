import axios from 'axios';
import mysql from 'mysql';
import { XMLValidator, XMLParser } from 'fast-xml-parser';

export const validateRequest = (req, res, next) => {
  console.debug(`validating request`);
  if (!true) {
    // Validation didn't pass
    throw({ status: 401, message: 'Validation failed' });
  }
  next();
};

export const getSiteMap = async (siteMapUrl) => {
  // Log Request Statistics
  // TODO: Logic to pull from cache
  try {
    const res = await axios.get(siteMapUrl);
    if(res.status === 200){
      const isValid = XMLValidator.validate(res.data);
      if(!isValid){
        throw(isValid.err);
      }
      const parser = new XMLParser();
      return parser.parse(res.data);
    }
  } catch (e) {
    console.error(e);
    return false;
  }
}

const connection = mysql.createConnection({
  host: 'localhost', // Your MySQL host
  user: 'your_username', // Your MySQL username
  password: 'your_password', // Your MySQL password
  database: 'product_catalog' // Your database name
});

const fetchAndStoreData = async () => {
  try {
    const response = await axios.get('https://christianbook.com/sitemap4.xml');
    const xmlData = response.data;

    parseString(xmlData, async (err, result) => {
      if (err) {
        console.error('XML parsing error:', err);
        return;
      }

      const productUrls = result.urlset.url.map(url => url.loc[0]);
      const skuProducts = productUrls.filter(url => url.includes('/sku/'));

      await connection.connect();

      for (const productUrl of skuProducts) {
        const sku = productUrl.split('/').pop();

        // Assuming you have a way to scrape the necessary data from the productUrl
        const title = /* Extract title */;
        const author = /* Extract author */;
        const price = /* Extract price */;

        const query = `
          INSERT INTO products (sku, title, author, price)
          VALUES (?, ?, ?, ?)
        `;

        await connection.query(query, [sku, title, author, price]);
      }

      console.log('Data imported successfully');

      connection.end();
    });
  } catch (error) {
    console.error('Error:', error);
  }
};

fetchAndStoreData();
