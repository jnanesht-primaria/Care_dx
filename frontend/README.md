project/
├── backend/
│   ├── app.py            # Flask app, /api/login + role-protected routes
│   ├── config.py         # MySQL + JWT config
│   ├── models.py         # User model (SQLAlchemy) with role enum
│   ├── create_user.py    # CLI helper to create users w/ hashed passwords
│   ├── schema.sql        # Raw SQL schema (optional, db.create_all() also works)
│   └── requirements.txt
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                    # Routes + role-based redirects
│       ├── api.js                     # fetch wrappers for backend
│       ├── context/
│       │   └── AuthContext.jsx        # token/user state, localStorage
│       ├── components/
│       │   ├── Login.jsx / Login.css
│       │   ├── ProtectedRoute.jsx     # blocks access by role
│       │   ├── DashboardShell.jsx / DashboardShell.css
│       └── pages/
│           ├── AdminDashboard.jsx
│           ├── TechnicianDashboard.jsx
│           └── ReceptionistDashboard.jsx
└── README.md