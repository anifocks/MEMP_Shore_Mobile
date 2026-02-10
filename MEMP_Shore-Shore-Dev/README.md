# 🌊 MEMP Ship - Marine Emissions Management Platform

<div align="center">

![Version](https://img.shields.io/badge/Version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)
![Status](https://img.shields.io/badge/Status-Active-brightgreen.svg)
![2FA](https://img.shields.io/badge/Security-2FA%20Enabled-0ea5e9.svg)
![Compliance](https://img.shields.io/badge/Compliance-CII%20%7C%20EU%20MRV-8b5cf6.svg)
![Templates](https://img.shields.io/badge/Reports-Templates-22c55e.svg)

**A comprehensive maritime energy management and emissions tracking platform for modern vessel operations**

[Features](#-key-features) • [Architecture](#-architecture) • [Installation](#-installation) • [Services](#-core-services) • [API](#-api-documentation) • [Contributing](#-contributing)

</div>

---

## 📋 Overview

**MEMP Shore** is a sophisticated marine emissions management and operational platform designed to streamline vessel management, crew coordination, fleet optimization, and maritime logistics. Built with cutting-edge technologies, the application features a modern React-based client frontend and a robust microservices-based Node.js backend architecture. MEMP Shore enables maritime organizations to monitor and manage vessel emissions, optimize fuel consumption, track operational metrics, and ensure regulatory compliance with ease.

<div align="center">

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🌍 Emissions & Compliance  │  🔐 Secure Access  │  📊 Actionable Insights │
│  CII & EU MRV               │  2FA via Email OTP │  Templates & Analytics  │
└─────────────────────────────────────────────────────────────────────────┘
```

</div>

## 🏗️ Project Structure

### 📱 MEMP_Ship_Client
The client-side application built with **React** and **Vite** - a modern, responsive user interface for maritime operations.

#### 🛠️ Key Technologies:
- ⚛️ **React 18** - Latest React library with hooks and concurrent features
- ⚡ **Vite** - Lightning-fast build tool and dev server
- 🎨 **Tailwind CSS** - Utility-first CSS for rapid UI development
- 🔄 **PostCSS** - CSS processing and optimization
- 📦 **npm/yarn** - Package management

#### 🎯 Main Components:
| Component | Purpose |
|-----------|---------|
| `AddEditUserPage.jsx` | 👤 User management and profile editing |
| `TeamPage.jsx` | 👥 Crew coordination and team management |
| `App.jsx` | 🎪 Root application component |
| `Dashboard` | 📊 Analytics and overview dashboard |
| `VesselEmissionsPage.jsx` | 🌍 Emissions analytics and compliance insights |
| `Login` | 🔐 Authentication interface |

#### 📂 Directory Structure:
```
src/
├── components/        # 🧩 Reusable React components
├── pages/            # 📄 Page-level components
├── api.js            # 🔌 API integration layer
├── context/          # 🔗 React context for state management
├── hooks/            # 🪝 Custom React hooks
├── utils/            # 🔧 Utility functions
├── config/           # ⚙️  Configuration files
├── styles/           # 🎨 Global styles
├── assets/           # 🖼️ Static assets (logos, images)
└── layouts/          # 📐 Layout components
```

#### 🗂️ Public Assets:
- 📸 `member_images/` - User profile and crew photographs
- ⛴️ `ship_images/` - Vessel imagery and fleet photos
- 🖼️ `menu-backgrounds/` - UI background images
- 📎 `voyage_attachments/` - Trip-related documents and media files

### 🖥️ MEMP_Ship_Server
Enterprise-grade microservices-based backend architecture using **Node.js** and **Express** for scalable maritime operations management.

#### 📐 Service Architecture:
Each microservice follows a consistent, scalable structure:
```
service/
├── config/           # ⚙️  Configuration (database, environment)
├── controllers/      # 🎮 Business logic handlers
├── models/           # 📊 Data schemas and models
├── routes/           # 🛣️ API endpoints
├── utils/            # 🔧 Helper utilities
└── <service>Server.js # 🚀 Service entry point
```

---

## 🔧 Core Services

### 1. 🚪 API Gateway (`api-gateway/`)
**Central orchestration hub for all client requests**
- 🔀 Intelligent request routing to appropriate services
- ⚖️ Load balancing across microservices
- 🔐 Request/response middleware and validation
- 📊 Centralized logging and monitoring
- 🛡️ Rate limiting and security filters

**Port:** Configurable (default: 3000)

### 2. 🔑 Authentication Service (`auth-service/`)
**Secure identity and access management**
- 🔐 User authentication with JWT tokens
- 🔐 Two-factor authentication (email OTP)
- 🔒 Password hashing and encryption
- 👤 User profile management
- 🎭 Role-based access control (RBAC)
- 📱 Multi-device session management

**Port:** Configurable (default: 3001)

### 3. ⛴️ Ships Service (`ships-service/`)
**Complete vessel information management**
- 🚢 Vessel specifications and characteristics
- 🗺️ Fleet composition tracking
- 📋 Ship registration and compliance documents
- 🔧 Vessel maintenance history
- 🏷️ IMO and classification details
- ⚡ Technical specifications (engines, fuel capacity)

**Port:** Configurable (default: 3002)

### 4. 🗺️ Voyage Service (`voyage-service/`)
**Trip planning and operational tracking**
- 🛤️ Voyage leg creation and management
- 📅 Timeline and schedule tracking
- 🌐 Route planning and optimization
- ⛽ Fuel consumption estimation
- 🏁 Port call management
- 📍 ETA/ATA tracking
- 🎯 Waypoint management

**Port:** Configurable (default: 3003)

### 5. 👥 Team Service (`team-service/`)
**Crew and personnel management**
- 👤 Crew member profiles and credentials
- 📋 Role and position assignments
- 🎓 Certifications and qualifications tracking
- 📞 Contact information management
- 👨‍💼 Organizational hierarchy
- 📊 Crew performance metrics
- 🗓️ Scheduling and rotation planning

**Port:** Configurable (default: 3004)

### 6. ⛽ Bunker Service (`bunker-service/`)
**Fuel management and consumption tracking**
- 📊 Bunker quantity tracking
- 💹 Fuel consumption analytics
- 🛢️ Fuel type management
- 📈 Consumption trends and predictions
- 💰 Cost analysis and reporting
- ⚠️ Low fuel alerts
- 🔄 Fuel transfer logs

**Port:** Configurable (default: 3005)

### 7. 🏺 Tank Service (`tank-service/`)
**Cargo and resource tank management**
- 📦 Tank inventory tracking
- 🎯 Tank specifications and capacity
- ⚖️ Weight and balance calculations
- 📋 Cargo information management
- 🌡️ Tank condition monitoring
- 🔐 Tank security and sealing records
- 📊 Tank utilization reports

**Port:** Configurable (default: 3006)

### 8. ⚙️ Machinery Service (`machinery-service/`)
**Equipment and engine management**
- 🔧 Equipment specifications and inventory
- 🛠️ Maintenance schedule tracking
- 📝 Maintenance history and logs
- ⚡ Equipment performance metrics
- 🔍 Failure analysis and trending
- 🎯 Predictive maintenance alerts
- 📊 Equipment operational hours tracking

**Port:** Configurable (default: 3007)

### 9. 🏖️ Ports Service (`ports-service/`)
**Port facilities and scheduling management**
- 🗺️ Port information database
- 🏗️ Port facility details
- 📅 Docking schedules and berth management
- 📞 Port contact information
- 📋 Port regulations and requirements
- ⚓ Anchoring information
- 🚢 Vessel traffic coordination

**Port:** Configurable (default: 3008)

### 10. 📊 Reports Service (`reports-service/`)
**Advanced reporting and analytics**
- 📈 Report generation and templates
- 📉 Data analytics and insights
- 💾 Excel export functionality
- 🎯 Custom report creation
- 📊 Trend analysis
- 🔍 Emissions compliance reporting
- 📁 Report archiving

**Port:** Configurable (default: 3009)

### 11. ✅ Task Service (`task-service/`)
**Crew tasks and operational workflows**
- 📋 Task assignment and tracking
- 🔄 Task status management
- 👥 Crew task scheduling
- ⏰ Task deadline and reminder management
- 🎯 Priority and severity levels
- 📊 Task performance analytics
- 🔔 Notifications and escalations

**Port:** Configurable (default: 3010)

### 12. 🧴 Additive Service (`additive-service/`)
**Fuel additives and chemical management**
- 📦 Additive inventory management
- 📊 Consumption tracking
- 📋 Additive specifications
- ⚗️ Mixing ratios and procedures
- 📈 Usage analytics
- 🔄 Reorder point management
- 📄 Compliance documentation

**Port:** Configurable (default: 3011)

### 13. 📥 Excel Integration Service (`excel-integration-service/`)
**Data import/export and bulk operations**
- 📤 Excel file upload processing
- 📥 Bulk data import from spreadsheets
- 📊 Excel export with formatting
- 🔄 Data validation during import
- 📋 Batch operation support
- 🗂️ File management and storage
- ✅ Import validation reports

---

## 🛠️ Technology Stack

### 🎨 Frontend Technologies
| Technology | Purpose | Version |
|-----------|---------|---------|
| ⚛️ React | UI library & component framework | 18+ |
| ⚡ Vite | Build tool & dev server | Latest |
| 🎨 Tailwind CSS | Utility-first CSS framework | Latest |
| 🔄 PostCSS | CSS processing & optimization | Latest |
| 🎯 Context API | State management | React built-in |
| 🪝 React Hooks | Functional component logic | React built-in |

### 🖥️ Backend Technologies
| Technology | Purpose | Role |
|-----------|---------|------|
| 🟢 Node.js | Runtime environment | Server runtime |
| 🚂 Express.js | Web framework | API framework |
| 🐘 PostgreSQL/MySQL | Database | Data persistence |
| 🔐 JWT | Authentication | Token-based auth |
| 📊 Swagger | API documentation | API specs & docs |
| 📦 Multer | File upload | File handling |
| 📝 Joi/Validator | Data validation | Input validation |
| 🔄 Nodemon | Dev tool | Auto-restart on changes |

### 🏗️ Architecture & DevOps
| Technology | Purpose |
|-----------|---------|
| 🐳 Docker | Containerization (optional) |
| ☸️ Kubernetes | Orchestration (optional) |
| 🌐 IIS | Web hosting |
| 📋 npm/yarn | Package management |
| 🔄 Git | Version control |

---

## ✨ Key Features

### 🚀 Advanced Capabilities

#### 1️⃣ **Multi-Service Microservices Architecture**
- 🔀 Decoupled microservices for independent scaling
- 🚀 Independent deployment capabilities per service
- 📊 Service-specific databases and data models
- ⚡ Horizontal scalability and load distribution
- 🔌 Service discovery and inter-service communication
- 📡 Event-driven architecture support

#### 2️⃣ **Comprehensive Vessel Management**
- ⛴️ Complete ship information and specifications
- 🗺️ Real-time fleet tracking and monitoring
- 🔧 Equipment and machinery inventory management
- 📋 Maintenance scheduling and compliance
- 📊 Vessel performance analytics
- 🌍 Multi-vessel fleet coordination

#### 3️⃣ **Advanced Crew & Team Management**
- 👤 Detailed crew member profiles with certifications
- 📋 Dynamic role and position assignments
- 🎓 Qualification tracking and compliance
- 📅 Intelligent crew scheduling and rotation planning
- ✅ Task assignment and performance tracking
- 👥 Hierarchical organizational structure

#### 4️⃣ **Maritime Operations Excellence**
- 🛤️ Advanced voyage planning and tracking
- ⛽ Real-time fuel management and optimization
- 🏖️ Port scheduling and coordination
- 📊 Consumption analytics and forecasting
- 🔔 Alerts and notifications system
- 📈 Operational efficiency metrics

#### 5️⃣ **Intelligent Data Management**
- 🏺 Tank inventory with real-time tracking
- 📦 Cargo management and documentation
- 📊 Advanced reporting with customizable templates
- 📥 Excel import/export with validation
- 💾 Data archiving and historical tracking
- 🔍 Audit trails and compliance logs

#### 6️⃣ **Enterprise Security Framework**
- 🔐 JWT-based token authentication
- 🔐 Two-factor authentication (email OTP)
- 🎭 Granular role-based access control (RBAC)
- 🔒 Encrypted password storage
- 🛡️ Request validation and sanitization
- 📋 Centralized authorization policies
- 🔍 Audit logging and monitoring

**2FA User Flow (Email OTP)**
```
Login → Password Verified → OTP Sent → OTP Verified → Access Granted
```

#### 7️⃣ **Environmental & Compliance**
- 📊 Emissions tracking and reporting
- 🌍 Dedicated emissions analytics page with CO₂, CH₄, N₂O, SOx, NOx, PM totals and trends
- 🌍 Environmental impact analytics
- 📋 Regulatory compliance monitoring
- 🎯 IMO compliance assistance
- 📄 Automated compliance documentation
- ✅ Certification and audit support

**Compliance Highlights**
- 📈 CII compliance indicators, required values and reduction factors
- 🇪🇺 EU MRV reporting readiness (fuel, distance, cargo, emissions)
- 📑 Audit-friendly reporting with traceable calculations

#### 8️⃣ **Smart Templates & Reporting**
- 🧩 Ready-to-use report templates for emissions, voyage, and fuel analytics
- 🧾 Exportable structured outputs for audits and regulatory submissions
- 📥 Excel-based import/export with validation and consistent layouts
- 🗂️ Reusable templates for recurring monthly/annual compliance reports

#### 9️⃣ **Real-Time Monitoring & Analytics**
- 📊 Live dashboard with key metrics
- 📈 Performance trending and analytics
- 🔔 Real-time alerts and notifications
- 🗺️ Fleet location tracking (ready for GPS integration)
- 💹 Consumption and efficiency analytics
- 🎯 Predictive maintenance insights

---

## 📦 Installation & Setup

### ✅ Prerequisites
- 🟢 Node.js v14 or higher (v16+ recommended)
- 📦 npm v6+ or yarn v1.22+
- 🐘 PostgreSQL/MySQL database (configured)
- 🔧 Git for version control
- 🌐 Postman or similar for API testing (optional)

### 🚀 Quick Start

#### 1️⃣ Clone the Repository
```bash
git clone https://github.com/anifocks/MEMP_Ship.git
cd MEMP_Ship
```

#### 2️⃣ Frontend Setup
```bash
cd MEMP_Ship_Client

# Install dependencies
npm install

# Configure environment (create .env.development or .env.production)
# Configure API endpoints in src/config/apiConfig.js

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

#### 3️⃣ Backend Services Setup

**API Gateway Setup:**
```bash
cd MEMP_Ship_Server/api-gateway
npm install
npm start  # Listens on http://localhost:3000
```

**Individual Service Setup (example - Ships Service):**
```bash
cd MEMP_Ship_Server/ships-service
npm install

# Create .env file with database credentials
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=your_password
# DB_NAME=ships_db
# PORT=3002

npm start  # Or npm run dev for watch mode
```

**All Services Installation Script:**
```bash
cd MEMP_Ship_Server

# Install all service dependencies
for service in */; do
    if [ -f "$service/package.json" ]; then
        cd "$service"
        npm install
        cd ..
    fi
done
```

#### 4️⃣ Environment Configuration

**Frontend `.env.development`:**
```
VITE_API_BASE_URL=http://localhost:3000
VITE_API_TIMEOUT=30000
VITE_ENABLE_LOGGING=true
```

**Backend `.env` template (each service):**
```
PORT=3001
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=service_database
DB_PORT=3306

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# API Gateway
API_GATEWAY_URL=http://localhost:3000

# Service Configuration
SERVICE_NAME=ships-service
LOG_LEVEL=debug
```

---

## ⚙️ Configuration

### 🎨 Frontend Configuration

**Tailwind CSS** - Customize in `tailwind.config.js`:
```javascript
module.exports = {
  theme: {
    extend: {
      colors: { /* custom colors */ },
      spacing: { /* custom spacing */ }
    }
  }
}
```

**Vite Configuration** - Modify `vite.config.js`:
```javascript
export default {
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
}
```

### 🖥️ Backend Configuration

**Database Setup:**
```sql
-- Create databases for each service
CREATE DATABASE ships_db;
CREATE DATABASE voyage_db;
CREATE DATABASE team_db;
CREATE DATABASE auth_db;
-- ... repeat for all services
```

**Service Registration** (in api-gateway):
```javascript
const services = {
  ships: 'http://localhost:3002',
  voyage: 'http://localhost:3003',
  team: 'http://localhost:3004',
  auth: 'http://localhost:3001',
  // ... other services
};
```

---

## 🔌 API Documentation

### 📡 Base URL
```
http://localhost:3000/api
```

### 🔐 Authentication
All API endpoints require a JWT token (except login):
```bash
Authorization: Bearer <your_jwt_token>
```

### 📚 Available Service Endpoints

Each service exposes Swagger documentation at:
```
GET http://localhost:<service-port>/api-docs
```

#### 🚢 Ships Service Example:
```
GET    /api/ships              # Get all vessels
POST   /api/ships              # Create new vessel
GET    /api/ships/:id          # Get vessel details
PUT    /api/ships/:id          # Update vessel
DELETE /api/ships/:id          # Delete vessel
GET    /api/ships/:id/specs    # Get specifications
```

#### 🗺️ Voyage Service Example:
```
GET    /api/voyages            # Get all voyages
POST   /api/voyages            # Create voyage
GET    /api/voyages/:id        # Get voyage details
POST   /api/voyages/:id/legs   # Add voyage legs
GET    /api/voyages/:id/status # Get voyage status
```

#### 👥 Team Service Example:
```
GET    /api/team/members       # Get crew members
POST   /api/team/members       # Add crew member
PUT    /api/team/members/:id   # Update crew info
DELETE /api/team/members/:id   # Remove crew
GET    /api/team/members/:id/tasks  # Get crew tasks
```

#### ⛽ Bunker Service Example:
```
GET    /api/bunkers            # Get fuel records
POST   /api/bunkers            # Record fuel receipt
PUT    /api/bunkers/:id        # Update fuel data
GET    /api/bunkers/analytics  # Consumption analytics
```

### ✅ Response Format
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation successful",
  "timestamp": "2026-01-20T10:30:00Z"
}
```

### ❌ Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2026-01-20T10:30:00Z"
}
```

---

## 👨‍💻 Development Workflow

### 📂 Project Organization
```
MEMP_Ship/
├── MEMP_Ship_Client/           # 📱 React frontend
│   ├── src/                    # Source code
│   ├── public/                 # Static assets
│   ├── package.json            # Dependencies
│   └── vite.config.js          # Build config
│
└── MEMP_Ship_Server/           # 🖥️ Backend services
    ├── api-gateway/            # 🚪 Main entry point
    ├── auth-service/           # 🔑 Authentication
    ├── ships-service/          # ⛴️ Vessel management
    ├── voyage-service/         # 🗺️ Trip management
    ├── team-service/           # 👥 Crew management
    ├── bunker-service/         # ⛽ Fuel management
    ├── tank-service/           # 🏺 Tank inventory
    ├── machinery-service/      # ⚙️ Equipment tracking
    ├── ports-service/          # 🏖️ Port management
    ├── reports-service/        # 📊 Reporting
    ├── task-service/           # ✅ Task management
    ├── additive-service/       # 🧴 Additives
    └── excel-integration-service/ # 📥 Excel import/export
```

### 🔧 Code Organization Best Practices

**Controllers:**
- 🎮 Handle HTTP requests/responses
- 🧪 Keep business logic minimal
- ✅ Input validation
- 🔄 Call service layer methods

**Models:**
- 📊 Database schema definitions
- 🔗 Relationships and constraints
- 📝 Data validation rules

**Routes:**
- 🛣️ Define API endpoints
- 🔐 Attach middleware (auth, validation)
- 🔌 Route to controllers

**Utils:**
- 🔧 Helper functions
- 🗂️ Database utilities
- 📧 Email/notification services
- 🔐 Encryption and hashing

### 🧪 Testing

**Frontend Testing:**
```bash
# Unit tests
npm test

# Coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

**Backend Testing:**
```bash
cd MEMP_Ship_Server/<service>
npm test
npm run test:coverage
```

---

## 🚀 Deployment

### 🐳 Docker Deployment

**Build Docker Image:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

**Run Container:**
```bash
docker build -t memp-ship:latest .
docker run -p 3000:3000 -e NODE_ENV=production memp-ship:latest
```

### ☸️ Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: memp-ship
spec:
  replicas: 3
  selector:
    matchLabels:
      app: memp-ship
  template:
    metadata:
      labels:
        app: memp-ship
    spec:
      containers:
      - name: memp-ship
        image: memp-ship:latest
        ports:
        - containerPort: 3000
```

### 🌐 IIS Deployment
- Services include `web.config` for IIS compatibility
- Use IIS URL Rewrite for API routing
- Configure HTTPS and SSL certificates
- Set up application pools for each service

### ☁️ Cloud Deployment (Azure/AWS)
- Deploy as containerized services
- Use managed databases (Azure SQL, AWS RDS)
- Configure auto-scaling policies
- Set up CI/CD pipelines with GitHub Actions

---

## 🔒 Security Features

### 🛡️ Authentication & Authorization
- 🔐 JWT-based stateless authentication
- 🔐 Two-factor authentication (email OTP)
- 🎭 Role-based access control (RBAC)
- 🔑 Secure password hashing (bcrypt)
- ⏰ Token expiration and refresh mechanisms
- 🚫 Rate limiting and brute-force protection

### 📝 Data Security
- 🔒 Encrypted sensitive data at rest
- 🔐 HTTPS/TLS for data in transit
- 🛡️ SQL injection prevention with parameterized queries
- ✅ Input validation and sanitization
- 🔍 Audit logging for compliance

### 🔔 Compliance & Monitoring
- 📋 GDPR compliance considerations
- 🌍 IMO compliance support
- 📊 Audit trails for all operations
- 🔍 Activity logging and monitoring
- 🚨 Security alerts and notifications

---

## 📚 Documentation & Resources

### 📖 API Documentation
```
Individual Service Swagger Docs:
- http://localhost:3000/api-docs          # API Gateway
- http://localhost:3001/api-docs          # Auth Service
- http://localhost:3002/api-docs          # Ships Service
- http://localhost:3003/api-docs          # Voyage Service
- ... (one for each service)
```

### 🎓 Learning Resources
- 📘 React Official Docs: https://react.dev
- 📗 Node.js Docs: https://nodejs.org/docs
- 📙 Express Guide: https://expressjs.com
- 📕 Tailwind CSS: https://tailwindcss.com

---

## 🤝 Contributing

### 📋 Contribution Guidelines

1. **Fork the Repository**
   ```bash
   git clone https://github.com/anifocks/MEMP_Ship.git
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Follow the existing code style
   - Write meaningful commit messages
   - Keep commits atomic and focused

3. **Testing**
   - Write unit tests for new features
   - Ensure all tests pass
   - Check code coverage

4. **Submit Pull Request**
   - Provide detailed PR description
   - Reference related issues
   - Wait for code review

### 📋 Code Standards
- ✅ Use consistent naming conventions
- 📝 Comment complex logic
- 🧪 Write testable code
- 🎨 Follow project style guide
- 🔍 Use linting tools (ESLint, Prettier)

---

## 🐛 Troubleshooting

### ❌ Common Issues & Solutions

**Issue: Port Already in Use**
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (Windows)
taskkill /PID <PID> /F
```

**Issue: Database Connection Failed**
- ✅ Verify database is running
- ✅ Check credentials in .env
- ✅ Ensure database exists
- ✅ Check firewall rules

**Issue: CORS Errors**
- ✅ Verify API Gateway configuration
- ✅ Check CORS headers in response
- ✅ Ensure frontend URL is whitelisted

**Issue: JWT Authentication Errors**
- ✅ Verify token not expired
- ✅ Check JWT_SECRET matches
- ✅ Ensure Authorization header format is correct

---

## 📊 Performance Optimization

### ⚡ Frontend Optimization
- 🎯 Code splitting with React.lazy()
- 📦 Bundle analysis with Vite
- 🖼️ Image optimization
- 💾 Service workers for caching
- ⚡ Lazy loading of components

### 🖥️ Backend Optimization
- 🗄️ Database indexing strategies
- 💾 Caching (Redis) implementation
- 📊 Query optimization
- 🔄 Connection pooling
- ⚖️ Load balancing configuration

---

## 🗺️ Roadmap & Future Enhancements

### 🔄 Planned Features
- 🗺️ Real-time GPS tracking integration
- 📡 IoT sensor data integration
- 🤖 Machine learning for predictive maintenance
- 📱 Mobile app (React Native)
- 🔔 Real-time notifications (WebSockets)
- 🌍 Multi-language support
- 🎨 Advanced reporting dashboard

### 🎯 Version Roadmap
- **v1.0.0** - Core functionality (Current)
- **v1.1.0** - GPS tracking & mapping
- **v1.2.0** - Advanced analytics
- **v2.0.0** - Mobile application
- **v2.1.0** - AI/ML features

---

## 📞 Support & Contact

### 🆘 Getting Help
- 📧 Email: support@memp-ship.com
- 💬 Discord: [Join Community](https://discord.gg/memp-ship)
- 📋 Issues: [GitHub Issues](https://github.com/anifocks/MEMP_Ship/issues)
- 📚 Documentation: [Wiki](https://github.com/anifocks/MEMP_Ship/wiki)

### 👥 Team
- **Project Lead:** Anil Ravada
- **Architecture:** Enterprise Microservices
- **Organization:** Viswa Group

---

## 📄 License & Legal

**License:** MIT License  
**Status:** Active Development  
**Version:** 1.0.0  
**Last Updated:** February 2026

See [LICENSE.md](LICENSE.md) for full license details.

---

## 🎉 Acknowledgments

- 🙏 React community for amazing tools
- 🙏 Node.js ecosystem contributors
- 🙏 Maritime industry partners
- 🙏 Open-source projects utilized

---

<div align="center">

**Made with ❤️ for the Maritime Industry**

[⬆ Back to Top](#-memp-ship---marine-emissions-management-platform)

</div>

---

**Repository:** https://github.com/anifocks/MEMP_Ship  
**Created:** 2026  
**Status:** ✅ Active | 🚀 Production Ready
