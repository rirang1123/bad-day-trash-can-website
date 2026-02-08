import React, { useState, useEffect } from 'react';
import './EncouragementMessage.css';

const EncouragementMessage = ({ message, isVisible }) => {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // When isVisible becomes true, schedule showContent to true for fade-in
      // Use requestAnimationFrame to ensure CSS transition has time to register initial opacity:0
      requestAnimationFrame(() => {
        setShowContent(true);
      });
    } else {
      // When isVisible becomes false, set showContent to false for fade-out
      setShowContent(false);
    }
  }, [isVisible]); // Re-run effect when isVisible changes

  if (!message) return null; 

  return (
    <div className={`clear-message ${showContent ? 'visible' : ''}`}>
      {message}
    </div>
  );
};

export default EncouragementMessage;