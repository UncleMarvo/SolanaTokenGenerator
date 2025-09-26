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
      name: "Create Tokens",
      icon: <MdGeneratingTokens />,
      description:
        "Set up your token with a name, symbol, and supply. We handle the technical stuff so you can focus on your idea.",
      function: setOpenCreateModal,
    },
    {
      name: "Get Test SOL",
      icon: <MdToken />,
      description:
        "Claim free test SOL from the devnet to test token creation and other features without spending real money.",
      function: setOpenAirdrop,
    },
    {
      name: "Donate",
      icon: <RiTokenSwapFill />,
      description:
        "Support the platform if you find it useful. Help us keep building and improving the token creation tools.",
      function: setOpenSendTransaction,
    },
    {
      name: "Token Info",
      icon: <RxTokens />,
      description:
        "Look up any token on Solana. Check its metadata, supply, and other details before you invest or trade.",
      function: setOpenTokenMetadata,
    },
  ];

  return (
    <section className="section">
      <div className="container">
        <div className="mb-10 flex items-end justify-between">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="h2 mb-4 capitalize text-fg">
              What you can do
            </h2>
            <p className="text-muted text-sm font-medium">
              Everything you need to work with Solana tokens <br />
              without writing any code
            </p>
          </div>
        </div>

        <div className="bg-bg/40 flex flex-wrap items-center rounded-3xl backdrop-blur-3xl">
          {features.map((list, index) => (
            <div
              key={index}
              className={`w-auto grow md:w-12`}
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
