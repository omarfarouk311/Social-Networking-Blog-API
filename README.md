![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Postman](https://img.shields.io/badge/Postman-FF6C37?style=for-the-badge&logo=postman&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)

This project is a RESTful API for a social networking blog platform, providing functionalities like user authentication, post and comment management, bookmarks, user management, and more. It is built with Node.js, Express.js, MongoDB, Nginx for load balancing and caching, and Docker for containerization. The API is tested using Postman, and a collection is available for easy reference.

## Features
- Authentication & Authorization
    - Utilizes JWT, refresh tokens that allows users to refresh their token without having to log in repeatedly.
    - Maintaining a whitelist of valid tokens stored in the database.
    - CSRF tokens are used to secure the token refreshing process.
    - Users can create an account and log in securely.
    - Ensured authorized access for specific operations.
- Validation
  - Used express-validator package to implement Input validation and sanitization logic.
- User Profile Management
  - Profile Creation: Users can create and manage their profiles, including updating personal information.
  - Follow/Unfollow Users: Users can follow other users to see their posts in their feeds.
- Post Management
  - Create Posts: Users can create new posts.
  - Update Posts: Allows users to edit existing posts.
  - Delete Posts: Users can remove posts they no longer wish to share.
  - Like Posts: Users can like posts, enhancing engagement and interaction within the community.
  - Bookmarking Posts: Users can add or remove posts from their bookmarks.
- Comment Management
  - Create Comments: Users can add comments to posts, facilitating discussions and feedback.
  - Update Comments: Users can edit their comments to clarify or modify their responses.
  - Delete Comments: Users have the option to remove their comments at any time.
  - Like Comments: Users can express approval by liking comments on posts.
  - Replies to Comments: Users can reply to comments, creating threaded discussions.
- Pagination
    - Efficiently handles large sets of data, allowing users to navigate through posts and comments easily.
    - Implemented using the last ID of fetched posts or comments to leverage indexes and enhance performance.
- Facade Design Pattern: Manages complex delete operations that contain sub-operations such as removing comments and associated likes.
- Dockerized Application: The project uses Docker to simplify deployment and management, with a Docker Compose file included for easy setup.

## Database
- Aggregation Pipelines: Used to perform complex data querying and transformations, it also Includes bulk reading operations using MongoDB’s $lookup stage for efficient data joins between collections.
- Optimized Queries: Concurrent query execution when applicable and appropriate indexing for fast responses, even during complex operations.
- Clustered Posts Collections: Posts are stored with their _id field as a clustered index for better indexing and retrieval, this ensures that the data is ordered on the disk by the order of the documents in the collection, ensuring that the minimum number of pages are read from the disk and reducing random I/O operations.
- Used TTL indexes to manage the deletion of tokens and refresh-tokens collections documents after their expiry time.
- Transactions: Used for critical operations to ensure ACID properties compliance with specific read preference, read and write concerns, including setting the journal to true to ensure safe writes.

![database](database%20schema.png)

## Reverse Proxy
- Implemented L7 load balancing using Nginx as a reverse proxy to handle traffic distribution, ensuring high availability and fault tolerance.
- used least connections algorithm for load balancing to ensure that the traffic is routed to the server that has the least connections.
- Enabled caching to cache images of users and posts.

## Installation
Follow these steps to set up the project locally:

1. Clone the Repository  
    First, clone the repository to your local machine using the following command:
    
    ```bash
    git clone https://github.com/omarfarouk311/Social-Networking-Blog-API.git
    cd Social-Networking-Blog-API
    ```
    
2. Set Up the .env File  
    Create a `.env` file in the root of the project to store your environment variables. You can use the provided example file as a reference. Here’s an example of what to include in your .env file:
    
    ```plaintext
    # MongoDB connection string
    DB_URI=mongodb://<username>:<password>@localhost:27017/<dbname>
    
    # allowed Origins for CORS
    ORIGIN=allowed origin
    
    # JWT settings
    JWT_SECRET=your JWT secret
    
    # Refresh token settings
    REFRESH_TOKEN_SECRET=your refresh token secret
    
    # Cookies signing secret
    COOKIE_SECRET=your cookie secret
    
    # Email settings
    MAILGUN_API_KEY=your mailgun api key
    MAILGUN_DOMAIN=your mailgun domain
    SENDER_EMAIL=you sender email
    
    PORT=the port number that the app will listen on, note that it should be set to 8080 because nginx is configured to forward traffic on it.
    
    Make sure to replace the placeholder values with your actual configuration.
    ```

3. Run Docker Compose  
    Ensure you have Docker and Docker Compose installed on your machine. Once you have Docker set up, run the following command to start the application:
    ```bash
    docker-compose up --scale api=3 -d
    ```
    This command will build the Docker images, create networks and volumes, and start the application with all its services.
    Note that it starts 3 instances from the api service, but you can adjust it to more or less.

4. Access the API Once the services are up and running, you can access the API at http://localhost:8080, where `8080` is the port number exposed by nginx in the docker-compose.yml file.

## API Documentation
You can find the API documentation [here](https://documenter.getpostman.com/view/34071055/2sAXxMgu6D)
