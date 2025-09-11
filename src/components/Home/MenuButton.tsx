import FeedbackModal from "../FeedbackModal";
import RecoveryCodeSetter from "../RecoveryCodeSetter";


interface MenuButtonProps {
  menuRef: React.RefObject<HTMLDivElement | null>;
  open: boolean;
  setOpen: (open: boolean) => void;
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
  open,
  setOpen,
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
    <div ref={menuRef} className="absolute top-3 left-2 z-50">
      {/* Pulsante con i 3 puntini */}
      <button
        onClick={() => setOpen(!open)}
        className="flex flex-col justify-center items-center w-6 h-6 space-y-0.5"
        aria-label="Menu"
      >
        <span className="w-1.5 h-1.5 bg-gray-700 rounded-full"></span>
        <span className="w-1.5 h-1.5 bg-gray-700 rounded-full"></span>
        <span className="w-1.5 h-1.5 bg-gray-700 rounded-full"></span>
      </button>

      {/* Modali */}
      {showRecoveryCodeModal && <RecoveryCodeSetter onSetted={handleRecoverySet} />}
      {showFeedback && <FeedbackModal onSetted={handleFeedbackSent} />}

      {/* Dropdown menu */}
      {open && (
        <div className="absolute mt-2 w-44 bg-white border border-gray-200 rounded shadow-lg">
          <a
            href="/privacy-policy"
            className="block px-4 py-2 text-sm font-mono text-gray-700 hover:bg-gray-100"
          >
            Privacy & Cookie Policy
          </a>
          <hr className="border-t border-gray-200 my-1" />
          <a
            href="/terms-of-use"
            className="block px-4 py-2 text-sm font-mono text-gray-700 hover:bg-gray-100"
          >
            Terms of use
          </a>
          {userId && (
            <>
              <hr className="border-t border-gray-200 my-1" />
              <button
                onClick={handleRemoveAccount}
                className="w-full text-left px-4 py-2 text-sm font-mono text-gray-700 hover:bg-red-100"
              >
                Remove Account
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MenuButton;