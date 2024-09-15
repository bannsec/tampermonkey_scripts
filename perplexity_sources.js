  
// ==UserScript==
// @name         Perplexity Source Extractor and Text Downloader (Auto)
// @namespace    http://tampermonkey.net/
// @version      1.14
// @description  Extracts and downloads text content from unique source links in Perplexity prompts. Adds a button to copy the output to the clipboard instead of downloading.
// @author       Your Name
// @match        https://www.perplexity.ai/*
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @grant        GM_notification
// @grant        GM_setClipboard
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js
// @require      https://unpkg.com/@mozilla/readability@0.5.0/Readability.js
// @license      MIT
// @homepageURL  https://github.com/bannsec/tampermonkey_scripts
// @supportURL   https://github.com/bannsec/tampermonkey_scripts/issues
// @updateURL    https://github.com/bannsec/tampermonkey_scripts/raw/main/perplexity_sources.js
// @downloadURL  https://github.com/bannsec/tampermonkey_scripts/raw/main/perplexity_sources.js
// @connect      *
// ==/UserScript==

(function() {
    'use strict';

    // Create the buttons
    const showButton = createButton('Show Sources', '120px');
    const downloadButton = createButton('Download Text', '10px');
    const copyButton = createButton('Copy to Clipboard', '240px');

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
        showToast('Extracting sources');
        const sources = [];
        const uniqueUrls = new Set();
        const sourceElements = document.querySelectorAll('div[class^="prose"] a[target="_blank"]');
        
        try {
            sourceElements.forEach((link, index) => {
                if (link.href && !link.href.includes('javascript:') && !uniqueUrls.has(link.href)) {
                    uniqueUrls.add(link.href);
                    sources.push({ number: index + 1, url: link.href });
                }
            });
        } catch (error) {
            showToast('Error extracting sources: ' + error.message);
        }

        showToast('Sources extracted');
        return sources;
    };

    // Function to create and display the modal
    const createModal = (sources) => {
        // Create modal elements
        const modal = document.createElement('div');
        const modalContent = document.createElement('div');
        const closeButton = document.createElement('span');
        const sourceList = document.createElement('ul');

        // Set modal styles
        modal.style.display = 'block';
        modal.style.position = 'fixed';
        modal.style.zIndex = '10000';
        modal.style.left = '0';
        modal.style.top = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.overflow = 'auto';
        modal.style.backgroundColor = 'rgba(0,0,0,0.4)';

        // Set modal content styles
        modalContent.style.backgroundColor = '#333'; // Darker background color for better contrast
        modalContent.style.color = '#f1f1f1'; // Lighter text color for better readability
        modalContent.style.margin = '15% auto';
        modalContent.style.padding = '20px';
        modalContent.style.border = '1px solid #888';
        modalContent.style.width = '80%';

        // Set close button styles
        closeButton.style.color = '#f1f1f1'; // Updated close button color to maintain contrast
        closeButton.style.float = 'right';
        closeButton.style.fontSize = '28px';
        closeButton.style.fontWeight = 'bold';
        closeButton.innerHTML = '&times;';

        // Add close button event listener
        closeButton.onclick = () => {
            modal.style.display = 'none';
        };

        // Add sources to the list
        sources.forEach(source => {
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            link.href = source.url;
            link.innerText = `[${source.number}] ${source.url}`;
            link.style.cursor = 'pointer';
            link.onclick = (e) => {
                e.preventDefault();
                navigator.clipboard.writeText(source.url).then(() => {
                    showToast('URL copied to clipboard');
                });
            };
            listItem.appendChild(link);
            sourceList.appendChild(listItem);
        });

        // Append elements to modal content
        modalContent.appendChild(closeButton);
        modalContent.appendChild(sourceList);

        // Append modal content to modal
        modal.appendChild(modalContent);

        // Append modal to body
        document.body.appendChild(modal);
    };

    // Function to display sources
    const displaySources = (sources) => {
        if (sources.length > 0) {
            createModal(sources);
        } else {
            showToast('No sources found.');
        }
    };

    // Function to extract text content from HTML
    const extractTextFromHTML = (html) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const documentClone = doc.cloneNode(true);
        const article = new Readability(documentClone).parse();
        return article ? article.textContent || '' : '';
    };

    // Function to download source content
    const downloadSources = (sources) => {
        showToast('Downloading sources');
        console.log('downloadSources function called');
        let combinedText = '';
        let downloadedCount = 0;

        const isAndroid = /Android/i.test(navigator.userAgent);

        sources.forEach((source, index) => {
            try {
                GM_xmlhttpRequest({
                    method: "GET",
                    url: source.url,
                    headers: {
                        "Origin": source.url
                    },
                    onload: function(response) {
                        showToast('Source downloaded');
                        console.log('GM_xmlhttpRequest onload callback triggered');
                        const textContent = extractTextFromHTML(response.responseText);
                        if (textContent) {
                            combinedText += `\n\n--- Source ${source.number} ---\n\n${textContent}`;
                        }
                        downloadedCount++;
                        if (downloadedCount === sources.length) {
                            const blob = new Blob([combinedText], {type: 'text/plain'});
                            const url = URL.createObjectURL(blob);
                            
                            if (isAndroid) {
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = 'Combined_Sources.txt';
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                                GM_notification({
                                    text: `All ${sources.length} sources have been downloaded as a single text file.`,
                                    title: 'Download Complete',
                                    timeout: 5000
                                });
                            } else {
                                GM_download({
                                    url: url,
                                    name: 'Combined_Sources.txt',
                                    saveAs: false,
                                    onload: function() {
                                        console.log('GM_download onload callback triggered');
                                        URL.revokeObjectURL(url);
                                        GM_notification({
                                            text: `All ${sources.length} sources have been downloaded as a single text file.`,
                                            title: 'Download Complete',
                                            timeout: 5000
                                        });
                                    },
                                    onerror: function(error) {
                                        GM_notification({
                                            text: `Error downloading combined sources: ${error.message}`,
                                            title: 'Download Error',
                                            timeout: 5000
                                        });
                                    }
                                });
                            }
                        }
                    },
                    onerror: function(error) {
                        GM_notification({
                            text: `Error downloading source ${source.number}: ${error.message}`,
                            title: 'Download Error',
                            timeout: 5000
                        });
                    },
                    onabort: function() {
                        GM_notification({
                            text: `Download aborted for source ${source.number}.`,
                            title: 'Download Aborted',
                            timeout: 5000
                        });
                    },
                    ontimeout: function() {
                        GM_notification({
                            text: `Download timed out for source ${source.number}.`,
                            title: 'Download Timeout',
                            timeout: 5000
                        });
                    }
                });
            } catch (error) {
                GM_notification({
                    text: `Error initiating download for source ${source.number}: ${error.message}`,
                    title: 'Download Error',
                    timeout: 5000
                });
            }
        });
    };

    // Function to copy source content to clipboard
    const copySourcesToClipboard = (sources) => {
        console.log('copySourcesToClipboard function called');
        let combinedText = '';
        let copiedCount = 0;

        sources.forEach((source, index) => {
            try {
                GM_xmlhttpRequest({
                    method: "GET",
                    url: source.url,
                    headers: {
                        "Origin": source.url
                    },
                    onload: function(response) {
                        console.log('GM_xmlhttpRequest onload callback triggered');
                        const textContent = extractTextFromHTML(response.responseText);
                        combinedText += `\n\n--- Source ${source.number} ---\n\n${textContent}`;
                        copiedCount++;
                        if (copiedCount === sources.length) {
                            GM_setClipboard(combinedText);
                            GM_notification({
                                text: `All ${sources.length} sources have been copied to the clipboard.`,
                                title: 'Copy Complete',
                                timeout: 5000
                            });
                        }
                    },
                    onerror: function(error) {
                        GM_notification({
                            text: `Error copying source ${source.number}: ${error.message}`,
                            title: 'Copy Error',
                            timeout: 5000
                        });
                    },
                    onabort: function() {
                        GM_notification({
                            text: `Copy aborted for source ${source.number}.`,
                            title: 'Copy Aborted',
                            timeout: 5000
                        });
                    },
                    ontimeout: function() {
                        GM_notification({
                            text: `Copy timed out for source ${source.number}.`,
                            title: 'Copy Timeout',
                            timeout: 5000
                        });
                    }
                });
            } catch (error) {
                GM_notification({
                    text: `Error initiating copy for source ${source.number}: ${error.message}`,
                    title: 'Copy Error',
                    timeout: 5000
                });
            }
        });
    };

    // Add click event listeners
    showButton.addEventListener('click', function() {
        const sources = extractSources();
        displaySources(sources);
    });

    downloadButton.addEventListener('click', function() {
        showToast('Download button clicked');
        console.log('Download button clicked');
        const sources = extractSources();
        downloadSources(sources);
    });

    copyButton.addEventListener('click', function() {
        console.log('Copy button clicked');
        const sources = extractSources();
        copySourcesToClipboard(sources);
    });

    // Function to add the buttons to the page
    const addButtons = () => {
        if (!document.body.contains(showButton)) {
            document.body.appendChild(showButton);
        }
        if (!document.body.contains(downloadButton)) {
            document.body.appendChild(downloadButton);
        }
        if (!document.body.contains(copyButton)) {
            document.body.appendChild(copyButton);
        }
    };

    // Add the buttons initially
    addButtons();

    // Use MutationObserver to ensure the buttons are always present
    const observer = new MutationObserver(addButtons);
    observer.observe(document.body, { childList: true, subtree: true });

    // Function to create and display a toast notification
    function showToast(message) {
        const toast = document.createElement('div');
        toast.innerText = message;
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.backgroundColor = '#333';
        toast.style.color = '#fff';
        toast.style.padding = '10px 20px';
        toast.style.borderRadius = '5px';
        toast.style.zIndex = '10000';
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // Add CSS styles for the toast notification
    const style = document.createElement('style');
    style.innerHTML = `
        .toast {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #333;
            color: #fff;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 10000;
        }
    `;
    document.head.appendChild(style);
})();
