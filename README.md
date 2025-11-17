# Phakamani AI Assistant

A full-stack AI chatbot application with persistent chat history, built with FastAPI, React, and Supabase. Features a local LLM (GPT4All) for completely private AI conversations with no external API calls.

![Python](https://img.shields.io/badge/python-3.9+-blue.svg)
![React](https://img.shields.io/badge/react-18+-61dafb.svg)

## ✨ Features

- 🤖 **Local AI Model** - Powered by GPT4All (runs entirely offline)
- 💬 **Persistent Chat History** - All conversations stored in Supabase
- 🔐 **JWT Authentication** - Secure admin login system
- ⚡ **Real-time Streaming** - Word-by-word response streaming for faster perceived speed
- 🎨 **Modern UI** - Sleek dark mode interface with smooth animations
- 🔍 **Search Chats** - Instant live filtering of conversations
- ✏️ **Rename & Delete** - Full CRUD operations on chat history
- 📝 **Smart Formatting** - AI responses with bullet points, numbered lists, and paragraphs
- 🔄 **Auto-save** - Messages automatically persist to database
- 🚀 **Fast & Responsive** - Optimized streaming for 3x faster response time

## 🏗️ Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **GPT4All** - Local LLM (Falcon model)
- **Supabase** - PostgreSQL database
- **JWT** - Token-based authentication
- **Python 3.9+**

### Frontend
- **React 18** - UI framework
- **Zustand** - State management
- **Tailwind CSS** - Styling
- **Vite** - Build tool

## 📋 Prerequisites

- Python 3.9 or higher
- Node.js 16 or higher
- Supabase account (free tier works)
- ~4GB disk space for AI model

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/idungamanzi/Phakamani-AI-Assistant
cd phakamani-ai-assistant
```

### 2. Setup Supabase

Create a new project on [Supabase](https://supabase.com) and run this SQL:

```sql
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chats table
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  title TEXT DEFAULT 'New Chat',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for simplicity (enable in production!)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
```

### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
```

Edit `backend/.env`:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
JWT_SECRET=your-random-secret-key
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=password123
PORT=8000
```

**Download AI Model:**

The GPT4All model will be downloaded automatically on first run (~4GB).

```bash
# Start backend
python app.py
```

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
echo "VITE_API=http://localhost:8000" > .env

# Start development server
npm run dev
```

### 5. Access Application

Open your browser to:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

**Default Login:**
- Email: `admin@example.com`
- Password: `password123`

## 🎮 Usage

### Creating a New Chat

1. Click the **"+ New Chat"** button in the sidebar
2. Type your message in the input box
3. Press **Enter** or click **Send**
4. Watch the AI respond in real-time!

### Managing Chats

- **Search**: Type in the search box to filter chats
- **Rename**: Hover over a chat → Click pencil icon → Edit inline
- **Delete**: Hover over a chat → Click trash icon → Confirm deletion
- **Select**: Click any chat to view its full conversation history

### Keyboard Shortcuts

- `Enter` - Send message
- `Shift + Enter` - New line in message
- `Escape` - Cancel chat rename

## ⚙️ Configuration

### Changing AI Model

Edit `backend/app.py`:

```python
# Available models: https://gpt4all.io/models.json
LLM = GPT4All(
    model_name="gpt4all-falcon-newbpe-q4_0.gguf",  # Change this
    model_path="./models"
)
```

Popular alternatives:
- `mistral-7b-openorca.Q4_0.gguf` - Better reasoning
- `nous-hermes-llama2-13b.Q4_0.gguf` - Larger context
- `wizardlm-13b-v1.2.Q4_0.gguf` - Instruction following

### Adjusting Response Speed

In `backend/app.py`, modify the streaming delay:

```python
def generator():
    for i, word in enumerate(words):
        chunk = word if i == 0 else ' ' + word
        yield chunk.encode("utf-8")
        time.sleep(0.003)  # Lower = faster, Higher = slower
```

### Increasing Response Length

```python
assistant_full = LLM.generate(
    system_prompt, 
    max_tokens=500,  # Increase for longer responses
    temp=0.7,
    top_p=0.9
)
```

## 🔒 Security Notes

**⚠️ Important for Production:**

1. **Enable Row Level Security (RLS)** on Supabase tables
2. **Change default admin credentials** in `.env`
3. **Use strong JWT secret** (generate with `openssl rand -hex 32`)
4. **Enable HTTPS** for production deployment
5. **Add rate limiting** to API endpoints
6. **Implement proper user authentication** (currently single admin)

## 📊 Performance

- **Initial Load**: ~2s (model loading)
- **Message Send**: <100ms (database write)
- **Streaming Start**: ~500ms (LLM processing)
- **Response Rate**: ~50 words/second (streaming)
- **Memory Usage**: ~2GB RAM (model loaded)

## 🛣️ Roadmap

- [ ] Multi-user support with proper authentication
- [ ] File upload and analysis
- [ ] Voice input/output
- [ ] Export chat history (PDF, JSON)
- [ ] Custom AI personalities
- [ ] RAG (Retrieval Augmented Generation)
- [ ] Mobile responsive design improvements
- [ ] Markdown rendering in messages
- [ ] Code syntax highlighting

## 📝 License

This project is licensed under the Apache License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [GPT4All](https://gpt4all.io/) - Local LLM framework
- [Supabase](https://supabase.com/) - Backend infrastructure
- [FastAPI](https://fastapi.tiangolo.com/) - Python web framework
- [React](https://react.dev/) - UI library
- [Tailwind CSS](https://tailwindcss.com/) - Styling framework

## 📧 Contact

Phakamani Sibeko - (https://www.linkedin.com/in/pwm-sibeko-t1000)

Project Link: [https://github.com/idungamanzi/Phakamani-AI-Assistant](https://github.com/idungamanzi/Phakamani-AI-Assistant)

---

**Made with ❤️ for private, secure AI conversations**
