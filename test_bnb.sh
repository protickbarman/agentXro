#!/usr/bin/env bash
set -e

TOKEN=$(node -e "
const jwt = require('jsonwebtoken');
console.log(jwt.sign({id:1,email:'test@test.com',username:'test'},'xro_agent_super_secret_jwt_key_2024',{expiresIn:'1h'}))
")

curl -s -X POST http://localhost:3000/xro/v1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Find BNB news, current price in USD, and 7-day price history. Use web_search for news, http_get for CoinGecko API price data (https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd&include_24hr_change=true for price, https://api.coingecko.com/api/v3/coins/binancecoin/market_chart?vs_currency=usd&days=7 for history). Analyze and present everything together."
      }
    ],
    "stream": true,
    "tools": true
  }' --max-time 120
