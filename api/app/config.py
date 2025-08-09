# api/app/config.py
import os
from typing import Optional

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://openmemory:openmemory123@localhost:5432/openmemory")

# Qdrant configuration
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", None)

# Embedding configuration
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "mxbai-embed-large")
EMBEDDING_API_URL = os.getenv("EMBEDDING_API_URL", "http://localhost:11434")

# User configuration
USER_ID = os.getenv("USER_ID", "default_user")
DEFAULT_APP_ID = os.getenv("DEFAULT_APP_ID", "default")

# Optional: OpenAI configuration (disabled by default)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", None)

# Memory client configuration
MEMORY_CONFIG = {
    "vector_store": {
        "provider": "qdrant",
        "config": {
            "url": QDRANT_URL,
            "api_key": QDRANT_API_KEY,
        }
    },
    "embedder": {
        "provider": "ollama",
        "config": {
            "model": EMBEDDING_MODEL,
            "ollama_base_url": EMBEDDING_API_URL,
        }
    },
    "version": "v1.1"
}
