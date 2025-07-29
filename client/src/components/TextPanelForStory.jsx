import EmojiPicker from 'emoji-picker-react';
import  { useContext, useEffect, useRef, useState } from 'react'
import { BiBold, BiFontColor, BiItalic, BiListUl, BiSolidPalette, BiStrikethrough, BiUnderline } from 'react-icons/bi'
import { BsArrowLeft, BsSend } from 'react-icons/bs'
import { HiOutlineBan } from 'react-icons/hi';
import { HiMiniChevronDown, HiFaceSmile } from 'react-icons/hi2'
import { UserContext } from '@context/UserContext';
import { ConfirmationDialog } from "./index.js";
import { extractContentFromInputField } from "@utils";
function TextPanelForStory({
    setShowTextPanelForStory,
    targetStoryForReplyOrEdit
}) {
    const {
        insertEmojiIntoInputField,
        handleInputDirection,
        printTextIn_InputField,
        setTextStoryReadyToSend,
        safeParseJSON
    } = useContext(UserContext);

    // Array of solid color text backgrounds with associated font colors
    let colorsText = [
        { type: 'solid_color', background: 'rgb(250,175,168)', color: 'white' },
        { type: 'solid_color', background: 'rgb(243,159,118)', color: 'white' },
        { type: 'solid_color', background: 'rgb(255,248,184)', color: 'black' },
        { type: 'solid_color', background: 'rgb(226,246,211)', color: 'black' },
        { type: 'solid_color', background: 'rgb(180,221,211)', color: 'black' },
        { type: 'solid_color', background: 'rgb(212,228,237)', color: 'black' },
        { type: 'solid_color', background: 'rgb(174,204,220)', color: 'black' },
        { type: 'solid_color', background: 'rgb(211,191,219)', color: 'black' },
        { type: 'solid_color', background: 'rgb(246,226,221)', color: 'black' },
        { type: 'solid_color', background: 'rgb(239,239,241)', color: 'black' }
    ];

    // Array of image-based text backgrounds with associated font colors
    const textBgNames = [
        { type: 'image', background: 'background1.png', color: 'white' },
        { type: 'image', background: 'background2.png', color: 'black' },
        { type: 'image', background: 'background3.png', color: 'black' },
        { type: 'image', background: 'background4.png', color: 'white' },
        { type: 'image', background: 'background5.png', color: 'black' },
        { type: 'image', background: 'background6.png', color: 'black' },
        { type: 'image', background: 'background7.png', color: 'black' },
        { type: 'image', background: 'background8.png', color: 'black' },
        { type: 'image', background: 'background9.png', color: 'white' },
        { type: 'image', background: 'background10.png', color: 'black' },
        { type: 'image', background: 'background11.png', color: 'black' },
        { type: 'image', background: 'background12.png', color: 'black' },
        { type: 'image', background: 'background13.png', color: 'black' },
        { type: 'image', background: 'background14.png', color: 'black' },
        { type: 'image', background: 'background15.png', color: 'black' },
        { type: 'image', background: 'background16.png', color: 'black' },
        { type: 'image', background: 'background17.jpg', color: 'black' },
        { type: 'image', background: 'background18.png', color: 'black' },
        { type: 'image', background: 'background19.jpg', color: 'black' },
        { type: 'image', background: 'background20.png', color: 'black' },
        { type: 'image', background: 'background21.png', color: 'black' },
        { type: 'image', background: 'background22.png', color: 'black' },
        { type: 'image', background: 'background23.png', color: 'black' },
        { type: 'image', background: 'background24.png', color: 'black' },
        { type: 'image', background: 'background25.png', color: 'black' },
        { type: 'image', background: 'background26.png', color: 'white' },
        { type: 'image', background: 'background27.png', color: 'white' },
        { type: 'image', background: 'background28.png', color: 'black' },
        { type: 'image', background: 'background29.png', color: 'black' },
        { type: 'image', background: 'background30.png', color: 'black' },
        { type: 'image', background: 'background31.png', color: 'black' },
        { type: 'image', background: 'background32.png', color: 'black' },
        { type: 'image', background: 'background33.png', color: 'black' },
        { type: 'image', background: 'background34.png', color: 'black' },
        { type: 'image', background: 'background35.png', color: 'black' },
        { type: 'image', background: 'background36.png', color: 'black' },
        { type: 'image', background: 'background37.png', color: 'black' },
        { type: 'image', background: 'background38.png', color: 'black' },
        { type: 'image', background: 'background39.png', color: 'black' },
        { type: 'image', background: 'background40.png', color: 'black' },
        { type: 'image', background: 'background41.jpg', color: 'black' }
    ];

    // State to manage the currently selected text background style
    const [currentTextBackground, setCurrentTextBackground] = useState(
        { type: 'solid_color', background: 'rgb(250,175,168)', color: 'white' }
    );

    // State to toggle emoji picker visibility
    const [showEmojiContainer, setShowEmojiContainer] = useState(false);

    // State to toggle background pattern list visibility
    const [showTextPatternList, setShowTextPatternList] = useState(false);

    // State to toggle text formatting options visibility
    const [showTextEditingOptions, setShowTextEditingOptions] = useState(false);

    // Ref for the editable input field
    const inputRef = useRef(null);

    // State to track if input field has any content
    const [inputNotEmpty, setInputNotEmpty] = useState(false);

    // Array of state setters to manage UI panels (emoji, background, formatting)
    let allShowingSetter = [
        setShowTextPatternList, setShowEmojiContainer, setShowTextEditingOptions
    ];
    const [showConfirmationDialog, setShowConfirmationDialog] = useState(false); // Show confirmation dialog
    // Function to show one section and hide others
    function handleShowingSection(stateSetters, activeSetter) {
        stateSetters.forEach(setState => setState(false)); // Hide all
        activeSetter(true); // Show the selected section
    }

    // useEffect to set up text formatting buttons' event listeners
    useEffect(() => {
        // Access the editable input field
        const inputField = inputRef.current;

        // Format selected text using document.execCommand
        const formatText = (command, value = null) => {
            document.execCommand(command, false, value);
            inputField.focus();
        };

        // Handle button clicks for formatting (bold, italic, etc.)
        const handleButtonClick = (e) => {
            const command = e.currentTarget.id;
            formatText(command);
        };

        // Add click event listener to each formatting button
        document.querySelectorAll('.format').forEach(button => {
            button.addEventListener('click', handleButtonClick);
        });

        return () => {
            // Cleanup event listeners on unmount
            document.querySelectorAll('.format').forEach(button => {
                button.removeEventListener('click', handleButtonClick);
            });
        };
    }, []);

    // useEffect to populate input field and background when editing or replying to a story
    useEffect(() => {
        if (targetStoryForReplyOrEdit != null) {
            // Print previous story text into input field
            printTextIn_InputField(inputRef, targetStoryForReplyOrEdit?.data?.text);

            // Parse the text to extract background info (if exists)
            const textDataArray = safeParseJSON(targetStoryForReplyOrEdit?.data?.text);
            let bgInfo = textDataArray?.find(item => item?.bgInfo)?.bgInfo;

            // Set the background info to the current state
            setCurrentTextBackground(bgInfo);
        };
    }, [targetStoryForReplyOrEdit]);

    // End of text editing related logic

    return (
        // Main container for the text story panel
        <>
            <div className='textPanelForStory'>
                <div className="textPanelForStoryInner relative">
                    <div className='w-full h-full p-4'>
                        {/* Header section with back arrow and title */}
                        <div className='w-full flex items-center justify-between'>
                            <div className='pb-3 w-full flex items-center justify-between gap-x-2.5'>
                                {/* Back button to close the text panel */}
                                <BsArrowLeft
                                    onClick={() => {
                                        setShowConfirmationDialog(true);
                                    }}
                                    className='w-7 h-7 cursor-pointer text-gray-600' />
                                {/* Title for the text story panel */}
                                <h3 className='font-semibold text-gray-600 text-xl'>
                                    Create Text Story
                                </h3>
                            </div>
                        </div>

                        {/* Input field container with dynamic background and text color */}
                        <div style={{
                            background: currentTextBackground?.type == 'solid_color' ?
                                currentTextBackground?.background :
                                `url('/BG/${currentTextBackground?.background}') no-repeat center center/cover`,
                            color: `${currentTextBackground?.color}`,
                            border: `${currentTextBackground?.background == 'white' ? '2px' : '0px'} solid rgba(75,85,99,0.1)`
                        }} className='inputContainer flex items-center justify-center overflow-y-auto'>

                            {/* Editable text input field */}
                            <div ref={inputRef}
                                onInput={(e) => {
                                    // Input event logic (commented out block for controlling input height)
                                }}
                                onKeyDown={(e) => {
                                    // Handles input direction and constraints on text input
                                    handleInputDirection(
                                        e,
                                        inputRef,
                                        setInputNotEmpty,
                                        'no',
                                        true
                                    );
                                }}
                                className='min-h-full w-full bg-transparent my-1 text-xl outline-0 border-0 text-center break-all overflow-visible inputForChat editable_div not_prevent_select inputForStory' contentEditable>
                            </div>
                        </div>

                        {/* Bottom action bar */}
                        <div className='w-full flex items-center justify-between py-4'>
                            <div className='flex items-center justify-center gap-x-2.5'>

                                {/* Text background design button */}
                                <div style={{ borderRadius: '6px' }} className='cursor-pointer flex items-center justify-center text-white'>
                                    <BiSolidPalette
                                        onClick={() => {
                                            handleShowingSection(allShowingSetter, setShowTextPatternList)
                                            setShowTextPatternList(true);
                                        }} className='w-8 h-8 cursor-pointer text-gray-600' />
                                </div>

                                {/* Text pattern list panel */}
                                <div className={`${showTextPatternList ? 'show' : 'hide'} textPatternListContainer`}>
                                    {/* Close icon for text pattern list */}
                                    <div className='w-full text-center flex items-center justify-center'>
                                        <HiMiniChevronDown
                                            onClick={() => {
                                                setShowTextPatternList(false);
                                            }} className='w-7 h-7 cursor-pointer text-gray-600' />
                                    </div>

                                    {/* Solid color label */}
                                    <div className='w-full text-left flex items-center justify-start'>
                                        <p className='font-semibold text-gray-600 text-xl'>Solid Colors</p>
                                    </div>

                                    {/* Option to remove background */}
                                    <div onClick={() => {
                                        setCurrentTextBackground(
                                            { type: 'solid_color', background: 'white', color: 'black' }
                                        )
                                    }} className='textPatternBox flex items-center justify-center'>
                                        <HiOutlineBan className="w-10 h-10 text-gray-600" />
                                    </div>

                                    {/* Looping through solid color backgrounds */}
                                    {
                                        colorsText.map((colorInfo, index) => {
                                            return <div key={index} style={{
                                                backgroundColor: `${colorInfo?.background}`,
                                            }} onClick={() => { setCurrentTextBackground(colorInfo) }} className='textPatternBox flex items-center justify-center'>
                                            </div>
                                        })
                                    }

                                    {/* Pattern label */}
                                    <div className='w-full text-left flex items-center justify-start'>
                                        <p className='font-semibold text-gray-600 text-xl'>Pattern</p>
                                    </div>

                                    {/* Looping through image backgrounds */}
                                    {
                                        textBgNames.map((textBgInfo, index) => {
                                            return <div key={index} style={{
                                                background: `url('/BG/${textBgInfo?.background}') no-repeat center center/cover`,
                                            }} onClick={() => { setCurrentTextBackground(textBgInfo) }} className='textPatternBox flex items-center justify-center'>
                                            </div>
                                        })
                                    }
                                </div>

                                {/* Emoji picker button */}
                                <div style={{ borderRadius: '6px' }} className='cursor-pointer flex items-center justify-center text-white'>
                                    <HiFaceSmile
                                        onClick={() => {
                                            handleShowingSection(allShowingSetter, setShowEmojiContainer)
                                            setShowEmojiContainer(true);
                                        }} className='w-8 h-8 cursor-pointer text-gray-600' />
                                </div>

                                {/* Text editing button */}
                                <div style={{ borderRadius: '6px' }} className='cursor-pointer flex items-center justify-center text-white'>
                                    <BiFontColor
                                        onClick={() => {
                                            handleShowingSection(allShowingSetter, setShowTextEditingOptions)
                                            setShowTextEditingOptions(!showTextEditingOptions);
                                        }} className='w-9 h-9 cursor-pointer text-gray-600' />
                                </div>

                                {/* Text editing option list */}
                                <div className={`${showTextEditingOptions ? 'show' : 'hide'} textEditingListContainer shadow-lg`}>
                                    <div className={`textEditingListInner`}>
                                        {/* Bold button */}
                                        <button id="bold" className="option-button format" type="button">
                                            <BiBold className="w-7 h-7" />
                                        </button>
                                        {/* Italic button */}
                                        <button id="italic" className="option-button format" type="button">
                                            <BiItalic className="w-7 h-7" />
                                        </button>
                                        {/* Strikethrough button */}
                                        <button id="strikethrough" className="option-button format" type="button">
                                            <BiStrikethrough className="w-7 h-7" />
                                        </button>
                                        {/* Underline button */}
                                        <button id="underline" className="option-button format" type="button">
                                            <BiUnderline className="w-7 h-7" />
                                        </button>
                                        {/* Unordered list button */}
                                        <button id="insertUnorderedList" className="option-button format" type="button">
                                            <BiListUl className="w-7 h-7" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Send button (only visible if input is not empty) */}
                            {
                                inputNotEmpty &&
                                <div>
                                    <BsSend
                                        style={{ transform: "rotate(45deg)", color: 'rgb(114, 105, 239)' }}
                                        className="cursor-pointer w-7 h-7 relative right-2"
                                        onClick={async () => {
                                            const extractedContent = await extractContentFromInputField(inputRef); //extract content from input field
                                            if (extractedContent?.length > 0) {
                                                setTextStoryReadyToSend([
                                                    ...extractedContent,
                                                    { type: "bgInfo", bgInfo: currentTextBackground }
                                                ]);
                                                setShowTextPanelForStory(false);
                                            };
                                        }}
                                    />
                                </div>
                            }
                        </div>
                    </div>

                    {/* Emoji picker panel */}
                    {
                        <div className={`${showEmojiContainer ? 'show' : 'hide'} emojiesInTextStoryPanel bottom-0 absolute pt-0 p-4 bg-white shadow-lg rounded-lg`}>
                            {/* Close emoji picker icon */}
                            <div className='py-2 w-full text-center flex items-center justify-center'>
                                <HiMiniChevronDown
                                    onClick={() => {
                                        setShowEmojiContainer(false);
                                    }} className='w-7 h-7 cursor-pointer text-gray-600' />
                            </div>

                            {/* Emoji Picker component */}
                            {
                                <EmojiPicker
                                    onEmojiClick={
                                        emoji =>
                                            insertEmojiIntoInputField(
                                                {
                                                    emojiUrl: emoji.imageUrl,
                                                    emojiUnicode: emoji.emoji
                                                },
                                                inputRef,
                                                setInputNotEmpty
                                            )
                                    }
                                    emojiStyle={"apple"}
                                    lazyLoadEmojis={true}
                                />
                            }
                        </div>
                    }
                </div>
            </div>
            {
                // Confirmation dialog
                showConfirmationDialog &&
                <ConfirmationDialog
                    textMsg={`Are you sure you want to discard the changes?`}
                    handleConfirmAction={() => {
                        setShowConfirmationDialog(false);
                        setShowTextPanelForStory(false)
                    }}
                    setShowConfirmationDialog={setShowConfirmationDialog}
                />
            }
        </>
    )
}

export default TextPanelForStory;
