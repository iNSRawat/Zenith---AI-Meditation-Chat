# Zenith - AI Meditation & Chat ✨

**Your personal sanctuary for mindfulness, powered by Google's Gemini AI.**

Zenith is a modern web application designed to provide a unique and personalized mindfulness experience. It leverages the power of generative AI to create custom guided meditation sessions from a simple text prompt and features an intelligent chatbot to support you on your wellness journey.

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Gemini API](https://img.shields.io/badge/Gemini_API-4285F4?style=for-the-badge&logo=google&logoColor=white)

---

<!-- It's highly recommended to add a screenshot or GIF of the app in action here! -->
<!-- ![Zenith App Screenshot](link-to-your-screenshot.png) -->

## 🌟 Key Features

### 🧘‍♀️ AI-Powered Meditation Generator

*   **Personalized Sessions:** Simply enter a theme or feeling (e.g., "A calm forest by a gentle stream"), and Zenith's AI will generate a complete, unique meditation session for you.
*   **AI-Generated Script:** Uses the `gemini-2.5-flash` model to craft a soothing, well-paced guided meditation script tailored to your prompt.
*   **Stunning Visuals:** The `imagen-4.0-generate-001` model creates a beautiful, high-resolution, and serene background image to match the theme of your meditation, creating an immersive experience.
*   **Soothing Voiceover:** Leverages `gemini-2.5-flash-preview-tts` to synthesize a calm, human-like voiceover from the generated script, guiding you through your session.
*   **Customizable Ambience:** Enhance your meditation with a selection of built-in background music tracks (e.g., Soft Piano, Ocean Waves) or upload your own audio for a truly personal touch.
*   **Session History:** Your last 10 sessions are automatically saved. Revisit and replay your favorite meditations with a single click.

### 💬 Intelligent Mindfulness Chatbot

*   **Conversational AI:** Have a friendly chat with an AI companion powered by `gemini-2.5-flash`. Ask questions about mindfulness, meditation techniques, or general well-being.
*   **Streaming Responses:** The chatbot provides answers in real-time, creating a fluid and natural conversation.
*   **Markdown Support:** Responses are beautifully formatted, making them easy to read and understand.

### 🎨 Sleek & Modern UI/UX

*   **Responsive Design:** A clean, beautiful, and fully responsive interface built with TailwindCSS that looks great on any device.
*   **Intuitive Navigation:** Easily switch between the Meditation Generator and the Chatbot through a clear, tab-based interface.
*   **Interactive Player:** A custom-built media player for your meditation sessions, complete with play/pause controls, a seek bar, and volume controls for background audio.
*   **Dark Mode Theme:** A calming, dark-themed aesthetic to help you relax and focus.

## 🛠️ Technology Stack

*   **Frontend:** [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/), [TailwindCSS](https://tailwindcss.com/)
*   **Generative AI:** [Google Gemini API](https://ai.google.dev/)
    *   **Text & Chat:** `gemini-2.5-flash`
    *   **Image Generation:** `imagen-4.0-generate-001`
    *   **Text-to-Speech:** `gemini-2.5-flash-preview-tts`
*   **Deployment:** This project is ready to be deployed on any static site hosting service like Vercel, Netlify, or GitHub Pages.

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

*   Node.js (v18 or later)
*   npm or yarn
*   A Google Gemini API Key. You can get one from [Google AI Studio](https://makersuite.google.com/).

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/iNSRawat/Zenith---AI-Meditation-Chat.git
    cd Zenith---AI-Meditation-Chat
    ```

2.  **Install NPM packages:**
    ```sh
    npm install
    ```

3.  **Set up your environment variables:**
    Create a file named `.env` in the root of your project and add your Gemini API key:
    ```
    API_KEY=YOUR_GEMINI_API_KEY
    ```
    > **Note:** The current setup in `services/geminiService.ts` reads `process.env.API_KEY` directly. For local development with tools like Vite, you would typically name this `VITE_API_KEY` and access it via `import.meta.env.VITE_API_KEY`. You may need to adjust the service file or your build tool's configuration accordingly.

4.  **Run the development server:**
    ```sh
    npm run dev
    ```

Open [http://localhost:5173](http://localhost:5173) (or the port specified in your terminal) to view the application in your browser.

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
