import { apiRequest, showToast } from './api.js';

let vapiInstance = null;
let isCallActive = false;
let isMuted = false;
let currentVapiPublicKey = '';
let currentVapiAssistantId = '';

/**
 * Loads Vapi SDK dynamically from local bundle, module, or CDN
 */
async function getVapiSDK() {
  if (window.Vapi) {
    return window.Vapi;
  }
  if (window.VapiModule?.default || window.VapiModule) {
    window.Vapi = window.VapiModule.default || window.VapiModule;
    return window.Vapi;
  }

  // 1. Try local bundled Vapi SDK script (offline-ready, zero CDN dependency)
  try {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/js/vapi-sdk.bundle.js';
      script.onload = () => {
        const vClass = window.VapiModule?.default || window.VapiModule || window.Vapi;
        if (vClass) {
          window.Vapi = vClass;
          resolve(vClass);
        } else {
          reject(new Error('Vapi class not in local bundle'));
        }
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
    if (window.Vapi) return window.Vapi;
  } catch (localErr) {
    console.warn('[Vapi] Local bundle not loaded, trying next source...', localErr.message);
  }

  // 2. Try module import if supported by environment
  try {
    const mod = await import('@vapi-ai/web');
    const VapiClass = mod.default?.default || mod.default || mod.Vapi;
    if (VapiClass) {
      window.Vapi = VapiClass;
      return VapiClass;
    }
  } catch (e) {
    // Ignore and proceed to CDN fallbacks
  }

  // 3. Fallback to valid CDN URLs
  const cdnUrls = [
    'https://unpkg.com/@vapi-ai/web/dist/vapi.js',
    'https://cdn.jsdelivr.net/npm/@vapi-ai/web/dist/vapi.js'
  ];

  for (const url of cdnUrls) {
    try {
      const cls = await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => {
          const v = window.Vapi || window.VapiModule?.default || window.VapiModule;
          if (v) resolve(v);
          else reject(new Error('Vapi not attached to window'));
        };
        script.onerror = reject;
        document.head.appendChild(script);
      });
      if (cls) {
        window.Vapi = cls;
        return cls;
      }
    } catch (e) {
      // try next CDN
    }
  }

  if (!window.Vapi) {
    throw new Error('Vapi Voice SDK could not be loaded. Please check network connectivity or your Vapi configuration.');
  }
  return window.Vapi;
}

export async function fetchVapiConfig() {
  // Check local storage overrides first
  const localKey = localStorage.getItem('vapi_public_key');
  const localAsst = localStorage.getItem('vapi_assistant_id');

  if (localKey && localAsst) {
    currentVapiPublicKey = localKey;
    currentVapiAssistantId = localAsst;
    return {
      publicKey: localKey,
      assistantId: localAsst,
      configured: true,
    };
  }

  // Otherwise check backend server configuration
  try {
    const res = await apiRequest('/ai/vapi-config', { silent: true });
    if (res.success && res.vapiPublicKey && res.vapiAssistantId) {
      currentVapiPublicKey = res.vapiPublicKey;
      currentVapiAssistantId = res.vapiAssistantId;
      return {
        publicKey: res.vapiPublicKey,
        assistantId: res.vapiAssistantId,
        configured: true,
      };
    }
  } catch (e) {
    // ignore
  }

  return {
    publicKey: localKey || '',
    assistantId: localAsst || '',
    configured: Boolean(localKey && localAsst),
  };
}

export function initChatWidget() {
  if (document.getElementById('ai-chat-root')) return;

  const chatContainer = document.createElement('div');
  chatContainer.id = 'ai-chat-root';
  chatContainer.innerHTML = `
    <!-- Floating Launcher Wrap -->
    <div class="voice-launcher-wrap">
      <button class="voice-call-trigger-btn" id="voice-call-trigger" title="Talk with TribalScholar Voice AI">
        <span style="font-size:16px;">🎙️</span>
        <span id="voice-trigger-label"><span class="voice-label-full">Voice Call</span><span class="voice-label-short">Voice</span></span>
      </button>

      <button class="ai-chat-launcher" id="ai-chat-toggle" title="Ask TribalScholar AI Counselor" style="position:static;">
        <span style="font-size:18px;">✨</span>
        <span class="ai-chat-label"><span class="ai-chat-full">Ask TribalScholar AI</span><span class="ai-chat-short">Ask AI</span></span>
      </button>
    </div>

    <!-- Chat Drawer -->
    <div class="ai-chat-drawer" id="ai-chat-drawer">
      <!-- Drawer Header -->
      <div class="ai-chat-header">
        <h3><span>🤖</span> TribalScholar AI Counselor</h3>
        <div style="display:flex;align-items:center;gap:8px;">
          <button id="voice-settings-toggle-btn" title="Vapi Voice Assistant Keys" style="background:rgba(255,255,255,0.2);border:none;color:#fff;border-radius:4px;padding:3px 7px;font-size:12px;cursor:pointer;">
            ⚙️ Vapi Keys
          </button>
          <button id="ai-chat-close" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer;line-height:1;">&times;</button>
        </div>
      </div>

      <!-- Vapi Voice Call Panel (Active when calling) -->
      <div class="voice-panel" id="voice-call-panel">
        <div class="voice-panel-top">
          <div class="voice-status-pill">
            <span class="voice-status-dot" id="voice-status-dot"></span>
            <span id="voice-status-text">Vapi AI Voice Assistant</span>
          </div>
          <span style="font-size:11px;opacity:0.8;" id="voice-timer">00:00</span>
        </div>

        <!-- Waveform Animation -->
        <div class="voice-wave-container" id="voice-wave-container">
          <div class="voice-wave-bar"></div>
          <div class="voice-wave-bar"></div>
          <div class="voice-wave-bar"></div>
          <div class="voice-wave-bar"></div>
          <div class="voice-wave-bar"></div>
          <div class="voice-wave-bar"></div>
          <div class="voice-wave-bar"></div>
        </div>

        <div style="text-align:center;font-size:12px;color:#94a3b8;" id="voice-subtext">
          Listening to your voice query...
        </div>

        <div class="voice-controls-bar">
          <button class="voice-ctrl-btn" id="voice-mute-btn" title="Mute Microphone">
            <span>🎤</span> <span id="voice-mute-label">Mute</span>
          </button>
          <button class="voice-ctrl-btn voice-end-btn" id="voice-hangup-btn" title="End Voice Call">
            <span>🔴</span> <span>End Call</span>
          </button>
        </div>
      </div>

      <!-- Messages Stream -->
      <div class="ai-chat-messages" id="ai-chat-messages">
        <div class="chat-bubble bot">
          <strong>Namaste!</strong> I am your AI Scholarship Counselor for Scheduled Tribe students.
          Ask me anything in text, or click <strong>🎙️ Voice Call</strong> to talk live with me!
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;" id="ai-quick-prompts">
          <button class="btn btn-sm btn-outline" style="font-size:11px;padding:4px 8px;background:#fff;" data-prompt="I am a B.Tech student with family income under ₹2.5 Lakh. Which scholarships can I get?">
            🎓 B.Tech & ₹2.5L Income
          </button>
          <button class="btn btn-sm btn-outline" style="font-size:11px;padding:4px 8px;background:#fff;" data-prompt="What certificates are required to apply for ST scholarships?">
            📄 Required Documents
          </button>
          <button class="btn btn-sm btn-outline" style="font-size:11px;padding:4px 8px;background:#fff;" data-prompt="How long does Institute and Department verification take?">
            ⏱️ Verification Timeline
          </button>
        </div>
      </div>

      <!-- Text Input Form -->
      <form class="ai-chat-input-bar" id="ai-chat-form">
        <button type="button" class="btn btn-sm btn-outline" id="chat-voice-start-btn" title="Start Vapi Voice Call" style="padding:6px 10px;border-color:var(--secondary);color:var(--secondary);">
          🎙️
        </button>
        <input 
          type="text" 
          id="ai-chat-input" 
          class="form-control" 
          placeholder="Ask a question or click 🎙️ to speak..." 
          style="font-size:13px;"
          required 
          autocomplete="off"
        />
        <button type="submit" class="btn btn-secondary btn-sm" id="ai-send-btn">
          Send
        </button>
      </form>
    </div>

    <!-- Vapi Keys Configuration Modal -->
    <div class="modal-overlay" id="vapi-config-modal">
      <div class="modal-container" style="max-width:520px;">
        <div class="modal-header">
          <h3 class="modal-title" style="display:flex;align-items:center;gap:8px;">
            <span>🎙️</span> Vapi Voice Assistance Setup
          </h3>
          <button class="modal-close-btn" onclick="document.getElementById('vapi-config-modal').classList.remove('open')">&times;</button>
        </div>
        <div class="modal-body">
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:14px;line-height:1.5;">
            Configure your <strong>Vapi Public Key</strong> and <strong>Vapi Assistant Key / ID</strong> to enable real-time WebRTC conversational voice assistance.
          </p>

          <form id="vapi-config-form">
            <div class="form-group">
              <label class="form-label" for="vapi-public-key-input">
                Vapi Public Key (Client-Safe) <span class="required">*</span>
              </label>
              <input 
                type="text" 
                id="vapi-public-key-input" 
                class="form-control" 
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000" 
                required 
              />
              <div class="form-hint">Find your Public Key in Vapi Dashboard &rarr; Account / API Keys &rarr; Public Key.</div>
            </div>

            <div class="form-group">
              <label class="form-label" for="vapi-assistant-id-input">
                Vapi Assistant Key / ID <span class="required">*</span>
              </label>
              <input 
                type="text" 
                id="vapi-assistant-id-input" 
                class="form-control" 
                placeholder="e.g. asst_9a8b7c6d5e4f" 
                required 
              />
              <div class="form-hint">Find your Assistant ID in Vapi Dashboard &rarr; Assistants.</div>
            </div>

            <div style="background:#eff6ff;border:1px solid #bfdbfe;padding:10px 14px;border-radius:var(--radius-sm);margin-bottom:16px;font-size:12px;color:#1e40af;">
              💡 <strong>Instant Testing:</strong> Keys are stored safely in your browser session for live testing and are also read from <code>VAPI_PUBLIC_KEY</code> and <code>VAPI_ASSISTANT_ID</code> environment variables.
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
              <button type="button" class="btn btn-outline btn-sm" id="test-browser-voice-btn">
                🔊 Try Browser Speech AI
              </button>
              <div style="display:flex;gap:8px;">
                <button type="button" class="btn btn-outline" onclick="document.getElementById('vapi-config-modal').classList.remove('open')">
                  Cancel
                </button>
                <button type="submit" class="btn btn-primary" id="vapi-save-btn">
                  Save & Connect Call
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(chatContainer);

  const toggleBtn = document.getElementById('ai-chat-toggle');
  const voiceCallTrigger = document.getElementById('voice-call-trigger');
  const chatVoiceStartBtn = document.getElementById('chat-voice-start-btn');
  const voiceSettingsBtn = document.getElementById('voice-settings-toggle-btn');
  const closeBtn = document.getElementById('ai-chat-close');
  const drawer = document.getElementById('ai-chat-drawer');
  const chatForm = document.getElementById('ai-chat-form');
  const chatInput = document.getElementById('ai-chat-input');
  const messagesContainer = document.getElementById('ai-chat-messages');

  const voicePanel = document.getElementById('voice-call-panel');
  const voiceStatusText = document.getElementById('voice-status-text');
  const voiceSubtext = document.getElementById('voice-subtext');
  const voiceWave = document.getElementById('voice-wave-container');
  const voiceMuteBtn = document.getElementById('voice-mute-btn');
  const voiceMuteLabel = document.getElementById('voice-mute-label');
  const voiceHangupBtn = document.getElementById('voice-hangup-btn');
  const configModal = document.getElementById('vapi-config-modal');
  const configForm = document.getElementById('vapi-config-form');
  const publicKeyInput = document.getElementById('vapi-public-key-input');
  const assistantIdInput = document.getElementById('vapi-assistant-id-input');

  let callDurationTimer = null;
  let callSeconds = 0;

  function updateCallTimer() {
    callSeconds++;
    const mins = String(Math.floor(callSeconds / 60)).padStart(2, '0');
    const secs = String(callSeconds % 60).padStart(2, '0');
    const timerEl = document.getElementById('voice-timer');
    if (timerEl) timerEl.innerText = `${mins}:${secs}`;
  }

  // Toggle Drawer
  toggleBtn.addEventListener('click', () => {
    drawer.classList.toggle('open');
    if (drawer.classList.contains('open')) {
      chatInput.focus();
    }
  });

  closeBtn.addEventListener('click', () => {
    drawer.classList.remove('open');
  });

  // Settings Modal Open
  voiceSettingsBtn.addEventListener('click', async () => {
    const cfg = await fetchVapiConfig();
    publicKeyInput.value = cfg.publicKey || '';
    assistantIdInput.value = cfg.assistantId || '';
    configModal.classList.add('open');
  });

  // Save Vapi Configuration
  configForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pk = publicKeyInput.value.trim();
    const asst = assistantIdInput.value.trim();

    if (!pk || !asst) {
      showToast('Please provide both Vapi Public Key and Assistant ID.', 'error');
      return;
    }

    localStorage.setItem('vapi_public_key', pk);
    localStorage.setItem('vapi_assistant_id', asst);
    currentVapiPublicKey = pk;
    currentVapiAssistantId = asst;

    showToast('Vapi keys saved successfully!', 'success');
    configModal.classList.remove('open');

    // Automatically initiate call
    startVapiVoiceCall(pk, asst);
  });

  // Handle Voice Call Initiation
  async function handleVoiceCallClick() {
    drawer.classList.add('open');

    if (isCallActive) {
      stopVoiceCall();
      return;
    }

    const cfg = await fetchVapiConfig();
    if (!cfg.configured) {
      publicKeyInput.value = cfg.publicKey || '';
      assistantIdInput.value = cfg.assistantId || '';
      configModal.classList.add('open');
      showToast('Please enter your Vapi Public Key and Assistant ID to start voice assistance.', 'info');
      return;
    }

    startVapiVoiceCall(cfg.publicKey, cfg.assistantId);
  }

  voiceCallTrigger.addEventListener('click', handleVoiceCallClick);
  chatVoiceStartBtn.addEventListener('click', handleVoiceCallClick);

  // Start Vapi Call
  async function startVapiVoiceCall(publicKey, assistantId) {
    voicePanel.classList.add('active');
    voiceStatusText.innerText = 'Connecting to Vapi Voice...';
    voiceSubtext.innerText = 'Initializing WebRTC voice channel...';
    voiceWave.className = 'voice-wave-container';
    voiceCallTrigger.classList.add('calling');
    document.getElementById('voice-trigger-label').innerText = 'In Call...';

    callSeconds = 0;
    clearInterval(callDurationTimer);
    callDurationTimer = setInterval(updateCallTimer, 1000);

    try {
      const VapiClass = await getVapiSDK();
      if (!VapiClass) {
        throw new Error('Vapi SDK could not be loaded.');
      }

      // Cleanup previous instance if any
      if (vapiInstance) {
        try { vapiInstance.stop(); } catch (e) {}
      }

      vapiInstance = new VapiClass(publicKey);

      // Event handlers
      vapiInstance.on('call-start', () => {
        isCallActive = true;
        voiceStatusText.innerText = 'Vapi Voice Call Active';
        voiceSubtext.innerText = 'Speak your question (e.g., ST scholarship eligibility)...';
        voiceWave.className = 'voice-wave-container';
        showToast('Connected to TribalScholar Voice Assistant!', 'success');
      });

      vapiInstance.on('speech-start', () => {
        voiceWave.className = 'voice-wave-container speaking';
        voiceSubtext.innerText = 'TribalScholar AI is speaking...';
      });

      vapiInstance.on('speech-end', () => {
        voiceWave.className = 'voice-wave-container';
        voiceSubtext.innerText = 'Listening to your response...';
      });

      vapiInstance.on('volume-level', (vol) => {
        if (vol > 0.05) {
          voiceWave.className = 'voice-wave-container speaking';
        }
      });

      vapiInstance.on('message', (msg) => {
        if (!msg) return;

        // Transcript handling
        if (msg.type === 'transcript') {
          const role = msg.transcriptType === 'final' ? (msg.role === 'assistant' ? 'bot' : 'user') : null;
          if (role && msg.transcript) {
            appendChatBubble(role, msg.transcript);
          }
        } else if (msg.type === 'conversation-update' && msg.conversation) {
          const lastMsg = msg.conversation[msg.conversation.length - 1];
          if (lastMsg && lastMsg.content) {
            appendChatBubble(lastMsg.role === 'assistant' ? 'bot' : 'user', lastMsg.content);
          }
        }
      });

      vapiInstance.on('call-end', () => {
        stopVoiceCall();
      });

      vapiInstance.on('error', (err) => {
        console.error('[Vapi Error]', err);
        showToast(err.message || 'Voice connection encountered an error.', 'error');
        stopVoiceCall();
      });

      // Start call with assistant ID
      await vapiInstance.start(assistantId);

    } catch (err) {
      console.error('[Vapi Start Failure]', err);
      showToast(`Voice Call Error: ${err.message || 'Check your Vapi keys'}`, 'error');
      stopVoiceCall();
    }
  }

  // Stop / Hangup Voice Call
  function stopVoiceCall() {
    isCallActive = false;
    isMuted = false;
    clearInterval(callDurationTimer);

    if (vapiInstance) {
      try {
        vapiInstance.stop();
      } catch (e) {}
    }

    voicePanel.classList.remove('active');
    voiceCallTrigger.classList.remove('calling');
    document.getElementById('voice-trigger-label').innerText = 'Voice Call';
    voiceMuteLabel.innerText = 'Mute';

    appendChatBubble('bot', '<em>Voice call ended. You can continue our conversation here in text anytime!</em>');
  }

  voiceHangupBtn.addEventListener('click', stopVoiceCall);

  // Mute / Unmute
  voiceMuteBtn.addEventListener('click', () => {
    if (!vapiInstance) return;
    isMuted = !isMuted;
    try {
      vapiInstance.setMuted(isMuted);
      voiceMuteLabel.innerText = isMuted ? 'Unmute' : 'Mute';
      showToast(isMuted ? 'Microphone muted' : 'Microphone unmuted', 'info');
    } catch (e) {}
  });

  // Native Browser Speech AI Test Option
  document.getElementById('test-browser-voice-btn').addEventListener('click', () => {
    configModal.classList.remove('open');
    startBrowserSpeechAssistant();
  });

  function startBrowserSpeechAssistant() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Speech recognition not supported in this browser.', 'error');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;

    drawer.classList.add('open');
    showToast('Listening... Speak your scholarship query now!', 'info');

    voicePanel.classList.add('active');
    voiceStatusText.innerText = 'Browser Speech AI';
    voiceSubtext.innerText = 'Listening to your microphone...';
    voiceWave.className = 'voice-wave-container speaking';

    recognition.onresult = async (event) => {
      const query = event.results[0][0].transcript;
      voiceWave.className = 'voice-wave-container';
      voiceSubtext.innerText = 'Processing response...';

      // Submit as user chat message
      chatInput.value = query;
      chatForm.dispatchEvent(new Event('submit'));

      // Clean up panel after response
      setTimeout(() => {
        voicePanel.classList.remove('active');
      }, 4000);
    };

    recognition.onerror = () => {
      voicePanel.classList.remove('active');
      showToast('Speech recognition stopped or not heard.', 'info');
    };

    recognition.onend = () => {
      voiceWave.className = 'voice-wave-container';
    };

    recognition.start();
  }

  function appendChatBubble(role, text) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${role}`;
    bubble.innerHTML = text.replace(/\n/g, '<br/>');
    messagesContainer.appendChild(bubble);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Quick Prompts Click
  document.querySelectorAll('#ai-quick-prompts button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const prompt = btn.getAttribute('data-prompt');
      chatInput.value = prompt;
      chatForm.dispatchEvent(new Event('submit'));
    });
  });

  // Text Form Submit
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    appendChatBubble('user', text);
    chatInput.value = '';

    const loadingBubble = document.createElement('div');
    loadingBubble.className = 'chat-bubble bot';
    loadingBubble.innerHTML = '<em>Thinking and checking portal database...</em>';
    messagesContainer.appendChild(loadingBubble);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
      const res = await apiRequest('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: text }),
      });

      loadingBubble.innerHTML = res.reply.replace(/\n/g, '<br/>');

      // If speech synthesis available and user prefers audio reply
      if ('speechSynthesis' in window && isCallActive) {
        const utter = new SpeechSynthesisUtterance(res.reply.replace(/[#*]/g, ''));
        utter.lang = 'en-IN';
        window.speechSynthesis.speak(utter);
      }
    } catch (err) {
      loadingBubble.innerText = 'Unable to fetch response right now. Please try again.';
    }

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initChatWidget();
});

export default {
  initChatWidget,
  fetchVapiConfig,
};
