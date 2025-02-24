import { Disclosure, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { Bars3Icon } from '@heroicons/react/24/outline'
import Logo from '../assets/logo_without_text.png';
import { Link } from 'react-router-dom';



export default function Header({chatName='', onOpenNicknameModal = () => {}}: {chatName: string, onOpenNicknameModal: () => void}) {
  
  const navigation = [
    { name: 'Cambia nome', href: '#', current: true, onClick: onOpenNicknameModal },
    { name: 'Ritorna alla Home', href: '#', current: false, onClick: () => window.location.replace("/") },
  ]
  
  return (
    <Disclosure >
      <div className="mx-auto max-w-7xl pl-4 pr-4">
        <div className="relative flex h-16 items-center justify-between">
          <div className="flex flex-1">
            <div className="flex items-start">
            <Link to="/">
                    <img
                        alt="Your Company"
                        src={Logo}
                        className="h-8 block"
                    />
              </Link>
            </div>
          </div>
           {/* Centrare il nome della chat se presente */}
           {chatName && (
  <div className="absolute inset-0 flex justify-center items-center pointer-events-none w-full">
    <h1 className={`font-bold text-red text-center ${chatName.length > 20 ? 'text-sm' : 'text-xl'} max-w-[80%]`}>
      {chatName}
    </h1>
  </div>
)}


          <div className="absolute inset-y-0 right-0 flex items-center sm:static sm:inset-auto sm:ml-6 sm:pr-0">
            <div className="hidden sm:ml-6 sm:block">
              <div className="flex space-x-4">
                {navigation.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    aria-current={item.current ? 'page' : undefined}
                    onClick={(e) => {
                      e.preventDefault(); // Previene il comportamento predefinito dell'anchor
                      if (item.onClick) item.onClick();
                    }}
                  >
                    {item.name}
                  </a>
                ))}
              </div>
            </div>
            {/* dropdown only mobile */}
            <Menu as="div" className="block sm:hidden relative ml-3">
                <MenuButton className="relative flex rounded-full text-sm focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800 focus:outline-hidden">
                    <Bars3Icon aria-hidden="true" className="block size-6 group-data-open:hidden" />
                </MenuButton>
                <MenuItems
                    transition
                    className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 ring-1 shadow-lg ring-black/5 transition focus:outline-hidden data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
                >
                    {navigation.map((item) => (
                        <MenuItem>
                    <a
                        key={item.name}
                        href={"#"}
                        aria-current={item.current ? 'page' : undefined}
                        className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                        onClick={(e) => {
                          e.preventDefault(); // Previene il comportamento predefinito dell'anchor
                          if (item.onClick) item.onClick();
                        }}
                    >
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
