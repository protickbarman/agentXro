#!/usr/bin/env python3
"""
News Headline Scraper
=====================
Two approaches to scrape news headlines from websites:

1. RSS Feed Method - Clean, reliable, and faster
2. Web Scraping Method - More flexible for sites without RSS feeds
"""

import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
import json


# Method 1: RSS Feed Scraper (Recommended)
class RSSScraper:
    """Scrape news headlines from RSS feeds."""
    
    def __init__(self, rss_url: str):
        """
        Initialize RSS scraper.
        
        Args:
            rss_url: URL of the RSS feed to scrape
        """
        self.rss_url = rss_url
    
    def scrape(self, limit: int = 10) -> List[Dict[str, str]]:
        """
        Scrape headlines from RSS feed.
        
        Args:
            limit: Maximum number of headlines to return
            
        Returns:
            List of dictionaries containing headline information
        """
        try:
            response = requests.get(self.rss_url, timeout=10)
            response.raise_for_status()
            
            # Parse RSS using simple XML parsing
            from xml.etree import ElementTree as ET
            
            root = ET.fromstring(response.content)
            items = []
            
            # Find all <item> elements
            for item in root.findall('.//item'):
                title = item.findtext('title', 'No title')
                link = item.findtext('link', '')
                description = item.findtext('description', '')
                pub_date = item.findtext('pub_date', '')
                author = item.findtext('author', '')
                
                # Get categories
                categories = [cat.text for cat in item.findall('category')]
                
                items.append({
                    'title': title,
                    'link': link,
                    'description': description,
                    'pub_date': pub_date,
                    'author': author,
                    'categories': categories
                })
            
            return items[:limit]
            
        except Exception as e:
            print(f"Error scraping RSS feed: {e}")
            return []
    
    @staticmethod
    def format_results(items: List[Dict[str, str]]) -> str:
        """Format results for display."""
        output = []
        for i, item in enumerate(items, 1):
            output.append(f"{i}. {item['title']}")
            output.append(f"   Link: {item['link']}")
            if item['pub_date']:
                output.append(f"   Published: {item['pub_date']}")
            output.append("")
        return "\n".join(output)


# Method 2: Web Scraping Scraper
class WebScraper:
    """Scrape headlines from HTML-based news websites."""
    
    def __init__(self, url: str):
        """
        Initialize web scraper.
        
        Args:
            url: URL of the news website to scrape
        """
        self.url = url
    
    def scrape(self, limit: int = 10) -> List[Dict[str, str]]:
        """
        Scrape headlines from a news website using BeautifulSoup.
        
        Args:
            limit: Maximum number of headlines to return
            
        Returns:
            List of dictionaries containing headline information
        """
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            response = requests.get(self.url, headers=headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            items = []
            
            # Common CSS selectors for news headlines
            # These selectors work for most news websites
            selectors = [
                ('h2', 'title'),
                ('h1', 'title'),
                ('h3', 'title'),
                ('a', 'title'),
            ]
            
            for tag, key in selectors:
                for element in soup.find_all(tag, class_=lambda x: x and any(
                    word in str(x).lower() for word in ['headline', 'title', 'news', 'article', 'content']
                )):
                    if element.get('href'):
                        link = element.get('href')
                        if not link.startswith('http'):
                            link = self.url + link
                        
                        items.append({
                            'title': element.get_text(strip=True),
                            'link': link,
                            'description': element.get_text(strip=True),
                            'pub_date': '',
                            'author': '',
                            'categories': []
                        })
                    
                    if len(items) >= limit:
                        break
                
                if len(items) >= limit:
                    break
            
            # Remove duplicates by link
            seen_links = set()
            unique_items = []
            for item in items:
                if item['link'] not in seen_links:
                    seen_links.add(item['link'])
                    unique_items.append(item)
            
            return unique_items[:limit]
            
        except Exception as e:
            print(f"Error scraping website: {e}")
            return []
    
    @staticmethod
    def format_results(items: List[Dict[str, str]]) -> str:
        """Format results for display."""
        output = []
        for i, item in enumerate(items, 1):
            output.append(f"{i}. {item['title']}")
            output.append(f"   Link: {item['link']}")
            output.append("")
        return "\n".join(output)


# Convenience function for quick scraping
def scrape_news(url: str, method: str = 'rss', limit: int = 10) -> List[Dict[str, str]]:
    """
    Quick function to scrape news headlines.
    
    Args:
        url: URL of the RSS feed or news website
        method: 'rss' or 'web' for scraping method
        limit: Maximum number of headlines to return
        
    Returns:
        List of dictionaries containing headline information
    """
    if method.lower() == 'rss':
        scraper = RSSScraper(url)
        return scraper.scrape(limit)
    elif method.lower() == 'web':
        scraper = WebScraper(url)
        return scraper.scrape(limit)
    else:
        print(f"Unknown method: {method}. Use 'rss' or 'web'")
        return []


def save_to_json(items: List[Dict[str, str]], filename: str = 'news_headlines.json'):
    """
    Save scraped news headlines to a JSON file.
    
    Args:
        items: List of news items to save
        filename: Output filename
    """
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(items, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(items)} headlines to {filename}")


# Example usage
if __name__ == "__main__":
    # Example 1: Using RSS Feed (BBC News)
    print("=== Example 1: BBC News RSS Feed ===")
    bbc_rss = "https://feeds.bbci.co.uk/news/rss.xml"
    bbc_scraper = RSSScraper(bbc_rss)
    bbc_headlines = bbc_scraper.scrape(limit=5)
    print(RSSScraper.format_results(bbc_headlines))
    
    # Example 2: Using Web Scraping (CNN)
    print("\n=== Example 2: CNN Web Scraping ===")
    cnn_url = "https://edition.cnn.com"
    cnn_scraper = WebScraper(cnn_url)
    cnn_headlines = cnn_scraper.scrape(limit=5)
    print(WebScraper.format_results(cnn_headlines))
    
    # Example 3: Quick scrape function
    print("\n=== Example 3: Quick Scrape Function ===")
    headlines = scrape_news("https://feeds.bbci.co.uk/news/rss.xml", method='rss', limit=3)
    print(f"Found {len(headlines)} headlines")
    
    # Example 4: Save to JSON
    if headlines:
        save_to_json(headlines, 'bbc_headlines.json')