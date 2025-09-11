
import user3 from '../../assets/user3.png';

interface OnlineUsersIndicatorProps {
  totalUsersIdOnline: number[];
  setShowModalUsersOnline: (show: boolean) => void;
}



const OnlineUsersIndicator: React.FC<OnlineUsersIndicatorProps> = ({
    totalUsersIdOnline,
    setShowModalUsersOnline,
}) => {

    return <div
        className="absolute top-3 right-2 z-50"
      >
        {(totalUsersIdOnline && totalUsersIdOnline.length > 0) && (<div onClick={() => setShowModalUsersOnline(true)} className="cursor-pointer flex items-center space-x-1 bg-gray-700 rounded-full px-2 py-1">
          <img src={user3} alt="Users Icon" className="w-5 h-5" />
          <span onClick={() => setShowModalUsersOnline(true)} className="text-white text-sm font-semibold flex items-center justify-center min-w-[20px]">
            {totalUsersIdOnline.length}
          </span>
        </div>)}
      </div>

}


export default OnlineUsersIndicator;