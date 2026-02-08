import React from 'react';
import './EmptyButton.css';

const EmptyButton = ({ onClick }) => {
  return (
    <button className="clear-button" onClick={onClick}>
      전부 비우기
    </button>
  );
};

export default EmptyButton;
