# CloudVandana Salesforce CRUD Application

A full-stack Salesforce CRUD web application built using React.js and Node.js. The application integrates with Salesforce using OAuth 2.0 authentication and provides CRUD operations for standard Salesforce objects.

## Features

- Salesforce OAuth 2.0 authentication
- Secure Salesforce API integration
- Dynamic Salesforce object selection
- Create, View, Update and Delete records
- Pagination with 20 records per page
- REST API based backend
- React.js frontend
- Node.js and Express.js backend
- Deployed frontend and backend

## Supported Salesforce Objects

The application supports CRUD operations for the following Salesforce standard objects:

- Account
- Opportunity
- Lead
- Contact
- Case

Each supported object provides 5 or more relevant fields through the application interface.

## CRUD Operations

For each supported Salesforce object, the application provides:

- Create a new record
- View existing records
- Edit/Update records
- Delete records

All five supported objects have been tested successfully.

## Technology Stack

### Frontend
- React.js
- JavaScript
- HTML5
- CSS3
- Vite

### Backend
- Node.js
- Express.js
- JavaScript
- Axios
- REST APIs

### Integration
- Salesforce REST API
- OAuth 2.0
- PKCE authentication flow

### Deployment
- Render
- GitHub

## Project Structure

```text
cloudvandana-crud-app/
├── backend/
│   ├── server.js
│   ├── package.json
│   └── ...
├── fronted/
│   ├── src/
│   ├── package.json
│   ├── vite.config.js
│   └── ...
└── README.md
