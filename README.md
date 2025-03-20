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

### **1️⃣ Clone the Repository**
```bash
git clone https://github.com/MartinMans/SkillTrade.git
cd skilltrade
```

### **2️⃣ Install Dependencies**
Ensure you have **Node.js** and **Python** installed.

#### **Frontend Setup (React)**
```bash
cd frontend
npm install
```

#### **Backend Setup (FastAPI)**
```bash
cd backend
python -m venv venv  # Create a virtual environment # You may not need to run this and can directly skip to the next step.
source venv/bin/activate  # On macOS/Linux
# OR
venv\Scripts\activate  # On Windows
pip install -r requirements.txt
```

---

## ▶️ Running the Application

### 🔹 Start the Backend Server
Ensure the database is set up:
```bash
python reset_db.py  # Resets the database
```

Run the FastAPI backend:
```bash
uvicorn app.main:app --reload # Note: Our main file is within app, hence: app.main
```

The API will be available at: [http://127.0.0.1:8000](http://127.0.0.1:8000)  
API Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### 🔹 Start the Frontend
Navigate to the frontend directory:
```bash
cd frontend
```

Start the development server:
```bash
npm start
```

The frontend will be available at: [http://localhost:3000](http://localhost:3000)

---

## ⚡ Technologies Used

### **Frontend**
- React.js (JavaScript)
- Bootstrap (UI Styling)

### **Backend**
- FastAPI (Python)
- PostgreSQL (Database)
- SQLAlchemy (ORM)
- JWT Authentication (Security)
