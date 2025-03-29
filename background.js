chrome.action.onClicked.addListener(() => {
    chrome.windows.create({
      url: 'parser_window.html',
      type: 'popup',
      width: 400,
      height: 600
    });
  });