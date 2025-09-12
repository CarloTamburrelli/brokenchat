import FeedbackModal from "../FeedbackModal";
import RecoveryCodeSetter from "../RecoveryCodeSetter";
import { Menu, MenuButton as Menubut, MenuItems, MenuItem } from "@headlessui/react"



interface MenuButtonProps {
  menuRef: React.RefObject<HTMLDivElement | null>;
  showRecoveryCodeModal: boolean;
  setShowRecoveryCodeModal: (show: boolean) => void;
  showFeedback: boolean;
  setShowFeedback: (show: boolean) => void;
  setShowToastMessage: (message: string | null) => void;
  userId?: number | null;
  handleRemoveAccount: () => void;
}


const MenuButton: React.FC<MenuButtonProps> = ({
  menuRef,
  showRecoveryCodeModal,
  setShowRecoveryCodeModal,
  showFeedback,
  setShowFeedback,
  setShowToastMessage,
  userId,
  handleRemoveAccount,
}) => {
const handleRecoverySet = () => {
    setShowRecoveryCodeModal(false);
    setShowToastMessage("Recovery code saved!");
    setTimeout(() => setShowToastMessage(null), 3000);
  };

  const handleFeedbackSent = () => {
    setShowFeedback(false);
    setShowToastMessage("Feedback sent, thank you! ❤️");
    setTimeout(() => setShowToastMessage(null), 3000);
  };

  return (
    <div ref={menuRef} className="absolute top-1 right-2 z-50">

      <Menu as="div" className="relative inline-block text-left">
      {/* Bottone 3 puntini */}
      <Menubut className="flex flex-col justify-center items-center w-6 h-6 space-y-0.5">
        <span className="w-1.5 h-1.5 bg-black rounded-full"></span>
        <span className="w-1.5 h-1.5 bg-black rounded-full"></span>
        <span className="w-1.5 h-1.5 bg-black rounded-full"></span>
      </Menubut>

      <MenuItems className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded shadow-lg focus:outline-none">
    <MenuItem>
      {({ active }) => (
        <a
          href="/privacy-policy"
          className={`block px-4 py-2 text-sm font-mono ${
            active ? "bg-gray-100 text-gray-900" : "text-gray-700"
          }`}
        >
          Privacy & Cookie Policy
        </a>
      )}
    </MenuItem>

    <MenuItem>
      {({ active }) => (
        <a
          href="/terms-of-use"
          className={`block px-4 py-2 text-sm font-mono ${
            active ? "bg-gray-100 text-gray-900" : "text-gray-700"
          }`}
        >
          Terms of use
        </a>
      )}
    </MenuItem>

    {userId && (
      <MenuItem>
        {({ active }) => (
          <button
            onClick={handleRemoveAccount}
            className={`w-full text-left px-4 py-2 text-sm font-mono ${
              active ? "bg-red-100 text-red-700" : "text-gray-700"
            }`}
          >
            Remove Account
          </button>
        )}
      </MenuItem>
    )}
  </MenuItems>
  {/* Modali */}
      {showRecoveryCodeModal && <RecoveryCodeSetter onSetted={handleRecoverySet} />}
      {showFeedback && <FeedbackModal onSetted={handleFeedbackSent} />}
  </Menu>

    </div>
  );
};

export default MenuButton;