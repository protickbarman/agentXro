language: Python
code: |
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
          
          # Extract text content
          text = soup.get_text(separator=' ', strip=True)
          
          # Clean up whitespace
          text = re.sub(r'\s+', ' ', text).strip()
          
          # Basic summary: first meaningful paragraph or first 500 chars
          paragraphs = [p.strip() for p in text.split('.') if len(p.strip()) > 50]
          summary = '. '.join(paragraphs[:3]) if paragraphs else text[:500]
          
          # Fallback summary if too short
          if len(summary) < 100:
              summary = text[:500]
          
          return {
              'title': soup.title.string if soup.title else 'No title',
              'url': url,
              'summary': summary[:1000] + '...' if len(summary) > 1000 else summary,
              'full_text_length': len(text)
          }
          
      except requests.exceptions.RequestException as e:
          return {'error': f'Failed to fetch URL: {str(e)}'}
      except Exception as e:
          return {'error': f'Processing error: {str(e)}'}

  # Execute
  if __name__ == "__main__":
      result = scrape_and_summarize('https://example.com')
      print(f"Title: {result.get('title', 'N/A')}")
      print(f"Summary: {result.get('summary', 'N/A')}")
      print(f"Full text length: {result.get('full_text_length', 0)}")

explanation: |
  This script scrapes https://example.com and generates a basic summary. It uses requests for HTTP fetching with a User-Agent header to avoid simple blocking, BeautifulSoup for HTML parsing and cleanup, and regex for text normalization. The summary logic extracts the first substantial paragraphs. 
  
  Potential issues: (1) example.com is a placeholder domain with minimal content—real scraping targets need robots.txt checks; (2) No rate limiting included—add time.sleep() between requests; (3) Simple summarization is extractive not abstractive—for better summaries integrate an LLM API (OpenAI, etc.); (4) Some sites block scrapers—may need Selenium/Playwright for JS-rendered content or proxy rotation; (5) Legal: always check website's ToS and robots.txt before scraping.