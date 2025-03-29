    document.addEventListener('DOMContentLoaded', () => {
    const parseButton = document.getElementById('parseButton');
    const parsingStatus = document.getElementById('parsingStatus');
    const searchContainer = document.getElementById('searchContainer');
    const searchInput = document.getElementById('searchQuery');
    const searchButton = document.getElementById('searchButton');
    const resultsDiv = document.getElementById('results');

    parseButton.addEventListener('click', async () => {
        parsingStatus.textContent = 'Checking for page 1...';
        parsingStatus.className = '';
        parseButton.disabled = true;
        searchContainer.style.display = 'none';
        resultsDiv.textContent = '';

        chrome.tabs.query({ url: '*://*.nexusmods.com/*/mods/*?tab=posts*' }, async (tabs) => 
        {
            if (tabs && tabs.length > 0) 
            {
                nexusModsTab = tabs[0];
                if (nexusModsTab)
                    await chrome.tabs.update(nexusModsTab.id, { active: true });

            if (nexusModsTab && nexusModsTab.id) 
            {
                console.log("mod tab");
                const navigationResultArray = await chrome.scripting.executeScript({
                target: { tabId: nexusModsTab.id },
                func: () => {
                const paginationDiv = document.querySelector('div.pagination.clearfix');
                if (paginationDiv) 
                {
                    console.log('Pagination div found:', paginationDiv);
                
                    // Grab the ul.clearfix inside the div.pagination.clearfix
                    const paginationUl = paginationDiv.querySelector('ul.clearfix');
                    if (paginationUl) {
                    console.log('Pagination ul found:', paginationUl);
                
                    // Grab all the list items (li) inside the ul.clearfix
                    const listItems = paginationUl.querySelectorAll('li');
                    console.log('List items:', listItems);
                
                    // Example: Access and click the second list item
                    const secondLiLink = paginationUl.querySelector('li:nth-child(2) a');
                    if (secondLiLink) 
                    {
                        secondLiLink.click();
                        console.log('Clicked the second list item link.');
                    } 
                    else 
                    {
                        console.warn('Second list item link not found.');
                    }
                    } else {
                    console.warn('Pagination ul not found inside the div.');
                    }
                } 
                else 
                {
                    console.warn('Pagination div not found.');
                }
                }});

                await new Promise(resolve => setTimeout(resolve, 2000));
                
                parsingStatus.textContent = 'Parsing...';

                const response = await chrome.tabs.sendMessage(nexusModsTab.id, { action: "parseComments" });

                if (response && response.success) 
                {
                    parsingStatus.className = 'done';
                    parsingStatus.textContent = 'Done';
                    
                } 
                else if (response && !response.success) 
                {
                    parsingStatus.textContent = 'Parsing failed';
                    parsingStatus.className = 'failed';
                } 
                else 
                {
                    parsingStatus.textContent = 'Parsing...';
                    parsingStatus.className = 'parsing';
                }
                parseButton.disabled = true;
                searchContainer.style.display = 'block';
            } 
            else 
            {
                console.error("Error: Could not get tab ID for Nexus Mods page.");
                parsingStatus.textContent = 'Error checking for page 1.';
                parsingStatus.className = 'failed';
                parseButton.disabled = false;
            }
        } 
        else 
        {
            parsingStatus.textContent = 'Error: Nexus Mods comments page not found.';
            parsingStatus.className = 'failed';
            parseButton.disabled = false;
        }
        });
    });
    searchButton.addEventListener('click', async () => {
        const query = searchInput.value.trim();
        if (query) 
        {
        resultsDiv.innerHTML = 'Searching...';
        chrome.tabs.query({ url: '*://*.nexusmods.com/*/mods/*?tab=posts*' }, async (tabs) => {
            if (tabs && tabs.length > 0) 
            {
                const nexusModsTab = tabs[0]; // Assuming the first matching tab is the correct one
                const modId = await chrome.tabs.sendMessage(nexusModsTab.id, { action: "getModId" });
                if (modId) 
                {
                    const storageKey = `mod_${modId}_comments`;
                    chrome.storage.local.get([storageKey], async (storedData) => {
                    const comments = storedData[storageKey] || [];
                    const results = comments.filter(comment =>
                        comment.author.toLowerCase().includes(query.toLowerCase()) ||
                        comment.content.toLowerCase().includes(query.toLowerCase())
                    );
                    resultsDiv.innerHTML = '';
                    if (results.length > 0) 
                    {
                        results.forEach(comment => {
                        const resultItem = document.createElement('div');
                        resultItem.classList.add('result-item');
                        const commentLink = document.createElement('a');
                        commentLink.href = '#';
                        commentLink.innerHTML = `<strong>${comment.author}:</strong> <p class="comment-text">${comment.content}</p>`;
                        commentLink.addEventListener('click', async (event) => {
                            event.preventDefault(); // Prevent the default link behavior

                            const page = comment.page; // The page number for the comment
                            console.log(`Navigating to page ${page}...`);

                            // Inject a script into the page context to call RH_CommentContainer.Send
                            await chrome.scripting.executeScript({
                            target: { tabId: nexusModsTab.id },
                            func: (pageNumber) => {
                                // Execute in the page context
                                if (window.RH_CommentContainer && typeof window.RH_CommentContainer.Send === 'function') {
                                window.RH_CommentContainer.Send('page', pageNumber);
                                console.log(`Navigated to page ${pageNumber}`);
                                } else {
                                console.error('RH_CommentContainer.Send function not found.');
                                }
                            },
                            args: [page], // Pass the page number as an argument
                            world: 'MAIN', // Execute in the page context
                            });
                        });
                        resultItem.appendChild(commentLink);
                        const hr = document.createElement('hr');
                        resultItem.appendChild(hr);
                        resultsDiv.appendChild(resultItem);
                        });
                    } 
                    else 
                        resultsDiv.textContent = 'No comments found matching your query.';
                    });
                } 
                else
                    resultsDiv.textContent = 'Could not determine Mod ID.';
            } 
            else
                resultsDiv.textContent = 'Error: Nexus Mods comments page not found for getting Mod ID.';
            });
        } 
            else 
                resultsDiv.textContent = 'Please enter a search query.';
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "parsingDone") 
        {
            parsingStatus.className = 'done';
            parsingStatus.textContent = 'Done';
            searchContainer.style.display = 'block';
            parseButton.disabled = false;
        } 
        else if (request.action === "parsingFailed") 
        {
            parsingStatus.textContent = 'Parsing failed';
            parsingStatus.className = 'failed';
            searchContainer.style.display = 'none';
            resultsDiv.textContent = '';
            parseButton.disabled = false;
        }
    });
});