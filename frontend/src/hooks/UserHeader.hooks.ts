import { useLocation } from "react-router-dom";
import { getPageConfig } from "../utils/UserHeader.utils";

// Hook pour récupérer la configuration de page
export const usePageConfig = () => {
  const location = useLocation();

  const getCurrentPageConfig = () => {
    return getPageConfig(location.pathname);
  };

  return getCurrentPageConfig();
};
