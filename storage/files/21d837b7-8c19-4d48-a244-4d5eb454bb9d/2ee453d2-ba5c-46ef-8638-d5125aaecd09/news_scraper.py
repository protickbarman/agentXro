#!/usr/bin/env python3
"""
News Headlines Scraper
A flexible Python function to scrape headlines from news websites.
"""

import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
import time
import random


class NewsScraper:
    """A class to scrape news headlines from websites."""
    
    def __init__(self, user_agent: Optional[str] = None):
        """
        Initialize the scraper.
        
        Args:
            user_agent: Custom user agent string (defaults to a generic one)
        """
        self.session = requests.Session()
        
        if user_agent is None:
            self.user_agent = (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/91.0.4472.124 Safari/537.36"
            )
        else:
            self.user_agent = user_agent
            
        self.session.headers.update({
            "User-Agent": self.user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate",
            "Connection": "keep-alive",
        })
    
    def scrape_headlines(self, url: str, 
                        headline_selector: str = "h2.news__title",
                        limit: Optional[int] = None,
                        delay_range: tuple = (1, 3)) -> List[Dict[str, str]]:
        """
        Scrape headlines from a news website.
        
        Args:
            url: The URL of the news website to scrape
            headline_selector: CSS selector for headline elements
            limit: Maximum number of headlines to return (None for all)
            delay_range: Tuple of (min, max) seconds to wait between requests
            
        Returns:
            List of dictionaries containing 'title' and 'link' for each headline
        """
        headlines = []
        
        try:
            # Make the initial request
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            # Parse the HTML
            soup = BeautifulSoup(response.text, "html.parser")
            
            # Find headline elements
            elements = soup.select(headline_selector)
            
            for element in elements[:limit]:
                try:
                    title = element.get_text(strip=True)
                    link = element.get("href")
                    
                    # Handle relative URLs
                    if link and link.startswith("/"):
                        link = url.rstrip("/") + link
                    
                    if title and link:
                        headlines.append({
                            "title": title,
                            "link": link
                        })
                        
                        # Add random delay to be polite to servers
                        delay = random.uniform(delay_range[0], delay_range[1])
                        time.sleep(delay)
                        
                        if limit and len(headlines) >= limit:
                            break
                            
                except Exception as e:
                    print(f"Error processing element: {e}")
                    continue
                    
        except requests.exceptions.RequestException as e:
            print(f"Error making request: {e}")
        except Exception as e:
            print(f"Unexpected error: {e}")
            
        return headlines
    
    def scrape_multiple_pages(self, 
                             base_url: str,
                             pages: int,
                             headline_selector: str = "h2.news__title",
                             limit: Optional[int] = None,
                             page_url_pattern: Optional[str] = None) -> List[Dict[str, str]]:
        """
        Scrape headlines from multiple pages of a news website.
        
        Args:
            base_url: Base URL of the website
            pages: Number of pages to scrape
            headline_selector: CSS selector for headline elements
            limit: Maximum total headlines to return (None for all)
            page_url_pattern: Optional pattern for page URLs (e.g., "?page={}")
            
        Returns:
            Combined list of headlines from all pages
        """
        all_headlines = []
        
        for page_num in range(1, pages + 1):
            if page_url_pattern:
                url = base_url.replace("{}", page_num).format("?page={}".format(page_num))
            else:
                url = f"{base_url}?page={page_num}"
                
            print(f"Scraping page {page_num}: {url}")
            headlines = self.scrape_headlines(
                url, 
                headline_selector=headline_selector,
                limit=limit
            )
            all_headlines.extend(headlines)
            
            # Add delay between pages
            time.sleep(random.uniform(2, 4))
            
            # Check if we've reached the limit
            if limit and len(all_headlines) >= limit:
                break
                
        return all_headlines


def create_scraper(user_agent: Optional[str] = None) -> NewsScraper:
    """
    Factory function to create a NewsScraper instance.
    
    Args:
        user_agent: Custom user agent string
        
    Returns:
        A configured NewsScraper instance
    """
    return NewsScraper(user_agent=user_agent)


def main():
    """Example usage of the news scraper."""
    print("News Headlines Scraper Example")
    print("=" * 50)
    
    # Example 1: Scrape headlines from a website
    scraper = create_scraper()
    
    # Configure these selectors for the specific website you want to scrape
    # Common headline selectors:
    # - h2.news__title
    # - h2.title
    # - a.article-title
    # - h3.entry-title
    # - class="headline" h2
    
    # For demonstration, we'll scrape from a general news site structure
    # Replace with the actual URL and selector for your target website
    url = "https://news.ycombinator.com/"
    headline_selector = "a.storylink"
    
    print(f"\nScraping headlines from: {url}")
    print(f"Headline selector: {headline_selector}")
    print("-" * 50)
    
    headlines = scraper.scrape_headlines(
        url=url,
        headline_selector=headline_selector,
        limit=10,  # Limit to 10 headlines
        delay_range=(1, 2)  # 1-2 second delay between headlines
    )
    
    # Display results
    for i, headline in enumerate(headlines, 1):
        print(f"{i}. {headline['title']}")
        print(f"   Link: {headline['link']}")
        print()
    
    # Example 2: Scrape from multiple pages
    print("\n" + "=" * 50)
    print("Multi-page scraping example:")
    print("-" * 50)
    
    all_headlines = scraper.scrape_multiple_pages(
        base_url="https://news.ycombinator.com/",
        pages=2,
        headline_selector="a.storylink",
        limit=5  # Get only 5 headlines total from 2 pages
    )
    
    print(f"\nTotal headlines collected: {len(all_headlines)}")
    
    # Save to file
    with open("headlines.txt", "w", encoding="utf-8") as f:
        for headline in all_headlines:
            f.write(f"{headline['title']}\n{headline['link']}\n\n")
    
    print("Saved headlines to headlines.txt")


if __name__ == "__main__":
    main()