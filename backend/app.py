from dotenv import load_dotenv
load_dotenv()

import os
import time
import requests
from typing import Optional, Dict, Any, Generator
from uuid import uuid4
from fastapi import FastAPI, HTTPException, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import jwt

#CONFIG from .env  
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
JWT_SECRET = os.getenv("JWT_SECRET", "change_this_secret")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@example.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "password123")
API_PORT = int(os.getenv("PORT", 8000))

ADMIN_USER_ID = "00000000-0000-0000-0000-000000000001"
if not (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY):
    raise RuntimeError("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env")

REST_ENDPOINT = f"{SUPABASE_URL}/rest/v1"
HEADERS_SERVICE = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

#FastAPI app  
app = FastAPI(title="Phakamani AI Assistant")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#Ensure admin profile exists  
def ensure_admin_profile():
    try:
        check_url = f"{REST_ENDPOINT}/profiles?id=eq.{ADMIN_USER_ID}"
        r = requests.get(check_url, headers=HEADERS_SERVICE)
        
        if r.status_code == 200 and not r.json():
            profile_data = {
                "id": ADMIN_USER_ID,
                "email": ADMIN_EMAIL,
                "full_name": "Admin User"
            }
            requests.post(f"{REST_ENDPOINT}/profiles", headers=HEADERS_SERVICE, json=profile_data)
            print("  Admin profile created")
    except Exception as e:
        print(f"Warning: Could not create admin profile: {e}")

ensure_admin_profile()

#LLM wrapper  
try:
    from gpt4all import GPT4All
    LLM = GPT4All(model_name="gpt4all-falcon-newbpe-q4_0.gguf", model_path="./models")
    print("GPT4All model loaded")
except Exception as e:
    LLM = None
    print(f"GPT4All model not loaded: {e}")

class LoginIn(BaseModel):
    email: str
    password: str

class ChatCreateIn(BaseModel):
    message: str
    chat_id: Optional[str] = None

class SimpleIn(BaseModel):
    message: str

#JWT auth 
def create_token(sub: str, hours: int = 12) -> str:
    payload = {"sub": sub, "exp": int(time.time()) + hours * 3600}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def verify_token(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization")
    
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization header format")
    
    token = authorization.split(" ", 1)[1]
    
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return data
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token validation failed: {str(e)}")

#Login  
@app.post("/login")
def login(data: LoginIn):
    if data.email != ADMIN_EMAIL or data.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(sub="admin")
    return {"access_token": token, "token_type": "bearer"}

#Create or append chat
@app.post("/chat")
def create_or_update_chat(payload: ChatCreateIn, token_data: Dict = Depends(verify_token)):
    if payload.chat_id:
        chat_id = payload.chat_id
    else:
        #Create new chat with UUID user_id
        try:
            chat_data = {"user_id": ADMIN_USER_ID, "title": "New Chat"}
            r = requests.post(
                f"{REST_ENDPOINT}/chats",
                headers=HEADERS_SERVICE,
                json=chat_data,
                timeout=10
            )
            
            if r.status_code not in (200, 201):
                print(f"Supabase error: {r.status_code} - {r.text}")
                raise HTTPException(status_code=500, detail=f"Failed to create chat: {r.text}")
            
            resp_json = r.json()
            chat_id = resp_json[0]["id"] if isinstance(resp_json, list) and resp_json else resp_json.get("id", str(uuid4()))
            print(f"  Created chat: {chat_id}")
        
        except requests.exceptions.RequestException as e:
            print(f"Connection error: {e}")
            raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")

    #Insert user message
    msg_payload = {"chat_id": chat_id, "role": "user", "content": payload.message}
    r = requests.post(f"{REST_ENDPOINT}/messages", headers=HEADERS_SERVICE, json=msg_payload)
    if r.status_code not in (200, 201):
        raise HTTPException(status_code=500, detail="Failed to store message")

    return {"chat_id": chat_id}

# Generate title
@app.post("/chat-title")
def chat_title(payload: SimpleIn, token_data: Dict = Depends(verify_token)):
    user_message = (payload.message or "").strip()
    if not user_message:
        return {"title": "New Chat"}
    
    prompt = f"Summarize into a short 1-3 word topic (no prefix, no punctuation): {user_message}\nTitle:"
    
    if LLM:
        try:
            title = LLM.generate(prompt, max_tokens=8).strip().title()
        except Exception:
            title = ""
    else:
        words = user_message.split()
        title = " ".join(words[:2]).title()
    
    title = title.replace("\n", "").strip()
    return {"title": title or "New Chat"}

# Stream chat
@app.post("/chat/{chat_id}/stream")
async def chat_stream(chat_id: str, request: Request, token_data: Dict = Depends(verify_token)):
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    user_message = data.get("message", "")
    if not user_message:
        raise HTTPException(status_code=400, detail="Message is required")

    system_prompt = (
        "You are Phakamani's highly capable AI assistant. Provide clear, well-structured responses.\n\n"
        "Guidelines:\n"
        "- Use bullet points (•) for lists\n"
        "- Use numbered lists (1., 2., 3.) for steps\n"
        "- Use paragraphs for explanations\n"
        "- Be concise but thorough\n"
        "- Start directly with the answer\n\n"
        f"User: {user_message}\n\nAssistant:"
    )

    if LLM:
        try:
            assistant_full = LLM.generate(system_prompt, max_tokens=500, temp=0.7, top_p=0.9).strip()
        except Exception as e:
            assistant_full = "I couldn't generate a response (LLM error)."
            print("LLM generate error:", e)
    else:
        assistant_full = f"Echo: {user_message} (LLM not loaded)"

    try:
        assistant_payload = {"chat_id": chat_id, "role": "assistant", "content": assistant_full}
        requests.post(f"{REST_ENDPOINT}/messages", headers=HEADERS_SERVICE, json=assistant_payload)
    except Exception as e:
        print("Warning: could not persist assistant message:", e)

    def generator() -> Generator[bytes, None, None]:
        words = assistant_full.split(' ')
        for i, word in enumerate(words):
            chunk = word if i == 0 else ' ' + word
            yield chunk.encode("utf-8")
            time.sleep(0.003)
        yield b"\n"

    return StreamingResponse(generator(), media_type="text/plain")

# Get chats
@app.get("/chats")
def list_chats(token_data: Dict = Depends(verify_token)):
    r = requests.get(f"{REST_ENDPOINT}/chats?select=*&order=created_at.desc", headers=HEADERS_SERVICE)
    if r.status_code != 200:
        return []
    return r.json()

# Get chat messages
@app.get("/chats/{chat_id}")
def get_chat(chat_id: str, token_data: Dict = Depends(verify_token)):
    q = f"{REST_ENDPOINT}/messages?chat_id=eq.{chat_id}&order=created_at.asc"
    r = requests.get(q, headers=HEADERS_SERVICE)
    if r.status_code != 200:
        return {"messages": []}
    return {"messages": r.json()}

# Delete chat
@app.delete("/chats/{chat_id}")
def delete_chat(chat_id: str, token_data: Dict = Depends(verify_token)):
    msg_q = f"{REST_ENDPOINT}/messages?chat_id=eq.{chat_id}"
    requests.delete(msg_q, headers=HEADERS_SERVICE)
    
    chat_q = f"{REST_ENDPOINT}/chats?id=eq.{chat_id}"
    r = requests.delete(chat_q, headers=HEADERS_SERVICE)
    
    if r.status_code not in (200, 204):
        raise HTTPException(status_code=500, detail="Failed to delete chat")
    
    return {"success": True}

# Update chat title
@app.patch("/chats/{chat_id}/title")
def update_chat_title(chat_id: str, payload: SimpleIn, token_data: Dict = Depends(verify_token)):
    title = payload.message.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title cannot be empty")
    
    chat_q = f"{REST_ENDPOINT}/chats?id=eq.{chat_id}"
    r = requests.patch(chat_q, headers=HEADERS_SERVICE, json={"title": title})
    
    if r.status_code not in (200, 204):
        raise HTTPException(status_code=500, detail="Failed to update chat title")
    
    return {"success": True, "title": title}

@app.get("/")
def root():
    return {"status": "ok", "message": "Phakamani AI Assistant API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=API_PORT)