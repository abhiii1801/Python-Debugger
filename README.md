# Tracer

<div align="center">
  <p><strong>A highly interactive Visual Python Debugger offering step-by-step execution tracking and seamless LeetCode integration.</strong></p>
  
  <p>
    <a href="https://tracer-debugger.vercel.app/" target="_blank"><strong>🌐 Try the Live App</strong></a> •
    <a href="./extension/README.md"><strong>🧩 Get the Chrome Extension</strong></a>
  </p>
</div>

## 🎥 Demo Video

<!-- Add your demo video link or embed below -->
> **[Watch the Tracer Demo Video Here](#)** *(Demo video coming soon)*

---

## 🌟 Overview

Debugging complex algorithms, nested loops, and recursive functions can be incredibly overwhelming. Standard `print()` statements are tedious, and command-line debuggers can be difficult to visualize. 

**Tracer** bridges this gap by providing an intuitive, web-based visual debugger. It sandboxes your Python code execution on the backend, meticulously tracking the state of your variables, the call stack, and memory structures at every single step. This execution timeline is then passed to a rich, React-based frontend where you can traverse the execution history forward and backward, allowing you to see exactly what your code is doing under the hood.

Whether you're debugging intricate algorithms, learning Python data structures, or practicing for technical interviews, Tracer offers an unparalleled, transparent view of your code's lifecycle.

---

## ✨ Features Deep Dive

Tracer is packed with features designed to give you absolute control and visibility over your code's execution.

### 1. Visual Execution Timeline
Rather than just running your code and seeing the final output, Tracer records the entire lifecycle. Use the intuitive playback controls or timeline slider to step forwards and backwards through your code's execution. Watch as the active line of code highlights in real-time, corresponding to the exact state of your program at that moment.

<img width="1871" height="1156" alt="Screenshot From 2026-06-26 10-13-30" src="https://github.com/user-attachments/assets/5e8a3980-a467-4c5c-bad6-11698c80ef3c" />


### 2. Live Variables & Scope Tracking
Stop guessing what value a variable holds! The **Variables Panel** updates dynamically as you scrub through the timeline. It clearly separates variables by scope (Local vs. Global), allowing you to trace exactly when and where a value mutates.

<img width="1256" height="747" alt="Screenshot From 2026-06-26 10-14-25" src="https://github.com/user-attachments/assets/45639afa-b6e1-45a3-affb-b5add76bf13c" />

### 3. Visual Heap Memory (Object References)
Understanding object references, pointers, and complex data structures (like Linked Lists or Trees) is a common hurdle. Tracer includes a specialized **Heap View** powered by interactive node graphs. It visually maps out how variables reference objects in memory, making it trivial to spot circular references or dangling pointers.

<img width="1466" height="826" alt="Screenshot From 2026-06-26 10-15-03" src="https://github.com/user-attachments/assets/dd52e427-e247-4bbe-9b93-fb2866c395d3" />

### 4. Interactive Call Stack
Recursive functions are notoriously hard to trace. Tracer's **Call Stack Panel** visually stacks your function calls. You can easily monitor the depth of your recursion, see exactly which function context is currently active, and understand the flow of parameters and return values.

<img width="1864" height="937" alt="Screenshot From 2026-06-26 10-17-02" src="https://github.com/user-attachments/assets/40551d39-2e7d-4d70-afa7-b751a12cba22" />


### 5. Seamless LeetCode Integration (Chrome Extension)
Tired of failing LeetCode test cases and not knowing why? We built a dedicated Chrome Extension specifically for algorithmic prep. 

The extension injects a native-looking **"Debug" button** right into the LeetCode UI. With a single click, it extracts your code, detects your language, captures your active test cases, and automatically transports you into a fully populated Tracer session. 

👉 **[Read the Extension Setup Guide Here](./extension/README.md)**

<img width="1268" height="196" alt="Screenshot From 2026-06-26 10-18-33" src="https://github.com/user-attachments/assets/d4a0d30f-1bcc-41ee-85d1-23f6d938dd78" />


---

## 🛠️ Tech Stack & Architecture

Tracer is built with a modern, high-performance web stack to ensure smooth tracing even for complex scripts.

### Frontend
- **React & TypeScript**: For a robust, type-safe user interface.
- **Vite**: Ultra-fast frontend build tooling.
- **TailwindCSS**: For sleek, responsive, and maintainable styling.
- **Monaco Editor**: Powering the core code editing experience (the same engine behind VS Code).
- **React Flow**: Rendering the interactive, node-based Heap View.
- **react-resizable-panels**: Providing a customizable workspace layout.

### Backend
- **FastAPI**: A modern, high-performance Python web framework handling execution requests.
- **Python `sys.settrace`**: The core engine. We utilize Python's native tracing API to hook into the execution and capture frame states securely in a sandboxed environment.

### Extension
- **Manifest V3**: Using the latest, most secure standard for Chrome Extensions.
- **Content Scripts**: To intelligently parse the LeetCode DOM and extract Monaco editor states.

---

## 🚀 Local Development

If you want to run the project locally or contribute, follow these steps:

### 1. Backend Setup
The backend requires Python 3.9+.
```bash
cd backend
pip install -r requirements.txt
# Run the FastAPI server on port 8000
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup
The frontend requires Node.js (v18+ recommended).
```bash
cd frontend
cp .env.example .env.local
# Install dependencies
npm install
# Start the Vite development server
npm run dev
```

> **Note:** By default, the local frontend expects the local backend to be running on `http://localhost:8000`.
