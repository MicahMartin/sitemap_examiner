# Sitemap Examiner service Documentation

## How Do You Run This service?
To start the service, clone the repo and run build.sh. This script installs dependencies like Open Search & Redis, then builds the nodeJs with npm install.

To run the service, call the run.sh script. It will start open search & redis, then it will start vite which serves our client side code to http://localhost:5173/. After the client has spawned it'll start the express server with the npm start command. The express server will display it's initilization progress in the console. Once the server is done importing the xml data into elastic search, it is ready to accept queries. 

The client app accepts keyword search or SKU search in the same input field. When you search via keyword & select one of the suggestions from the type ahead drop down, it will replace the keywords with the sku for that object.

## How Does This service Work?
The Examiner Service is designed to allow users to search for products using a specific SKU or keywords. The service consists of a client-side React app made with vite and an express API on the backend. The React app allows users to input a SKU or keywords, which are then sent to the express server for processing. The server communicates with an OpenSearch index and a Redis cache to retrieve product data. The data is fetched from the christaianbook sitemap file, and the server also scrapes product details from the christianbook web page. The client receives the retrieved product information and displays it to the user.

## Scaling the service to Search Across All Sitemap Files
To scale the service to search across all sitemap files we'd have to first ingest all the sitemap files. This could be a problem if we try to do it sequentially & all on one instance.... it already takes 2 seconds on average to parse one sitemap file and another 5 seconds to push the data into open search. With this in mind, we could take a few different approaches

1. **Distributed Sitemap Parsing**: Implement a distributed service that parses multiple sitemap files simultaneously, possibly using a queue like bull-queue to distribute tasks to multiple processing nodes
2. **Horizontal Scaling**: Deploy multiple instances of the server on different machines or containers to handle higher user concurrency using AWS or another cloud provider

## Performance with Different User Loads
(All testing done with locus)
(I didn't stress test the sku lookup endpoint since that scrapes christianbook.com for html and it could cause a DDoS).

- **100 Users**: The keyword search service & status endpoint handles 100 concurrents effectively without a significant impact on performance. With proper load balancing and caching, the sku lookup service should still perform. bottlenecks might start to appear especially when scraping the html... so horizontal scaling and distributed systems should be considered. 
We might be able to squeeze out some extra performance if we read the HTML chunk by chunk while scraping and closing the stream once we've matched our tags.
We'd probably have to reconsider our client side type-ahead strategy, since it makes many requests to the server.


- **1000 Users**: This is where we start to see problems with this setup. Elastic search begins to show read problems around 300 concurrent users. When the server has 1k concurrents all hitting the search endpoint, elastic search begins to slow down considerably and begins rejecting requests.
hitting the status point with 1k concurrents is still fine, but it begins to slow down after 500 concurrents. Under no strain the status endpoint returns in 24ms, but it takes 860ms at 1k concurrents. 
Discussion about ES concurrency: https://discuss.elastic.co/t/concurrent-search-request-to-elasticsearch/21539

- **10,000 Users**: hitting the status endpoint with 10k concurrents makes the average response time go up to 3 seconds ( when it usually takes 24 milliseconds ) and we start to see about 5% of the requests failing. This lets us know that our bottle neck is most likely regarding elastic search.

- **1,000,000 Users**: At this point additional optimizations are critical... Distributing tasks / horizontal scaling, employing content delivery networks (CDNs) for frontend assets, and utilizing advanced caching mechanisms would probably help us achieve reasonable performance

## Resources Consulted
This definitely isn't everything, but these are the resources I referred to the most

- Why no create react app?: https://github.com/reactjs/react.dev/pull/5487
- React documentation: https://reactjs.org/docs/getting-started.html
- Node.js documentation: https://nodejs.org/en/docs/
- Redis documentation: https://redis.io/documentation
- OpenSearch documentation: https://opensearch.org/docs/
- Bootstrap documentation: https://getbootstrap.com/docs/5.0/getting-started/introduction/
- Axios documentation: https://axios-http.com/docs/intro
- Stack Overflow: for help with specific problems
- Twitter: for opinions on modern best practices from tech influencers
- Blogs and Tutorials: various online tutorials and articles on React & Node.js
- Replacing CRA with vite: https://www.makeuseof.com/set-up-react-app-with-vite/

## Additional Time and Prioritization
So the actual implementation took me about 3 days? (Still working on optimizing) 
With unlimited time, I'd probably do these things:

1. **Security Measures**: implement security features. The API has no validation & we're trusting user input with no sanitization which is a recipe for disaster. Pretty sure the cache can be poisioned with trivial get requests at the moment

2. **Automated Testing**: Implement unit and integration tests, integrate with CI/CD service like circleCI

3. **Optimize Scraping**: refine the HTML scraping process for better accuracy and performance, handling edge cases and fragile HTML selectors. We might be able to get better performance if we read the html chunk by chunk

4. **Database Sharding**: Develop sharding strategy on the OpenSearch index to distribute data storage and retrieval. Opensearch plays well with amazon

5. **Containerization**: Run service inside docker container

6. **Enhance UI/UX**: Invest in a more polished and responsive user interface. Implement more animations & transitions, better feedback during loading and errors, etc. UI/UX definitely isn't my strong suit, so I know this project is lacking in this area.

7. **Logging and Monitoring**: Implement some logging with log4js


## Code Critique
Here are a couple things I can say about my code

- **Tests**: I didnt get to implement unit tests! The tests I currently have are more integration / end to end tests than unit tests. If I had more time to figure out how to mock my data I would be able to write actual unit tests
- **Arbitrary Sharding / Replica Count**: My understanding of sharding & replication isn't strong enough for me to decide how many shards / replicas of elastic search I need.
- **Styling / Client**: Instead of importing sass I used `!important` in the css to override bootstrap styles which is an anti pattern. The UI could look a lot better!
- **Error Handling & Logging**: Implement more error handling with better error messages and persistent logging
- **Comments and Documentation**: More comments & documentation. Add diagrams for the service flow & relationships.
- **Separation of Concerns**: We could probably seperate concerns more in the express api
