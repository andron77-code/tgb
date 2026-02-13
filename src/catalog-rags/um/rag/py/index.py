# pip install lxml sentence-transformers faiss-cpu transformers torch

import faiss
import numpy as np
from lxml import etree
from sentence_transformers import SentenceTransformer
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

# -----------------------------
# 1. Парсинг XML
# -----------------------------
tree = etree.parse("catalog.xml")
root = tree.getroot()

documents = []
metadata = []

for product in root.findall("product"):
    pid = product.findtext("id")
    name = product.findtext("name")
    category = product.findtext("category")
    price = product.findtext("price")
    currency = product.find("price").get("currency")
    description = product.findtext("description")

    text = f"""
    ID: {pid}
    Название: {name}
    Категория: {category}
    Цена: {price} {currency}
    Описание: {description}
    """

    documents.append(text)
    metadata.append({"id": pid, "name": name})

# -----------------------------
# 2. Embeddings
# -----------------------------
embedder = SentenceTransformer("intfloat/multilingual-e5-base")
embeddings = embedder.encode(documents, convert_to_numpy=True)

dimension = embeddings.shape[1]
index = faiss.IndexFlatL2(dimension)
index.add(embeddings)

# -----------------------------
# 3. Загрузка LLM
# -----------------------------
model_name = "mistralai/Mistral-7B-Instruct-v0.2"

tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.float16,
    device_map="auto"
)

# -----------------------------
# 4. RAG функция
# -----------------------------
def ask(question, top_k=2):
    query_embedding = embedder.encode([question])
    distances, indices = index.search(query_embedding, top_k)

    retrieved_docs = [documents[i] for i in indices[0]]
    context = "\n".join(retrieved_docs)

    prompt = f"""
    Ты ассистент по каталогу товаров.
    Отвечай только на основе предоставленного контекста.
    Если информации нет — скажи, что в каталоге нет таких данных.

    Контекст:
    {context}

    Вопрос:
    {question}

    Ответ:
    """

    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

    output = model.generate(
        **inputs,
        max_new_tokens=200,
        temperature=0.3
    )

    return tokenizer.decode(output[0], skip_special_tokens=True)

# -----------------------------
# 5. Пример
# -----------------------------
print(ask("Есть ли у вас смартфоны с 5G?"))
