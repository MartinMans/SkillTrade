import os
import uvicorn

if __name__ == "__main__":
    # Ensure development mode is false
    os.environ["DEVELOPMENT_MODE"] = "false"
    
    # Run the server
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",  # Allow external connections
        port=int(os.getenv("PORT", 8000)),
        reload=False  # Disable reload in production
    ) 