import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";

const Navbar = ({ darkMode, toggleDarkMode }) => {
  return (
    <nav className="bg-gray-900 text-white fixed w-full shadow-md">
      <div className="container mx-auto flex justify-between items-center p-4">
        {/* Logo */}
        <h1 className="text-2xl font-bold">AI Summarizer</h1>

        {/* Dark Mode Toggle Button */}
        <button onClick={toggleDarkMode} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">
          {darkMode ? <SunIcon className="w-6 h-6 text-yellow-400" /> : <MoonIcon className="w-6 h-6 text-gray-700" />}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
