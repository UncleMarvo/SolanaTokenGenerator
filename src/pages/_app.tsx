import { AppProps } from "next/app";
import Head from "next/head";
import { FC, useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import { ContextProvider } from "../contexts/ContextProvider";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import Notifications from "../components/Notification";
import PageTransition from "../components/PageTransition";

require("@solana/wallet-adapter-react-ui/styles.css");
require("../styles/globals.css");

const App: FC<AppProps> = ({ Component, pageProps }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Ensure all styles and scripts are loaded before showing content
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Head>
        <title>Solana Token Creator</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style jsx global>{`
          html {
            background-color: var(--bg);
            color: var(--fg);
          }
          body {
            background-color: var(--bg);
            color: var(--fg);
            margin: 0;
            padding: 0;
            overflow-x: hidden;
          }
          #__next {
            background-color: var(--bg);
            color: var(--fg);
            min-height: 100vh;
          }
        `}</style>
      </Head>
      
      {isLoading ? (
        <div className="fixed inset-0 bg-bg flex items-center justify-center z-50">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-bg text-fg min-h-screen">
          <ContextProvider>
            <Notifications />
            <Nav />
            <PageTransition>
              <Component {...pageProps} />
            </PageTransition>
            <Footer />
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1a1a1a',
                  color: '#fff',
                  border: '1px solid #333',
                },
              }}
            />
          </ContextProvider>
        </div>
      )}

      {/* scripts */}
      <script src="/assets/libs/preline/preline.js"></script>
      <script src="/assets/libs/swiper/swiper-bundle.min.js"></script>
      <script src="/assets/libs/gumshoejs/gumshoe.polyfills.min.js"></script>
      <script src="/assets/libs/aos/aos.js"></script>
      <script src="/assets/js/swiper.js"></script>
    </>
  )
};

export default App;