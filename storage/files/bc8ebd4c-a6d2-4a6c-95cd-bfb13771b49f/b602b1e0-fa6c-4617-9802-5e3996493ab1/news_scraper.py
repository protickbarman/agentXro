"""
News Headline Scraper
A flexible Python function to scrape headlines from news websites.
"""

import requests
from bs4 import BeautifulSoup
import time
from typing import List, Dict, Optional


def scrape_news_headlines(
    url: str,
    headline_selector: Optional[str] = None,
    max_retries: int = 3,
    delay: float = 1.0,
    user_agent: Optional[str] = None
) -> List[str]:
    """
    Scrape headlines from a news website.
    
    Args:
        url: The URL of the news website to scrape
        headline_selector: CSS selector for headlines (e.g., 'h2', 'h3', '.headline')
                         If None, tries common selectors
        max_retries: Maximum number of retry attempts (default: 3)
        delay: Delay between requests in seconds (default: 1.0)
        user_agent: Custom User-Agent string (default: uses a standard one)
    
    Returns:
        List of headline strings
    
    Raises:
        ValueError: If scraping fails or no headlines found
        requests.RequestException: If network requests fail
    """
    
    # Default User-Agent to avoid being blocked
    default_user_agent = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/91.0.4472.124 Safari/537.36"
    )
    
    headers = {
        "User-Agent": user_agent if user_agent else default_user_agent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Connection": "keep-alive"
    }
    
    # Common headline selectors to try
    default_selectors = [
        "h2",
        "h3",
        ".headline",
        ".article-title",
        ".title",
        ".news-title",
        ".story-title",
        ".article-header",
        ".headline-link",
        "h1",
        ".headline-text"
    ]
    
    # Determine which selector to use
    selectors_to_try = [headline_selector] if headline_selector else default_selectors
    
    for attempt in range(max_retries):
        try:
            # Make the HTTP request
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            
            # Parse the HTML
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Try each selector to find headlines
            for selector in selectors_to_try:
                headlines = []
                
                # Find elements using the selector
                elements = soup.select(selector)
                
                for element in elements:
                    # Extract text and clean it up
                    headline = element.get_text(strip=True)
                    
                    # Skip empty headlines
                    if headline and len(headline) > 5:
                        headlines.append(headline)
                
                # If we found headlines, return them
                if headlines:
                    print(f"Found {len(headlines)} headlines using selector: {selector}")
                    return headlines
            
            # If no headlines found with current selector, try next one
            if headline_selector:
                print(f"No headlines found with selector: {headline_selector}")
            else:
                print(f"No headlines found with any default selector")
            
        except requests.RequestException as e:
            print(f"Attempt {attempt + 1} failed: {str(e)}")
            if attempt < max_retries - 1:
                time.sleep(delay)
                continue
            else:
                raise ValueError(f"Failed to scrape headlines after {max_retries} attempts: {str(e)}")
    
    # If we get here, no headlines were found
    raise ValueError("No headlines found on the page. Please check the URL and selectors.")


def scrape_multiple_pages(
    base_url: str,
    pages: int = 5,
    headline_selector: Optional[str] = None,
    **kwargs
) -> List[str]:
    """
    Scrape headlines from multiple pages of a news website.
    
    Args:
        base_url: Base URL of the news website (e.g., "https://example.com/news?page=")
        pages: Number of pages to scrape
        headline_selector: CSS selector for headlines
        **kwargs: Additional arguments to pass to scrape_news_headlines
    
    Returns:
        Combined list of headlines from all pages
    """
    all_headlines = []
    
    for page_num in range(pages):
        # Build the page URL (supports common pagination formats)
        page_url = base_url if "?" not in base_url else base_url
        
        # Handle different pagination styles
        if "?" in base_url:
            separator = "&" if "?" in base_url.split("?")[1] else "?"
            page_url = f"{base_url}{separator}page={page_num + 1}"
        else:
            page_url = f"{base_url}?page={page_num + 1}"
        
        print(f"Scraping page {page_num + 1}: {page_url}")
        
        try:
            headlines = scrape_news_headlines(page_url, headline_selector, **kwargs)
            all_headlines.extend(headlines)
            
            # Add delay to be respectful to the server
            time.sleep(2)
            
        except Exception as e:
            print(f"Error scraping page {page_num + 1}: {str(e)}")
            continue
    
    # Remove duplicates while preserving order
    unique_headlines = list(dict.fromkeys(all_headlines))
    
    print(f"\nTotal unique headlines found: {len(unique_headlines)}")
    return unique_headlines


# Example usage functions
def scrape_cnn_headlines() -> List[str]:
    """Example: Scrape headlines from CNN."""
    return scrape_news_headlines(
        "https://www.cnn.com",
        headline_selector=".media__headline"
    )


def scrape_reuters_headlines() -> List[str]:
    """Example: Scrape headlines from Reuters."""
    return scrape_news_headlines(
        "https://www.reuters.com/world",
        headline_selector=".headline"
    )


def scrape_google_news_headlines() -> List[str]:
    """Example: Scrape headlines from Google News."""
    return scrape_news_headlines(
        "https://news.google.com",
        headline_selector="h3"
    )


if __name__ == "__main__":
    # Example usage
    print("News Headline Scraper Example")
    print("=" * 50)
    
    try:
        # Scrape headlines from a news website
        headlines = scrape_news_headlines(
            "https://www.bbc.com/news",
            headline_selector=".media__title"
        )
        
        print(f"\nScraped {len(headlines)} headlines:\n")
        for i, headline in enumerate(headlines[:10], 1):  # Show first 10 headlines
            print(f"{i}. {headline}")
        
        if len(headlines) > 10:
            print(f"\n... and {len(headlines) - 10} more headlines")
    
    except Exception as e:
        print(f"Error: {str(e)}")
        print("\nNote: Some news websites may block automated scraping.")
        print("Consider using their official APIs if available.")