import React, { useRef, useEffect } from 'react';
import './TextInput.css';

const TextInput = ({ value, onChange, onKeyDown }) => {
  const textareaRef = useRef(null); // Ref for the textarea

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '0px'; // Reset height
      // Set height to scrollHeight, but ensure it doesn't exceed a max height if desired
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value]); // Rerun when value changes

  return (
    <textarea
      ref={textareaRef} // Attach ref
      className="text-input"
      placeholder="오늘 당신을 힘들게 한 일은 무엇인가요? (Enter)"
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      maxLength="50"
      // rows="1" // Removed
    />
  );
};

export default TextInput;