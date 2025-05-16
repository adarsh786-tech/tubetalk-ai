# TubeTalk - AI

**TubeTalk AI** helps you **chat with YouTube videos** using an AI-powered, context-first approach. It enables users to ask questions related to video content and receive precise, context-aware answers.

---

## 🚀 Features

- 🔗 **Chat with YouTube Videos**: Paste any YouTube video URL and chat with an AI assistant about its content.
- 🧠 **Context-Aware Q&A**: Ask questions related to the video and get precise answers, powered by advanced RAG (Retrieval-Augmented Generation).
- 🚫 **Context Enforcement**: Questions outside the video's context are automatically flagged, prompting users to stay relevant.
- ⚡ **Fast & Scalable**: Backend powered by Express, Redis caching, and Qdrant vector database for high performance.
- 🤖 **AI Integration**: Utilizes Google Generative AI and Langchain for semantic understanding and response generation.
- 🛡️ **Environment-Driven Configuration**: Easily configure API keys and endpoints using `.env` variables.
- 🌐 **Modern Tech Stack**: Built with Next.js, React, and TypeScript for a fast, responsive frontend experience.

---

## 🛠 Tech Stack

- **Frontend**: Next.js, React.js, TypeScript
- **Backend**: Express.js
- **AI/ML**: Langchain, Google Generative AI
- **Database**: Qdrant DB
- **Caching**: Redis (via Upstash)

---

## ⚙️ Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/your-username/tubetalk-ai.git
   cd tubetalk-ai
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Create a `.env` file** and add the following variables:

   ```env
   GOOGLE_API_KEY=
   QDRANT_URL=
   QDRANT_API_KEY=
   UPSTASH_REDIS_REST_URL=
   UPSTASH_REDIS_REST_TOKEN=
   ```

---

## 🧠 Usage

1. Paste a **YouTube video URL** into the app.
2. Let the assistant **load and process the video**.
3. Ask **video-relevant questions** in the chat.
4. If the question is outside the video’s context, the assistant will prompt for a more relevant one. _(Standard RAG-based behavior)_

---

## 📸 Screenshots

- ![TubeTalk AI Screenshot](https://webappsgallery.s3.us-east-1.amazonaws.com/tubetalk-ai-image.png)

---

## 📡 API Endpoints

- `POST /api/load_video` – Loads and indexes the video for chat.
- `POST /api/ask_questions` – Accepts and processes user questions.

---

## 📄 License

This project is licensed under the **MIT License**.

---
