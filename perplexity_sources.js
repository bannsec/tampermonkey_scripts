// ==UserScript==
// @name         Perplexity Source Extractor and Text Downloader (Auto)
// @namespace    http://tampermonkey.net/
// @version      0.8
// @description  Extracts, displays, and automatically downloads plain text content from unique source links in Perplexity prompts
// @match        https://www.perplexity.ai/*
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @grant        GM_notification
// ==/UserScript==

(function() {
    'use strict';

    // Create the buttons
    const showButton = createButton('Show Sources', '120px');
    const downloadButton = createButton('Download Text', '10px');

    function createButton(text, right) {
        const button = document.createElement('button');
        button.innerText = text;
        button.style.position = 'fixed';
        button.style.top = '10px';
        button.style.right = right;
        button.style.zIndex = '9999';
        button.style.padding = '5px 10px';
        button.style.backgroundColor = '#4CAF50';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '4px';
        button.style.cursor = 'pointer';
        return button;
    }

    // Function to extract relevant sources with deduplication
    const extractSources = () => {
        const sources = [];
        const uniqueUrls = new Set();
        const sourceElements = document.querySelectorAll('div[class^="prose"] a[target="_blank"]');
        
        sourceElements.forEach((link, index) => {
            if (link.href && !link.href.includes('javascript:') && !uniqueUrls.has(link.href)) {
                uniqueUrls.add(link.href);
                sources.push({ number: index + 1, url: link.href });
            }
        });

        return sources;
    };

    // Function to display sources
    const displaySources = (sources) => {
        let message = 'Unique Sources:\n\n';
        if (sources.length > 0) {
            sources.forEach(source => {
                message += `[${source.number}] ${source.url}\n`;
            });
        } else {
            message = 'No sources found.';
        }
        alert(message);
    };

    // Function to extract text content from HTML
    const extractTextFromHTML = (html) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.innerText || '';
    };

    // Function to download source content
    const downloadSources = (sources) => {
        let downloadedCount = 0;
        sources.forEach((source, index) => {
            setTimeout(() => {
                GM_xmlhttpRequest({
                    method: "GET",
                    url: source.url,
                    onload: function(response) {
                        const textContent = extractTextFromHTML(response.responseText);
                        const blob = new Blob([textContent], {type: 'text/plain'});
                        const url = URL.createObjectURL(blob);
                        
                        GM_download({
                            url: url,
                            name: `Source_${source.number}.txt`,
                            saveAs: false,
                            onload: function() {
                                URL.revokeObjectURL(url);
                                downloadedCount++;
                                if (downloadedCount === sources.length) {
                                    GM_notification({
                                        text: `All ${sources.length} sources have been downloaded as text.`,
                                        title: 'Download Complete',
                                        timeout: 5000
                                    });
                                }
                            }
                        });
                    }
                });
            }, index * 1000); // Delay each download by 1 second to avoid overwhelming the browser
        });
    };

    // Add click event listeners
    showButton.addEventListener('click', function() {
        const sources = extractSources();
        displaySources(sources);
    });

    downloadButton.addEventListener('click', function() {
        const sources = extractSources();
        downloadSources(sources);
    });

    // Function to add the buttons to the page
    const addButtons = () => {
        if (!document.body.contains(showButton)) {
            document.body.appendChild(showButton);
        }
        if (!document.body.contains(downloadButton)) {
            document.body.appendChild(downloadButton);
        }
    };

    // Add the buttons initially
    addButtons();

    // Use MutationObserver to ensure the buttons are always present
    const observer = new MutationObserver(addButtons);
    observer.observe(document.body, { childList: true, subtree: true });
})();
