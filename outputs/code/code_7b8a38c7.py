language: Python
code: |
  # scrape_example.py
  import requests
  from bs4 import BeautifulSoup
  import re

  def scrape_and_summarize(url):
      try:
          # Fetch the webpage
          headers = {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.0'
          }
          response = requests.get(url, headers=headers, timeout=10)
          response.raise_for_status()
          
          # Parse HTML
          soup = BeautifulSoup(response.content, 'html.parser')
          
          # Remove script and style elements
          for script in soup(["script", "style", "nav", "footer", "header"]):
              script.decompose()
          
          # Extract title
          title = soup.find('title')
          title_text = title.get_text(strip=True) if title else "No title found"
          
          # Extract main content
          # Try to find main content area first
          main_content = soup.find('main') or soup.find('article') or soup.find('div', class_=re.compile('content|main'))
          
          if main_content:
              text = main_content.get_text(separator=' ', strip=True)
          else:
              # Fallback to body text
              text = soup.get_text(separator=' ', strip=True)
          
          # Clean up whitespace
          text = re.sub(r'\s+', ' ', text).strip()
          
          # Create summary (first 500 chars as basic summary)
          summary = text[:500] + "..." if len(text) > 500 else text
          
          return {
              'url': url,
              'title': title_text,
              'summary': summary,
              'word_count': len(text.split())
          }
          
      except requests.RequestException as e:
          return {'error': f"Failed to fetch URL: {str(e)}"}
      except Exception as e:
          return {'error': f"Processing error: {str(e)}"}

  if __name__ == "__main__":
      result = scrape_and_summarize("https://example.com")
      
      # Display results
      if 'error' in result:
          print(f"Error: {result['error']}")
      else:
          print(f"URL: {result['url']}")
          print(f"Title: {result['title']}")
          print(f"Word Count: {result['word_count']}")
          print(f"\nSummary:\n{result['summary']}")

explanation: |
  This Python script uses `requests` to fetch https://example.com and `BeautifulSoup` to parse the HTML. It extracts the page title and main text content, cleans up formatting, and produces a basic summary (first 500 characters). The script includes error handling for network issues and HTML parsing problems.

  **Potential issues:**
  1. **Rate limiting/Blocking**: example.com may block or rate-limit scrapers; use respectful delays and rotate User-Agents for production
  2. **Dynamic content**: This only works for static HTML; JavaScript-rendered sites need Selenium/Playwright
  3. **Legal/Ethical**: Always check robots.txt and Terms of Service before scraping
  4. **Content changes**: HTML structure may change, breaking selectors
  5. **Dependencies**: Requires `pip install requests beautifulsoup4`
  6. **Summary quality**: The simple truncation approach is basic; for better summaries, integrate with an LLM API (OpenAI, etc.)