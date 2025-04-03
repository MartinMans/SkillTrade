import os
import uvicorn

if __name__ == "__main__":
    # Set development mode
    os.environ["DEVELOPMENT_MODE"] = "true"
    
    # Run the server
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    ) 