import { Container, Form, Button, Card, Alert, Spinner } from 'react-bootstrap';
import { Typeahead } from 'react-bootstrap-typeahead';
import React, { useState } from 'react';
import axios from 'axios';
import './SearchForm.css';

/**
 * the search form
 * @returns {JSX.Element} the component
 */
const SearchForm = () => {
  // TODO: better state management
  const [sku, setSku] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [keywordSuggestions, setKeywordSuggestions] = useState([]);

  /**
   * handles the search form submission
   * @async
   * @param {Event} event - the form submission event
   */
  const handleSearch = async event => {
    event.preventDefault(); // prevent enter keypress from reloading page

    console.log(`the sku ${sku}`);
    try {
      setLoading(true); // set loading to true for spinner
      setSearchResult(null);

      const { data } = await axios.get(`http://localhost:8032/product/${sku}`);

      setSearchResult(data);
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
      setLoading(false);
    }
  };

  /**
   * fetches keyword suggestions based on input and sets it to state
   * @async
   * @param {string} input - The input for keyword suggestion
   */
  const fetchKeywordSuggestions = async input => {
    try {
      // would it be crazy if we initiated the product request for every keyword
      // suggested so it can preload?
      const { data } = await axios.get(`http://localhost:8032/search?keywords=${input}`);

      setKeywordSuggestions(data);
    } catch (error) {
      console.error('Error fetching keyword suggestions:', error);
      setKeywordSuggestions([]);
    }
  };

  // typeahead component
  const typeAheadComponent = (
    <Typeahead
      id="sku-typeahead"
      options={keywordSuggestions.map(item => item.keywords.join(', '))}
      placeholder="Enter SKU or Keywords"
      selected={sku ? [sku] : []}

      onChange={selected => {
        if (selected[0]) {
          // find the selected suggestion in keywordSuggestions
          const selectedSuggestion = keywordSuggestions.find(item =>
            // join it so we can show all the keywords on one line
            item.keywords.join(', ') === selected[0]
          );
          setSku(selectedSuggestion.sku);
        } else {
          setSku('');
        }
      }}

      onInputChange={input => {
        // fetch keyword suggestion every time input changes
        fetchKeywordSuggestions(input);
        setSku(input); // update the sku state with the input value
      }}
    />
  );

  return (
    <Container className="mt-5">
      <Card className="main-card">
        <Card.Body>
          <h1 className="mb-4">Sitemap Examiner</h1>

          <Form onSubmit={handleSearch}>
            <Form.Group className="" controlId="sku">
              <Form.Label>Search by SKU or Keywords!</Form.Label>

              { typeAheadComponent }

            </Form.Group>
            <Button className="search-btn" type="submit" variant="primary">
              Search
            </Button>
          </Form>

          {loading && <Spinner animation="border" role="status" className="spinner ml-2"/> }

          {errorMessage && <Alert variant="danger" className="alert-error mt-3">{errorMessage}</Alert>}

          <div className={`mt-4 result ${searchResult ? 'show' : ''}`}> 
          {searchResult && (
            <div className="result-content">
              <h2 className="result-title">{searchResult.title}</h2>
              <p className="result-property">
                Author: <span className="result-value">{searchResult.author}</span>
              </p>
              <p className="result-property">
                Price: <span className="result-value">${searchResult.price}</span>
              </p>
            </div>
          )}
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default SearchForm;
