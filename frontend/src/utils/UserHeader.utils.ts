import { pageConfigs } from "../components/shared/user/UserHeader.config";

export const getPageConfig = (pathname: string) => {
  if (pathname in pageConfigs) {
    return pageConfigs[pathname as keyof typeof pageConfigs];
  }

  for (const [path, config] of Object.entries(pageConfigs)) {
    if (pathname.startsWith(path)) {
      return config;
    }
  }

  return pageConfigs["/mes-rendezvous"]; // Updated fallback
};
