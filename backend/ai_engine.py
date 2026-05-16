import os

from langchain_core.prompts import PromptTemplate
from langchain_ollama import OllamaLLM
from pydantic import BaseModel

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL")


class NarrationRequest(BaseModel):
    context: str


class DungeonMaster:
    def __init__(self):
        llm_kwargs: dict[str, str] = {"model": OLLAMA_MODEL}
        if OLLAMA_BASE_URL:
            llm_kwargs["base_url"] = OLLAMA_BASE_URL
        self.llm = OllamaLLM(**llm_kwargs)
        self.template = PromptTemplate(
            input_variables=["combat_context"],
            template=(
                "You are an expert Dungeon Master. Narrate the following combat "
                "event in 2-3 vivid sentences. Do not use numbers.\n\n"
                "Context: {combat_context}\n\n"
                "Narration:"
            ),
        )
        self.chain = self.template | self.llm

    def generate_combat_narration(self, context_string: str) -> str:
        return self.chain.invoke({"combat_context": context_string})


_dm: DungeonMaster | None = None


def get_dm() -> DungeonMaster:
    global _dm
    if _dm is None:
        _dm = DungeonMaster()
    return _dm
