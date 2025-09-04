import { AppProps } from "next/app";
import Head from "next/head";
import { FC } from "react";
import { Toaster } from "react-hot-toast";
import { ContextProvider } from "../contexts/ContextProvider";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import Notifications from "../components/Notification";

require("@solana/wallet-adapter-react-ui/styles.css");
require("../styles/globals.css");

const App: FC<AppProps> = ({ Component, pageProps }) => {
  return (
    <div className="bg-bg text-fg">
      <Head>
        <title>Solana Token Creator</title>
      </Head>
      <ContextProvider>
        <Notifications />
        <Nav />
        <Component {...pageProps} />
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

      {/* scripts */}
      <script src="assets/libs/preline/preline.js"></script>
      <script src="assets/libs/swiper/swiper-bundle.min.js"></script>
      <script src="assets/libs/gumshoejs/gumshoe.polyfills.min.js"></script>
      <script src="assets/libs/aos/aos.js"></script>
      <script src="assets/js/swiper.js"></script>
    </div>
  )
};

export default App;