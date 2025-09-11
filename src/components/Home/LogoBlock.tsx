
import Logo from '../../assets/logo.png';


const LogoBlock: React.FC = () => {

    return <div className="flex items-center space-x-3">
    <img
      src={Logo}
      alt="Logo"
      className="w-32 sm:w-40 md:w-44 lg:w-48 xl:w-[170px] h-auto"
    />
  </div>

}


export default LogoBlock;