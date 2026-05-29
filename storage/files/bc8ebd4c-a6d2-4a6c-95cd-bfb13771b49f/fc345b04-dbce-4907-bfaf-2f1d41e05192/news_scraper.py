"""
News Headlines Scraper
======================
A Python function to scrape headlines from news websites using BeautifulSoup and requests.
"""

import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
import time


def scrape_news_headlines(
    url: str,
    headline_selector: str = 'h2',
    link_selector: str = 'a',
    limit: int = 20,
    timeout: int = 10,
    user_agent: Optional[str] = None
) -> List[Dict[str, str]]:
    """
    Scrape headlines from a news website.
    
    Parameters:
    -----------
    url : str
        The URL of the news website to scrape
    headline_selector : str
        CSS selector for headline elements (default: 'h2')
    link_selector : str
        CSS selector for link elements (default: 'a')
    limit : int
        Maximum number of headlines to return (default: 20)
    timeout : int
        Request timeout in seconds (default: 10)
    user_agent : str, optional
        Custom User-Agent header (useful to avoid being blocked)
    
    Returns:
    --------
    List[Dict[str, str]]
        List of dictionaries containing 'title' and 'link' for each headline
    """
    
    # Default user agent if not provided
    if user_agent is None:
        user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    
    # Set headers to mimic a real browser
    headers = {
        'User-Agent': user_agent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    }
    
    try:
        # Make the HTTP request
        response = requests.get(url, headers=headers, timeout=timeout)
        response.raise_for_status()
        
        # Parse the HTML content
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find all headline elements
        headlines = soup.select(headline_selector)
        
        # Extract headlines and links
        results = []
        for i, headline in enumerate(headlines[:limit]):
            # Get the headline text
            title = headline.get_text(strip=True)
            
            # Get the link
            link_tag = headline.select_one(link_selector)
            link = link_tag.get('href') if link_tag else ''
            
            # Make the link absolute if it's relative
            if link and not link.startswith('http'):
                link = requests.compat.urljoin(url, link)
            
            # Add to results
            if title and link:  # Only add if we have both title and link
                results.append({
                    'title': title,
                    'link': link,
                    'position': i + 1
                })
        
        return results
        
    except requests.exceptions.RequestException as e:
        print(f"Error making request to {url}: {e}")
        return []
    except Exception as e:
        print(f"Error parsing content from {url}: {e}")
        return []


def scrape_multiple_sources(
    urls: List[str],
    headline_selector: str = 'h2',
    limit_per_source: int = 10,
    delay: float = 1.0
) -> Dict[str, List[Dict[str, str]]]:
    """
    Scrape headlines from multiple news sources.
    
    Parameters:
    -----------
    urls : List[str]
        List of URLs to scrape
    headline_selector : str
        CSS selector for headline elements
    limit_per_source : int
        Maximum headlines per source
    delay : float
        Delay between requests in seconds (default: 1.0)
    
    Returns:
    --------
    Dict[str, List[Dict[str, str]]]
        Dictionary mapping URLs to their scraped headlines
    """
    
    all_results = {}
    
    for url in urls:
        print(f"Scraping {url}...")
        headlines = scrape_news_headlines(
            url,
            headline_selector=headline_selector,
            limit=limit_per_source
        )
        all_results[url] = headlines
        
        # Delay between requests to be respectful
        if delay > 0:
            time.sleep(delay)
    
    return all_results


def get_news_headlines_demo():
    """
    Demo function showing how to use the scraper with common news sites.
    Note: These URLs are examples and may change or require different selectors.
    """
    
    # Example URLs (you may need to update these based on the actual website structure)
    example_urls = [
        'https://www.bbc.com/news',
        # 'https://news.ycombinator.com/',  # Hacker News
        # 'https://news.google.com/topics/eqA5CQ1x1M5NzoybG9jYWxob3N0OjEwMA',  # Google News
    ]
    
    # The CSS selectors might need adjustment based on the website structure
    # You can inspect the page with your browser to find the correct selectors
    
    print("News Headlines Scraper Demo")
    print("=" * 50)
    
    results = scrape_multiple_sources(example_urls)
    
    for url, headlines in results.items():
        print(f"\n{url}")
        print("-" * 50)
        for i, headline in enumerate(headlines, 1):
            print(f"{i}. {headline['title']}")
            print(f"   Link: {headline['link']}")
    
    return results


if __name__ == "__main__":
    # Example usage
    # results = get_news_headlines_demo()
    
    # Or scrape a single website
    # headlines = scrape_news_headlines(
    #     url='https://example.com/news',
    #     headline_selector='h3',
    #     limit=10
    # )
    
    # Print the results
    # for headline in headlines:
    #     print(f"{headline['title']} - {headline['link']}")
    
    print("To use this script:")
    print("1. Install required packages: pip install requests beautifulsoup4")
    print("2. Update the example URLs and CSS selectors for your target website")
    print("3. Run the script: python news_scraper.py")