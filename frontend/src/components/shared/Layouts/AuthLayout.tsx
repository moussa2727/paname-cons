import type { FC } from "react";
import { Helmet } from "react-helmet-async";

const AuthLayout: FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen bg-linear-to-br from-sky-50 via-white to-indigo-50 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </>
  );
};

export default AuthLayout;
