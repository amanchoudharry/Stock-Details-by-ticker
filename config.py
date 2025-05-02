import os
import re
from datetime import datetime

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'secret-key'
    TIINGO_API_KEY = '23d8cc64a7fc0c55d176dee67b9cec3710716679'
    
    def parse_tiingo_timestamp(self, ts):
        """
        Parses a Tiingo timestamp string, normalizing fractional seconds to microseconds (6 digits).
        """
        match = re.match(r"(.*T\d{2}:\d{2}:\d{2})(\.\d+)?([+-]\d{2}:\d{2})", ts)
        if match:
            base, fraction, tz = match.groups()
            # If there's a fraction, truncate or pad to 6 digits for microseconds
            if fraction:
                fraction = (fraction + "000000")[:7]  # includes the dot
            else:
                fraction = ".000000"
            ts_fixed = f"{base}{fraction}{tz}"
            return datetime.strptime(ts_fixed, "%Y-%m-%dT%H:%M:%S.%f%z")
        else:
            # Fallback if no fractional seconds
            return datetime.strptime(ts, "%Y-%m-%dT%H:%M:%S%z")
    
    