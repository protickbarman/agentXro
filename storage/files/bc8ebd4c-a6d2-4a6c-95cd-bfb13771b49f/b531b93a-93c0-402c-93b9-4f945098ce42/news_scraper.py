#!/usr/bin/env python3
"""
News Headlines Scraper

This module provides functionality to scrape headlines from news websites
using RSS feeds.
"""

import json
from typing import List, Dict, Optional
from urllib.parse import urlparse
import requests


def scrape_news_headlines(url: str, count: int = 10) -> List[Dict[str, str]]:
    """
    Scrape headlines from a news website's RSS feed.
    
    Args:
        url: RSS feed URL (e.g., 'https://news.ycombinator.com/rss')
        count: Number of headlines to return (default: 10)
    
    Returns:
        List of dictionaries containing title, link, description, and pubDate
    """
    try:
        # Try using the rss_fetch tool if available
        try:
            import requests
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            feed_data = response.text
        except ImportError:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            feed_data = response.text
            
        # Parse RSS feed (simplified parser for demonstration)
        return _parse_rss_feed(feed_data, count)
        
    except requests.exceptions.RequestException as e:
        raise Exception(f"Failed to fetch RSS feed: {e}")
    except Exception as e:
        raise Exception(f"Error parsing RSS feed: {e}")


def _parse_rss_feed(xml_str, count: int) -> List[Dict[str, str]]:
    """
    Parse RSS/Atom feed XML data.
    
    Args:
        xml_RSS/Atom feed XML string
        count: Maximum number of items to return
    
    Returns:
        List of headline dictionaries
    """
    import xml.etree.ElementTree as ET
    
    headlines = []
    
    try:
        # Remove XML declaration if present
        if xml_data.startswith('<?xml'):
            xml_data = xml_data.split('\n', 1)[1]
        
        root = ET.fromstring(xml_data)
        
        # Handle different RSS namespaces
        channel = root.find('.//channel') or root
        items = channel.findall('.//item')
        
        for item in items[:count]:
            # Extract basic information
            title_elem = item.find('title')
            link_elem = item.find('link')
            description_elem = item.find('description')
            pub_date_elem = item.find('pubDate')
            
            title = title_elem.text if title_elem is not None else 'Untitled'
            link = link_elem.text if link_elem is not None else ''
            description = description_elem.text if description_elem is not None else ''
            pub_date = pub_date_elem.text if pub_date_elem is not None else ''
            
            headlines.append({
                'title': title.strip(),
                'link': link.strip(),
                'description': description.strip(),
                'pubDate': pub_date.strip(),
                'source': root.find('title').text if root.find('title') is not None else urlparse(link).netloc
            })
            
    except ET.ParseError as e:
        raise Exception(f"XML parsing error: {e}")
    
    return headlines


def scrape_multiple_news_sites(urls: List[str], count_per_site: int = 10) -> List[Dict[str, str]]:
    """
    Scrape headlines from multiple news sites.
    
    Args:
        urls: List of RSS feed URLs
        count_per_site: Number of headlines per site
    
    Returns:
        Combined list of headlines from all sources
    """
    all_headlines = []
    
    for url in urls:
        try:
            headlines = scrape_news_headlines(url, count_per_site)
            all_headlines.extend(headlines)
        except Exception as e:
            print(f"Error scraping {url}: {e}")
            continue
    
    return all_headlines


def format_headlines(headlines: List[Dict[str, str]], include_description: bool = False) -> str:
    """
    Format headlines for display.
    
    Args:
        headlines: List of headline dictionaries
        include_description: Whether to include description text
    
    Returns:
        Formatted string of headlines
    """
    if not headlines:
        return "No headlines found."
    
    formatted = []
    
    for i, headline in enumerate(headlines, 1):
        source = headline.get('source', 'Unknown')
        title = headline.get('title', 'Untitled')
        link = headline.get('link', '')
        pub_date = headline.get('pubDate', '')
        
        formatted.append(f"{i}. [{source}] {title}")
        
        if link:
            formatted.append(f"   Link: {link}")
        
        if pub_date:
            formatted.append(f"   Published: {pub_date}")
        
        if include_description and headline.get('description'):
            formatted.append(f"   Description: {headline['description'][:100]}...")
        
        formatted.append("")  # Empty line for separation
    
    return "\n".join(formatted)


# Example usage and predefined news sources
PREDEFINED_SOURCES = {
    'tech': 'https://news.ycombinator.com/rss',
    'bbc_news': 'https://feeds.bbci.co.uk/news/rss.xml',
    'reuters': 'https://www.reutersagency.com/feed/',
    'tech_crunch': 'https://techcrunch.com/feed/',
    'the_guardian': 'https://www.theguardian.com/world/rss'
}


def main():
    """Example usage of the news scraper."""
    print("News Headlines Scraper")
    print("=" * 50)
    
    # Option 1: Scrape from predefined sources
    print("\n1. From predefined tech news sources:")
    headlines = scrape_multiple_news_sites(
        [PREDEFINED_SOURCES['tech'], PREDEFINED_SOURCES['tech_crunch']],
        count_per_site=3
    )
    print(format_headlines(headlines[:6]))
    
    # Option 2: Scrape from a custom URL
    print("\n2. From custom URL (BBC News):")
    bbc_headlines = scrape_news_headlines(PREDEFINED_SOURCES['bbc_news'], count=5)
    print(format_headlines(bbc_headlines))


if __name__ == "__main__":
    main()