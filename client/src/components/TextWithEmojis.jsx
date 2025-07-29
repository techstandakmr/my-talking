
// Functional component to display parsed text data with emojis
function TextWithEmojis({ textData, textWidth, hide, isSearching,areaName }) {
    // 'hide' will truncate the text if it's too long
    // 'textWidth' defines the maximum width of the container
    // areaName is the class of parent element where it is used
    // 'isSearching' is currently unused but could be useful for conditional styling or behavior
    // Safe JSON parser that returns empty array if parsing fails
    const safeParseJSON = (value, fallback = []) => {
        try {
            return typeof value === "string" ? JSON.parse(value) : value;
        } catch (e) {
            return fallback;
        }
    };
    let parsedData = safeParseJSON(textData);

    return (
        // Container for displaying text and emojis with optional truncation
        <div style={{ width: 'auto', maxWidth: `${textWidth}` }} className={`textWithEmojis ${hide && "truncate"} inline-block ${areaName}`}>
            {
                // Loop through parsed content array to render each part (emoji or text)
                parsedData?.map((part, partIdx) => {
                    if (part?.type === 'emoji') {
                        // Render emoji image
                        return (
                            <img
                                className={`${part?.usedFor == "profilePic" && "rounded-full h-14 w-14 "} not_prevent_select emoji_img mx-0.5`}
                                key={partIdx}
                                src={part?.url}
                                alt={part?.value || "emoji"}
                            />
                        );
                    } else if (part?.type === 'text') {
                        // Render text span, possibly highlighted
                        return (
                            <span
                                key={partIdx}
                                className={`${part?.highlight ? 'highlight' : ''} mx-0.5 infoText`}
                            >
                                {part?.value}
                            </span>
                        );
                    }

                    // If part type is neither emoji nor text, skip rendering
                    return null;
                })}
        </div>
    );
}

export default TextWithEmojis
