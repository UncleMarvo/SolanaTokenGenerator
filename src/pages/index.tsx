import React, { useState } from "react";
import type { NextPage } from "next";
import Head from "next/head";

import {
  HomeView,
  ToolView,
  FeatureView,
  OfferView,
  FaqView,
  AirdropView,
  DonateView,
  TokenMetadata,
  ContactView,
} from "../views";
import { useCreateTokenModal } from "../contexts/CreateTokenModalProvider";

const Home: NextPage = (props) => {
  const { openModal } = useCreateTokenModal();
  const [openTokenMetadata, setOpenTokenMetadata] = useState(false);
  const [openContact, setOpenContact] = useState(false);
  const [openAirdrop, setOpenAirdrop] = useState(false);
  const [openSendTransaction, setOpenSendTransaction] = useState(false);

  return (
    <>
      <Head>
        <title>Solana Token Creator</title>
        <meta
          name="Solana token creator"
          content="Build and create solana tokens"
        />
      </Head>


      <HomeView setOpenCreateModal={openModal} />
      <ToolView
        setOpenAirdrop={setOpenAirdrop}
        setOpenContact={setOpenContact}
        setOpenCreateModal={openModal}
        setOpenSendTransaction={setOpenSendTransaction}
        setOpenTokenMetadata={setOpenTokenMetadata}
      />
      <FeatureView
        setOpenAirdrop={setOpenAirdrop}
        setOpenContact={setOpenContact}
        setOpenCreateModal={openModal}
        setOpenSendTransaction={setOpenSendTransaction}
        setOpenTokenMetadata={setOpenTokenMetadata}
      />
      <OfferView />
      <FaqView />

     
      {openTokenMetadata && (
        <div className="new_loader relative h-full bg-slate-900">
          <TokenMetadata setOpenTokenMetadata={setOpenTokenMetadata} />
        </div>
      )}

      {openContact && (
        <div className="new_loader relative h-full bg-slate-900">
          <ContactView setOpenContact={setOpenContact} />
        </div>
      )}

      {openAirdrop && (
        <div className="new_loader relative h-full bg-slate-900">
          <AirdropView setOpenAirdrop={setOpenAirdrop} />
        </div>
      )}

      {openSendTransaction && (
        <div className="new_loader relative h-full bg-slate-900">
          <DonateView setOpenSendTransaction={setOpenSendTransaction} />
        </div>
      )}
    </>
  );
};

export default Home;
