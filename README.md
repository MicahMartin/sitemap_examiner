# Sitemap Examiner System Documentation

## How Does This System Work?
The Sitemap Examiner system is designed to allow users to search for products using a specific SKU or keywords. The system consists of a client-side React app made with vite and an express API on the backend. The React app allows users to input a SKU or keywords, which are then sent to the express server for processing. The server communicates with an OpenSearch index and a Redis cache to retrieve product data. The data is fetched from the christaianbook sitemap file, and the server also scrapes product details from the christianbook web page. The client receives the retrieved product information and displays it to the user.

## Scaling the System to Search Across All Sitemap Files
To scale the system to search across all sitemap files we'd have to first ingest all the sitemap files. This could be a problem if we try to do it sequentially & all on one instance.... it already takes 4 seconds on average to parse one sitemap file and add it to Open Search! With this in mind, we could take a few different approaches

1. **Distributed Sitemap Parsing**: Implement a distributed system that parses multiple sitemap files simultaneously, possibly using a queue like bull-queue to distribute tasks to multiple processing nodes
2. **Horizontal Scaling**: Deploy multiple instances of the server on different machines or containers to handle higher user concurrency using AWS or another cloud provider

## Performance with Different User Loads
performance test results coming soon!

- **100 Users**: The system should handle 100 users effectively without a significant impact on performance. The caching mechanism and optimizations should help reduce the load on the server.

- **10,000 Users**: with proper load balancing and caching, the system should still perform reasonably well? However, bottlenecks might start to appear especially when scraping the html... so horizontal scaling and distributed systems should be considered. 
We might be able to squeeze out some extra performance if we read the HTML chunk by chunk while scraping and closing the stream once we've matched our tags.
We'd probably have to reconsider our client side type ahead strategy, since it makes many requests to the server.

- **1,000,000 Users**: At this point additional optimizations are critical... Distributing tasks / horizontal scaling, employing content delivery networks (CDNs) for frontend assets, and utilizing advanced caching mechanisms would help us achieve reasonable performance

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

1. **Optimize Scraping**: refine the HTML scraping process for better accuracy and performance, handling edge cases and fragile HTML selectors. We might be able to get better performance if we read the html chunk by chunk like I described earlier

2. **Enhance UI/UX**: Invest in a more polished and responsive user interface. Implement more animations & transitions, better feedback during loading and errors, etc. UI/UX definitely isn't my strong suit, so I know this project is lacking in this area.

3. **Security Measures**: Implement security features. The API has no validation & we're trusting user input with no sanitization which is a recipe for disaster.

4. **Automated Testing**: Implement unit and integration tests, integrate with CI/CD  service like circleCI

5. **Database Sharding**: Develop sharding strategy on the OpenSearch index to distribute data storage and retrieval load. Opensearch plays well with amazon, so we could use AWS for distributed processing

7. **Logging and Monitoring**: Implement some logging with log4js

## Code Critique
Here are a couple things I can say about my code

- **Error Handling**: Implement more error handling with better error messages 
- **Logging**: Implement persistent logging!
- **Comments and Documentation**: More comments & documentation. Add diagrams for the system flow & relationships.
- **Separation of Concerns**: We could probably seperate concerns more in the express api
- **Tests**: Implement unit & integration tests! 
