# api/migrations/add_api_keys.py
"""
Migration script to add API keys table and update user table
Run this script to migrate existing database to support API key authentication
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.config import DATABASE_URL
from app.models import Base, User, ApiKey, generate_api_key, hash_api_key
from app.database import SessionLocal
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def migrate_database():
    """Add API keys table and generate keys for existing users"""
    
    engine = create_engine(DATABASE_URL)
    
    # Create new tables (this will only create tables that don't exist)
    logger.info("Creating new tables...")
    Base.metadata.create_all(bind=engine)
    
    # Get a database session
    db = SessionLocal()
    
    try:
        # Check if api_keys table was just created (is empty)
        api_key_count = db.query(ApiKey).count()
        
        if api_key_count == 0:
            logger.info("Generating API keys for existing users...")
            
            # Get all existing users
            users = db.query(User).all()
            
            generated_keys = []
            
            for user in users:
                # Check if user already has an API key (shouldn't happen, but safety check)
                existing_key = db.query(ApiKey).filter(ApiKey.user_id == user.id).first()
                
                if not existing_key:
                    # Generate new API key
                    api_key = generate_api_key()
                    
                    # Create API key record
                    api_key_obj = ApiKey(
                        user_id=user.id,
                        key_hash=hash_api_key(api_key)
                    )
                    db.add(api_key_obj)
                    
                    generated_keys.append({
                        'user_id': user.user_id,
                        'name': user.name or user.user_id,
                        'api_key': api_key
                    })
                    
                    logger.info(f"Generated API key for user: {user.user_id}")
            
            # Commit all changes
            db.commit()
            
            if generated_keys:
                logger.info("\n" + "="*60)
                logger.info("IMPORTANT: Save these API keys - they cannot be recovered!")
                logger.info("="*60)
                
                for key_info in generated_keys:
                    print(f"\nUser: {key_info['name']} ({key_info['user_id']})")
                    print(f"API Key: {key_info['api_key']}")
                
                logger.info("\n" + "="*60)
                logger.info("Migration completed successfully!")
                logger.info(f"Generated {len(generated_keys)} API keys")
            else:
                logger.info("No users found to migrate")
        else:
            logger.info("API keys already exist, skipping migration")
            
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    logger.info("Starting database migration...")
    migrate_database()
    logger.info("Migration complete!")