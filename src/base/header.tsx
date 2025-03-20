import { Disclosure, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { Bars3Icon } from '@heroicons/react/24/outline'
import Logo from '../assets/logo_without_text.png';
import edit from '../assets/edit.png';
import exit from '../assets/exit.png';
import { Link } from 'react-router-dom';
import user3 from '../assets/user3.png';



export default function Header({chatName='', usersList=[], onOpenNicknameModal = () => {}, onOpenInfo =() => {}, showUserListModal = () => {}}: {chatName: string, usersList: string[], onOpenNicknameModal: () => void, onOpenInfo: ()=> void, showUserListModal: () => void}) {
  
  const navigation = [
    { name: 'Cambia Nickname', href: '#', current: true, onClick: onOpenNicknameModal, icon: edit },
    { name: 'Ritorna alla Home', href: '#', current: false, onClick: () => window.location.replace("/"), icon: exit },
  ]

  const setTitle = (text: string, maxLength = 15) => {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };
  
  return (
    <Disclosure>
      <div className="mx-auto max-w-7xl pl-4 pr-4">
      <div className="relative flex h-16 items-center justify-between">
  {/* Contenitore per il logo e il titolo della chat */}
  <div className="flex items-center">
    {/* Logo */}
    <div className="flex items-start">
      <Link to="/" className="pointer-events-auto">
        <img alt="Your Company" src={Logo} className="h-8 block" />
      </Link>
    </div>
    
    {/* Titolo della chat */}
    {chatName && (
      <h1 className={`font-bold text-red text-center text-lg sm:text-xl flex items-center gap-2 ml-4`}>
        <span onClick={onOpenInfo} className="cursor-pointer pointer-events-auto">
          {window.innerWidth < 640 ? setTitle(chatName) : chatName}
        </span>
      </h1>
    )}
  </div>

      <div className="absolute inset-y-0 right-0 flex items-center sm:static sm:inset-auto sm:ml-6 sm:pr-0">
        {(usersList && usersList.length > 0) && (<div onClick={showUserListModal} className="cursor-pointer flex items-center space-x-1 bg-gray-700 rounded-full px-2 py-1">
          <img src={user3} alt="Users Icon" className="w-5 h-5" />
          <span onClick={showUserListModal} className="text-white text-sm font-semibold flex items-center justify-center min-w-[20px]">
            {usersList.length}
          </span>
        </div>)}
        <Menu as="div" className="block relative ml-1 sm:ml-4 text-left">
          <MenuButton className="relative flex rounded-full text-sm focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800 focus:outline-hidden">
            <Bars3Icon aria-hidden="true" className="block size-6 group-data-open:hidden" />
          </MenuButton>
          <MenuItems
            transition
            className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 ring-1 shadow-lg ring-black/5 transition focus:outline-hidden data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
          >
            {navigation.map((item) => (
              <MenuItem key={item.name}>
                <a
                  href={"#"}
                  aria-current={item.current ? 'page' : undefined}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none"
                  onClick={(e) => {
                    e.preventDefault(); // Previene il comportamento predefinito dell'anchor
                    if (item.onClick) item.onClick();
                  }}
                >
                  {item.icon && (
                    <img
                      src={item.icon}
                      alt={`${item.name} icon`}
                      className="w-5 h-5 mr-2 inline" // Adatta la dimensione dell'icona
                    />
                  )}
                  {item.name}
                </a>
              </MenuItem>
            ))}
          </MenuItems>
        </Menu>
      </div>
    </div>
  </div>
</Disclosure>

  )
}
