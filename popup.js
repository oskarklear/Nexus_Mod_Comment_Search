document.addEventListener('DOMContentLoaded', () => {
  const parseButton = document.getElementById('parseButton');

  parseButton.addEventListener('click', async () => {
    chrome.windows.create({
      url: 'parser_window.html',
      type: 'popup',
      width: 400,
      height: 600
    });
  });
});