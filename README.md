# Household Finance App

A personal finance management system that brings the power of double-entry accounting to household finances with an intuitive interface.

## Features

- Double-entry accounting with flexible transaction creation
- Intuitive tools for balancing transactions
- Financial flow visualization with Sankey diagrams
- Location-based expense tracking
- Multiple currency and asset type support

## Tech Stack

### Frontend
- React
- Tailwind CSS
- D3.js (for visualizations)
- Leaflet (for maps)
- React Query
- React Router

### Backend
- Node.js with Express
- MongoDB with Mongoose
- Winston (for logging)
- Joi (for validation)

## Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB

### Environment Setup

The application requires a `.env` file in the root directory with the following variables:

```
MONGO_URI=your_mongodb_connection_string
PORT=5000 (optional)
LOG_LEVEL=info (optional)
```

### Installation

1. Clone the repository
2. Create a `.env` file in the project root with your MongoDB connection string
3. Install backend dependencies:
```
cd backend
npm install
```

4. Install frontend dependencies:
```
cd frontend
npm install
```

### Running the Application

#### Backend
```
cd backend
npm run dev
```

#### Frontend
```
cd frontend
npm start
```

## Project Structure

- `/backend`: Node.js Express server
- `/frontend`: React application

## Development Roadmap

See the [TODO file](./household-finance-todo.md) for the development roadmap. 