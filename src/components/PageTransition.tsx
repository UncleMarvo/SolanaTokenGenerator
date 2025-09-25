import { FC, ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/router";

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * PageTransition component to handle smooth transitions between pages
 * Prevents white screen flash and provides loading states
 */
export const PageTransition: FC<PageTransitionProps> = ({ children }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isPageReady, setIsPageReady] = useState(true);

  useEffect(() => {
    const handleRouteChangeStart = () => {
      setIsLoading(true);
      setIsPageReady(false);
    };

    const handleRouteChangeComplete = () => {
      // Small delay to ensure smooth transition
      setTimeout(() => {
        setIsLoading(false);
        setIsPageReady(true);
      }, 100);
    };

    const handleRouteChangeError = () => {
      setIsLoading(false);
      setIsPageReady(true);
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);
    router.events.on('routeChangeError', handleRouteChangeError);

    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
      router.events.off('routeChangeError', handleRouteChangeError);
    };
  }, [router.events]);

  return (
    <div className="relative min-h-screen">
      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-bg flex items-center justify-center z-50">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted text-sm">Loading...</p>
          </div>
        </div>
      )}
      
      {/* Page content */}
      <div className={`transition-opacity duration-200 ${isPageReady ? 'opacity-100' : 'opacity-0'}`}>
        {children}
      </div>
    </div>
  );
};

export default PageTransition;
