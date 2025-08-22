#!/bin/bash
# Fix all datetime.UTC occurrences in Python files

echo "Fixing datetime.UTC in all Python files..."

# Fix in all Python files
find api/app -name "*.py" -type f | while read file; do
    if grep -q "datetime.UTC" "$file"; then
        echo "Fixing: $file"
        # Backup the file
        cp "$file" "$file.bak_datetime"
        # Replace datetime.UTC with timezone.utc
        sed -i 's/datetime\.UTC/timezone.utc/g' "$file"
        # Check if timezone is imported, if not add it
        if ! grep -q "from datetime import.*timezone" "$file"; then
            # Add timezone to existing datetime import
            sed -i 's/from datetime import datetime/from datetime import datetime, timezone/g' "$file"
        fi
    fi
done

echo "Done! All datetime.UTC occurrences have been fixed."
