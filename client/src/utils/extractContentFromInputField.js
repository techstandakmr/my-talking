//extract contents from input file and return content JSON object - start
function extractContentFromInputField(inputRef) {
    const contentArray = []; // Array to store extracted content objects
    let consecutiveBrCount = 0; // Counter for consecutive <br> elements
    let previousWasTextOrEmoji = false; // Flag to track if previous node was text or emoji

    // Recursive function to extract content from a DOM node
    const extractContent = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            // Handle text nodes
            const textContent = node.textContent.trim();
            if (textContent.length > 0) {
                // If there were preceding <br> tags, add newlines accordingly
                if (consecutiveBrCount > 0) {
                    for (let i = 0; i < consecutiveBrCount; i++) {
                        contentArray.push({ type: 'newline' });
                    }
                    consecutiveBrCount = 0; // Reset counter after processing
                }

                // Initialize the text data object with default properties
                const textData = { type: 'text', value: textContent, format: [], isLink: false }; // Add isLink property

                // Regular expression to detect URLs inside the text content
                // const urlRegex = /\b(https?:\/\/)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(\/[^\s]*)?\b/g;
                // const urlRegex = /\b(https?:\/\/)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(:[0-9]{1,5})?(\/[^\s]*)?\b/g;
                // const urlRegex = /^(https?:\/\/|www\.)[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})(\/[^\s]*)?$/;
                const urlRegex = /^(https?:\/\/|www\.)(([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})(\/[^\s]*)?\/?$/;
                const urls = textContent.match(urlRegex);
                console.log("textContent", textContent, urls)
                // If URLs are found, mark the text as a link
                if (urls) {
                    textData.isLink = true; // Mark as link
                } else {
                    textData.isLink = false; // Mark as link
                };

                // Function to check styling of parent elements recursively for formatting
                const checkParentStyles = (element) => {
                    if (!element || element.tagName === 'BODY' || element === inputRef.current) return;

                    // Check for bold formatting by tag or style
                    if (element.tagName === 'B' || element.style.fontWeight === 'bold') {
                        // console.log('b ', element)
                        textData.format.push('bold');
                    }
                    // Check for italic formatting
                    if (element.tagName === 'I' || element.style.fontStyle === 'italic') {
                        textData.format.push('italic');
                    }
                    // Check for underline formatting
                    if (element.tagName === 'U' || element.style.textDecoration.includes('underline')) {
                        textData.format.push('underline');
                    }
                    // Check for strikethrough formatting
                    if (element.style.textDecoration.includes('line-through') || element.tagName === 'STRIKE') {
                        textData.format.push('strikethrough');
                    }
                    // Check for FONT tag styles and add them if present
                    if (element.tagName === 'FONT') {
                        textData.format.push(`${element.style.fontStyle}`);
                        textData.format.push(`${element.style.textDecorationLine}`);
                        textData.format.push(`${element.style.fontWeight}`);
                    };
                    // Check for unordered list formatting
                    if (element.tagName === 'UL') {
                        textData.format.push("unordered-list");
                    };

                    // Adjust spacing before and after text based on sibling nodes (2nd method)
                    if (element.previousSibling && element.previousSibling.nodeType === Node.TEXT_NODE) {
                        textData.value = ' ' + textData.value.trimStart();
                    }
                    if (element.nextSibling && element.nextSibling.nodeType === Node.TEXT_NODE) {
                        textData.value = textData.value.trimEnd() + ' ';
                    }

                    // Stop recursive checking if a space or <br> is found before the current element
                    if (element.previousSibling && element.previousSibling.nodeType === Node.TEXT_NODE && !element.previousSibling.textContent.trim()) {
                        return;
                    }
                    if (element.previousSibling && element.previousSibling.tagName === 'BR') {
                        return;
                    }

                    // Recursively check the parent element's styles
                    checkParentStyles(element.parentElement);
                };

                // Start checking formatting from the text node's parent element
                checkParentStyles(node.parentElement);

                // Add the processed text data to the content array
                contentArray.push(textData);
                previousWasTextOrEmoji = true; // Mark last processed node as text or emoji
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            // Handle element nodes
            if (node.tagName === 'IMG') {
                // If preceding <br> tags exist, add newline objects before emoji
                if (consecutiveBrCount > 0) {
                    for (let i = 0; i < consecutiveBrCount; i++) {
                        contentArray.push({ type: 'newline' });
                    }
                    consecutiveBrCount = 0; // Reset counter after processing
                }
                // Add emoji object with alt text and source URL
                contentArray.push({ type: 'emoji', value: node.getAttribute('alt'), url: node.getAttribute('src') });
                // contentArray.push({ type: 'emoji', value: { src: node.getAttribute('src'), alt: node.getAttribute('alt') } });
                previousWasTextOrEmoji = true; // Mark last processed node as text or emoji
            } else if (node.tagName === 'BR') {
                // Increment count of consecutive <br> elements
                consecutiveBrCount++;
                // If previous node was text or emoji, add a newline and reset
                if (previousWasTextOrEmoji) {
                    contentArray.push({ type: 'newline' });
                    previousWasTextOrEmoji = false;
                    consecutiveBrCount = 0;
                }
            };
        }

        // Recursively process child nodes of the current node
        node.childNodes.forEach(child => extractContent(child));
    };

    // Begin extraction by iterating through the root inputRef's child nodes
    inputRef.current.childNodes.forEach(node => extractContent(node));

    // Remove leading newlines from the content array
    while (contentArray.length > 0 && contentArray[0].type === 'newline') {
        contentArray.shift();
    }
    // Remove trailing newlines from the content array
    while (contentArray.length > 0 && contentArray[contentArray.length - 1].type === 'newline') {
        contentArray.pop();
    };

    // Return the final array of content objects
    return contentArray;
};
export default extractContentFromInputField;
//extract contents from input file and return content JSON object - end
