from flask import render_template, jsonify, request, session
from app import app
import requests
from datetime import datetime
from config import Config
import json
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

TIINGO_API_KEY = Config.TIINGO_API_KEY

def get_company_info(symbol):
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Token {TIINGO_API_KEY}'
    }
    
    try:
        # Get company metadata
        metadata_url = f'https://api.tiingo.com/tiingo/daily/{symbol}'
        logger.debug(f"Requesting company info from: {metadata_url}")
        
        response = requests.get(metadata_url, headers=headers)
        logger.debug(f"Company info response status: {response.status_code}")
        logger.debug(f"Company info response: {response.text}")
        
        if response.status_code == 404:
            raise Exception('No record has been found, please enter a valid symbol.')
        
        response.raise_for_status()
        data = response.json()
        
        return {
            'name': data.get('name'),
            'symbol': data.get('ticker'),
            'exchange': data.get('exchangeCode'),
            'startDate': data.get('startDate'),
            'description': data.get('description')
        }
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching company info: {str(e)}")
        raise Exception(f"Error fetching company info: {str(e)}")

def get_stock_summary(symbol):
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Token {TIINGO_API_KEY}'
    }
    
    try:
        price_url = f'https://api.tiingo.com/iex/{symbol}'
        response = requests.get(price_url, headers=headers)
        
        if response.status_code == 404:
            raise Exception('No record has been found, please enter a valid symbol.')
            
        response.raise_for_status()
        data = response.json()
        
        if not data:
            raise Exception('No recent trading data available for this symbol.')
            
        data = data[0]  # Get the first (latest) entry
        
        # Get the required values with proper null handling
        prev_close = float(data.get('prevClose', 0) or 0)
        last_price = float(data.get('last', 0) or 0)
        
        # Calculate change
        change = round(last_price - prev_close, 2)
        
        # Calculate change percent
        change_percent = round((change / prev_close * 100), 2) if prev_close != 0 else 0
        
        # Format timestamp to show only the date
        trading_day = datetime.strptime(
            data.get('timestamp', ''), 
            '%Y-%m-%dT%H:%M:%S%z'
        ).strftime('%Y-%m-%d')
        
        # Format numeric values with proper handling of None
        def format_number(value):
            """Format numbers with proper decimal places"""
            if value is None:
                return 'N/A'
            try:
                # Convert to float first to handle both int and float
                float_val = float(value)
                if float_val.is_integer():
                    return f"{int(float_val):,}"  # Format integers with commas
                return f"{float_val:,.2f}"  # Format floats with 2 decimal places
            except (ValueError, TypeError):
                return str(value)
        
        return {
            'symbol': symbol.upper(),                    # ✅ Stock Ticker Symbol
            'tradingDay': trading_day,                   # ✅ Trading Day (truncated)
            'prevClose': format_number(prev_close),      # ✅ Previous Closing Price
            'open': format_number(data.get('open')),     # ✅ Opening Price
            'high': format_number(data.get('high')),     # ✅ High Price
            'low': format_number(data.get('low')),       # ✅ Low Price
            'last': format_number(last_price),           # ✅ Last Price
            'change': f"{change:.2f} {'▼' if change < 0 else '▲' if change > 0 else ''}", # ✅ Change with arrow
            'changePercent': f"{change_percent:.2f}% {'▼' if change < 0 else '▲' if change > 0 else ''}", # ✅ Change Percent with arrow
            'volume': format_number(data.get('volume'))  # ✅ Number of Shares Traded
        }
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching stock summary: {str(e)}")
        raise Exception(f"Error fetching stock summary: {str(e)}")

@app.route('/')
def index():
    last_searched_symbol = session.get('last_searched_symbol', '')
    return render_template('index.html', last_searched_symbol=last_searched_symbol)

@app.route('/api/stock/<symbol>')
def get_stock_data(symbol):
    try:
        # Validate symbol
        if not symbol or not symbol.strip():
            return jsonify({'error': 'Please enter a stock symbol'}), 400
            
        symbol = symbol.strip().upper()
        session['last_searched_symbol'] = symbol  # Save the symbol in session
        logger.info(f"Processing request for symbol: {symbol}")
        
        try:
            # Get company info first
            company_info = get_company_info(symbol)
            stock_summary = get_stock_summary(symbol)
            
            return jsonify({
                'company_info': company_info,
                'stock_summary': stock_summary
            })
        except Exception as e:
            logger.error(f"API Error: {str(e)}")
            return jsonify({'error': str(e)}), 400
            
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred'}), 500 