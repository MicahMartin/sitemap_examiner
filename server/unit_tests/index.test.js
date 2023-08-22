import chai from 'chai';
import chaiHttp from 'chai-http';

chai.use(chaiHttp);
const expect = chai.expect;

describe('Server routes and functionality', function () {
  describe('GET /product/:sku', () => {
    it('should return a product when a valid SKU is provided', async () => {
      const sku = '404'; // 404 sku just because its easy to remember
      const res = await chai.request(`http://localhost:8032`).get(`/product/${sku}`);
      expect(res).to.have.status(200);
    });

    it('should return a 404 status when an invalid SKU is provided', async () => {
      const sku = '405';
      const res = await chai.request(`http://localhost:8032`).get(`/product/${sku}`);
      expect(res).to.have.status(404);
    });
  });

  describe('GET /search', function () {
    it('should return products when valid keywords are provided', async () => {
      const keywords = 'jesus christ'; // Replace with valid keywords
      const res = await chai.request(`http://localhost:8032`).get('/search').query({ keywords });
      expect(res).to.have.status(200);
      expect(res.body).to.be.an('array');
    });

    it('should return an empty array when no products match keywords', async () => {
      // why was foobuzzin folife actually matching stuff?
      const keywords = 'foobuzzin defwontmatch';
      const res = await chai.request(`http://localhost:8032`).get('/search').query({ keywords });
      expect(res.body).to.be.an('array').and.lengthOf(0);
    });
  });
});
