import { FC } from "react";
import { useRouter } from "next/router";
import { MdGeneratingTokens } from "react-icons/md";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import pkg from "../../../package.json";
import { heroCarouselImages } from "../../config/brand";

interface HomeViewProps {
  // Legacy prop - no longer used, kept for compatibility
  setOpenCreateModal?: (value: boolean) => void;
}

export const HomeView: FC<HomeViewProps> = ({ setOpenCreateModal }) => {
  const router = useRouter();
  return (
    <section id="home" className="section relative overflow-hidden">
      <div className="px-6 py-4">
        <div className="bg-bg/40 rounded-2xl">
          <div className="container">
            <div className="p-6">
              <div className="relative grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
                {/* <div className="bg-primary/10 -z-1 start-0 absolute top-0 h-14 w-14 animate-[spin_10s_linear_infinite] rounded-2xl round-br-none rounded-tl-none"></div> */}
                {/* <div className="bg-primary/20 -z-1 end-0 absolute bottom-0 h-14 w-14 animate-ping rounded-full"></div> */}

                <div className="">
                  <span className="text-primary bg-primary/20 rounded-md px-3 py-1 text-sm font-medium uppercase tracking-wider">
                    CREATE SOLANA TOKEN {pkg.version}
                  </span>

                  <h1 className="h1 md:text-5xl/tight my-4 max-w-lg text-fg">
                    Launch. Meme. Moon. In minutes.
                  </h1>
                  <p className="text-muted md:text-lg">
                    Mint the token, get the meme kit, and one-click add liquidity.
                  </p>

                  <div className="new_add_css">
                    <a
                      onClick={() => router.push('/pricing')}
                      className="btn btn-primary pe-4 group mt-10 gap-2 cursor-pointer"
                    >
                      <span className="bg-primary/20 text-primary me-2 flex h-11 w-11 items-center justify-center rounded-full group-hover:bg-muted/10 group-hover:text-fg">
                        <MdGeneratingTokens />
                      </span>
                      Create your token
                    </a>
                    <a className="mt-8">
                      <WalletMultiButton />
                    </a>
                  </div>
                </div>

                <div className="mx-auto h-[595px] overflow-hidden">
                  <div className="marquee grid grid-cols-2 gap-6">
                    <div className="relative m-autp flex flex-col gap-6 overflow-hidden">
                      <div className="marquee-hero flex min-h-full flex-shrink-0 flex-col items-center justify-around gap-6">
                        {heroCarouselImages.map(
                          (image, index) => (
                            <img
                              key={index}
                              src={image.src}
                              alt={image.alt}
                              className="aspect-1 h-full w-80 rounded-xl object-cover"
                            />
                          )
                        )}
                      </div>

                      <div
                        aria-hidden="true"
                        className="marquee-hero flex min-h-full flex-shrink-0 flex-col items-center justify-around gap-6"
                      >
                        {heroCarouselImages.map(
                          (image, index) => (
                            <img
                              key={index}
                              src={image.src}
                              alt={image.alt}
                              className="aspect-1 h-full w-80 rounded-xl object-cover"
                            />
                          )
                        )}
                      </div>
                    </div>

                    <div className="marquee-reverse m-auto flex flex-col gap-6 overflow-hidden">
                      <div className="marquee-hero flex min-h-full flex-shrink-0 flex-col items-center justify-around gap-6">
                        {heroCarouselImages.map(
                          (image, index) => (
                            <img
                              key={index}
                              src={image.src}
                              alt={image.alt}
                              className="aspect-1 h-full w-80 rounded-xl object-cover"
                            />
                          )
                        )}
                      </div>

                      <div
                        aria-hidden="true"
                        className="marquee-hero flex min-h-full flex-shrink-0 flex-col items-center justify-around gap-6"
                      >
                        {heroCarouselImages.map(
                          (image, index) => (
                            <img
                              key={index}
                              src={image.src}
                              alt={image.alt}
                              className="aspect-1 h-full w-80 rounded-xl object-cover"
                            />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
