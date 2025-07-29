import  {  useContext } from 'react';
import { UserContext } from '@context/UserContext';

// ConfirmationDialog component to show a confirmation popup
export default function ConfirmationDialog({ textMsg, textColor, handleConfirmAction, setShowConfirmationDialog }) {
    // Access activeDarkMode from context to apply dark mode styling
    const { activeDarkMode } = useContext(UserContext);

    return (
        // Overlay to center the confirmation dialog
        <div className='confirmationDialog overlay w-full h-full flex justify-center items-center'>
            {/* Dialog box container with conditional dark mode class */}
            <div className={`${activeDarkMode ? "darkModeBg2" : ''} overlayInner bg-white text-gray-700 rounded-lg shadow-lg max-w-md w-full p-5`}>

                {/* Dialog Content section */}
                <div className="text-center py-4">
                    {/* Alert icon */}
                    <svg className="mx-auto mb-4 w-12 h-12" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                        <path stroke="currentColor" strokeWidth="2" d="M10 11V6m0 8h.01M19 10a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>

                    {/* Dynamic confirmation message */}
                    <p className={`font-semibold text-lg  whitespace-break-spaces ${textColor}`}>{textMsg}</p>
                </div>

                {/* Dialog Footer with Yes and No buttons */}
                <div className="btnContainer flex justify-center gap-3 pt-2">
                    {/* "Yes" button calls the handleConfirmAction function */}
                    <button className="bg-red-600 text-white font-medium rounded-lg px-5 py-2.5" onClick={() => handleConfirmAction()}>
                        Yes, I'm sure
                    </button>

                    {/* "No" button hides the confirmation dialog */}
                    <button className={`${activeDarkMode ? "darkModeBg2" : ''} px-4 py-2 border rounded-lg`} onClick={() => setShowConfirmationDialog(false)}>
                        No, cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
