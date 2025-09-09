# Glassbox Admin - Media Advertising Platform

A comprehensive admin dashboard for managing the Glassbox media advertising platform with role-based access control.

## Features

- **Role-Based Access Control**: Three distinct user roles (Admin, Partner, Merchant)
- **Responsive Dashboard**: Beautiful, modern UI with Material-UI components
- **Real-time Analytics**: Interactive charts and metrics for revenue tracking
- **API Integration**: Full integration with Glassbox Core API
- **Authentication**: Secure JWT-based authentication system
- **TypeScript**: Full type safety throughout the application

## User Roles

### Admin
- Full platform overview and analytics
- User, partner, and merchant management
- System-wide transaction and settlement monitoring
- Revenue distribution analysis
- Top performers tracking

### Partner
- Partner-specific revenue dashboard
- Advertisement performance metrics
- Merchant management for their network
- Settlement tracking and reports
- Revenue trend analysis

### Merchant
- Device performance monitoring
- Revenue tracking by location/device
- Advertisement display analytics
- Quality score monitoring
- Settlement status tracking

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **UI Framework**: Material-UI (MUI) v5
- **Routing**: React Router v6
- **Charts**: Recharts
- **HTTP Client**: Axios
- **State Management**: React Context API
- **Authentication**: JWT tokens with localStorage

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Glassbox Core API running on `http://localhost:8000`

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd glassbox-admin
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will open in your browser at `http://localhost:3000`.

## API Integration

The application integrates with the Glassbox Core API at `http://localhost:8000`. Make sure the API server is running before using the admin dashboard.

### API Endpoints Used

- **Authentication**: `/auth/login`, `/auth/logout`, `/auth/me`
- **Dashboard Data**: `/dashboard/admin`, `/dashboard/partner/{id}`, `/dashboard/merchant/{id}`
- **User Management**: `/users/*`
- **Partner Management**: `/partners/*`
- **Merchant Management**: `/merchants/*`
- **Device Management**: `/devices/*`
- **Transactions**: `/transactions/*`
- **Settlements**: `/settlements/*`

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Layout.tsx      # Main application layout
│   └── ProtectedRoute.tsx # Route protection component
├── contexts/           # React context providers
│   └── AuthContext.tsx # Authentication context
├── pages/             # Page components
│   ├── Login.tsx      # Login page
│   ├── AdminDashboard.tsx
│   ├── PartnerDashboard.tsx
│   ├── MerchantDashboard.tsx
│   └── Unauthorized.tsx
├── services/          # API services
│   └── api.ts         # HTTP client and API methods
├── types/            # TypeScript type definitions
│   └── index.ts      # All type definitions
└── utils/            # Utility functions
```

## Authentication

The application uses JWT-based authentication:

1. Users log in with email/password
2. JWT token is stored in localStorage
3. Token is automatically included in API requests
4. Automatic logout on token expiration

## Role-Based Navigation

Navigation items are dynamically shown based on user roles:

- **Admin**: Access to all sections
- **Partner**: Limited to partner-relevant sections
- **Merchant**: Limited to merchant-relevant sections

## Development

### Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

### Environment Variables

Create a `.env` file in the root directory:

```
REACT_APP_API_BASE_URL=http://localhost:8000
```

## Building for Production

```bash
npm run build
```

This builds the app for production to the `build` folder.

## Contributing

1. Create a feature branch
2. Make your changes
3. Add tests if necessary
4. Submit a pull request

## License

This project is proprietary to Glassbox Media Advertising Platform.

## Support

For support, please contact the development team or check the API documentation at `http://localhost:8000/swagger/`.# gb-sys
# gb-sys
# gb-sys
# gb-admin
