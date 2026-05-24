#!/usr/bin/env python3
"""
scrape_example.py
Scrapes https://example.com and summarizes its content.
"""

import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin


def fetch_page(url: str, timeout: int = 10) -> str:
    """Fetch HTML content from a URL."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                      "AppleWebKit/537.0"
    }
    response = requests.get(url, headers=headers, timeout=timeout)
    response.raise_for_status()
    return response.text


def extract_content(html: str) -> dict:
    """Extract title, headings, and body text from HTML."""
    soup = BeautifulSoup(html, "html.parser")
    
    # Remove script and style elements
    for element in soup(["script", "style", "nav", "footer"]):
        element.decompose()
    
    title = soup.title.string.strip() if soup.title else "No title"
    
    # Get main content (example.com uses <body>)
    body = soup.find("body")
    text = body.get_text(separator="\n", strip=True) if body else ""
    
    # Clean up whitespace
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    
    return {
        "title": title,
        "text": "\n".join(lines),
        "headings": [h.get_text(strip=True) for h in soup.find_all(["h1", "h2", "h3"])],
        "paragraphs": [p.get_text(strip=True) for p in soup.find_all("p") if p.get_text(strip=True)]
    }


def summarize(content: dict) -> str:
    """Generate a simple summary of the page content."""
    summary = []
    summary.append(f"Page Title: {content['title']}")
    summary.append(f"Headings: {content['headings']}")
    summary.append(f"Number of paragraphs: {len(content['paragraphs'])}")
    summary.append("\n--- Full Text ---\n")
    summary.append(content['text'][:2000])  # First 2000 chars
    return "\n".join(summary)


def main():
    url = "https://example.com"
    
    try:
        print(f"Fetching {url}...")
        html = fetch_page(url)
        
        print("Extracting content...\n")
        content = extract_content(html)
        
        print("=" * 50)
        print("SUMMARY")
        print("=" * 50)
        print(summarize(content))
        
        # Structured output
        print("\n" + "=" * 50)
        print("STRUCTURED DATA")
        print("=" * 50)
        print(f"Title: {content['title']}")
        print(f"Headings found: {content['headings']}")
        print(f"Paragraphs: {content['paragraphs']}")
        
    except requests.exceptions.RequestException as e:
        print(f"Network error: {e}")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    main()