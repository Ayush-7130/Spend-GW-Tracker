# Spend Tracker# Spend Tracker# Spend Tracker Web Application

> A modern, production-ready expense tracking application with multi-group support, built with Next.js 15 and MongoDB.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)> A modern, production-ready expense tracking application with multi-group support, built with Next.js 15 and MongoDB.A full-featured, production-ready expense tracking application built with Next.js 15, MongoDB, and Bootstrap 5. Track expenses, manage budgets, and analyze spending patterns with a modern, accessible, and highly optimized interface.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)

[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)](https://www.mongodb.com/atlas)

[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

## 🌟 Features

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)

### Core Capabilities

[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)](https://www.mongodb.com/atlas)[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)](https://www.mongodb.com/atlas)

- **Multi-Group Architecture**: Create and manage separate expense tracking groups for family, work, friends, etc.

- **Smart Expense Splitting**: Equal or custom split amounts with automatic balance calculation[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-purple)](https://getbootstrap.com/)

- **Real-time Analytics**: Interactive charts showing spending patterns, trends, and category breakdowns

- **Comprehensive Search**: Full-text search with advanced filtering by category, date range, and payer[![WCAG 2.1](https://img.shields.io/badge/WCAG-2.1%20AA-brightgreen)](https://www.w3.org/WAI/WCAG21/quickref/)

- **Secure Authentication**: JWT-based auth with MFA support, session management, and rate limiting

- **Data Export**: CSV exports of expenses and settlements with applied filters## 🌟 Features[![Performance](https://img.shields.io/badge/Lighthouse-90%2B-brightgreen)](https://developers.google.com/web/tools/lighthouse)

- **Responsive Design**: Mobile-first interface optimized for all devices

- **Accessibility**: WCAG 2.1 Level AA compliant with keyboard navigation and screen reader support

- **Dark Mode**: System preference detection with manual toggle

### Core Capabilities## 🚀 Performance Optimized

### Group Management

- 🏘️ **Multiple Groups**: Create unlimited groups for different contexts

- 🔐 **Access Control**: Role-based permissions (Admin/Member)- **Multi-Group Architecture**: Create and manage separate expense tracking groups for family, work, friends, etc.This application has been extensively optimized for performance:

- 📨 **Invite System**: Share 6-digit codes to invite members

- ✅ **Join Approvals**: Optional approval workflow for new members- **Smart Expense Splitting**: Equal or custom split amounts with automatic balance calculation

- 🔄 **Quick Switching**: Seamless navigation between groups

- **Real-time Analytics**: Interactive charts showing spending patterns, trends, and category breakdowns- **⚡ 90+ Lighthouse Score** - Production-ready performance

### Security & Performance

- **Comprehensive Search**: Full-text search with advanced filtering by category, date range, and payer- **📦 25% Smaller Bundles** - Code splitting & dynamic imports

- 🔒 **Enterprise Security**: OWASP best practices, CSP headers, rate limiting

- ⚡ **Optimized Performance**: 90+ Lighthouse score, <200ms API responses- **Secure Authentication**: JWT-based auth with MFA support, session management, and rate limiting- **🔥 70-90% Fewer DB Queries** - Intelligent caching layer

- 🗄️ **Smart Caching**: 70-90% reduction in database queries

- 📦 **Code Splitting**: Dynamic imports for 25% smaller bundles- **Data Export**: CSV exports of expenses and settlements with applied filters- **⏱️ <200ms API Responses** - Optimized queries & connection pooling

## 🚀 Quick Start- **Responsive Design**: Mobile-first interface optimized for all devices- **📊 Web Vitals Monitoring** - Real-time performance tracking

### Prerequisites- **Accessibility**: WCAG 2.1 Level AA compliant with keyboard navigation and screen reader support

- Node.js 18+ ([Download](https://nodejs.org/))- **Dark Mode**: System preference detection with manual toggleSee [PERFORMANCE-IMPLEMENTATION-SUMMARY.md](PERFORMANCE-IMPLEMENTATION-SUMMARY.md) for details.

- MongoDB Atlas account ([Sign up free](https://www.mongodb.com/cloud/atlas/register))

- Git ([Download](https://git-scm.com/))

### Installation### Group Management## ✨ Features

1. **Clone the repository**

   ````bash

   git clone <repository-url>- 🏘️ **Multiple Groups**: Create unlimited groups for different contexts### Core Functionality

   cd SpendTracker-new

   ```- 🔐 **Access Control**: Role-based permissions (Admin/Member)

   ````

2. **Install dependencies**- 📨 **Invite System**: Share 6-digit codes to invite members- **🏘️ Multi-Group Architecture** (NEW - Dec 2025):

   ```bash

   npm install- ✅ **Join Approvals**: Optional approval workflow for new members  - Create and manage multiple expense tracking groups

   ```

- 🔄 **Quick Switching**: Seamless navigation between groups - Share groups with family, friends, or colleagues using 6-digit codes

3. **Configure environment**
   - Switch between groups seamlessly with group selector

   Create `.env.local` in the project root:

   ```env### Security & Performance  - Complete data isolation - each group has its own expenses, categories, and settlements

   # Database

   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/spend-tracker  - Role-based access control (Admin/Member)



   # Authentication (minimum 32 characters)- 🔒 **Enterprise Security**: OWASP best practices, CSP headers, rate limiting  - Join request approval system

   JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
   ```

- ⚡ **Optimized Performance**: 90+ Lighthouse score, <200ms API responses - Member management with promote/demote capabilities

  # Application

  NEXT_PUBLIC_APP_URL=http://localhost:3000- 🗄️ **Smart Caching**: 70-90% reduction in database queries - Group settings customization (invite permissions, approval requirements)

  NEXT_PUBLIC_ENABLE_SIGNUP=true

  NODE_ENV=development- 📦 **Code Splitting**: Dynamic imports for 25% smaller bundles- **📊 Dashboard**: Overview with quick stats, recent expenses, and spending insights

  # Optional: Email service (Resend)- **💰 Expense Management**:

  RESEND_API_KEY=re_your_api_key_here

  EMAIL_FROM=noreply@yourdomain.com## 🚀 Quick Start - Create, read, update, delete expenses

  ````

  - Split expenses (equal or custom amounts)

  > **Security Note**: Never commit `.env.local` to version control. Generate a strong JWT_SECRET:

  > ```bash### Prerequisites  - Advanced filtering and search with debounced input

  > openssl rand -base64 32

  > ```  - Bulk operations
  ````

4. **Initialize database**- Node.js 18+ ([Download](https://nodejs.org/)) - CSV export with current filters

   ```bash

   npm run db:setup- MongoDB Atlas account ([Sign up free](https://www.mongodb.com/cloud/atlas/register))  - Category and subcategory assignment

   ```

- Git ([Download](https://git-scm.com/))- **📁 Category Management**: Full CRUD operations with color coding and icons

  This creates collections and indexes (no sample data).

- **💳 Settlements**: Track who owes whom, record payments, view balance summaries

  To include test users and demo group:

  ````bash### Installation- **📈 Analytics Dashboard**:

  npm run db:setup -- --seed

  ```  - Expense breakdown by category (interactive pie chart)
  ````

5. **Start development server**1. **Clone the repository** - Spending trends over time (line chart)

   ````bash

   npm run dev   ```bash  - User-wise spending comparison (bar chart)

   ````

   git clone <repository-url> - Time-based analysis (daily/monthly/quarterly/yearly)

6. **Open application**

   cd SpendTracker-new - Timeline view of expense history

   Navigate to [http://localhost:3000](http://localhost:3000)

   ```- **👤 User Profile**: Manage account information, change password

   Sign up to create your account and first group!
   ```

- **📥 Data Export**: Export expenses and settlements to CSV format

### Test Credentials (Optional)

2. **Install dependencies**

If you ran setup with `--seed` flag, you can log in with:

````bash### Technical Features

- **Email**: `alice@example.com` | **Password**: `password123`

- **Email**: `bob@example.com` | **Password**: `password123`   npm install



> ⚠️ **Change these passwords immediately in production!**   ```- **🎨 Centralized Color System**: Consistent theming with CSS variables



## 📖 Documentation- **♿ Accessibility**: WCAG 2.1 Level AA compliant



### Project Structure3. **Configure environment**  - ARIA labels and roles



```     - Keyboard navigation

SpendTracker-new/

├── src/   Create `.env.local` in the project root:  - Screen reader support

│   ├── app/                     # Next.js App Router

│   │   ├── api/                 # API endpoints   ```env  - Focus indicators

│   │   │   ├── auth/            # Authentication

│   │   │   ├── groups/          # Group management   # Database  - Touch target optimization (44x44px)

│   │   │   ├── expenses/        # Expense CRUD

│   │   │   ├── categories/      # Categories   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/spend-tracker- **📱 Responsive Design**: Mobile-first approach with tablet and desktop optimizations

│   │   │   ├── settlements/     # Settlement tracking

│   │   │   ├── analytics/       # Analytics data- **🔒 Security** (Enhanced Dec 2025):

│   │   │   └── dashboard/       # Dashboard stats

│   │   ├── groups/              # Group pages   # Authentication (minimum 32 characters)  - **HTTPS Enforcement**: Production-grade TLS/SSL with HSTS

│   │   ├── expenses/            # Expense pages

│   │   ├── settlements/         # Settlement pages   JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long  - **Security Headers**: OWASP-compliant (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)

│   │   ├── analytics/           # Analytics pages

│   │   └── profile/             # User profile  - **JWT Authentication**: Single token system with FIXED expiry (no sliding sessions)

│   ├── components/              # React components

│   ├── contexts/                # React contexts   # Application  - **Session Management**: Fixed 1-day or 7-day expiry (Remember Me) - never extends

│   ├── hooks/                   # Custom hooks

│   ├── lib/                     # Utilities & config   NEXT_PUBLIC_APP_URL=http://localhost:3000  - **Password Security**: bcrypt with 12 rounds, strong password policy (8+ chars, mixed case, numbers)

│   ├── shared/                  # Shared components

│   ├── styles/                  # Global styles   NEXT_PUBLIC_ENABLE_SIGNUP=true  - **Rate Limiting**:

│   └── types/                   # TypeScript types

├── scripts/                     # Database scripts   NODE_ENV=development    - Login: 5 attempts per 15 minutes

│   └── setup-database.js        # Unified setup script

├── public/                      # Static assets    - Signup: 5 attempts per hour

└── package.json                 # Dependencies

```   # Optional: Email service (Resend)    - Password Reset: 3 attempts per hour



### Available Commands   RESEND_API_KEY=re_your_api_key_here    - Email Verification: 5 attempts per hour



```bash   EMAIL_FROM=noreply@yourdomain.com    - API Endpoints: 30 requests per minute

# Development

npm run dev                        # Start dev server with hot reload   ```  - **Session Tracking**: Multi-device support with device fingerprinting

npm run build                      # Production build

npm start                          # Start production server  - **MFA Support**: Optional TOTP-based two-factor authentication with backup codes



# Code Quality   > **Security Note**: Never commit `.env.local` to version control. Generate a strong JWT_SECRET:  - **Input Validation**: Server-side validation & sanitization

npm run lint                       # Lint code

npm run type-check                 # TypeScript validation   > ```bash  - **NoSQL Injection Prevention**: Parameterized queries & MongoDB operators only



# Database   > openssl rand -base64 32  - **Privacy-Focused**: IP addresses stored only for display (not used for enforcement)

npm run db:setup                   # Clean setup (no sample data)

npm run db:setup -- --seed         # Setup with test data   > ```- **⚡ Performance** (Optimized Nov 2025):

npm run db:setup -- --indexes-only # Only create/update indexes

```  - **Connection Pooling**: MongoDB optimized with compression



### API Documentation4. **Initialize database**  - **Intelligent Caching**: 70-90% reduction in database queries



All API endpoints return JSON with this structure:   ```bash  - **Code Splitting**: Dynamic imports for 25% smaller bundles



```typescript   npm run db:setup  - **Query Optimization**: Field projection, compound indexes, TTL indexes

{

success: boolean;   ```  - **React Memoization**: useCallback/useMemo to prevent re-renders

data?: T;                    // Response data (on success)

message?: string;            // Success message  - **HTTP Caching**: Cache-Control headers with stale-while-revalidate

error?: string;              // Error message (on failure)

errors?: Record<string, string>; // Validation errors   This creates collections, indexes, and seeds sample data.  - **Web Vitals**: Real-time monitoring (LCP, FID, CLS, FCP, TTFB, INP)

}

```  - **Bundle Optimization**: Separate chunks for large libraries



#### Authentication Endpoints5. **Start development server**- **🎭 Dark Mode**: System preference detection with manual toggle



- `POST /api/auth/signup` - Create new account   ```bash- **🛡️ Error Handling**: React Error Boundaries with fallback UIs

- `POST /api/auth/login` - Authenticate user

- `GET /api/auth/me` - Get current user   npm run dev- **📝 Type Safety**: Full TypeScript coverage with shared API types

- `POST /api/auth/logout` - Logout and invalidate session

- `POST /api/auth/change-password` - Change password   ```- **📊 Structured Logging**: Production-ready logging with automatic sensitive data redaction



#### Group Endpoints



- `GET /api/groups` - List user's groups6. **Open application**## 🛠️ Technology Stack

- `POST /api/groups` - Create new group

- `GET /api/groups/:id` - Get group details

- `PATCH /api/groups/:id` - Update group

- `DELETE /api/groups/:id` - Delete group (admin only)   Navigate to [http://localhost:3000](http://localhost:3000)- **Frontend & Backend**: Next.js 15 (App Router, React Server Components)

- `POST /api/groups/switch` - Switch active group

- `POST /api/groups/join` - Join group via code- **Database**: MongoDB with optimized indexes and TTL cleanup



#### Expense Endpoints### Test Credentials- **Styling**: Bootstrap 5.3 + Custom CSS (themes, responsive, accessibility)



- `GET /api/expenses` - List expenses (paginated)- **Icons**: Bootstrap Icons

- `POST /api/expenses` - Create expense

- `PUT /api/expenses/:id` - Update expenseAfter setup, you can log in with:- **Charts**: Chart.js with react-chartjs-2

- `DELETE /api/expenses/:id` - Delete expense

- `GET /api/expenses/export` - Export to CSV- **Language**: TypeScript 5.0



#### Analytics Endpoints- **Email**: `alice@example.com` | **Password**: `password123`- **Authentication**: Custom JWT implementation (single token, fixed expiry)



- `GET /api/analytics/summary` - Spending summary- **Email**: `bob@example.com` | **Password**: `password123`- **Password Hashing**: bcrypt (12 rounds)

- `GET /api/analytics/timeline` - Historical trends

- `GET /api/analytics/categories` - Category breakdown- **Date Handling**: Native JavaScript Date API

- `GET /api/dashboard` - Dashboard overview

> ⚠️ **Change these passwords immediately in production!**- **Validation**: Custom validation with type-safe schemas

For detailed API specifications, see inline JSDoc comments in route files.

- **Logging**: Structured logging with sensitive data redaction

## 🏗️ Architecture

## 📖 Documentation

### Technology Stack

## 🚀 Quick Start

| Layer | Technology |

|-------|-----------|### Project Structure

| **Frontend** | Next.js 15 (App Router), React 18, TypeScript 5 |

| **Backend** | Next.js API Routes, Node.js 18+ |### Prerequisites

| **Database** | MongoDB Atlas with optimized indexes |

| **Styling** | Bootstrap 5.3, Custom CSS Variables |```

| **Charts** | Chart.js with react-chartjs-2 |

| **Authentication** | JWT (httpOnly cookies), bcrypt (12 rounds) |SpendTracker-new/- **Node.js**: 18.0 or higher ([Download](https://nodejs.org/))

| **Validation** | Server-side with type-safe schemas |

├── src/- **MongoDB**: Atlas account ([Sign up free](https://www.mongodb.com/cloud/atlas/register))

### Key Design Patterns

│   ├── app/                     # Next.js App Router- **Git**: For version control ([Download](https://git-scm.com/))

- **API Middleware**: Centralized authentication and authorization

- **Context Providers**: Global state management (Auth, Groups, Theme)│   │   ├── api/                 # API endpoints- **Resend Account** (Optional): For email functionality ([Sign up](https://resend.com))

- **Error Boundaries**: Graceful error handling with fallback UI

- **Code Splitting**: Dynamic imports for large dependencies│   │   │   ├── auth/            # Authentication

- **React Memoization**: useCallback/useMemo to prevent re-renders

│   │   │   ├── groups/          # Group management### Authentication System

### Performance Optimizations

│   │   │   ├── expenses/        # Expense CRUD

| Optimization | Impact |

|-------------|--------|│   │   │   ├── categories/      # CategoriesThis application uses a **single token authentication** system with **FIXED session expiry**:

| Connection Pooling | -50ms per request |

| Intelligent Caching | 70-90% fewer DB queries |│   │   │   ├── settlements/     # Settlement tracking

| Code Splitting | -25% bundle size |

| Query Optimization | -40% response time |│   │   │   ├── analytics/       # Analytics data#### Token Strategy

| HTTP Caching | 60-80% less traffic |

│   │   │   └── dashboard/       # Dashboard stats

## 🔒 Security

│   │   ├── groups/              # Group pages- **Single Token**: One JWT token (no separate access/refresh tokens)

### Authentication & Sessions

│   │   ├── expenses/            # Expense pages- **Fixed Expiry**: Sessions expire at exact time set during login, **never extended**

- **JWT Tokens**: httpOnly, secure, SameSite cookies

- **Fixed Expiry**: 1-day (default) or 7-day (Remember Me) - never extended│   │   ├── settlements/         # Settlement pages- **Remember Me = false**: 1 day fixed expiry

- **Multi-Device**: Independent sessions with manual revocation

- **MFA Support**: TOTP-based two-factor authentication│   │   ├── analytics/           # Analytics pages- **Remember Me = true**: 7 days fixed expiry



### Data Protection│   │   └── profile/             # User profile- **Storage**: Secure httpOnly cookie named `refreshToken`



- **Group Isolation**: All data scoped to groups at database level│   ├── components/              # React components- **Security**: httpOnly, secure (production), sameSite: "lax"

- **Role-Based Access**: Admin/Member permissions enforced

- **Input Validation**: Server-side validation and sanitization│   ├── contexts/                # React contexts

- **NoSQL Injection**: Parameterized queries, ObjectId validation

- **Rate Limiting**: │   ├── hooks/                   # Custom hooks#### Session Behavior

- Login: 5 attempts per 15 minutes

- Signup: 5 attempts per hour│   ├── lib/                     # Utilities & config

- API: 30 requests per minute

│   ├── shared/                  # Shared components- ✅ Sessions expire at **exact time** from login (no sliding)

### Production Checklist

│   ├── styles/                  # Global styles- ✅ Refresh route (`/api/auth/me`) validates but does NOT extend sessions

Before deploying to production:

│   └── types/                   # TypeScript types- ✅ Activity tracked via `lastActivityAt` (for analytics only, not expiry)

- [ ] Set strong `JWT_SECRET` (32+ characters)

- [ ] Configure HTTPS/TLS with valid certificate├── scripts/                     # Database scripts- ✅ Expired sessions automatically deactivated in database

- [ ] Update `EMAIL_FROM` to verified domain

- [ ] Set `NODE_ENV=production`│   └── setup-database.js        # Unified setup script- ✅ Multiple devices supported (independent sessions)

- [ ] Create database indexes (`npm run db:setup -- --indexes-only`)

- [ ] Configure CORS and CSP headers├── public/                      # Static assets- ❌ No automatic session extension on activity

- [ ] Review MongoDB Atlas IP whitelist

- [ ] Disable test credentials (don't run with `--seed`)└── package.json                 # Dependencies- ❌ No infinite sessions (security by design)



## 🚀 Deployment```



### Deploy to Vercel (Recommended)**Example:** Login with Remember Me at 10:00 AM → Session expires exactly 7 days later at 10:00 AM, regardless of usage.



1. Push code to Git repository (GitHub, GitLab, Bitbucket)### Available Commands

2. Import project at [vercel.com](https://vercel.com)

3. Configure environment variables (see `.env.local` template)**Migration Note:** Upgraded from two-token system (Dec 2025). See `PRODUCTION-READINESS-AUDIT.md` for details.

4. Deploy automatically

```bash

### Manual Deployment

# Development### Installation

**Build Command**: `npm run build`

**Start Command**: `npm start`  npm run dev                 # Start dev server with hot reload

**Port**: 3000 (configurable via `PORT` env var)

npm run build               # Production build1. **Clone the repository**:

**Requirements**:

- Node.js 18+ runtimenpm start                   # Start production server

- MongoDB Atlas accessible from server

- Environment variables configured   ```bash

- HTTPS enabled

# Code Quality   git clone <repository-url>

### Post-Deployment

npm run lint                # Lint code   cd spend-tracker

1. Verify environment variables are set

2. Run database setup: `npm run db:setup -- --indexes-only`npm run type-check          # TypeScript validation   ```

3. Test authentication flow

4. Verify rate limiting (should return HTTP 429 on excessive requests)

5. Check security headers in browser DevTools

6. Run Lighthouse audit (target: 90+)# Database2. **Install dependencies**:



## 🤝 Contributingnpm run db:setup            # Full setup with seed data



We welcome contributions! Here's how:npm run db:setup -- --no-seed      # Setup without seed data   ```bash



1. Fork the repositorynpm run db:setup -- --indexes-only # Only create/update indexes   npm install

2. Create feature branch: `git checkout -b feature/amazing-feature`

3. Make changes and test thoroughly```   ```

4. Commit: `git commit -m "Add amazing feature"`

5. Push: `git push origin feature/amazing-feature`

6. Open Pull Request with description

### API Documentation3. **Set up environment variables**:

### Code Style



- Use TypeScript for all new code

- Follow existing naming conventionsAll API endpoints return JSON with this structure:   Create a `.env.local` file in the root directory:

- Add ARIA labels for accessibility

- Ensure mobile responsiveness

- Write meaningful commit messages

- Add JSDoc comments for exported functions```typescript   ```env



## 📝 License{   # ============================================



This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.  success: boolean;   # DATABASE



## 🙏 Acknowledgments  data?: T;                    // Response data (on success)   # ============================================



- [Next.js](https://nextjs.org/) - React framework  message?: string;            // Success message   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/spend-tracker?retryWrites=true&w=majority

- [MongoDB](https://www.mongodb.com/) - Database platform

- [Bootstrap](https://getbootstrap.com/) - UI framework  error?: string;              // Error message (on failure)

- [Chart.js](https://www.chartjs.org/) - Data visualization

errors?: Record<string, string>; // Validation errors   # ============================================

## 📧 Support

}   # JWT SECRET (Single Token System)

- 🐛 **Bug Reports**: [Open an issue](../../issues)

- 💡 **Feature Requests**: [Open an issue](../../issues)```   # ============================================

- 📖 **Documentation**: Check inline comments and JSDoc

- 🔍 **Troubleshooting**: See API error responses   # SECURITY: Must be at least 32 characters for cryptographic security



---#### Authentication Endpoints   # Generate: openssl rand -base64 32



**Built with ❤️ using Next.js, TypeScript, and MongoDB**   JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long



*Last updated: January 2026*- `POST /api/auth/signup` - Create new account


- `POST /api/auth/login` - Authenticate user   # ============================================

- `GET /api/auth/me` - Get current user   # EMAIL SERVICE (Resend) - Optional

- `POST /api/auth/logout` - Logout and invalidate session   # ============================================

- `POST /api/auth/change-password` - Change password   # For password reset and email verification

# Get API key from: https://resend.com/api-keys

#### Group Endpoints   RESEND_API_KEY=re_your_api_key_here

EMAIL_FROM=noreply@yourdomain.com  # Use verified domain in production

- `GET /api/groups` - List user's groups

- `POST /api/groups` - Create new group   # ============================================

- `GET /api/groups/:id` - Get group details   # APPLICATION

- `PATCH /api/groups/:id` - Update group   # ============================================

- `DELETE /api/groups/:id` - Delete group (admin only)   NEXT_PUBLIC_APP_URL=http://localhost:3000

- `POST /api/groups/switch` - Switch active group   NEXT_PUBLIC_ENABLE_SIGNUP=true  # Set to false to disable new signups

- `POST /api/groups/join` - Join group via code   NODE_ENV=development

````

#### Expense Endpoints

**Security Notes:**

- `GET /api/expenses` - List expenses (paginated) - ✅ Never commit `.env.local` to version control

- `POST /api/expenses` - Create expense - ✅ Use strong, random JWT_SECRET (32+ characters)

- `PUT /api/expenses/:id` - Update expense - ✅ Change EMAIL_FROM from test domain (`onboarding@resend.dev`) to verified domain before production

- `DELETE /api/expenses/:id` - Delete expense - ✅ Use HTTPS URL for NEXT_PUBLIC_APP_URL in production

- `GET /api/expenses/export` - Export to CSV - ⚠️ Remove `JWT_REFRESH_SECRET` and `NEXTAUTH_*` if present (no longer used)

#### Analytics Endpoints4. **Validate environment variables**:

- `GET /api/analytics/summary` - Spending summary The application automatically validates environment variables on startup. Fix any errors before proceeding.

- `GET /api/analytics/timeline` - Historical trends

- `GET /api/analytics/categories` - Category breakdown5. **Initialize the database**:

- `GET /api/dashboard` - Dashboard overview

  ```bash

  ```

For detailed API specifications, see inline JSDoc comments in route files. # One-time setup: Creates collections and seeds initial data

npm run db:setup

## 🏗️ Architecture

# Setup without seed data (clean start)

### Technology Stack npm run db:setup-no-seed

| Layer | Technology | # Create optimized indexes (recommended after setup)

|-------|-----------| npm run db:indexes

| **Frontend** | Next.js 15 (App Router), React 18, TypeScript 5 | ```

| **Backend** | Next.js API Routes, Node.js 18+ |

| **Database** | MongoDB Atlas with optimized indexes | **What happens:**

| **Styling** | Bootstrap 5.3, Custom CSS Variables | - Creates MongoDB collections (users, sessions, expenses, categories, etc.)

| **Charts** | Chart.js with react-chartjs-2 | - Seeds sample data (categories, test expenses) if not using `--no-seed`

| **Authentication** | JWT (httpOnly cookies), bcrypt (12 rounds) | - Creates compound indexes for optimized queries

| **Validation** | Server-side with type-safe schemas | - Adds TTL index for automatic login history cleanup (90 days)

### Key Design Patterns6. **Start the development server**:

- **API Middleware**: Centralized authentication and authorization ```bash

- **Context Providers**: Global state management (Auth, Groups, Theme) npm run dev

- **Error Boundaries**: Graceful error handling with fallback UI ```

- **Code Splitting**: Dynamic imports for large dependencies

- **React Memoization**: useCallback/useMemo to prevent re-renders7. **Open your browser and navigate to**:

  ```

  ```

### Performance Optimizations http://localhost:3000

````

| Optimization | Impact |

|-------------|--------|### Default Users

| Connection Pooling | -50ms per request |

| Intelligent Caching | 70-90% fewer DB queries |After initialization, you can log in with:

| Code Splitting | -25% bundle size |

| Query Optimization | -40% response time |- **Email**: `saket@example.com` | **Password**: `password123`

| HTTP Caching | 60-80% less traffic |- **Email**: `ayush@example.com` | **Password**: `password123`



## 🔒 Security⚠️ **Change these passwords immediately in production!**



### Authentication & Sessions### Key Optimizations



- **JWT Tokens**: httpOnly, secure, SameSite cookies| Feature                 | Impact                  | Details                                           |

- **Fixed Expiry**: 1-day (default) or 7-day (Remember Me) - never extended| ----------------------- | ----------------------- | ------------------------------------------------- |

- **Multi-Device**: Independent sessions with manual revocation| **Connection Pooling**  | -50ms per request       | Optimized MongoDB connections with compression    |

- **MFA Support**: TOTP-based two-factor authentication| **Intelligent Caching** | 70-90% fewer DB queries | In-memory cache with automatic invalidation       |

| **Code Splitting**      | -25% bundle size        | Dynamic imports for Chart.js and heavy components |

### Data Protection| **Query Optimization**  | -40% response time      | Field projection and indexed queries              |

| **HTTP Caching**        | 60-80% less traffic     | Cache-Control headers with stale-while-revalidate |

- **Group Isolation**: All data scoped to groups at database level| **React Optimization**  | -50% re-renders         | Memoized contexts and components                  |

- **Role-Based Access**: Admin/Member permissions enforced| **Web Vitals**          | Real-time monitoring    | Track LCP, FID, CLS, FCP, TTFB, INP               |

- **Input Validation**: Server-side validation and sanitization

- **NoSQL Injection**: Parameterized queries, ObjectId validation### Target Metrics (Production)

- **Rate Limiting**:

- Login: 5 attempts per 15 minutes- **Lighthouse Performance:** 90+

- Signup: 5 attempts per hour- **First Contentful Paint:** <1.5s

- API: 30 requests per minute- **Time to Interactive:** <3.5s

- **API Response (p95):** <200ms

### Production Checklist- **Bundle Size:** <225KB

- **Database Query:** <100ms

Before deploying to production:

## 📁 Project Structure

- [ ] Set strong `JWT_SECRET` (32+ characters)

- [ ] Configure HTTPS/TLS with valid certificate```

- [ ] Update `EMAIL_FROM` to verified domainspend-tracker/

- [ ] Set `NODE_ENV=production`├── src/

- [ ] Create database indexes (`npm run db:setup -- --indexes-only`)│   ├── app/                      # Next.js App Router pages

- [ ] Configure CORS and CSP headers│   │   ├── api/                  # API routes

- [ ] Set up session cleanup cron job│   │   │   ├── auth/             # Authentication endpoints

- [ ] Review MongoDB Atlas IP whitelist│   │   │   ├── expenses/         # Expense CRUD + export

- [ ] Change default test user passwords│   │   │   ├── categories/       # Category management

│   │   │   ├── settlements/      # Settlement tracking

## 🧪 Testing│   │   │   ├── analytics/        # Analytics data

│   │   │   └── dashboard/        # Dashboard stats

### Manual Testing Checklist│   │   ├── expenses/             # Expense management UI

│   │   ├── categories/           # Category management UI

**Authentication**│   │   ├── settlements/          # Settlement tracking UI

- [ ] Signup with valid/invalid data│   │   ├── analytics/            # Analytics dashboards

- [ ] Login with correct/incorrect credentials│   │   ├── profile/              # User profile page

- [ ] Session expiry after inactivity│   │   ├── login/                # Login page

- [ ] MFA enrollment and verification│   │   └── layout.tsx            # Root layout with providers

- [ ] Password reset flow│   ├── components/               # Reusable React components

│   │   ├── Navigation.tsx        # Main navigation bar

**Groups**│   │   ├── MainLayout.tsx        # Page layout wrapper

- [ ] Create new group│   │   ├── ErrorBoundary.tsx     # Error handling

- [ ] Join group with valid code│   │   └── ...

- [ ] Switch between multiple groups│   ├── shared/                   # Shared component library

- [ ] Invite/remove members (admin)│   │   └── components/

- [ ] Data isolation between groups│   │       ├── Table/            # Table component

│   │       ├── Modal/            # Modal dialogs

**Expenses**│   │       ├── Form/             # Form components

- [ ] Create expense (personal and split)│   │       ├── Card/             # Card layouts

- [ ] Edit/delete own expenses│   │       ├── Badge/            # Badge components

- [ ] Search and filter expenses│   │       ├── ExportButton/     # Export functionality

- [ ] Export to CSV│   │       └── ...

- [ ] Pagination│   ├── contexts/                 # React contexts

│   │   ├── AuthContext.tsx       # Authentication state

**Analytics**│   │   ├── ThemeContext.tsx      # Dark/light mode

- [ ] View category breakdown│   │   ├── CategoriesContext.tsx # Categories data

- [ ] Check spending trends│   │   └── NotificationContext.tsx # Notifications

- [ ] Verify date range filtering│   ├── hooks/                    # Custom React hooks

- [ ] Test chart interactions│   │   ├── useApi.ts             # API calls with error handling

│   │   ├── useForm.ts            # Form state management

## 🚀 Deployment│   │   └── useConfirmation.ts    # Confirmation dialogs

│   ├── lib/                      # Utility libraries

### Deploy to Vercel (Recommended)│   │   ├── database.ts           # MongoDB connection

│   │   ├── auth.ts               # JWT & password utilities

1. Push code to Git repository (GitHub, GitLab, Bitbucket)│   │   ├── api-middleware.ts     # API middleware functions

2. Import project at [vercel.com](https://vercel.com)│   │   └── utils/

3. Configure environment variables (see `.env.local` template)│   │       ├── export.ts         # CSV export utilities

4. Deploy automatically│   │       ├── accessibility.ts  # Accessibility helpers

│   │       ├── performance.ts    # Performance monitoring

### Manual Deployment│   │       ├── security.ts       # Security utilities

│   │       ├── currency.ts       # Currency formatting

**Build Command**: `npm run build`  │   │       ├── date.ts           # Date formatting

**Start Command**: `npm start`  │   │       └── ...

**Port**: 3000 (configurable via `PORT` env var)│   ├── types/                    # TypeScript type definitions

│   │   └── api.ts                # Shared API types

**Requirements**:│   └── styles/                   # Global styles

- Node.js 18+ runtime│       ├── globals.css           # Global CSS

- MongoDB Atlas accessible from server│       ├── themes.css            # Theme variables

- Environment variables configured│       ├── responsive.css        # Responsive breakpoints

- HTTPS enabled│       └── accessibility.css     # Accessibility styles

├── scripts/                      # Utility scripts

### Post-Deployment│   ├── unified-database-setup.js # Complete database setup (recommended)

│   ├── migrate-to-single-token.js # Migration script for token system

1. Verify environment variables are set│   ├── verify-migration.js       # Verify migration status

2. Run database setup: `npm run db:setup -- --no-seed`│   └── cleanup-old-indexes.js    # Clean up old indexes

3. Test authentication flow├── public/                       # Static assets

4. Verify rate limiting (should return HTTP 429 on excessive requests)├── .env.local                    # Environment variables (not in Git)

5. Check security headers in browser DevTools├── next.config.ts                # Next.js configuration

6. Run Lighthouse audit (target: 90+)├── tsconfig.json                 # TypeScript configuration

└── package.json                  # Dependencies

## 🤝 Contributing```



We welcome contributions! Here's how:## 🔌 API Documentation



1. Fork the repositoryAll API endpoints return JSON responses with the following structure:

2. Create feature branch: `git checkout -b feature/amazing-feature`

3. Make changes and test thoroughly```typescript

4. Commit: `git commit -m "Add amazing feature"`{

5. Push: `git push origin feature/amazing-feature`  success: boolean;

6. Open Pull Request with description  data?: T;              // Response data (on success)

message?: string;      // Success message

### Code Style  error?: string;        // Error message (on failure)

errors?: Record<string, string>; // Validation errors

- Use TypeScript for all new code}

- Follow existing naming conventions```

- Add ARIA labels for accessibility

- Ensure mobile responsiveness### Authentication

- Write meaningful commit messages

- Add JSDoc comments for exported functions#### POST `/api/auth/signup`



## 📝 LicenseCreate a new user account.



This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.**Request Body:**



## 🙏 Acknowledgments```json

{

- [Next.js](https://nextjs.org/) - React framework  "email": "user@example.com",

- [MongoDB](https://www.mongodb.com/) - Database platform  "password": "SecurePassword123",

- [Bootstrap](https://getbootstrap.com/) - UI framework  "name": "John Doe"

- [Chart.js](https://www.chartjs.org/) - Data visualization}

````

## 📧 Support

**Response:**

- 🐛 **Bug Reports**: [Open an issue](../../issues)

- 💡 **Feature Requests**: [Open an issue](../../issues)```json

- 📖 **Documentation**: Check inline comments and JSDoc{

- 🔍 **Troubleshooting**: See API error responses "success": true,

  "data": {

--- "user": { "\_id": "...", "email": "...", "name": "..." },

    "token": "jwt-refresh-token"

**Built with ❤️ using Next.js, TypeScript, and MongoDB** },

"message": "Signup successful"

_Last updated: January 2026_}

````

**Note:** Token is automatically set as an httpOnly cookie named `refreshToken`

#### POST `/api/auth/login`

Authenticate user and get JWT refresh token.

**Rate Limit:** 5 attempts per minute per IP

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "rememberMe": false,
  "totpCode": "123456"
}
````

**Response:**

```json
{
  "success": true,
  "data": {
    "user": { "_id": "...", "email": "...", "name": "..." },
    "requiresMFA": false
  },
  "message": "Login successful"
}
```

**Token Storage:**

- Token automatically set as httpOnly cookie: `refreshToken`
- Default expiry: 1 day
- With rememberMe: 7 days
- Secure flag enabled in production (HTTPS only)

#### GET `/api/auth/me`

Get current authenticated user info.

**Authentication:** Automatic via `refreshToken` cookie

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "...",
      "email": "user@example.com",
      "name": "John Doe",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  }
}
```

#### POST `/api/auth/logout`

Logout current user and invalidate session.

**Authentication:** Automatic via `refreshToken` cookie

**Response:**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Actions:**

- Marks session as inactive in database
- Clears `refreshToken` cookie
- Logs security event

#### PUT `/api/auth/profile`

Update user profile.

**Request Body:**

```json
{
  "name": "New Name",
  "email": "newemail@example.com"
}
```

#### POST `/api/auth/change-password`

Change user password.

**Request Body:**

```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword123"
}
```

### Expenses

#### GET `/api/expenses`

Get list of expenses with filtering and pagination.

**Query Parameters:**

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `search` (string): Search in description
- `category` (string): Filter by category ID
- `paidBy` (string): Filter by user
- `startDate` (string): Start date (YYYY-MM-DD)
- `endDate` (string): End date (YYYY-MM-DD)
- `sortBy` (string): Sort field (default: "date")
- `sortOrder` ("asc" | "desc"): Sort direction (default: "desc")

**Response:**

```json
{
  "success": true,
  "data": {
    "expenses": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "pages": 10
    }
  }
}
```

#### POST `/api/expenses`

Create a new expense.

**Request Body:**

```json
{
  "amount": 500.5,
  "description": "Grocery shopping",
  "date": "2025-11-15",
  "category": "groceries",
  "subcategory": "Weekly Shopping",
  "paidBy": "saket",
  "isSplit": true,
  "splitDetails": {
    "type": "equal",
    "saketAmount": 250.25,
    "ayushAmount": 250.25
  }
}
```

#### PUT `/api/expenses/[id]`

Update an existing expense.

#### DELETE `/api/expenses/[id]`

Delete an expense.

#### GET `/api/expenses/export`

Export expenses to CSV with current filters.

**Query Parameters:** Same as GET `/api/expenses`

**Response:** CSV file download

### Categories

#### GET `/api/categories`

Get all categories.

#### POST `/api/categories`

Create a new category.

**Request Body:**

```json
{
  "name": "Entertainment",
  "icon": "bi-film",
  "color": "#ff6b6b",
  "subcategories": ["Movies", "Games", "Concerts"]
}
```

#### PUT `/api/categories/[id]`

Update a category.

#### DELETE `/api/categories/[id]`

Delete a category.

### Settlements

#### GET `/api/settlements`

Get list of settlements.

#### POST `/api/settlements`

Record a new settlement.

**Request Body:**

```json
{
  "fromUser": "saket",
  "toUser": "ayush",
  "amount": 500,
  "description": "Settling last month's expenses",
  "date": "2025-11-15",
  "status": "settled"
}
```

#### GET `/api/settlements/balance`

Get current balance between users.

**Response:**

```json
{
  "success": true,
  "data": {
    "balances": [
      {
        "fromUser": "saket",
        "toUser": "ayush",
        "amount": 250.5,
        "status": "owes"
      }
    ],
    "summary": {
      "totalOwed": 250.5,
      "totalSettled": 1500,
      "totalTransactions": 25,
      "activeBalances": 1
    }
  }
}
```

#### GET `/api/settlements/export`

Export settlements to CSV.

### Analytics

#### GET `/api/analytics/overview`

Get dashboard overview statistics.

#### GET `/api/analytics/categories`

Get expense breakdown by category.

#### GET `/api/analytics/trends`

Get spending trends over time.

#### GET `/api/analytics/timeline`

Get expense timeline data.

#### GET `/api/analytics/user/[name]`

Get user-specific analytics.

### Dashboard

#### GET `/api/dashboard`

Get dashboard summary data.

## 📄 Pages

- **`/`** - Dashboard with overview and recent activity
- **`/expenses`** - Expense management (list, add, edit, delete, export)
- **`/categories`** - Category management
- **`/settlements`** - Settlement tracking and balance view
- **`/analytics`** - Analytics dashboard with charts
- **`/analytics/overview`** - Detailed spending overview
- **`/analytics/timeline`** - Timeline view of expenses
- **`/analytics/user/[name]`** - User-specific analytics
- **`/profile`** - User profile and settings
- **`/login`** - Login page
- **`/signup`** - Signup page (currently disabled)

3. **Expenses List** (`/expenses`) - Table view with filters and search
4. **Categories** (`/categories`) - Manage expense categories
5. **Analytics** (`/analytics`) - Charts and insights

## Key Features Highlights

### Split Logic

- **Equal Split**: Automatically divides amount equally
- **Custom Split**: Manual entry with validation
- **Settlement Tracking**: Shows who owes whom

### Responsive Design

- Mobile-first approach using Bootstrap 5
- Collapsible navigation for mobile devices
- Responsive tables and cards
- Touch-friendly interface

### Data Visualization

- **Pie Chart**: Expense breakdown by category
- **Line Chart**: Spending trends over time
- **Bar Chart**: Person-wise spending comparison
- **Interactive**: Hover effects and detailed tooltips

### User Experience

- **Form Validation**: Client and server-side validation
- **Loading States**: Spinners and feedback
- **Error Handling**: User-friendly error messages
- **Success Notifications**: Confirmation messages
- **Pagination**: Efficient data loading

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── analytics/
│   │   ├── categories/
│   │   ├── groups/           # NEW: Group management APIs
│   │   └── expenses/
│   ├── analytics/
│   ├── categories/
│   ├── expenses/
│   │   └── add/
│   ├── groups/                # NEW: Group management pages
│   │   └── [id]/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── MainLayout.tsx
│   ├── Navigation.tsx
│   ├── GroupSelector.tsx      # NEW: Group switching dropdown
│   ├── CreateGroupModal.tsx   # NEW: Create group modal
│   ├── JoinGroupModal.tsx     # NEW: Join group modal
│   ├── GroupSettings.tsx      # NEW: Group settings component
│   └── MemberList.tsx         # NEW: Member management component
├── contexts/
│   ├── GroupContext.tsx       # NEW: Group state management
│   └── ...
└── lib/
    ├── mongodb.ts
    └── utils/
        └── group.ts           # NEW: Group utilities
```

## 🏘️ Multi-Group Architecture

### Overview

The application now supports **multi-group expense tracking**, allowing users to:

- Create multiple groups for different purposes (family, work, friends, etc.)
- Share groups with others using simple 6-digit codes
- Maintain complete data isolation between groups
- Switch seamlessly between groups with a dropdown selector

### Key Concepts

**Groups**: Containers for expenses, categories, and settlements. Each group has:

- Unique 6-character alphanumeric code (e.g., `ABC123`)
- Members with roles (Admin or Member)
- Independent data (expenses, categories, settlements)
- Customizable settings

**Roles**:

- **Admin**: Can manage group settings, add/remove members, approve join requests, delete group
- **Member**: Can create/edit expenses, view group data, leave group

**Data Isolation**: All data is strictly scoped to groups:

- Expenses created in Group A are never visible in Group B
- Categories are group-specific
- Settlements track balances within each group
- Analytics show data only for the active group

### Getting Started with Groups

#### 1. Create Your First Group

After signing up and logging in:

1. Navigate to `/groups` (or click "Create Group" in the navbar)
2. Click "Create Group" button
3. Enter group name (e.g., "Family Budget")
4. Optionally add a description
5. Submit to create

**Result**:

- You become the admin of the new group
- A unique 6-digit code is generated (e.g., `XYZ789`)
- The group is automatically set as your active group

#### 2. Invite Members

**Method 1: Share the Group Code**

1. Go to `/groups/[groupId]` (click "Settings" on a group)
2. Copy the 6-digit group code
3. Share it with others via email, text, etc.

**Method 2: Direct Share**

1. Members can join by clicking "Join Group" in `/groups`
2. They enter the 6-digit code you shared
3. If approval is required, admins must approve the request

#### 3. Manage Join Requests (Admin Only)

1. Navigate to the group settings page
2. View "Join Requests" section
3. Click approve or reject for each pending request

#### 4. Switch Between Groups

Use the **Group Selector** in the navbar:

- Click the dropdown showing your current group
- Select a different group to switch
- All data updates to show the new group's information

### API Endpoints

#### Group Management

```bash
# Get all user's groups
GET /api/groups

# Create new group
POST /api/groups
Body: { "name": "Family", "description": "..." }

# Get specific group
GET /api/groups/:groupId

# Update group
PATCH /api/groups/:groupId
Body: { "name": "New Name", "settings": { ... } }

# Delete group (admin only)
DELETE /api/groups/:groupId

# Switch active group
POST /api/groups/switch
Body: { "groupId": "..." }

# Join group via code
POST /api/groups/join
Body: { "groupCode": "ABC123" }
```

#### Member Management

```bash
# Remove member (admin only)
DELETE /api/groups/:groupId/members/:userId

# Update member role (admin only)
PATCH /api/groups/:groupId/members/:userId
Body: { "role": "admin" | "member" }
```

#### Join Requests

```bash
# Get join requests (admin only)
GET /api/groups/:groupId/requests

# Process join request (admin only)
PATCH /api/groups/:groupId/requests/:userId
Body: { "action": "approve" | "reject" }
```

### Data Model

#### Group Object

```typescript
interface Group {
  _id: string;
  name: string;
  description?: string;
  groupId: string; // 6-digit code
  members: GroupMember[];
  createdBy: string;
  createdAt: Date;
  settings: {
    allowMemberInvites?: boolean;
    requireApproval?: boolean;
  };
}
```

#### Group Member

```typescript
interface GroupMember {
  userId: string;
  role: "admin" | "member";
  joinedAt: Date;
}
```

### Security & Permissions

#### Data Access Control

All API endpoints use `withGroupAuth` middleware that:

1. Verifies user is authenticated
2. Validates user belongs to the group
3. Checks user's role for admin-only actions
4. Adds `groupId` filter to all database queries

**Example**: When User A (member of Group 1) tries to access expenses:

```javascript
// Middleware automatically adds groupId filter
db.expenses.find({ groupId: group._id, ...otherFilters });
```

#### Permission Matrix

| Action                | Admin | Member |
| --------------------- | ----- | ------ |
| View group data       | ✅    | ✅     |
| Create expenses       | ✅    | ✅     |
| Edit own expenses     | ✅    | ✅     |
| Edit others' expenses | ✅    | ❌     |
| Create categories     | ✅    | ✅     |
| Delete categories     | ✅    | ❌     |
| Edit group settings   | ✅    | ❌     |
| Add members           | ✅    | ❌\*   |
| Remove members        | ✅    | ❌     |
| Approve join requests | ✅    | ❌     |
| Delete group          | ✅    | ❌     |
| Leave group           | ✅    | ✅     |

\*If `allowMemberInvites` is enabled, members can share the group code

#### Security Features

1. **Data Isolation**: All queries filtered by `groupId` at the database level
2. **Role Validation**: Middleware checks user role before admin actions
3. **Group Membership**: Users can only access groups they belong to
4. **Last Admin Protection**: Cannot remove last admin if group has members
5. **Join Request Validation**: Prevents duplicate join requests

### Frontend Components

#### GroupContext

Manages group state and provides methods:

```typescript
const {
  groups, // Array of user's groups
  activeGroup, // Currently active group
  joinRequests, // Pending join requests (admin only)
  isLoading, // Loading state
  createGroup, // Create new group
  switchGroup, // Switch active group
  joinGroup, // Join group via code
  leaveGroup, // Leave a group
  updateGroup, // Update group settings
  deleteGroup, // Delete group (admin only)
  removeMember, // Remove member (admin only)
  updateMemberRole, // Update member role (admin only)
  approveJoinRequest, // Approve join request (admin only)
  rejectJoinRequest, // Reject join request (admin only)
  isGroupAdmin, // Check if user is admin
} = useGroup();
```

#### GroupSelector Component

Dropdown in navbar showing:

- Active group name with checkmark
- List of all user's groups
- Member count for each group
- Links to create/join/settings

#### Group Pages

1. **`/groups`**: List all groups with create/join actions
2. **`/groups/[id]`**: Group details with settings and member management

### Migration Guide

If you have existing data, follow these steps:

1. **Database Migration**: Run the setup script to add group fields

   ```bash
   npm run db:setup
   ```

2. **Assign Existing Data**: Run migration to assign existing expenses to default groups

   ```bash
   node scripts/migrate-to-groups.js
   ```

3. **Create Initial Groups**: Users will be prompted to create/join a group on first login

### Testing

See [TESTING_GUIDE.md](TESTING_GUIDE.md) for comprehensive testing scenarios including:

- Group creation and management
- Data isolation testing
- Permission testing
- Member management
- Edge cases and security tests

### Known Limitations

1. User names in member list show as "User N" (requires user lookup enhancement)
2. Group invite links not yet implemented (only code-based joining)
3. No group activity logs
4. No group-level analytics dashboard

### Future Enhancements

- [ ] Email invitations for groups
- [ ] Group activity logs and audit trail
- [ ] Group-level settings (currency, timezone, budget)
- [ ] Expense templates per group
- [ ] Recurring expenses per group
- [ ] Group spending insights and reports
- [ ] Group export (all data for a specific group)

## 🛠️ Development

### Available Scripts

```bash
# Development server with hot reload
npm run dev

# Production build (optimized for production)
npm run build

# Start production server
npm start

# TypeScript type checking
npm run type-check

# Lint code
npm run lint

# Database Setup & Initialization
npm run db:setup              # Initialize database (collections, indexes, seed data)
npm run db:setup-no-seed      # Initialize without seed data (indexes only)
npm run db:indexes            # Create optimized indexes for performance
npm run db:cleanup            # Deactivate expired sessions (run via cron)

# Advanced Database Options
node scripts/unified-database-setup.js --force  # Force recreate all data
node scripts/unified-database-setup.js --help   # Show all options

# Migration Scripts (if upgrading from old versions)
node scripts/migrate-to-single-token.js --force-logout  # Migrate to single token
node scripts/verify-migration.js                        # Verify migration status
node scripts/cleanup-old-indexes.js                     # Clean old indexes
```

### Database Maintenance

**Session Cleanup:**
The `npm run db:cleanup` script deactivates expired sessions in the database. Recommended to run daily via cron:

```bash
# Linux/macOS cron (runs daily at 2 AM)
0 2 * * * cd /path/to/spend-tracker && npm run db:cleanup

# Or use a task scheduler on Windows
```

**Index Creation:**
Run `npm run db:indexes` after initial setup to create optimized indexes:

- Compound indexes for multi-field queries (e.g., `userId + date`)
- Text indexes for search functionality
- TTL index for login history (auto-deletes after 90 days)
- Expected performance improvement: 80-85% faster queries

### Code Organization

- **Components**: Reusable UI components in `src/components/` and `src/shared/components/`
- **Pages**: App Router pages in `src/app/`
- **API Routes**: Backend endpoints in `src/app/api/`
- **Utilities**: Helper functions in `src/lib/utils/`
- **Types**: TypeScript types in `src/types/`
- **Contexts**: React contexts in `src/contexts/`
- **Hooks**: Custom React hooks in `src/hooks/`

### Performance Optimization

**React Optimizations:**

- Component memoization with `React.memo`
- Callback memoization with `useCallback`
- Value memoization with `useMemo`
- Debounced search inputs (300ms delay)

**Database Optimizations:**

- Indexed queries on frequently accessed fields
- Compound indexes for multi-field queries
- Text indexes for search functionality
- Aggregation pipelines for analytics

**API Optimizations:**

- Response caching for read-heavy endpoints
- Pagination for large datasets
- Selective field projection
- Query result limiting

**Security Best Practices:**

**Authentication & Authorization:**

- Single JWT refresh token (1-day or 7-day expiry with Remember Me)
- httpOnly, secure, sameSite cookies for token storage
- Token validated on every request against database session
- Password hashing with bcrypt (12 rounds)
- Rate limiting on authentication endpoints (5 attempts/minute)
- Protected API routes with middleware
- Session validation on every request
- Multi-device session management with manual revocation
- Automatic session cleanup on security events (password change, MFA disable)

**Input Validation:**

- Server-side validation for all inputs
- MongoDB injection prevention
- XSS protection with input sanitization
- Type-safe request/response handling

**Environment Security:**

- Environment variables for secrets
- `.env.local` excluded from Git
- Secure JWT secret generation
- HTTPS enforcement in production

## 🐛 Troubleshooting

### MongoDB Connection Issues

**Problem:** Cannot connect to MongoDB Atlas

**Solutions:**

1. Check `.env.local` has correct `MONGODB_URI`
2. Verify IP whitelist in MongoDB Atlas:
   - Go to Network Access
   - Add current IP or allow all (0.0.0.0/0) for testing
3. Confirm database user has read/write permissions
4. Test connection string with MongoDB Compass

**Problem:** "MongoServerError: Authentication failed"

**Solutions:**

1. Verify username and password in connection string
2. Check special characters are URL-encoded
3. Ensure database user exists in Atlas

### Build & Deployment Issues

**Problem:** TypeScript errors during build

**Solutions:**

```bash
# Check for type errors
npm run type-check

# Fix common issues
npm run lint --fix

# Clear Next.js cache
rm -rf .next
npm run build
```

**Problem:** Missing environment variables

**Solutions:**

1. Create `.env.local` with required variables
2. For Vercel: Add environment variables in project settings
3. For production: Set `NODE_ENV=production`

### Performance Issues

**Problem:** Slow page loads

**Solutions:**

1. Ensure database indexes are created:
   ```bash
   node scripts/unified-database-setup.js --no-seed
   ```
2. Check MongoDB Atlas performance advisor
3. Verify queries are using indexes in MongoDB Atlas Performance tab

**Problem:** Slow search functionality

**Solutions:**

1. Verify debounce is working (300ms delay)
2. Check text index exists on description field
3. Limit search to necessary fields

### UI/UX Issues

**Problem:** Charts not displaying

**Solutions:**

1. Check browser console for errors
2. Verify Chart.js is installed:
   ```bash
   npm install chart.js react-chartjs-2
   ```
3. Clear browser cache

**Problem:** Mobile layout issues

**Solutions:**

1. Test responsive breakpoints:
   - Mobile: < 768px
   - Tablet: 768px - 1024px
   - Desktop: > 1024px
2. Check viewport meta tag in layout
3. Verify responsive.css is imported

### Accessibility Issues

**Problem:** Screen reader not announcing changes

**Solutions:**

1. Check ARIA live regions are present
2. Verify aria-label attributes on interactive elements
3. Test with NVDA or JAWS

**Problem:** Keyboard navigation not working

**Solutions:**

1. Check tab order with Tab key
2. Verify focus indicators are visible
3. Test with accessibility.css imported

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. **Push to Git repository** (GitHub, GitLab, Bitbucket)

2. **Import project in Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your repository

3. **Configure environment variables**:

   ```
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/spend-tracker?retryWrites=true&w=majority
   JWT_SECRET=your-production-secret-here
   NODE_ENV=production
   ```

4. **Deploy**:
   - Vercel will automatically build and deploy
   - Get production URL

### Deploy to Other Platforms

**Prerequisites:**

- Node.js 18+ runtime
- MongoDB Atlas accessible from deployment server
- Environment variables configured

**Build command:**

```bash
npm run build
```

**Start command:**

```bash
npm start
```

**Port:**

- Default: 3000
- Override with `PORT` environment variable

### Post-Deployment Checklist

⚠️ **CRITICAL**: See [PRODUCTION-READINESS-AUDIT.md](./PRODUCTION-READINESS-AUDIT.md) for comprehensive deployment guide.

**Pre-Deployment:**

- [ ] Environment validation passes (automatic on startup)
- [ ] JWT_SECRET is 32+ characters (strong, random)
- [ ] EMAIL_FROM uses verified domain (not @test.com)
- [ ] Database indexes created (`npm run db:indexes`)
- [ ] HTTPS/TLS configured with valid certificate

**Post-Deployment Verification:**

- [ ] Environment variables configured correctly
- [ ] Database accessible from production
- [ ] Default test users working (change passwords immediately!)
- [ ] Authentication functioning (login/logout/session expiry)
- [ ] Rate limiting responding with HTTP 429 on excessive requests
- [ ] Security headers present (check browser DevTools Network tab)
- [ ] API endpoints responding
- [ ] Dark mode working
- [ ] Export functionality working
- [ ] Charts displaying correctly
- [ ] Mobile responsiveness verified
- [ ] Accessibility features working (keyboard navigation, screen readers)
- [ ] Performance metrics acceptable (Lighthouse score > 90)
- [ ] Session cleanup cron job configured (`npm run db:cleanup` daily)

### Production Environment Variables

```env
# ============================================================================
# REQUIRED - Application will not start without these
# ============================================================================

# Database Connection (MongoDB Atlas recommended)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/spend-tracker?retryWrites=true&w=majority

# Authentication (Single Token System - FIXED Expiry)
JWT_SECRET=generate-with-openssl-rand-base64-32-minimum

# Environment
NODE_ENV=production

# Public URL (for emails, redirects)
NEXT_PUBLIC_APP_URL=https://your-domain.com

# ============================================================================
# OPTIONAL - Email functionality (Resend recommended)
# ============================================================================

# Resend API (for password reset, email verification)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com  # Must be verified domain

# ============================================================================
# OPTIONAL - Feature flags
# ============================================================================

NEXT_PUBLIC_ENABLE_SIGNUP=true  # Set false to disable new registrations

# ============================================================================
# OPTIONAL - Server configuration
# ============================================================================

PORT=3000  # Override default port if needed
```

**Generate secure JWT secret:**

```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32|%{Get-Random -Maximum 256}))

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Note:** Generate different secrets for `JWT_SECRET` and `JWT_REFRESH_SECRET` in production.

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**

2. **Create a feature branch**:

   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**:
   - Follow existing code style
   - Add TypeScript types
   - Include comments for complex logic
   - Test thoroughly

4. **Commit your changes**:

   ```bash
   git commit -m "Add amazing feature"
   ```

5. **Push to your fork**:

   ```bash
   git push origin feature/amazing-feature
   ```

6. **Open a Pull Request**:
   - Describe your changes
   - Reference any related issues
   - Include screenshots for UI changes

### Code Style Guidelines

- Use TypeScript for all new code
- Follow existing naming conventions
- Add ARIA labels for accessibility
- Ensure mobile responsiveness
- Write meaningful commit messages
- Add JSDoc comments for exported functions

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- MongoDB for the database platform
- Bootstrap team for the UI framework
- All contributors who have helped improve this project

## 📧 Support

For issues and questions:

- Open an issue on GitHub
- Check existing documentation
- Review troubleshooting section

---

**Built with ❤️ using Next.js, TypeScript, and MongoDB** 4. Test thoroughly 5. Submit a pull request

## License

This project is for educational purposes.
