(function() {
  'use strict';

  const TRACER_URL = 'https://tracer-debugger.vercel.app';
  let injected = false;
  let observer = null;

  // ─── BUTTON INJECTION ───────────────────────────────────────────

  function createTracerButton() {
    const btn = document.createElement('button');
    btn.id = 'tracer-debug-btn';
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 64 64" fill="none" 
           xmlns="http://www.w3.org/2000/svg" style="margin-right:5px;flex-shrink:0">
        <rect width="64" height="64" rx="12" fill="#7C6DFA"/>
        <path d="M18 16 L18 48 L50 32 Z" fill="white"/>
      </svg>
      <span>Debug</span>
    `;
    btn.title = 'Open in Tracer Visual Debugger';
    return btn;
  }

  function injectButton() {
    // Don't inject twice
    if (document.getElementById('tracer-debug-btn')) return;
    
    // Find the Run button using the data-e2e-locator attribute from LeetCode's HTML
    const runButton = document.querySelector(
      'button[data-e2e-locator="console-run-button"]'
    );
    
    if (!runButton) return;
    
    const btn = createTracerButton();
    btn.addEventListener('click', handleDebugClick);
    
    // Insert BEFORE the run button's parent container
    const runButtonContainer = runButton.closest('.group') || runButton.parentElement;
    runButtonContainer.parentElement.insertBefore(btn, runButtonContainer);
    
    injected = true;
    console.log('[Tracer] Button injected successfully');
  }

  // ─── CODE EXTRACTION ─────────────────────────────────────────────

  function extractCode() {
    // Method 1: Try Monaco editor lines (LeetCode uses Monaco)
    // The view-lines div contains the rendered code
    const viewLines = document.querySelectorAll('.view-line');
    if (viewLines.length > 0) {
      let code = '';
      viewLines.forEach(line => {
        // Get text content, replacing &nbsp; with spaces
        const text = line.innerText || line.textContent || '';
        code += text + '\n';
      });
      const cleaned = code.trim();
      if (cleaned.length > 10) return cleaned;
    }

    // Method 2: Try the Monaco editor model via window object
    try {
      const editors = window.monaco?.editor?.getEditors();
      if (editors && editors.length > 0) {
        const model = editors[0].getModel();
        if (model) return model.getValue();
      }
    } catch(e) {}

    // Method 3: Look for contenteditable code areas
    const codeArea = document.querySelector('[data-mode-id="python"], [data-mode-id="python3"]');
    if (codeArea) return codeArea.innerText;

    return null;
  }

  // ─── TEST CASE EXTRACTION ─────────────────────────────────────────

  function extractTestCases() {
    const testCases = [];
    
    // Find all test case parameter labels and their values
    // Based on LeetCode HTML: div with class containing text-label-3 = param name
    // contenteditable div with data-e2e-locator="console-testcase-input" = param value
    
    // First find the active test case tab
    // LeetCode shows Case 1, Case 2 etc as buttons
    const caseButtons = document.querySelectorAll(
      'button[data-e2e-locator="console-testcase-tag"]'
    );
    
    const totalCases = caseButtons.length;
    
    if (totalCases === 0) {
      // No test cases visible — return empty
      return [];
    }
    
    // Extract param names from the labels (text-label-3 class divs)
    // These show "heights =" or "nums =" etc.
    const paramLabels = document.querySelectorAll(
      '.text-label-3.dark\\:text-dark-label-3, [class*="text-label-3"]'
    );
    
    const paramNames = [];
    paramLabels.forEach(label => {
      const text = (label.textContent || '').trim();
      if (text.endsWith('=')) {
        paramNames.push(text.slice(0, -1).trim());
      }
    });
    
    // Extract param values from contenteditable inputs
    const paramInputs = document.querySelectorAll(
      '[data-e2e-locator="console-testcase-input"]'
    );
    
    if (paramNames.length > 0 && paramInputs.length > 0) {
      // Currently visible test case (assume Case 1 is active if first button selected)
      const activeParams = [];
      
      paramInputs.forEach((input, i) => {
        const name = paramNames[i] || `param${i}`;
        const value = (input.textContent || input.innerText || '').trim();
        activeParams.push({ name, value });
      });
      
      testCases.push({
        params: activeParams,
        expectedOutput: ''
      });
    }
    
    return testCases;
  }

  // ─── LANGUAGE CHECK ───────────────────────────────────────────────

  function detectLanguage() {
    // LeetCode shows selected language in a button or dropdown
    const langSelectors = [
      '[data-track-load="description_content"] button',
      '.ant-select-selection-item',
      '[class*="lang-select"]'
    ];
    
    for (const sel of langSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        const text = (el.textContent || '').toLowerCase();
        if (text.includes('python')) return 'python';
        if (text.includes('java')) return 'java';
        if (text.includes('c++') || text.includes('cpp')) return 'cpp';
      }
    }
    
    // Default check: if code contains "class Solution:" it's likely Python
    const code = extractCode() || '';
    if (code.includes('class Solution:')) return 'python';
    
    return 'python'; // default
  }

  // ─── MAIN CLICK HANDLER ───────────────────────────────────────────

  function handleDebugClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const btn = document.getElementById('tracer-debug-btn');
    const originalContent = btn.innerHTML;
    
    // Show loading state
    btn.innerHTML = `<span style="opacity:0.7">Extracting...</span>`;
    btn.disabled = true;
    
    try {
      let code = extractCode();
      
      if (code) {
        // Replace non-breaking spaces (U+00A0) which LeetCode uses for indentation
        code = code.replace(/\u00A0/g, ' ');
      }
      
      if (!code || code.trim().length < 5) {
        showToast('Could not extract code. Make sure you are on a problem page with code written.', 'error');
        btn.innerHTML = originalContent;
        btn.disabled = false;
        return;
      }
      
      const lang = detectLanguage();
      const testCases = extractTestCases();
      
      // Build the payload to pass to Tracer
      const payload = {
        code: code.trim(),
        language: lang,
        leetcodeMode: true,
        testCases: testCases,
        // Include the problem URL for reference
        sourceUrl: window.location.href,
        problemName: document.title.replace(' - LeetCode', '').trim()
      };
      
      // Encode payload as base64 URL param
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      const tracerUrl = `${TRACER_URL}?lc=${encoded}`;
      
      // Open Tracer in a new tab
      window.open(tracerUrl, '_blank');
      
      // Reset button
      setTimeout(() => {
        btn.innerHTML = originalContent;
        btn.disabled = false;
      }, 1500);
      
    } catch (err) {
      console.error('[Tracer] Error:', err);
      showToast('Something went wrong. Please try again.', 'error');
      btn.innerHTML = originalContent;
      btn.disabled = false;
    }
  }

  // ─── TOAST NOTIFICATION ───────────────────────────────────────────

  function showToast(message, type = 'info') {
    const existing = document.getElementById('tracer-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.id = 'tracer-toast';
    toast.textContent = message;
    toast.className = `tracer-toast tracer-toast-${type}`;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 4000);
  }

  // ─── OBSERVER: Wait for LeetCode to render the Run button ─────────

  function startObserver() {
    // LeetCode is a SPA — buttons render after JS loads
    // Use MutationObserver to detect when the Run button appears
    
    observer = new MutationObserver(() => {
      const runBtn = document.querySelector(
        'button[data-e2e-locator="console-run-button"]'
      );
      if (runBtn && !document.getElementById('tracer-debug-btn')) {
        injectButton();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Also try immediately in case page already loaded
    setTimeout(injectButton, 1000);
    setTimeout(injectButton, 2500);
    setTimeout(injectButton, 5000);
  }

  // ─── INIT ─────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver);
  } else {
    startObserver();
  }

})();
