# Tracer — LeetCode Debugger Extension

The Tracer Chrome Extension supercharges your LeetCode problem-solving experience by bringing our advanced visual Python debugger directly to your browser.

With a single click, this extension extracts your active LeetCode solution and test cases, seamlessly transporting them into the Tracer Visual Debugger where you can analyze execution step-by-step.

## ✨ Features

- **Seamless Injection**: Adds a "Debug" button directly next to the "Run" and "Submit" buttons on LeetCode problem pages.
- **Smart Extraction**: Automatically captures your Python code and the active test cases you are currently viewing on LeetCode.
- **One-Click Debugging**: Opens a new Tracer session instantly pre-populated with your LeetCode problem context, enabling you to visually debug why your solution is failing.

## 🛠️ How to Install (Developer Mode)

To install this extension directly from the source code, follow these simple steps:

1. **Open Chrome Extensions Page:**
   - In your Google Chrome browser, navigate to `chrome://extensions/`.
   - Alternatively, click the puzzle piece icon 🧩 in your toolbar, then click "Manage extensions".

2. **Enable Developer Mode:**
   - In the top right corner of the Extensions page, toggle the **Developer mode** switch to **ON**.

3. **Load the Extension:**
   - Click the **Load unpacked** button that appears in the top left corner.
   - A file picker dialog will open. Navigate to the folder where you cloned this repository.
   - Select the `extension` folder (`/mnt/data_volume/Python Debugger/extension`) and click **Select Folder** (or Open).

4. **Verify Installation:**
   - You should now see the "Tracer — LeetCode Debugger" extension loaded in your list.
   - Make sure the toggle switch is turned ON.

## 🚀 How to Use

1. Go to any [LeetCode problem page](https://leetcode.com/problemset/all/).
2. Write your Python code in the LeetCode editor.
3. Look for the **Purple "Debug" button** injected right next to the usual LeetCode "Run" or "Submit" buttons.
4. Click **Debug**. 
5. A new tab will open with the Tracer Visual Debugger, loaded with your code and the current active test case. You can now step through your execution to find bugs!

## 🔧 Permissions Justification

- `activeTab`: Used to access the current LeetCode problem page context when the user interacts with the extension.
- `scripting`: Required to inject our code extraction and button UI script (`content.js`) into the DOM of the LeetCode page.
- `storage`: (Optional) Can be used to save local user preferences for the extension in the future.
- `Host Permissions (*://leetcode.com/*)`: The content script needs permission to run on all LeetCode problem pages to inject the debug button.
