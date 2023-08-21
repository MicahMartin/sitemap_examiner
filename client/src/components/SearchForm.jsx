import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Form, Button, Card, Alert, Spinner } from 'react-bootstrap';
import { Typeahead } from 'react-bootstrap-typeahead';

const SearchForm = () => {
  const [sku, setSku] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [keywordSuggestions, setKeywordSuggestions] = useState([]);

  const handleSearch = async event => {
    event.preventDefault(); // Prevent form submission

    try {
      setLoading(true); // Set loading to true
      const response = await axios.get(`http://localhost:8032/product/${sku}`);
      setSearchResult(response.data);
      setErrorMessage('');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        setErrorMessage(`404 SKU ${sku} not found!`);
      } else {
        // uh oh?
        console.error('Error fetching data:', error);
        setErrorMessage('An error occurred');
      }
      setSearchResult(null);
    } finally {
      setLoading(false); // Set loading back to false
    }
  };

  const fetchKeywordSuggestions = async input => {
    try {
      const response = await axios.get(`http://localhost:8032/search?keywords=${input}`);
      console.log(response);
      setKeywordSuggestions(response.data);
    } catch (error) {
      console.error('Error fetching keyword suggestions:', error);
      setKeywordSuggestions([]);
    }
  };

  return (
    <Container className="mt-5">
      <Card>
        <Card.Body>
          <h1 className="mb-4">Product Search</h1>
          <Form onSubmit={handleSearch}>
            <Form.Group controlId="sku">
              <Form.Label>Enter SKU</Form.Label>
              <Typeahead
                id="sku-typeahead"
                options={keywordSuggestions.map(item => item.keywords.join(', '))}
                placeholder="Enter SKU"
                selected={sku ? [sku] : []}
                onChange={selected => {
                  if (selected[0]) {
                    const selectedSuggestion = keywordSuggestions.find(item =>
                      item.keywords.join(', ') === selected[0]
                    );
                    setSku(selectedSuggestion.sku);
                  } else {
                    setSku('');
                  }
                }}
                onInputChange={input => fetchKeywordSuggestions(input)}
              />
            </Form.Group>
            <Button type="submit" variant="primary">
              Search
            </Button>
          </Form>
          {loading && <Spinner animation="border" role="status" className="ml-2"/> }
          {errorMessage && <Alert variant="danger" className="mt-3">{errorMessage}</Alert>}
          {searchResult && (
            <div className="mt-4">
              <h2>{searchResult.title}</h2>
              <p>Author: {searchResult.author}</p>
              <p>Price: {searchResult.price}</p>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default SearchForm;
