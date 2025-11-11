window.APP_CONFIG = window.APP_CONFIG || {
  // Provide your Google Cloud Translation API key below.
  googleApiKey: '',
  googleTranslationUrl: '',
  // Provide your OpenAI API key below for chat functionality.
  openaiApiKey: '',
  openaiChatUrl: '',
  openaiModel: 'gpt-4o-mini',
  // Languages to translate into (ISO-639-1 codes). Only the first two will be used for now.
  translationTargets: ['en', 'zh-tw'],
  // Optional labels to display next to translations; falls back to language codes.
  translationLabels: ['English', 'Chinese'],
};
