# SkillTrade

SkillTrade is a **peer-to-peer skill exchange platform** where users can **teach and learn skills simultaneously**. It ensures a fair trade system through **AI-powered matching** and a **Trade Token mechanism** to prevent exploitation and enhance engagement.

---

## 🚀 Features (MVP)

### 🔹 **Basic Features**
- **1-on-1 Skill Exchange** – Users engage in direct skill trading sessions.
- **Guidelines for Users** – Best practices are suggested, but users decide how they trade.
- **Breakout System** – Users can exit a session anytime; the system reviews potential fraud.
- **Fraud Prevention** – Repeatedly flagged users face penalties.
- **Learning Confirmation** – Both users must confirm trade completion.

### 🔹 **User Profiles**
- **Skills to Teach** – Users list skills they are willing to share.
- **Skills to Learn** – Users specify what they want to learn.

### 🔹 **Core Functionality**
- **About Page** – Explains SkillTrade and its workflow.
- **AI-Powered Matching** – Users receive personalized skill match recommendations.
- **Direct Chat** – Users can message potential partners before committing to a trade.

### 🔹 **Optional Features**
- **In-Browser Video Calls** – Enables real-time skill exchanges.
- **Profile Statistics** – View trading history and performance.
- **Trust Score & Ratings** – Users receive **average ratings** and a **rating count**.

---

## 🛠 Installation & Setup

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn
- Git
- A text editor (VS Code recommended)

### **1️⃣ Clone the Repository**
```bash
git clone https://github.com/MartinMans/SkillTrade.git
cd SkillTrade
```

### **2️⃣ Backend Setup**
1. Navigate to the backend directory:
```bash
cd backend
```

2. Create and activate a virtual environment:
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
.\venv\Scripts\activate
# On Unix or MacOS:
source venv/bin/activate

# Verify activation (should show virtual environment path)
python -c "import sys; print(sys.prefix)"
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
# Copy the environment template
cp .env.example .env
# The default configuration should work out of the box for local development
```

5. Initialize and seed the database:
```bash
# Initialize the database (this might take a few seconds)
python -m app.reset_db

# (Optional) Add sample data for testing
# This will create test users with the following credentials:
# - john@example.com / password123
# - jane@example.com / password123
python -m app.seed_db
```

6. Start the FastAPI server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at: http://localhost:8000  
API Documentation (Swagger UI): http://localhost:8000/docs

### **3️⃣ Frontend Setup**
1. Open a new terminal and navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
# or if using yarn:
yarn install
```

3. Set up environment variables:
```bash
# Copy the environment template
cp .env.example .env
# The default configuration should work out of the box
```

4. Start the development server:
```bash
npm run dev
# or if using yarn:
yarn dev
```

The frontend will be available at: http://localhost:5173

### **4️⃣ Verify Setup**
1. Backend health check:
   - Open http://localhost:8000/docs in your browser
   - You should see the FastAPI Swagger documentation

2. Frontend check:
   - Open http://localhost:5173 in your browser
   - You should see the SkillTrade landing page

## ⚡ Technologies Used

### Frontend
- React with Vite
- TypeScript
- Modern UI components and styling

### Backend
- FastAPI (Python)
- SQLite (Development Database)
- SQLAlchemy (ORM)
- JWT Authentication
- Pydantic (Data Validation)

## Environment Variables

### Frontend (.env)
- `VITE_API_BASE_URL`: Backend API URL (default: http://localhost:8000)

### Backend (.env)
- `DATABASE_URL`: Database connection string
- `SECRET_KEY`: Application secret key for JWT
- `ACCESS_TOKEN_EXPIRE_MINUTES`: JWT token expiration time
- `ALLOWED_ORIGINS`: Allowed frontend origins for CORS
- `PORT`: Server port (default: 8000)
- `HOST`: Server host (default: 0.0.0.0)

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Submit a pull request

## License

[Add your license here]
