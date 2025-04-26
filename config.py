import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key-here'
    TIINGO_API_KEY = '23d8cc64a7fc0c55d176dee67b9cec3710716679'
    # Add any API keys or configuration settings here 