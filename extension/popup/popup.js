const TRACER_URL = 'https://tracer-debugger.vercel.app';

async function init() {
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const hint = document.getElementById('hint');
  const openBtn = document.getElementById('open-tracer');

  // Check if current tab is a LeetCode problem
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  const isLeetCode = tab?.url?.includes('leetcode.com/problems/');
  
  if (isLeetCode) {
    statusDot.className = 'status-dot active';
    statusText.textContent = 'LeetCode problem detected';
    hint.textContent = 'Click "Debug" button next to Run on the page';
  } else {
    statusDot.className = 'status-dot inactive';
    statusText.textContent = 'Not on a LeetCode problem';
    hint.textContent = 'Navigate to a LeetCode problem page to use the debugger';
  }

  openBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: TRACER_URL });
  });
}

init();
