#!/usr/bin/env python3
"""
News Scraper Setup Script
This script helps you install dependencies and set up the project.
"""

import subprocess
import sys


def check_python_version():
    """Check if Python version is compatible."""
    print("🔍 Checking Python version...")
    
    if sys.version_info < (3, 6):
        print("❌ Python 3.6 or higher required")
        return False
    
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")
    return True


def install_dependencies():
    """Install required Python packages."""
    print("\n📦 Installing dependencies...")
    
    packages = [
        "requests>=2.25.0",
        "beautifulsoup4>=4.9.0"
    ]
    
    for package in packages:
        try:
            subprocess.check_call([
                sys.executable, "-m", "pip", "install", "-q", package
            ])
            print(f"  ✅ {package}")
        except subprocess.CalledProcessError:
            print(f"  ❌ Failed to install {package}")
            return False
    
    return True


def create_sample_config():
    """Create a sample configuration file if it doesn't exist."""
    print("\n📝 Creating sample configuration...")
    
    try:
        with open("news_config.py", "r", encoding="utf-8") as f:
            content = f.read()
        
        if "NEWS_CONFIGS" in content:
            print("  ✅ Configuration file already exists")
            return True
        
    except FileNotFoundError:
        pass
    
    # Copy the default config
    try:
        with open("news_config.py", "w", encoding="utf-8") as f:
            f.write("""
# News Scraper Configuration
# Copy the appropriate configuration and update the selectors for your target.

NEWS_CONFIGS = {
    "hacker_news": {
        "url": "https://news.ycombinator.com/",
        "headline_selector": "a.storylink",
        "limit": 20
    },
    
    "github_trending": {
        "url": "https://github.com/trending",
        "headline_selector": "a.Link--muted",
        "limit": 20
    },
    
    "techcrunch": {
        "url": "https://techcrunch.com/",
        "headline_selector": "h2.post-title",
        "limit": 20
    }
}


def get_config(name: str):
    """Get configuration for a specific news site."""
    return NEWS_CONFIGS.get(name, None)
""")
        print("  ✅ Sample configuration created")
        return True
        
    except Exception as e:
        print(f"  ❌ Failed to create configuration: {e}")
        return False


def verify_installation():
    """Verify the installation."""
    print("\n✅ Verification...")
    
    try:
        import requests
        from bs4 import BeautifulSoup
        print("  ✅ All dependencies installed")
        return True
    except ImportError as e:
        print(f"  ❌ Missing dependency: {e}")
        return False


def main():
    """Main setup function."""
    print("=" * 60)
    print("NEWS SCRAPER SETUP")
    print("=" * 60)
    
    # Check Python version
    if not check_python_version():
        return 1
    
    # Install dependencies
    if not install_dependencies():
        return 1
    
    # Create sample config
    create_sample_config()
    
    # Verify installation
    if not verify_installation():
        return 1
    
    print("\n" + "=" * 60)
    print("🎉 Setup Complete!")
    print("=" * 60)
    
    print("\n📚 Next steps:")
    print("  1. Review the examples: python example_usage.py")
    print("  2. Customize the scraper for your needs")
    print("  3. Check news_config.py for website configurations")
    print("  4. Read README.md for detailed documentation")
    
    print("\n💡 Quick start:")
    print("  python news_scraper.py")
    
    print("\n" + "=" * 60 + "\n")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())