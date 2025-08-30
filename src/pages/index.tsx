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
  CreateView,
  TokenMetadata,
  ContactView,
} from "../views";

const Home: NextPage = (props) => {
  const [openCreateModal, setOpenCreateModal] = useState(false);
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


      <HomeView setOpenCreateModal={setOpenCreateModal} />
      <ToolView
        setOpenAirdrop={setOpenAirdrop}
        setOpenContact={setOpenContact}
        setOpenCreateModal={setOpenCreateModal}
        setOpenSendTransaction={setOpenSendTransaction}
        setOpenTokenMetadata={setOpenTokenMetadata}
      />
      <FeatureView
        setOpenAirdrop={setOpenAirdrop}
        setOpenContact={setOpenContact}
        setOpenCreateModal={setOpenCreateModal}
        setOpenSendTransaction={setOpenSendTransaction}
        setOpenTokenMetadata={setOpenTokenMetadata}
      />
      <OfferView />
      <FaqView />

      {openCreateModal && (
        <div className="new_loader relative h-full bg-slate-900">
          <CreateView setOpenCreateModal={setOpenCreateModal} />
        </div>
      )}
     
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
