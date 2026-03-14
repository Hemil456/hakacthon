# CoreInventory Backend

Production-ready multi-warehouse inventory management system backend.

## Tech Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB + Mongoose
- **Auth:** JWT (Access 15m + Refresh 7d)
- **Email:** Nodemailer (SMTP)
- **Validation:** Joi
- **Logging:** Winston + Daily Rotate

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Copy `.env` and fill in your values:
```bash
cp .env .env.local
```

Required variables:
```
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
MONGO_URI=mongodb://localhost:27017/coreinventory
JWT_ACCESS_SECRET=your_secret
JWT_REFRESH_SECRET=your_secret
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_app_password
```

### 3. Run
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Auth `/api/v1/auth`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /register | Register new user |
| POST | /login | Login |
| POST | /refresh | Refresh access token |
| POST | /logout | Logout |
| POST | /forgot-password | Send OTP |
| POST | /verify-otp | Verify OTP |
| POST | /reset-password | Reset password |
| GET | /me | Get current user |

### Products `/api/v1/products`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | List all products |
| GET | /:id | Get product |
| POST | / | Create product |
| PUT | /:id | Update product |
| DELETE | /:id | Soft delete product |

### Categories `/api/v1/categories`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /tree | Get category tree |
| GET | / | List all categories |
| GET | /:id | Get category |
| POST | / | Create category |
| PUT | /:id | Update category |
| DELETE | /:id | Delete category |

### Warehouses `/api/v1/warehouses`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | List all warehouses |
| GET | /:id | Get warehouse |
| POST | / | Create warehouse |
| PUT | /:id | Update warehouse |
| DELETE | /:id | Soft delete warehouse |

### Receipts `/api/v1/receipts`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | List all receipts |
| GET | /:id | Get receipt |
| POST | / | Create receipt (draft) |
| PUT | /:id | Update receipt |
| PATCH | /:id/confirm | Confirm receipt (updates stock) |
| PATCH | /:id/cancel | Cancel receipt |

### Deliveries `/api/v1/deliveries`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | List all deliveries |
| GET | /:id | Get delivery |
| POST | / | Create delivery (draft) |
| PUT | /:id | Update delivery |
| PATCH | /:id/confirm | Confirm delivery (decreases stock) |
| PATCH | /:id/cancel | Cancel delivery |

### Transfers `/api/v1/transfers`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | List all transfers |
| GET | /:id | Get transfer |
| POST | / | Create transfer (draft) |
| PUT | /:id | Update transfer |
| PATCH | /:id/confirm | Confirm transfer (moves stock) |
| PATCH | /:id/cancel | Cancel transfer |

### Adjustments `/api/v1/adjustments`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | List all adjustments |
| GET | /:id | Get adjustment |
| POST | / | Create adjustment (draft) |
| PUT | /:id | Update adjustment |
| PATCH | /:id/confirm | Confirm adjustment (±stock) |
| PATCH | /:id/cancel | Cancel adjustment |

### Stock `/api/v1/stock`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | All stock (filter: warehouse, product, low_stock) |
| GET | /low | Low stock items |
| GET | /product/:productId | Stock by product |
| GET | /warehouse/:warehouseId | Stock by warehouse |

### Dashboard `/api/v1/dashboard`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | Stats, recent receipts & deliveries |

### Reports `/api/v1/reports`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /stock-summary | Stock per product per warehouse |
| GET | /ledger | Ledger entries (filterable) |
| GET | /low-stock | Products below min level |
| GET | /valuation | Inventory value by warehouse |

> Add `?format=csv` to any report endpoint to download as CSV.

### Notifications `/api/v1/notifications`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | Get notifications |
| PATCH | /read-all | Mark all as read |
| PATCH | /:id/read | Mark one as read |

## Response Format
```json
// Success
{ "success": true, "message": "...", "data": {}, "meta": { "page": 1, "limit": 10, "total": 100 } }

// Error
{ "success": false, "message": "...", "errors": [] }
```

## Roles & Permissions
| Action | Admin | Manager | Staff |
|--------|-------|---------|-------|
| Users CRUD | ✅ | Read only | ❌ |
| Products CRUD | ✅ | ✅ | Read only |
| Warehouses CRUD | ✅ | ✅ | Read only |
| Create Drafts | ✅ | ✅ | ✅ |
| Confirm/Cancel | ✅ | ✅ | ❌ |
| Reports | ✅ | ✅ | Low-stock only |
| Dashboard | ✅ | ✅ | ✅ |
