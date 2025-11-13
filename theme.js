(function () {
  const picker = document.getElementById('themePicker');
  const themes = [
    'theme-light',
    'theme-dark',
    'theme-ocean',
    'theme-autumn',
    'theme-forest',
    'theme-sunset',
    'theme-slate',
  ];
  const body = document.body;

  const applyTheme = (theme) => {
    themes.forEach((name) => body.classList.remove(name));
    body.classList.add(theme);
  };

  if (picker) {
    picker.addEventListener('change', (event) => {
      applyTheme(event.target.value);
    });
    applyTheme(picker.value);
  }
}());
