
import Logo from '../../assets/logo.png';


const LogoBlock: React.FC = () => {

    return <div className="flex items-center space-x-4 mt-3">
  <img
    src={Logo}
    alt="Logo"
      className="w-64 sm:w-36 md:w-48 lg:w-52 xl:w-[220px] h-auto"
  />
</div>

}


export default LogoBlock;