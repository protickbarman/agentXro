#!/usr/bin/env python3
"""
News Headlines Scraper
A Python function to scrape headlines from news websites.
"""

import requests
from bs4 import BeautifulSoup
from typing import List, Optional
import time
import random


def scrape_headlines(url: str, selector: str = 'h2.headline', 
                     max_headlines: Optional[int] = None,
                     delay: float = 1.0) -> List[str]:
    """
    Scrape headlines from a news website.
    
    Args:
        url: The URL of the news website to scrape
        selector: CSS selector for the headline elements (default: 'h2.headline')
        max_headlines: Maximum number of headlines to return (None for all)
        delay: Delay between requests in seconds (default: 1.0)
    
    Returns:
        A list of headline strings
    
    Raises:
        requests.RequestException: If the request fails
        ValueError: If no headlines are found
    """
    # User agent to mimic a real browser
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    }
    
    try:
        # Fetch the webpage
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Parse the HTML
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find all headlines using the specified selector
        headlines = []
        for element in soup.select(selector):
            headline = element.get_text(strip=True)
            if headline:  # Only add non-empty headlines
                headlines.append(headline)
        
        # Apply max_headlines limit
        if max_headlines:
            headlines = headlines[:max_headlines]
        
        # Add a random delay to be respectful to the server
        time.sleep(delay + random.uniform(0, 0.5))
        
        if not headlines:
            print(f"Warning: No headlines found using selector '{selector}'")
            print(f"Try a different selector or inspect the website's HTML structure")
        
        return headlines
    
    except requests.RequestException as e:
        print(f"Error fetching URL: {e}")
        raise
    except Exception as e:
        print(f"Error processing content: {e}")
        raise


def scrape_multiple_sites(sites: dict, selector: str = 'h2.headline') -> dict:
    """
    Scrape headlines from multiple news websites.
    
    Args:
        sites: Dictionary of URLs and their site names
               {'site_name': 'url', ...}
        selector: CSS selector for the headline elements
    
    Returns:
        Dictionary mapping site names to lists of headlines
    """
    results = {}
    
    for site_name, url in sites.items():
        print(f"\nScraping {site_name}...")
        try:
            headlines = scrape_headlines(url, selector)
            results[site_name] = headlines
            print(f"Found {len(headlines)} headlines from {site_name}")
        except Exception as e:
            print(f"Failed to scrape {site_name}: {e}")
            results[site_name] = []
    
    return results


# Example usage
if __name__ == "__main__":
    # Example: Scrape headlines from a news website
    # Note: You may need to inspect the target website to find the correct headline selector
    
    # Example 1: Single site scraping
    try:
        news_url = "https://news.google.com/rss"
        # For Google News, the selector would be different
        # headlines = scrape_headlines(news_url, selector='item title')
        # print(f"Headlines: {headlines}")
        
        print("Example usage:")
        print("headlines = scrape_headlines('https://example.com', selector='h2')")
        print(f"\nFound headlines: {headlines}")
        
    except Exception as e:
        print(f"Error: {e}")
    
    # Example 2: Multiple sites scraping
    # news_sites = {
    #     'CNN': 'https://www.cnn.com',
    #     'BBC': 'https://www.bbc.com/news',
    #     'Reuters': 'https://www.reuters.com/world'
    # }
    # results = scrape_multiple_sites(news_sites)
    # for site, headlines in results.items():
    #     print(f"\n{site} Headlines:")
    #     for i, headline in enumerate(headlines[:5], 1):  # Show first 5
    #         print(f"  {i}. {headline}")