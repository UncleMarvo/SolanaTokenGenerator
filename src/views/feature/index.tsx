import React, { FC } from "react";
import { LuArrowRightFromLine } from "react-icons/lu";
import { MdGeneratingTokens, MdToken } from "react-icons/md";
import { RiTokenSwapFill } from "react-icons/ri";
import { RxTokens } from "react-icons/rx";

interface FeatureViewProps {
  setOpenAirdrop: (value: boolean) => void;
  setOpenContact: (value: boolean) => void;
  setOpenCreateModal: (value: boolean) => void;
  setOpenSendTransaction: (value: boolean) => void;
  setOpenTokenMetadata: (value: boolean) => void;
}

export const FeatureView: FC<FeatureViewProps> = ({
  setOpenAirdrop,
  setOpenContact,
  setOpenCreateModal,
  setOpenSendTransaction,
  setOpenTokenMetadata,
}) => {
  const features = [
    {
      name: "Token Generator",
      icon: <MdGeneratingTokens />,
      description:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus semper faucibus erat, quis malesuada risus tempor ac. Quisque et erat elit.",
      function: setOpenCreateModal,
    },
    {
      name: "Get Airdrop",
      icon: <MdToken />,
      description:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus semper faucibus erat, quis malesuada risus tempor ac. Quisque et erat elit.",
      function: setOpenAirdrop,
    },
    {
      name: "Transfer Sol",
      icon: <RiTokenSwapFill />,
      description:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus semper faucibus erat, quis malesuada risus tempor ac. Quisque et erat elit.",
      function: setOpenSendTransaction,
    },
    {
      name: "Token Metadata",
      icon: <RxTokens />,
      description:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus semper faucibus erat, quis malesuada risus tempor ac. Quisque et erat elit.",
      function: setOpenTokenMetadata,
    },
  ];

  return (
    <section className="section">
      <div className="container">
        <div className="mb-10 flex items-end justify-between">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="h2 mb-4 capitalize text-fg">
              Choose Solana Blockchain Generator
            </h2>
            <p className="text-muted text-sm font-medium">
              Now you can create Solana Tokens <br />
              without code instantly
            </p>
          </div>
        </div>

        <div className="bg-bg/40 flex flex-wrap items-center rounded-3xl backdrop-blur-3xl">
          {features.map((list, index) => (
            <div
              key={index}
              className={`w-auto grow border-b border-muted/10 md:w-12 ${
                index == 0
                  ? "md:border-e"
                  : index == 1
                  ? ""
                  : index == 2
                  ? "md:border-e md:border-b-0"
                  : ""
              }`}
            >
              <div className="p-8 sm:p-10">
                <div className="bg-primary/10 text-primary mb-10 inline-flex h-16 w-16 items-center justify-center rounded-xl">
                  <i data-lucide="framer">{list.icon}</i>
                </div>
                <h2 className="mb-4 text-2xl font-medium text-fg">
                  {list.name}
                </h2>
                <p className="text-muted mb-6 text-base">
                  {list.description}
                </p>
                <a
                  onClick={() => list.function(true)}
                  className="hover:bg-primary-600 inline-flex items-center justify-center gap-2 rounded-full border border-muted/10 px-6 py-2 text-fg transition-all duration-300"
                >
                  Use Tools
                  <i>
                    <LuArrowRightFromLine />
                  </i>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
