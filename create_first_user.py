#!/usr/bin/env python3
import sys
sys.path.append('/app')

from app.database import SessionLocal
from app.auth import create_user_with_api_key

def create_initial_user():
    db = SessionLocal()
    try:
        # Create user for Opti
        user, api_key = create_user_with_api_key(
            user_id="opti",
            db=db,
            name="Opti"
        )
        print(f"Created user: {user.user_id}")
        print(f"API Key: {api_key}")
        print("\nIMPORTANT: Save this API key! It will not be shown again.")
        print(f"\nUse this in your claude_desktop_config.json:")
        print(f'"http://mem-lab.duckdns.org:8765/mcp/claude/sse?key={api_key}"')
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_initial_user()
