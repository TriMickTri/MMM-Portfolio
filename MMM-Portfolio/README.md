# MMM-Portfolio

A [Magic Mirror²](https://magicmirror.builders/) module that displays stock quotes for your portfolio on your Raspberry Pi (or any Magic Mirror install).

## Features

- Shows symbol, current price, and change (amount and percent)
- Green/red for positive/negative change
- Uses [Alpha Vantage](https://www.alphavantage.co/) (free API key)
- Configurable symbols, update interval, and display options

## Installation

1. Clone or copy this folder into your Magic Mirror `modules` directory:
   ```bash
   cd ~/MagicMirror/modules
   git clone <this-repo-url> MMM-Portfolio
   # or copy the MMM-Portfolio folder there
   ```

2. Get a free API key from [Alpha Vantage](https://www.alphavantage.co/support/#api-key) (no credit card required).

3. Add the module to your `config/config.js` inside the `modules` array:

```javascript
{
  module: "MMM-Portfolio",
  position: "top_right",
  config: {
    apiKey: "YOUR_ALPHA_VANTAGE_API_KEY",
    symbols: ["AAPL", "GOOGL", "MSFT", "AMZN"],
    updateInterval: 300000,  // 5 minutes (ms)
    showChange: true,
    showPercent: true,
    decimals: 2,
    currency: "USD",
  },
},
```

## Configuration

| Option          | Default   | Description |
|----------------|-----------|-------------|
| `apiKey`       | `""`      | **Required.** Your Alpha Vantage API key. |
| `symbols`      | `["AAPL", "GOOGL", "MSFT"]` | List of stock ticker symbols. |
| `updateInterval` | `300000` | How often to refresh (milliseconds). |
| `showChange`  | `true`    | Show price change in dollars. |
| `showPercent` | `true`    | Show change in percent. |
| `decimals`    | `2`       | Decimal places for price. |
| `currency`    | `"USD"`   | Display currency (label only; API returns USD). |
| `fadeSpeed`   | `1000`    | DOM update fade duration (ms). |

## API limits (Alpha Vantage free tier)

- **25 API requests per day.** Each symbol uses one request per refresh.
- Example: 5 symbols and one refresh per 5 minutes ≈ 5×12×24 = 1,440 requests/day → over the limit.
- **Suggested:** Use up to **5 symbols** and set `updateInterval` to **3600000** (1 hour) or higher so you stay under 25 requests per day, or use fewer symbols for more frequent updates.

## Raspberry Pi

Install and run Magic Mirror as usual. This module uses only Node’s built-in `https` and the core `node_helper`; no `npm install` is required in the module folder.

## License

MIT.
