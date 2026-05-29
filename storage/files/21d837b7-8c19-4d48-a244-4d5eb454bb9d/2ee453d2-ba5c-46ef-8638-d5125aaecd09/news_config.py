"""
Configuration examples for different news websites.
Copy the appropriate configuration and update the selectors for your target.
"""

# Common CSS selectors for news headlines:
# - h2.news__title
# - h2.title
# - h2.headline
# - h3.entry-title
# - a.article-title
# - a.storylink
# - div.headline > a

NEWS_CONFIGS = {
    # Hacker News
    "hacker_news": {
        "url": "https://news.ycombinator.com/",
        "headline_selector": "a.storylink",
        "limit": 20
    },
    
    # Reddit (example structure)
    "reddit": {
        "url": "https://www.reddit.com/r/worldnews/",
        "headline_selector": "a.title",
        "limit": 30
    },
    
    # News outlets - These will need manual verification
    "bbc": {
        "url": "https://www.bbc.com/news/",
        "headline_selector": "h2.gs-c-promo-heading__title",
        "limit": 15
    },
    
    "cnn": {
        "url": "https://edition.cnn.com/world",
        "headline_selector": "span.card__title-text",
        "limit": 20
    },
    
    "reuters": {
        "url": "https://www.reuters.com/world/",
        "headline_selector": "h3.StoryHeadline",
        "limit": 15
    },
    
    "techcrunch": {
        "url": "https://techcrunch.com/",
        "headline_selector": "h2.post-title",
        "limit": 20
    },
    
    "theverge": {
        "url": "https://www.theverge.com/",
        "headline_selector": "h2.c-entry-content__title",
        "limit": 15
    },
    
    "github_trending": {
        "url": "https://github.com/trending",
        "headline_selector": "a.Link--muted",
        "limit": 20
    },
    
    # Example of scraping specific sections
    "github_trending_python": {
        "url": "https://github.com/trending/python",
        "headline_selector": "a.Link--muted",
        "limit": 20
    }
}


def get_config(name: str):
    """
    Get configuration for a specific news site.
    
    Args:
        name: Name of the configuration (see NEWS_CONFIGS)
        
    Returns:
        Configuration dictionary or None if not found
    """
    return NEWS_CONFIGS.get(name, None)


def print_all_configs():
    """Print all available configurations."""
    print("Available news scraper configurations:")
    print("=" * 60)
    for name, config in NEWS_CONFIGS.items():
        print(f"\n{name.upper()}:")
        print(f"  URL: {config['url']}")
        print(f"  Selector: {config['headline_selector']}")
        print(f"  Default limit: {config['limit']}")
    print("\n" + "=" * 60)
    print("\nNote: You may need to update selectors based on website changes.")
    print("Use browser developer tools (F12) to inspect HTML and find correct selectors.")


if __name__ == "__main__":
    print_all_configs()