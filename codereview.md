# Code Review: Perplexity Source Extractor and Text Downloader (Auto)

## Summary of the Script's Purpose and Functionality

The script, named "Perplexity Source Extractor and Text Downloader (Auto)", is designed to extract, display, and automatically download plain text content from unique source links in Perplexity prompts. The script operates on the `https://www.perplexity.ai/*` domain and provides two main functionalities:

1. **Show Sources**: Extracts and displays unique source links found in Perplexity prompts.
2. **Download Text**: Downloads the plain text content from the extracted source links.

The script uses the following Tampermonkey metadata tags:
- `@name`: The name of the script.
- `@namespace`: The namespace of the script.
- `@version`: The version of the script.
- `@description`: A short description of the script.
- `@match`: The URL pattern where the script should run.
- `@grant`: Permissions required by the script, including `GM_xmlhttpRequest`, `GM_download`, and `GM_notification`.

## Potential Issues and Areas for Improvement

1. **Performance**: The script uses a 1-second delay between each download to avoid overwhelming the browser. This approach may not be efficient for a large number of sources.
2. **User Experience**: The script uses `alert` to display the sources, which can be intrusive. A more user-friendly approach would be to display the sources in a modal or a dedicated section on the page.
3. **Code Structure**: The script could benefit from better modularization. For example, the button creation and event listener setup could be separated into different functions for better readability and maintainability.

## Best Practices and Optimizations

1. **Error Handling**: Implement error handling for network requests and content extraction. Use `try-catch` blocks and provide user feedback in case of errors.
2. **Performance Optimization**: Consider using asynchronous functions and `Promise.all` to handle multiple network requests concurrently, which can improve performance.
3. **User Experience**: Replace `alert` with a more user-friendly approach, such as displaying the sources in a modal or a dedicated section on the page.
4. **Code Modularization**: Refactor the script to separate concerns and improve readability. For example, create separate functions for button creation, event listener setup, source extraction, and content download.

## Error Handling Implementation Details

The script now includes comprehensive error handling to ensure proper functionality and user feedback. The following changes have been made:

1. **Network Request Error Handling**: Added `try-catch` blocks in the `downloadSources` function to handle errors during network requests. User feedback is provided using `GM_notification`.
2. **Content Extraction Error Handling**: Added `try-catch` blocks in the `extractSources` function to handle errors during content extraction. User feedback is provided using `alert`.

### Example Code Snippets

#### Network Request Error Handling

```javascript
const downloadSources = (sources) => {
    let downloadedCount = 0;
    sources.forEach((source, index) => {
        setTimeout(() => {
            try {
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
                    },
                    onerror: function(error) {
                        GM_notification({
                            text: `Error downloading source ${source.number}: ${error.message}`,
                            title: 'Download Error',
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
        }, index * 1000); // Delay each download by 1 second to avoid overwhelming the browser
    });
};
```

#### Content Extraction Error Handling

```javascript
const extractSources = () => {
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
        alert('Error extracting sources: ' + error.message);
    }

    return sources;
};
```

## References

- [Tampermonkey Documentation](https://www.tampermonkey.net/documentation.php?locale=en)
