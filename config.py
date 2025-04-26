import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'secret-key'
    TIINGO_API_KEY = 'ae8cfef5e7443bae377ee34469a79bbf4739c0cc'
    # Add any API keys or configuration settings here 