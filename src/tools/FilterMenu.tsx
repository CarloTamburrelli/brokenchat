import React, { useState, useEffect, useRef } from 'react';
import filterIcon from '../assets/filter.png'; 


interface FilterMenuProps {
    selectedFilter: string | null;
    setSelectedFilter: (filter: string) => void;
    nearFilterToShow: boolean;
    myFilterToShow: boolean;
  }

const FilterMenu: React.FC<FilterMenuProps> = ({ selectedFilter, setSelectedFilter, nearFilterToShow, myFilterToShow }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Stato per aprire/chiudere il menu
  const menuRef = useRef<HTMLDivElement>(null); // Riferimento al menu
  const buttonRef = useRef<HTMLDivElement>(null); // Riferimento al bottone del filtro

  // Chiudere il menu se si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false); // Chiude il menu
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFilterSelect = (filter: string) => {
    setSelectedFilter(filter); // Imposta il filtro selezionato
    setIsMenuOpen(false); // Chiude il menu dopo aver selezionato un filtro
  };

  const filters = ["Popular"];
  if (nearFilterToShow) {
    filters.splice(1, 0, "Nearby");
  }

  if (myFilterToShow) {
    filters.splice(1, 0, "My Chats"); 
  }


  return (
    <div className="relative">
      {/* Icona filtro */}
      <div
        ref={buttonRef}
        className={`flex-1 md:flex-none md:w-auto flex justify-end md:ml-4 cursor-pointer`} 
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        <img src={filterIcon} alt="Filtro" className={`w-6 h-6 ${
          isMenuOpen ? 'bg-gray-400 rounded' : ''
        }`} />
        {/* Scritta del filtro selezionato */}
        {(selectedFilter !== null)  && (<span className="ml-2 text-black hidden md:flex flex-1 font-mono">{selectedFilter}</span>) }
      </div>

      {/* Menu di Filtro Popup */}
      {isMenuOpen && (
        <div
          ref={menuRef}
          className="absolute top-10 right-0 bg-white border border-gray-300 rounded-lg shadow-lg w-48 z-50"
        >
          <div className="p-2">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => handleFilterSelect(filter)}
                className={`w-full text-left p-2 hover:bg-gray-200 rounded-lg font-mono ${
                  selectedFilter === filter ? "font-bold" : ""
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterMenu;
