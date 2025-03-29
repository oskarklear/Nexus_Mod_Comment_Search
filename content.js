function parsePageComments(currentPageNumber) 
{
  const comments = [];
  const commentElements = document.querySelectorAll('.comment');

  commentElements.forEach(element => {
    const authorElement = element.querySelector('.comment-name');
    const contentElement = element.querySelector('.comment-content-text');

    if (authorElement && contentElement) 
    {
      comments.push({
      author: authorElement.textContent.trim(),
      content: contentElement.textContent.trim(),
      page: currentPageNumber // Store the current page number
      });
    }
  });
  return comments;
}

async function getAllComments(modId) 
{
  let allComments = [];
  let currentPageNumber = 1;
  const parsedPages = new Set();
  let parsingSuccessful = true;

  while (true) 
  {
    if (parsedPages.has(currentPageNumber)) {
      console.warn(`Already parsed page ${currentPageNumber}, breaking loop to avoid duplicates.`);
      break;
    }
    parsedPages.add(currentPageNumber);

    console.log("Parsing page:", currentPageNumber);
    const currentPageComments = parsePageComments(currentPageNumber);
    console.log(`Found ${currentPageComments.length} comments on page ${currentPageNumber}`);
    allComments = allComments.concat(currentPageComments);

    const currentPageElement = document.querySelector('.pagination ul.clearfix li a.page-selected.mfp-prevent-close');
    if (!currentPageElement) {
      console.error("Could not find the currently selected page element. Stopping parsing.");
      parsingSuccessful = false;
      break;
    }
    const currentPage = parseInt(currentPageElement.textContent);
    const nextPage = currentPage + 1;

    const nextNavLink = document.querySelector(`.pagination ul.clearfix li a[onclick="return window.RH_CommentContainer.Send('page', '${nextPage}');"]`);

    if (nextNavLink) 
    {
      console.log("Attempting to go to page:", nextPage);
      nextNavLink.click();
      currentPageNumber = nextPage;
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for page load
    } else {
      console.log("No link found for the next page. Assuming this is the last page.");
      break;
    }

    if (currentPageNumber > 500 || allComments.length > 1000) {
      console.warn("Reached a safety limit, stopping.");
      parsingSuccessful = false;
      break;
    }
  }

  console.log("All comments parsed:", allComments.length);
  const storageKey = `mod_${modId}_comments`;
  chrome.storage.local.set({ [storageKey]: allComments }, () => {
    if (parsingSuccessful) {
      chrome.runtime.sendMessage({ action: "parsingDone" });
    } else {
      chrome.runtime.sendMessage({ action: "parsingFailed" });
    }
  });
  return parsingSuccessful;
}

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === "parseComments") {
    const modId = window.location.pathname.split('/')[3];
    const success = await getAllComments(modId);
    sendResponse({ success: success });
  } else if (request.action === "getModId") {
    const modId = window.location.pathname.split('/')[3];
    sendResponse(modId);
  } else if (request.action === "goToCommentPage") {
    const pageNumber = request.page;
    console.log("Attempting to jump to comment page:", pageNumber);

    // Find the "Jump" button element
    const jumpButton = document.querySelector('.select2-selection.select2-selection--single');
    if (jumpButton) {
      console.log("Found the 'Jump' button, setting aria-expanded to true.");
      jumpButton.setAttribute('aria-expanded', 'true');
      // Wait a short time for the input field to appear
      await new Promise(resolve => setTimeout(resolve, 500));
    } else {
      console.error("Could not find the 'Jump' button.");
      return;
    }

    // Find the page number input field
    const pageInput = document.querySelector('input.select2-search__field[type="search"]');

    if (pageInput) {
      console.log("Found the page number input field.");
      pageInput.value = pageNumber;
      const inputEvent = new Event('input', { bubbles: true, cancelable: false });
      pageInput.dispatchEvent(inputEvent);
      pageInput.focus();
      pageInput.blur();
    } else {
      console.error("Could not find the page number input field after setting aria-expanded.");
      // Let's try a slightly different selector in case the class changes
      const fallbackInput = document.querySelector('.select2-search__field');
      if (fallbackInput) {
        console.log("Found fallback input field (no type='search').");
        fallbackInput.value = pageNumber;
        const inputEvent = new Event('input', { bubbles: true, cancelable: false });
        fallbackInput.dispatchEvent(inputEvent);
        fallbackInput.focus();
        fallbackInput.blur();
      } else {
        console.error("Could not find any search input field after setting aria-expanded.");
      }
    }
  }
});