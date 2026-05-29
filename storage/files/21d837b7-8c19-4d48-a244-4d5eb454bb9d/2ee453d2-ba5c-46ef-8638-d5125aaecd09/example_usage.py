#!/usr/bin/env python3
"""
Example usage of the News Scraper with various websites.
This file demonstrates different ways to use the scraper.
"""

from news_scraper import create_scraper
import news_config


def example_1_basic_scrape():
    """Example 1: Basic headlines scraping from Hacker News."""
    print("=" * 60)
    print("Example 1: Basic Hacker News Scraper")
    print("=" * 60)
    
    scraper = create_scraper()
    
    # Get configuration from news_config.py
    config = news_config.get_config("hacker_news")
    
    headlines = scraper.scrape_headlines(
        url=config["url"],
        headline_selector=config["headline_selector"],
        limit=5  # Only get 5 headlines
    )
    
    for i, headline in enumerate(headlines, 1):
        print(f"{i}. {headline['title']}")
        print(f"   Link: {headline['link']}\n")


def example_2_multiple_pages():
    """Example 2: Scrape from multiple pages."""
    print("=" * 60)
    print("Example 2: Multi-page Scraper")
    print("=" * 60)
    
    scraper = create_scraper()
    
    # Scrape 2 pages from Hacker News
    all_headlines = scraper.scrape_multiple_pages(
        base_url="https://news.ycombinator.com/",
        pages=2,
        headline_selector="a.storylink",
        limit=10  # Get only 10 headlines total
    )
    
    print(f"Total headlines collected: {len(all_headlines)}\n")
    
    # Display some results
    for i, headline in enumerate(all_headlines[:5], 1):
        print(f"{i}. {headline['title']}")


def example_3_custom_config():
    """Example 3: Use a custom configuration."""
    print("=" * 60)
    print("Example 3: Custom Configuration")
    print("=" * 60)
    
    # Create custom config
    custom_config = {
        "url": "https://news.ycombinator.com/",
        "headline_selector": "a.storylink",
        "limit": 10
    }
    
    scraper = create_scraper()
    
    headlines = scraper.scrape_headlines(
        url=custom_config["url"],
        headline_selector=custom_config["headline_selector"],
        limit=custom_config["limit"],
        delay_range=(2, 3)  # Longer delays for custom config
    )
    
    print(f"Scraped {len(headlines)} headlines")
    for headline in headlines:
        print(f"- {headline['title']}")


def example_4_save_to_file():
    """Example 4: Save headlines to a file."""
    print("=" * 60)
    print("Example 4: Save Headlines to File")
    print("=" * 60)
    
    scraper = create_scraper()
    
    config = news_config.get_config("github_trending")
    
    headlines = scraper.scrape_headlines(
        url=config["url"],
        headline_selector=config["headline_selector"],
        limit=8
    )
    
    # Save to text file
    with open("my_headlines.txt", "w", encoding="utf-8") as f:
        f.write(f"Scraped headlines from: {config['url']}\n")
        f.write("=" * 60 + "\n\n")
        
        for headline in headlines:
            f.write(f"Title: {headline['title']}\n")
            f.write(f"Link:  {headline['link']}\n")
            f.write("-" * 40 + "\n\n")
    
    print(f"Saved {len(headlines)} headlines to 'my_headlines.txt'")


def example_5_error_handling():
    """Example 5: Proper error handling."""
    print("=" * 60)
    print("Example 5: Error Handling")
    print("=" * 60)
    
    scraper = create_scraper()
    
    try:
        config = news_config.get_config("hacker_news")
        
        headlines = scraper.scrape_headlines(
            url=config["url"],
            headline_selector=config["headline_selector"],
            limit=5
        )
        
        if headlines:
            print(f"✅ Successfully scraped {len(headlines)} headlines")
            for headline in headlines[:3]:
                print(f"- {headline['title']}")
        else:
            print("⚠️ No headlines found - check selector")
            
    except Exception as e:
        print(f"❌ Error occurred: {e}")


def example_6_multiple_sites():
    """Example 6: Scrape from multiple different websites."""
    print("=" * 60)
    print("Example 6: Multiple Websites")
    print("=" * 60)
    
    scraper = create_scraper()
    
    sites_to_scrape = [
        ("Hacker News", "hacker_news"),
        ("GitHub Trending", "github_trending"),
    ]
    
    all_headlines = []
    
    for site_name, config_name in sites_to_scrape:
        config = news_config.get_config(config_name)
        
        try:
            headlines = scraper.scrape_headlines(
                url=config["url"],
                headline_selector=config["headline_selector"],
                limit=3
            )
            
            print(f"\n{site_name}: {len(headlines)} headlines")
            for h in headlines:
                print(f"  - {h['title'][:50]}...")
                
            all_headlines.extend(headlines)
            
            # Wait before next request
            import time
            time.sleep(2)
            
        except Exception as e:
            print(f"\n{site_name}: Error - {e}")
    
    print(f"\nTotal unique headlines collected: {len(all_headlines)}")


def main():
    """Run all examples."""
    print("\n" + "=" * 60)
    print("NEWS SCRAPER EXAMPLES")
    print("=" * 60)
    
    # Run examples (comment out ones you don't want to run)
    
    example_1_basic_scrape()
    example_2_multiple_pages()
    example_3_custom_config()
    example_4_save_to_file()
    example_5_error_handling()
    example_6_multiple_sites()
    
    print("\n" + "=" * 60)
    print("All examples completed!")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()