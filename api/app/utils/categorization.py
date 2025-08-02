import logging
from typing import List

from app.utils.prompts import MEMORY_CATEGORIZATION_PROMPT
from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel
from tenacity import retry, stop_after_attempt, wait_exponential

load_dotenv()
openai_client = OpenAI()


class MemoryCategories(BaseModel):
    categories: List[str]


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=15))
def get_categories_for_memory(memory: str) -> List[str]:
    """
    Disabled categorization for fully private operation.
    Returns empty list to bypass OpenAI dependency.
    Original function backed up as categorization.py.backup
    """
    logging.info("[CATEGORIZATION] Disabled - returning empty categories list")
    return []
