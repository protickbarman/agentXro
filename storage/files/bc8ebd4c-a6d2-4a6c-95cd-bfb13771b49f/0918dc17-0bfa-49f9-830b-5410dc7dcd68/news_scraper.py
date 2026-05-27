"""
News Headlines Scraper
A Python function to scrape headlines from news websites.
"""

import requests
from bs4 import BeautifulSoup
from typing import List, Optional
import time
from datetime import datetime


class NewsScraper:
    """A class to scrape news headlines from websites."""
    
    def __init__(self, user_agent: Optional[str] = None, timeout: int = 30):
        """
        Initialize the news scraper.
        
        Args:
            user_agent: Custom user agent string (default: random browser UA)
            timeout: Request timeout in seconds (default: 30)
        """
        self.timeout = timeout
        self.session = requests.Session()
        
        # Set a default user agent if not provided
        if user_agent:
            self.session.headers.update({'User-Agent': user_agent})
        else:
            self.session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            })
    
    def scrape_headlines(
        self,
        url: str,
        headline_selector: str = "h2, h3, .headline, .title, .article-title",
        max_articles: int = 20,
        delay: float = 1.0
    ) -> List[dict]:
        """
        Scrape headlines from a news website.
        
        Args:
            url: The URL of the news website to scrape
            headline_selector: CSS selector for headline elements
            max_articles: Maximum number of headlines to scrape
            delay: Delay between requests in seconds (for polite scraping)
        
        Returns:
            A list of dictionaries containing headline data:
            [{'title': 'Headline 1', 'url': 'https://...', 'timestamp': datetime}]
        """
        headlines = []
        
        try:
            print(f"Fetching: {url}")
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            
            # Parse HTML
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find all headline elements
            headline_elements = soup.select(headline_selector)
            print(f"Found {len(headline_elements)} headline elements")
            
            # Extract headlines
            for i, element in enumerate(headline_elements[:max_articles]):
                # Get the title text
                title = element.get_text(strip=True)
                
                if not title:
                    continue
                
                # Try to get the URL
                link = element.find('a')
                url = link.get('href') if link else None
                
                # Resolve relative URLs
                if url and url.startswith('/'):
                    url = urljoin(url, url)
                
                # Get the date/time if available
                date_element = element.find(['time', 'span', 'div'], class_=lambda x: x and 'date' in x.lower())
                date_str = date_element.get_text(strip=True) if date_element else None
                
                headlines.append({
                    'title': title,
                    'url': url,
                    'timestamp': date_str,
                    'position': i + 1
                })
                
                # Be polite and add delay
                if i < len(headline_elements) - 1:
                    time.sleep(delay)
            
            print(f"Successfully scraped {len(headlines)} headlines")
            return headlines
            
        except requests.exceptions.RequestException as e:
            print(f"Error fetching URL: {e}")
            return []
        except Exception as e:
            print(f"Error parsing content: {e}")
            return []
    
    def save_to_csv(self, headlines: List[dict], filename: str):
        """
        Save scraped headlines to a CSV file.
        
        Args:
            headlines: List of headline dictionaries
            filename: Output CSV filename
        """
        import csv
        
        with open(filename, 'w', newline='', encoding='utf-8') as file:
            writer = csv.writer(file)
            writer.writerow(['Title', 'URL', 'Timestamp', 'Position'])
            
            for headline in headlines:
                writer.writerow([
                    headline['title'],
                    headline['url'] or '',
                    headline['timestamp'] or '',
                    headline['position']
                ])
        
        print(f"Headlines saved to: {filename}")


def scrape_headlines_simple(url: str, max_articles: int = 10) -> List[str]:
    """
    A simple version of the scraper that returns just headlines as strings.
    
    Args:
        url: The URL to scrape
        max_articles: Maximum number of headlines to scrape
    
    Returns:
        A list of headline strings
    """
    scraper = NewsScraper()
    headlines_data = scraper.scrape_headlines(url, max_articles=max_articles)
    return [h['title'] for h in headlines_data]


def scrape_bbc_news(max_articles: int = 10) -> List[str]:
    """
    Scrape headlines from BBC News.
    
    Args:
        max_articles: Maximum number of headlines to scrape
    
    Returns:
        A list of headline strings
    """
    url = "https://www.bbc.com/news"
    scraper = NewsScraper()
    headlines_data = scraper.scrape_headlines(url, max_articles=max_articles)
    return [h['title'] for h in headlines_data]


def scrape_cnn_news(max_articles: int = 10) -> List[str]:
    """
    Scrape headlines from CNN.
    
    Args:
        max_articles: Maximum number of headlines to scrape
    
    Returns:
        A list of headline strings
    """
    url = "https://www.cnn.com"
    scraper = NewsScraper()
    headlines_data = scraper.scrape_headlines(url, max_articles=max_articles)
    return [h['title'] for h in headlines_data]


if __name__ == "__main__":
    # Example usage
    print("News Headlines Scraper Demo")
    print("=" * 50)
    
    # Scrape BBC News
    print("\nScraping BBC News...")
    bbc_headlines = scrape_bbc_news(15)
    print(f"\nBBC Headlines ({len(bbc_headlines)} found):")
    for i, headline in enumerate(bbc_headlines, 1):
        print(f"{i}. {headline}")
    
    # Example with custom URL
    # custom_headlines = scrape_headlines_simple("https://example.com/news", 10)