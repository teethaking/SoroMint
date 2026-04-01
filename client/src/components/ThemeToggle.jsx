import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useUIStore } from '../store';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useUIStore();

  return (
    <button
      onClick={toggleTheme}
      className="
        relative 
        w-16 h-8 
        rounded-full 
        bg-slate-700 dark:bg-slate-700
        transition-colors duration-300
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stellar-blue
        hover:bg-slate-600 dark:hover:bg-slate-600
      "
      role="switch"
      aria-checked={theme === 'dark'}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {/* Slider Circle */}
      <span
        className={`
          absolute 
          top-1 
          w-6 h-6 
          rounded-full 
          bg-white 
          shadow-md
          transition-transform duration-300 ease-in-out
          flex items-center justify-center
          ${theme === 'dark' ? 'translate-x-9' : 'translate-x-1'}
        `}
      >
        {/* Icon */}
        {theme === 'dark' ? (
          <Moon size={14} className="text-slate-700" aria-hidden="true" />
        ) : (
          <Sun size={14} className="text-yellow-500" aria-hidden="true" />
        )}
      </span>
    </button>
  );
};

export default ThemeToggle;