from app.database import SessionLocal
from app.models import Config as ConfigModel
import json

db = SessionLocal()
db_config = db.query(ConfigModel).filter(ConfigModel.key == 'main').first()

if db_config:
    config_value = db_config.value
    
    # Add version to the mem0 config
    if 'mem0' not in config_value:
        config_value['mem0'] = {}
    
    config_value['mem0']['version'] = 'v1.1'
    
    # Update the database
    db_config.value = config_value
    db.commit()
    
    print("Configuration updated successfully!")
    print("New configuration:")
    print(json.dumps(config_value, indent=2))
else:
    print("No configuration found in database")

db.close()
