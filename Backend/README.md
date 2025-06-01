# Gym Cashier Web App - Backend

A Node.js/Express backend for a gym cashier system that handles food and drink sales with multiple owners.

## 🎯 Features

- **Admin Authentication**
  - JWT-based authentication
  - Secure password hashing with bcrypt
  - Protected routes

- **Product Management**
  - CRUD operations for products
  - Stock tracking
  - Owner assignment
  - Product categorization by owner

- **Owner Management**
  - CRUD operations for product owners
  - Owner-based product filtering

- **Purchase System**
  - Create new purchases
  - Automatic stock updates
  - Multiple payment methods (Cash/InstaPay)
  - Purchase history with filtering

## 🏗 Project Structure

```
Backend/
├── models/              # Database models
│   ├── Admin.js        # Admin user model
│   ├── Owner.js        # Product owner model
│   ├── Product.js      # Product model
│   └── Purchase.js     # Purchase transaction model
│
├── routes/             # API routes
│   ├── auth.js        # Authentication routes
│   ├── owners.js      # Owner management routes
│   ├── products.js    # Product management routes
│   └── purchases.js   # Purchase management routes
│
├── middleware/         # Custom middleware
│   └── auth.js        # JWT authentication middleware
│
├── .env.example       # Example environment variables
├── .gitignore         # Git ignore rules
├── package.json       # Project dependencies
└── server.js          # Main application file
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account
- npm or yarn package manager

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd Backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=your_secure_random_string
   NODE_ENV=development
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## 📝 API Documentation

### Authentication

#### Login
- **POST** `/api/auth/login`
  ```json
  {
    "username": "admin",
    "password": "password"
  }
  ```

#### Verify Token
- **GET** `/api/auth/verify`
  - Requires: Authorization header with JWT token

### Owners

#### Get All Owners
- **GET** `/api/owners`
  - Requires: Authentication

#### Create Owner
- **POST** `/api/owners`
  ```json
  {
    "name": "Owner Name"
  }
  ```
  - Requires: Authentication

#### Update Owner
- **PUT** `/api/owners/:id`
  ```json
  {
    "name": "Updated Name"
  }
  ```
  - Requires: Authentication

#### Delete Owner
- **DELETE** `/api/owners/:id`
  - Requires: Authentication

### Products

#### Get All Products
- **GET** `/api/products`
  - Requires: Authentication

#### Get Products by Owner
- **GET** `/api/products/owner/:ownerId`
  - Requires: Authentication

#### Create Product
- **POST** `/api/products`
  ```json
  {
    "name": "Product Name",
    "price": 10.99,
    "stock": 100,
    "ownerId": "owner_id"
  }
  ```
  - Requires: Authentication

#### Update Product
- **PUT** `/api/products/:id`
  ```json
  {
    "name": "Updated Name",
    "price": 11.99,
    "stock": 90,
    "ownerId": "owner_id"
  }
  ```
  - Requires: Authentication

#### Update Stock
- **PATCH** `/api/products/:id/stock`
  ```json
  {
    "stock": 80
  }
  ```
  - Requires: Authentication

#### Delete Product
- **DELETE** `/api/products/:id`
  - Requires: Authentication

### Purchases

#### Get Purchases (with filters)
- **GET** `/api/purchases`
  - Query Parameters:
    - startDate (ISO date)
    - endDate (ISO date)
    - ownerId
    - paymentMethod ('cash' or 'instapay')
  - Requires: Authentication

#### Create Purchase
- **POST** `/api/purchases`
  ```json
  {
    "products": [
      {
        "productId": "product_id",
        "quantity": 2
      }
    ],
    "paymentMethod": "cash",
    "transactionId": "optional_for_instapay"
  }
  ```
  - Requires: Authentication

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Protected routes with middleware
- Input validation with express-validator
- MongoDB injection protection
- CORS enabled
- Environment variables for sensitive data

## 📦 Dependencies

- express: Web framework
- mongoose: MongoDB ODM
- jsonwebtoken: JWT authentication
- bcryptjs: Password hashing
- cors: Cross-origin resource sharing
- dotenv: Environment variables
- express-validator: Input validation

## 🚀 Deployment

### Backend Deployment (Render)

The backend is configured to be deployed on Render's free tier using the included `render.yaml` configuration:

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Render will automatically detect the `render.yaml` configuration
4. Set the following environment variables in Render's dashboard:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: Will be automatically generated
   - `NODE_ENV`: Will be set to "production"
   - `PORT`: Will be set to 8080

The service will automatically deploy when you push changes to your repository.

### Frontend Deployment (Vercel)

While this is the backend repository, it's configured to work seamlessly with a Next.js frontend deployed on Vercel:

1. Update the CORS configuration in `server.js` with your Vercel frontend domain
2. The backend includes a `vercel.json` configuration file for proper routing
3. Environment variables needed for the frontend:
   ```env
   NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
   ```

### Production Considerations

1. **MongoDB Atlas Setup**:
   - Create a free M0 cluster
   - Whitelist IP addresses (0.0.0.0/0 for development)
   - Create a database user
   - Get your connection string

2. **Security**:
   - Ensure all environment variables are properly set
   - Update CORS settings with your actual frontend domain
   - Use strong JWT secrets in production
   - Enable MongoDB Atlas network security features

3. **Monitoring**:
   - The application includes basic error logging
   - Consider adding application monitoring (e.g., Sentry)
   - Monitor MongoDB Atlas metrics
   - Set up uptime monitoring

4. **Scaling**:
   - The free tier of Render has limitations:
     - Spins down after 15 minutes of inactivity
     - Limited bandwidth and compute resources
   - Consider upgrading for production use

## 📝 License

ISC

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a pull request 