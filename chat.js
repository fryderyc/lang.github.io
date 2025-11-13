(function () {
  const config = window.APP_CONFIG || {};
  const openaiApiKey = config.openaiApiKey || '';
  const openaiChatUrl = config.openaiChatUrl || 'https://api.openai.com/v1/chat/completions';
  const openaiModel = config.openaiModel || 'gpt-4o-mini';

  const TranslateApp = window.TranslateApp || {};
  const getCurrentSentence =
    typeof TranslateApp.getCurrentSentence === 'function'
      ? TranslateApp.getCurrentSentence
      : () => '';

  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const chatLog = document.getElementById('chatLog');

  const renderChatMarkdown = (text) => {
    if (!text) {
      return '';
    }

    const escapeHtml = (value) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const formatInline = (value) =>
      escapeHtml(value)
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>');

    const lines = text.replace(/\r\n/g, '\n').split('\n');
    const htmlParts = [];
    let listType = null;
    let insideCodeBlock = false;
    let codeBuffer = [];

    const closeList = () => {
      if (listType === 'ul') {
        htmlParts.push('</ul>');
      } else if (listType === 'ol') {
        htmlParts.push('</ol>');
      }
      listType = null;
    };

    const finalizeCodeBlock = () => {
      if (!insideCodeBlock) {
        return;
      }
      const codeHtml = escapeHtml(codeBuffer.join('\n'));
      htmlParts.push(`<pre><code>${codeHtml}</code></pre>`);
      codeBuffer = [];
      insideCodeBlock = false;
    };

    lines.forEach((rawLine) => {
      const line = rawLine || '';
      if (line.trim().startsWith('```')) {
        if (insideCodeBlock) {
          finalizeCodeBlock();
        } else {
          closeList();
          insideCodeBlock = true;
          codeBuffer = [];
        }
        return;
      }

      if (insideCodeBlock) {
        codeBuffer.push(line);
        return;
      }

      const unorderedMatch = line.match(/^\s*[-*]\s+(.*)$/);
      const orderedMatch = line.match(/^\s*\d+\.\s+(.*)$/);

      if (unorderedMatch) {
        if (listType !== 'ul') {
          closeList();
          htmlParts.push('<ul>');
          listType = 'ul';
        }
        htmlParts.push(`<li>${formatInline(unorderedMatch[1])}</li>`);
        return;
      }

      if (orderedMatch) {
        if (listType !== 'ol') {
          closeList();
          htmlParts.push('<ol>');
          listType = 'ol';
        }
        htmlParts.push(`<li>${formatInline(orderedMatch[1])}</li>`);
        return;
      }

      if (line.trim() === '') {
        closeList();
        htmlParts.push('<br />');
        return;
      }

      closeList();
      htmlParts.push(`<p>${formatInline(line)}</p>`);
    });

    finalizeCodeBlock();
    closeList();

    const html = htmlParts.join('');
    return html || `<p>${formatInline(text)}</p>`;
  };

  const appendMessage = (role, text) => {
    if (!chatLog) {
      return;
    }
    const wrapper = document.createElement('div');
    wrapper.className = `chat-message ${role}`;

    const roleLabel = document.createElement('span');
    roleLabel.className = 'chat-role';
    roleLabel.textContent = role === 'user' ? 'You' : 'Assistant';

    const messageBody = document.createElement('div');
    messageBody.className = 'chat-text';
    messageBody.innerHTML = renderChatMarkdown(text);

    wrapper.append(roleLabel, messageBody);
    chatLog.append(wrapper);
    chatLog.scrollTop = chatLog.scrollHeight;
  };

  const showTypingIndicator = () => {
    if (!chatLog) {
      return () => {};
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'chat-message assistant typing';

    const roleLabel = document.createElement('span');
    roleLabel.className = 'chat-role';
    roleLabel.textContent = 'Assistant';

    const messageBody = document.createElement('div');
    messageBody.className = 'chat-text';

    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'chat-typing';
    typingIndicator.setAttribute('aria-label', 'Assistant is typing');
    typingIndicator.innerHTML = '<span></span><span></span><span></span>';

    messageBody.append(typingIndicator);
    wrapper.append(roleLabel, messageBody);
    chatLog.append(wrapper);
    chatLog.scrollTop = chatLog.scrollHeight;

    return () => {
      wrapper.remove();
    };
  };

  const callOpenAIChat = async (sentence, prompt) => {
    const response = await fetch(openaiChatUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: openaiModel,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              'You are an AI assistant helping users analyze and refine highlighted sentences within an article.',
          },
          {
            role: 'user',
            content: `Highlighted sentence:\n"${sentence}"\n\nUser question:\n${prompt}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const message = payload.error?.message || `HTTP ${response.status} - ${response.statusText}`;
      throw new Error(message);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }
    return content;
  };

  const generateAssistantReply = async (prompt) => {
    const contextSentence = getCurrentSentence();
    if (!contextSentence) {
      return `No sentence is currently highlighted. Your message was: "${prompt}"`;
    }

    if (!openaiApiKey) {
      return `Provide an OpenAI API key in config.js to enable contextual chat.\n\nSentence: "${contextSentence}"\nYour message: "${prompt}"`;
    }

    try {
      const aiResponse = await callOpenAIChat(contextSentence, prompt);
      return aiResponse;
    } catch (error) {
      return `Chat request failed: ${error.message}`;
    }
  };

  const submitChat = () => {
    if (!chatInput) {
      return;
    }
    const value = chatInput.value.trim();
    if (!value) {
      return;
    }

    appendMessage('user', value);
    chatInput.value = '';
    chatInput.focus();

    const hideTypingIndicator = showTypingIndicator();

    generateAssistantReply(value)
      .then((reply) => {
        hideTypingIndicator();
        appendMessage('assistant', reply);
      })
      .catch((error) => {
        hideTypingIndicator();
        appendMessage('assistant', `Chat error: ${error.message}`);
      });
  };

  if (chatForm) {
    chatForm.addEventListener('submit', (event) => {
      event.preventDefault();
      submitChat();
    });
  }

  if (chatInput) {
    chatInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        submitChat();
      }
    });
  }
}());
