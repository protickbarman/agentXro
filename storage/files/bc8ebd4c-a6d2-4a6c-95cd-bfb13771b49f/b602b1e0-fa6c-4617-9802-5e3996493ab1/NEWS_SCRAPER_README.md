# News Headline Scraper

A flexible Python function to scrape headlines from news websites. This script uses the `requests` and `BeautifulSoup` libraries to fetch HTML content and extract headlines.

## Features

- ✅ Flexible CSS selector support for headlines
- ✅ Automatic fallback to common headline selectors
- ✅ Retry logic for failed requests
- ✅ User-Agent rotation to avoid being blocked
- ✅ Support for scraping multiple pages
- ✅ Duplicate removal
- ✅ Clean, well-documented code with type hints

## Requirements

```bash
pip install requests beautifulsoup4
```

## Basic Usage

```python
from news_scraper import scrape_news_headlines

# Scrape headlines from a website
headlines = scrape_news_headlines(
    url="https://www.example.com/news",
    headline_selector="h2"
)

print(headlines)
```

## Function Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | str | Required | The URL of the news website |
| `headline_selector` | str | None | CSS selector for headlines (e.g., 'h2', '.headline') |
| `max_retries` | int | 3 | Maximum retry attempts on failure |
| `delay` | float | 1.0 | Delay between requests in seconds |
| `user_agent` | str | None | Custom User-Agent string |

## Examples

### 1. Basic Headline Scraping

```python
from news_scraper import scrape_news_headlines

headlines = scrape_news_headlines(
    url="https://www.cnn.com",
    headline_selector=".media__headline"
)
```

### 2. Scraping Multiple Pages

```python
from news_scraper import scrape_multiple_pages

# Scrape headlines from multiple pages
headlines = scrape_multiple_pages(
    base_url="https://news.example.com/page=",
    pages=5,
    delay=2.0
)
```

### 3. Using Common Selectors

If you don't know the specific CSS selector, the function will automatically try common ones:

```python
headlines = scrape_news_headlines(
    url="https://www.bbc.com/news"
    # No selector needed - will try: h2, h3, .headline, .article-title, etc.
)
```

## Built-in Examples

The script includes pre-configured examples for popular news sites:

```python
from news_scraper import scrape_cnn_headlines, scrape_reuters_headlines

# CNN headlines
cnn_headlines = scrape_cnn_headlines()

# Reuters headlines
reuters_headlines = scrape_reuters_headlines()
```

## Important Notes

### 🚨 Respectful Scraping

- Always include a reasonable delay between requests
- Check the website's `robots.txt` file before scraping
- Some websites block automated scrapers
- Consider using official APIs when available

### 🔒 Common Issues and Solutions

**1. "No headlines found" error:**
- Check if the website uses a different CSS selector
- Use browser DevTools to inspect the HTML structure
- Try removing the `headline_selector` parameter to use defaults

**2. 403 Forbidden errors:**
- Add a User-Agent header (handled automatically)
- Increase the delay between requests
- Consider using a proxy service

**3. Slow scraping:**
- Increase the `delay` parameter
- Reduce the number of pages to scrape
- Consider running the scraper during off-peak hours

## Custom Selectors

Here are some common CSS selectors you might use:

```python
# Class-based selectors
".headline"           # Elements with class "headline"
".article-title"      # Elements with class "article-title"
".news-item h2"       # H2 elements inside .news-item containers

# Tag-based selectors
"h2"                  # All h2 elements
"h3"                  # All h3 elements

# Complex selectors
".media__headline"    # Specific to certain sites
".stream-item h3"     # Headlines in a stream layout
```

## Browser DevTools Guide

To find the correct CSS selector:

1. Open the news website in your browser
2. Right-click on a headline and select "Inspect"
3. Look at the HTML structure
4. Identify the tag and/or class used
5. Construct the CSS selector accordingly

## Advanced Usage

### Custom User-Agent

```python
headlines = scrape_news_headlines(
    url="https://example.com",
    user_agent="MyCustomScraper/1.0 (contact@example.com)"
)
```

### Custom Retry Logic

```python
headlines = scrape_news_headlines(
    url="https://example.com",
    max_retries=5,
    delay=2.0
)
```

## License

This script is provided as-is for educational purposes. Always respect website terms of service and implement responsible scraping practices.

## Troubleshooting

```python
# Test the scraper with debugging output
headlines = scrape_news_headlines(
    url="https://example.com",
    max_retries=1,
    delay=0.5
)

# If it fails, inspect the HTML structure
import requests
from bs4 import BeautifulSoup

response = requests.get("https://example.com")
soup = BeautifulSoup(response.text, 'html.parser')
print(soup.prettify()[:500])  # Print first 500 characters of HTML
```

---

**Remember**: Always scrape responsibly and consider using official APIs when available! 📰✨