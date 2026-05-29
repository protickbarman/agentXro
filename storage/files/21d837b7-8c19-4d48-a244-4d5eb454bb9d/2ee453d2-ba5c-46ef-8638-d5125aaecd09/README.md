# News Headlines Scraper

A Python utility for scraping headlines from news websites with flexible configuration and rate limiting.

## Features

- ✅ **Simple API** - Easy-to-use function for scraping headlines
- ✅ **Rate Limiting** - Built-in delays to respect server resources
- ✅ **Multiple Pages** - Support for scraping from multiple pages
- ✅ **Flexible Selectors** - Works with different HTML structures
- ✅ **User-Agent Rotation** - Uses realistic browser headers
- ✅ **Error Handling** - Robust error handling and recovery

## Requirements

```bash
pip install requests beautifulsoup4
```

## Usage

### Basic Example

```python
from news_scraper import create_scraper

# Create a scraper instance
scraper = create_scraper()

# Scrape headlines
headlines = scraper.scrape_headlines(
    url="https://news.ycombinator.com/",
    headline_selector="a.storylink",
    limit=10  # Limit to 10 headlines
)

# Display results
for headline in headlines:
    print(f"{headline['title']}")
    print(f"Link: {headline['link']}\n")
```

### Using Configuration

```python
from news_scraper import NewsScraper
import news_config

# Get configuration for a specific site
config = news_config.get_config("hacker_news")

scraper = NewsScraper(user_agent="Mozilla/5.0 ...")

headlines = scraper.scrape_headlines(
    url=config["url"],
    headline_selector=config["headline_selector"],
    limit=config["limit"]
)
```

### Multi-Page Scraping

```python
# Scrape from multiple pages
all_headlines = scraper.scrape_multiple_pages(
    base_url="https://news.ycombinator.com/",
    pages=5,
    headline_selector="a.storylink",
    limit=50  # Max headlines total
)
```

## Available Configurations

The `news_config.py` file includes pre-configured examples for:

- Hacker News (`hacker_news`)
- Reddit (`reddit`)
- BBC News (`bbc`)
- CNN (`cnn`)
- Reuters (`reuters`)
- TechCrunch (`techcrunch`)
- The Verge (`theverge`)
- GitHub Trending (`github_trending`)
- GitHub Trending Python (`github_trending_python`)

## Finding the Right Selector

1. Open the website in your browser
2. Press F12 to open Developer Tools
3. Navigate to the "Elements" or "Inspect" tab
4. Right-click on a headline and select "Inspect"
5. Look for the HTML tag (usually `<h2>`, `<h3>`, or `<a>`)
6. Note the class names (e.g., `.news__title`, `#headline`)

Example selector formats:
- `h2.news__title` - Tag with class
- `a.storylink` - Tag with class
- `#headline` - Tag with ID
- `div.headline > a` - Parent-child relationship

## Important Notes

⚠️ **Legal Considerations**
- Always check the website's Terms of Service
- Respect `robots.txt` file
- Do not scrape at excessive rates
- Consider using official APIs when available

⚠️ **Website Changes**
- HTML structure may change over time
- Selectors may need to be updated periodically
- Always verify your selectors work before bulk scraping

⚠️ **Ethical Usage**
- Use for personal or educational purposes
- Add delays between requests (default: 1-3 seconds)
- Don't overload servers
- Attribute content if reusing

## Custom User-Agent

```python
scraper = create_scraper(
    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124"
)
```

## Error Handling

The scraper includes built-in error handling:

```python
try:
    headlines = scraper.scrape_headlines(url, headline_selector)
    print(f"Scraped {len(headlines)} headlines")
except Exception as e:
    print(f"Error: {e}")
```

## Output Options

### Save to File

```python
with open("headlines.txt", "w", encoding="utf-8") as f:
    for headline in headlines:
        f.write(f"{headline['title']}\n{headline['link']}\n\n")
```

### Export to JSON

```python
import json
with open("headlines.json", "w", encoding="utf-8") as f:
    json.dump(headlines, f, indent=2, ensure_ascii=False)
```

## Running the Example

```bash
python news_scraper.py
```

This will:
1. Scrape headlines from Hacker News
2. Display the results
3. Save headlines to `headlines.txt`

## API Reference

### NewsScraper Class

#### `__init__(user_agent=None)`
Initialize the scraper with optional custom user agent.

#### `scrape_headlines(url, headline_selector, limit=None, delay_range=(1, 3))`
Scrape headlines from a single URL.

- `url`: Target URL
- `headline_selector`: CSS selector for headlines
- `limit`: Maximum headlines to return
- `delay_range`: Min/max delay between headlines (seconds)

#### `scrape_multiple_pages(base_url, pages, headline_selector, limit=None, page_url_pattern=None)`
Scrape headlines from multiple pages.

- `base_url`: Base URL of the website
- `pages`: Number of pages to scrape
- `headline_selector`: CSS selector for headlines
- `limit`: Maximum total headlines
- `page_url_pattern`: Pattern for page URLs

### Functions

#### `create_scraper(user_agent=None)`
Factory function to create a NewsScraper instance.

## Troubleshooting

### "403 Forbidden" errors
- The website blocks automated requests
- Try using different selectors or user agent
- Check if the site requires authentication

### "RequestsException" errors
- Network connectivity issues
- Check your internet connection
- Verify the URL is correct

### No headlines found
- The selector may be incorrect
- The site structure may have changed
- Verify the selector works in browser DevTools

## License

This tool is provided as-is for educational and personal use. Please respect the Terms of Service of websites you scrape from.