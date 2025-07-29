import React, { useState } from 'react'
import { validateEmail, validatePassword, validateOTP, validateName, validateTitle } from "@utils/formValidators.js";
import { HiEye, HiEyeSlash } from 'react-icons/hi2';
function InputBox({ inputIcon: Icon, label, inputType, placeholder, name, value, setValue }) {
  // State for error
  const [inputError, setInputError] = useState("");
  const [togglePasswordType, setTogglePasswordType] = useState(inputType);
  // Handle input value change event
  const handleChange = (e) => {
    let value = e.target.value;
    setValue(value) // Update the value state using setter function
    // set inputError if there are inputError
    if (setInputError) {
      if (name == "email") {
        const { isValid, error: emailError } = validateEmail(value);
        if (!isValid) {
          setInputError(emailError);
        } else {
          setInputError('');
        }
      };
      if (name == "password") {
        // Validate password strength before sending to server
        const { isValid, error: passwordError } = validatePassword(value);
        if (!isValid) {
          setInputError(passwordError);
        } else {
          setInputError('');
        }
      };
      if (name == "name") {
        // Validate name strength before sending to server
        const { isValid, error: nameError } = validateName(value);
        if (!isValid) {
          setInputError(nameError);
        } else {
          setInputError('');
        }
      };
      if (name == "title") {
        // Validate name strength before sending to server
        const { isValid, error: titleError } = validateTitle(value);
        if (!isValid) {
          setInputError(titleError);
        } else {
          setInputError('');
        }
      };
      if (name == "otp") {
        // Validate otp strength before sending to server
        const { isValid, error: otpError } = validateOTP(value);
        if (!isValid) {
          setInputError(otpError);
        } else {
          setInputError('');
        }
      };
    };
  }
  return (
    <React.Fragment>
      {/* Label for the input field */}
      <label className="block mb-1 text-md font-normal text-gray-600">{label}</label>
      <div className='formInputContainer relative'>
        {/* Icon wrapper, renders icon if provided */}
        <div className='iconWrapper'>
          {Icon && <Icon className="w-5 h-5" />}
          {/* Placeholder for a possible InputIcon component */}
          {/* <InputIcon className='w-5 h-5' /> */}
        </div>
        {/* Input element with controlled value and change handler */}
        <input
          type={togglePasswordType}       // Input type (text, password, etc.)
          name={name}            // Input name attribute
          id={name}              // Input id attribute, same as name
          className="text-gray-600 text-md block w-full p-2.5" // Styling classes
          placeholder={placeholder}  // Placeholder text
          value={value}          // Controlled input value
          onChange={handleChange} // On change event handler
        />
        {
          inputType == 'password' &&
          <span className="absolute right-3 text-gray-600 cursor-pointer" onClick={() => {
            if (togglePasswordType == 'password' && inputType == 'password') setTogglePasswordType('text'); else setTogglePasswordType(inputType);
          }} >
            {
              togglePasswordType == 'password' ?
                <HiEye className='w-5 h-5' />
                :
                <HiEyeSlash className='w-5 h-5' />
            }
          </span>
        }
      </div>
      {
        inputError && <p className={`text-red-500 text-sm m-0`}>{inputError}</p>
      }
    </React.Fragment>
  )
}

export default InputBox;
