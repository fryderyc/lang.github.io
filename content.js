(function () {
  const config = window.APP_CONFIG || {};
  const confirmContentButton = document.getElementById('confirmContent');
  const contentArea = document.getElementById('contentArea');
  const contentDisplay = document.getElementById('contentDisplay');
  const googleApiKey = config.googleApiKey || '';
  const googleTranslateEndpoint =
    config.googleTranslationUrl || 'https://translation.googleapis.com/language/translate/v2';
  const targetLanguages = (config.translationTargets || ['fr', 'es']).slice(0, 2);
  const translationLabels =
    (config.translationLabels && config.translationLabels.slice(0, 2)) ||
    targetLanguages.map((lang) => lang.toUpperCase());

  const createSentenceList = (input) => {
    const normalized = input.replace(/\r\n?/g, '\n').trim();
    if (!normalized) {
      return [];
    }

    const paragraphs = normalized.split(/\n+/);
    const sentences = [];

    paragraphs.forEach((block) => {
      const trimmedBlock = block.trim();
      if (!trimmedBlock) {
        return;
      }

      const matches = trimmedBlock.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
      if (matches) {
        matches.forEach((part) => {
          const sentence = part.trim();
          if (sentence) {
            sentences.push(sentence);
          }
        });
      } else {
        sentences.push(trimmedBlock);
      }
    });

    return sentences;
  };

  let sentenceButtons = [];
  let activeSentenceIndex = -1;
  let contentLocked = false;
  const translationTargets = {
    first: document.getElementById('translationText1'),
    second: document.getElementById('translationText2'),
  };
  const translationTitles = {
    first: document.getElementById('translationTitle1'),
    second: document.getElementById('translationTitle2'),
  };
  let translationRequestId = 0;
  const translationCache = new Map();

  const updateTranslationPanels = (result, { title1, title2 } = {}) => {
    if (translationTitles.first && title1) {
      translationTitles.first.textContent = title1;
    }
    if (translationTitles.second && title2) {
      translationTitles.second.textContent = title2;
    }
    if (translationTargets.first) {
      translationTargets.first.textContent = result.first;
    }
    if (translationTargets.second) {
      translationTargets.second.textContent = result.second;
    }
  };

  const setTranslationState = (message) => {
    updateTranslationPanels(
      {
        first: message,
        second: message,
      },
      {
        title1: translationLabels[0] || targetLanguages[0] || 'Translated Text 1',
        title2: translationLabels[1] || targetLanguages[1] || 'Translated Text 2',
      },
    );
  };

  const getCacheKey = (sentence, language) => `${language}::${sentence}`;

  const callGoogleTranslate = async (sentence, targetLanguage) => {
    const cacheKey = getCacheKey(sentence, targetLanguage);
    if (translationCache.has(cacheKey)) {
      return translationCache.get(cacheKey);
    }

    const response = await fetch(
      `${googleApiKey ? `${googleTranslateEndpoint}?key=${googleApiKey}` : googleTranslateEndpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: sentence,
          target: targetLanguage,
          format: 'text',
        }),
      },
    );

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const errorMessage =
        payload.error?.message || `HTTP ${response.status} - ${response.statusText}`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const translation = data?.data?.translations?.[0]?.translatedText;
    if (!translation) {
      throw new Error('No translation returned by API');
    }
    translationCache.set(cacheKey, translation);
    return translation;
  };

  const translateSentence = async (sentence, index) => {
    if (!sentence) {
      return;
    }

    const currentRequest = ++translationRequestId;

    if (!googleApiKey) {
      setTranslationState('Provide a Google API key in config.js to enable translations.');
      return;
    }

    if (!targetLanguages.length) {
      setTranslationState('No target languages configured in config.js.');
      return;
    }

    setTranslationState('Translating sentence...');

    try {
      const translations = await Promise.all(
        targetLanguages.map((languageCode) => callGoogleTranslate(sentence, languageCode)),
      );

      if (currentRequest === translationRequestId) {
        const firstTranslation = translations[0] || 'No translation available.';
        const secondTranslation =
          translations[1] || 'Add a second target language in config.js to populate this panel.';

        updateTranslationPanels(
          {
            first: firstTranslation,
            second: secondTranslation,
          },
          {
            title1: translationLabels[0] || targetLanguages[0] || 'Translated Text 1',
            title2: translationLabels[1] || targetLanguages[1] || 'Translated Text 2',
          },
        );
      }
    } catch (error) {
      if (currentRequest === translationRequestId) {
        updateTranslationPanels(
          {
            first: `Translation failed: ${error.message}`,
            second: 'Please try again.',
          },
          {
            title1: translationLabels[0] || targetLanguages[0] || 'Translated Text 1',
            title2: translationLabels[1] || targetLanguages[1] || 'Translated Text 2',
          },
        );
      }
    }
  };

  const syncSentenceButtons = () => {
    if (!contentDisplay) {
      sentenceButtons = [];
      return;
    }
    sentenceButtons = Array.from(contentDisplay.querySelectorAll('.content-sentence'));
  };

  const setActiveSentence = (
    nextIndex,
    { focusButton = false, scrollIntoView = true } = {},
  ) => {
    if (!sentenceButtons.length) {
      activeSentenceIndex = -1;
      return;
    }
    if (nextIndex < 0 || nextIndex >= sentenceButtons.length) {
      return;
    }
    sentenceButtons.forEach((button) => button.classList.remove('content-sentence-active'));
    const target = sentenceButtons[nextIndex];
    target.classList.add('content-sentence-active');
    activeSentenceIndex = nextIndex;
    if (scrollIntoView) {
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    translateSentence(target.dataset.sentence || target.textContent, Number(target.dataset.index));
    if (focusButton) {
      target.focus();
    }
  };

  const moveSentenceHighlight = (delta) => {
    if (!sentenceButtons.length) {
      return;
    }
    if (activeSentenceIndex === -1) {
      setActiveSentence(delta > 0 ? 0 : sentenceButtons.length - 1);
      return;
    }
    const nextIndex = Math.min(
      sentenceButtons.length - 1,
      Math.max(0, activeSentenceIndex + delta),
    );
    setActiveSentence(nextIndex);
  };

  const renderContent = (text) => {
    if (!contentDisplay) {
      return;
    }
    const fragment = document.createDocumentFragment();
    const sentences = createSentenceList(text);
    if (!sentences.length) {
      const emptyState = document.createElement('p');
      emptyState.textContent = 'No content available.';
      fragment.append(emptyState);
    } else {
      sentences.forEach((sentence, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'content-sentence';
        button.dataset.sentence = sentence;
        button.dataset.index = String(index);
        button.textContent = sentence;
        fragment.append(button);
      });
    }
    contentDisplay.innerHTML = '';
    contentDisplay.append(fragment);
    syncSentenceButtons();
    if (sentenceButtons.length) {
      setActiveSentence(0);
    } else {
      activeSentenceIndex = -1;
    }
  };

  const lockContent = () => {
    if (!contentArea || !contentDisplay || !confirmContentButton) {
      return;
    }
    if (!contentArea.value.trim()) {
      contentArea.focus();
      return;
    }
    renderContent(contentArea.value);
    contentArea.readOnly = true;
    contentArea.classList.add('content-area-locked');
    contentArea.hidden = true;
    contentDisplay.hidden = false;
    confirmContentButton.textContent = 'Unload';
    contentLocked = true;
    contentDisplay.focus();
  };

  const unlockContent = () => {
    if (!contentArea || !contentDisplay || !confirmContentButton) {
      return;
    }
    contentArea.hidden = false;
    contentDisplay.hidden = true;
    contentArea.readOnly = false;
    contentArea.classList.remove('content-area-locked');
    confirmContentButton.textContent = 'Load';
    contentLocked = false;
    activeSentenceIndex = -1;
    contentArea.focus();
  };

  if (confirmContentButton) {
    confirmContentButton.addEventListener('click', () => {
      if (contentLocked) {
        unlockContent();
      } else {
        lockContent();
      }
    });
  }

  if (contentDisplay) {
    contentDisplay.addEventListener('click', (event) => {
      const sentenceButton = event.target.closest('.content-sentence');
      if (!sentenceButton) {
        return;
      }
      const nextIndex = Number(sentenceButton.dataset.index);
      setActiveSentence(nextIndex, { focusButton: true });
      console.log(
        `Sentence clicked (index ${sentenceButton.dataset.index}): ${sentenceButton.dataset.sentence}`,
      );
    });

    contentDisplay.addEventListener('keydown', (event) => {
      if (!contentLocked) {
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveSentenceHighlight(1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveSentenceHighlight(-1);
      }
    });
  }

  const getCurrentSentence = () => {
    if (activeSentenceIndex === -1 || !sentenceButtons[activeSentenceIndex]) {
      return '';
    }
    return sentenceButtons[activeSentenceIndex].dataset.sentence || '';
  };

  const TranslateApp = (window.TranslateApp = window.TranslateApp || {});
  TranslateApp.getCurrentSentence = getCurrentSentence;
}());
