import React, { FC, useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  getAssociatedTokenAddress,
  createMintToInstruction,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import {
  PROGRAM_ID,
  createCreateMetadataAccountV3Instruction,
  createCreateMetadataAccountInstruction,
  createMetadataAccountV3InstructionDiscriminator,
} from "@metaplex-foundation/mpl-token-metadata";
import axios from "axios";
import { notify } from "../../utils/notifications";
import { ClipLoader } from "react-spinners";
import { useNetworkConfiguration } from "contexts/NetworkConfigurationProvider";
import { tokenStorage } from "../../utils/tokenStorage";

import { AiOutlineClose } from "react-icons/ai";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import CreateSVG from "../../components/SVG/CreateSVG";
import { Branding } from "../../components/Branding";
import { PresetBadge } from "../../components/PresetBadge";
import { HonestLaunchEnforcer } from "../../components/HonestLaunchEnforcer";
import { InputView } from "../index";

interface CreateViewProps {
  setOpenCreateModal: (value: boolean) => void;
}

export const CreateView: FC<CreateViewProps> = ({ setOpenCreateModal }) => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { networkConfiguration } = useNetworkConfiguration();

  const [tokenUri, setTokenUri] = useState("");
  const [tokenMintAddress, setTokenMintAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOnChainVerified, setIsOnChainVerified] = useState(false);
  const [token, setToken] = useState({
    name: "",
    symbol: "",
    decimals: "",
    amount: "",
    image: "",
    description: "",
    preset: "honest" as "honest" | "degen",
    vibe: "degen" as "funny" | "serious" | "degen",
  });

  const handleFormFieldChange = (fieldName, e) => {
    setToken({ ...token, [fieldName]: e.target.value });
  };

  // Handle honest launch verification status changes
  const handleVerificationChange = (isVerified: boolean) => {
    setIsOnChainVerified(isVerified);
  };



  // CREATE TOKEN FUNCTION
  const createToken = useCallback(
    async (token) => {
      // Check if wallet is connected
      if (!publicKey) {
        notify({
          type: "error",
          message: "Please connect your wallet first",
        });
        return;
      }

      // Validate required fields
      if (
        !token.name ||
        !token.symbol ||
        !token.decimals ||
        !token.amount ||
        !token.image ||
        !token.description ||
        !token.preset
      ) {
        notify({
          type: "error",
          message:
            "Please fill in all required fields (name, symbol, decimals, amount, image, description, and preset)",
        });
        return;
      }

      setIsLoading(true);
      const lamports = await getMinimumBalanceForRentExemptMint(connection);
      const mintKeypair = Keypair.generate();
      const tokenATA = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        publicKey
      );

      try {
        const metadataUrl = await uploadMetadata(token);
        console.log(metadataUrl);

        const createMetadataInstruction =
          createCreateMetadataAccountV3Instruction(
            {
              metadata: PublicKey.findProgramAddressSync(
                [
                  Buffer.from("metadata"),
                  PROGRAM_ID.toBuffer(),
                  mintKeypair.publicKey.toBuffer(),
                ],
                PROGRAM_ID
              )[0],
              mint: mintKeypair.publicKey,
              mintAuthority: publicKey,
              payer: publicKey,
              updateAuthority: publicKey,
            },
            {
              createMetadataAccountArgsV3: {
                data: {
                  name: token.name,
                  symbol: token.symbol,
                  uri: metadataUrl,
                  creators: null,
                  sellerFeeBasisPoints: 0,
                  uses: null,
                  collection: null,
                },
                isMutable: false,
                collectionDetails: null,
              },
            }
          );

        const createNewTokenTransation = new Transaction().add(
          SystemProgram.createAccount({
            fromPubkey: publicKey,
            newAccountPubkey: mintKeypair.publicKey,
            space: MINT_SIZE,
            lamports: lamports,
            programId: TOKEN_PROGRAM_ID,
          }),
          createInitializeMintInstruction(
            mintKeypair.publicKey,
            Number(token.decimals),
            publicKey,
            publicKey,
            TOKEN_PROGRAM_ID
          ),
          createAssociatedTokenAccountInstruction(
            publicKey,
            tokenATA,
            publicKey,
            mintKeypair.publicKey
          ),
          createMintToInstruction(
            mintKeypair.publicKey,
            tokenATA,
            publicKey,
            Number(token.amount) * Math.pow(10, Number(token.decimals))
          ),
          createMetadataInstruction
        );

        const signature = await sendTransaction(
          createNewTokenTransation,
          connection,
          {
            signers: [mintKeypair],
          }
        );

        const mintAddress = mintKeypair.publicKey.toString();
        setTokenMintAddress(mintAddress);

        // Store token data locally
        tokenStorage.storeToken({
          mintAddress,
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          amount: token.amount,
          image: token.image,
          description: token.description,
          preset: token.preset,
          vibe: token.vibe || "degen", // Default to degen if not specified
          createdAt: Date.now(),
        });

        notify({
          type: "success",
          message: "Token was created successfully",
          txid: signature,
        });
      } catch (error: any) {
        notify({
          type: "error",
          message: "Token creation failed, try again later",
        });
      }
      setIsLoading(false);
    },
    [publicKey, connection, sendTransaction]
  );

  // IMAGE UPLOAD IPFS
  const handleImageChange = async (event) => {
    const file = event.target.files[0];

    if (file) {
      const imgUrl = await uploadImagePinata(file);
      setToken({ ...token, image: imgUrl });
    }
  };

  const uploadImagePinata = async (file) => {
    console.log(`***** src/views/create: uploadImagePinata: Initial Call`);

    setIsLoading(true);
    if (file) {
      console.log(`***** src/views/create: uploadImagePinata: file: ${file}`);

      try {
        const formData = new FormData();
        formData.append("file", file);

        console.log(
          `***** src/views/create: uploadImagePinata: formData: ${formData[file]}`
        );

        const response = await axios({
          method: "POST",
          url: "https://api.pinata.cloud/pinning/pinFileToIPFS", // [STORE IN .ENV]
          data: formData,
          headers: {
            pinata_api_key: "25ef6fe8484ca7a0ab7d", // [STORE IN .ENV]
            pinata_secret_api_key:
              "a08368b1fa4508b1be221bed2076db94f78cedee12a906ef6f619c624a46d4fe", // [STORE IN .ENV]
            "Content-Type": "multipart/form-data",
          },
        });

        const ImgHash = `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`; // [STORE IN .ENV]
        setIsLoading(false);
        return ImgHash;
      } catch (error: any) {
        console.error(`Image file upload error: ${error}`);
        notify({ type: "error", message: "Upload image failed" });
        setIsLoading(false);
        return;
      }
    }
  };

  // METADATA UPLOAD
  const uploadMetadata = async (token): Promise<string> => {
    setIsLoading(true);
    const { name, symbol, description, image } = token;
    if (!name || !symbol || !description || !image) {
      notify({ type: "error", message: "Data is missing" });
      return "";
    }

    const data = JSON.stringify({
      name: name,
      symbol: symbol,
      description: description,
      image: image,
    });

    try {
      const response = await axios({
        method: "POST",
        url: "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        data: data,
        headers: {
          pinata_api_key: "25ef6fe8484ca7a0ab7d",
          pinata_secret_api_key:
            "a08368b1fa4508b1be221bed2076db94f78cedee12a906ef6f619c624a46d4fe",
          "Content-Type": "application/json",
        },
      });

      return `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;
    } catch (error: any) {
      notify({ type: "error", message: "Upload to Pinata Json failed" });
      return "";
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isLoading && (
        <div className="absolute top-0 left-0 z-50 flex h-screen w-full items-center justify-center bg-bg/[.3] backdrop-blur-[10px]">
          <ClipLoader />
        </div>
      )}

      {!tokenMintAddress ? (
        <section className="flex w-full items-center py-6 px-0 lg:h-screen lg:p-10">
          <div className="container">
            <div className="bg-bg/40 mx-auto max-w-5xl overflow-hidden backdrop-blur-2xl modal-grid">
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="ps-4 hidden py-4 pt-10 lg:block">
                  <div className="upload relative w-full overflow-hidden rounded-xl">
                    {token.image ? (
                      <img src={token.image} alt="token" className="w-2/5" />
                    ) : (
                      <label htmlFor="file" className="custum-file-upload ">
                        <div className="icon">
                          <CreateSVG />
                        </div>
                        <div className="text">
                          <span className="">Click to upload image</span>
                        </div>
                        <input
                          type="file"
                          id="file"
                          onChange={handleImageChange}
                        />
                      </label>
                    )}
                  </div>

                  <div className="token-styles relative">
                    {/* Preset Selector */}
                    <div className="mt-6">
                      <label className="block text-muted mb-3 font-semibold">
                        Launch Preset
                      </label>
                      <div className="space-y-3">
                        <label className={`flex items-start space-x-3 cursor-pointer p-3 rounded-lg transition-all duration-200 ${
                          token.preset === "honest" 
                            ? "bg-primary/5 border border-primary/20" 
                            : "hover:bg-muted/20"
                        }`}>
                          <input
                            type="radio"
                            name="preset"
                            value="honest"
                            checked={token.preset === "honest"}
                            onChange={(e) => handleFormFieldChange("preset", e)}
                            className="text-primary focus:ring-primary mt-1 w-5 h-5 border-2 border-primary/30 checked:bg-primary checked:border-primary transition-all duration-200"
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-fg font-medium">
                                Honest Launch
                              </span>
                              <span className="bg-success/20 text-success text-xs px-2 py-1 rounded-full">
                                Recommended
                              </span>
                            </div>
                            <p className="text-muted text-sm mt-1">
                              Revoke mint/freeze authority, plan LP lock for
                              community trust
                            </p>
                          </div>
                        </label>
                        <label className={`flex items-start space-x-3 cursor-pointer p-3 rounded-lg transition-all duration-200 ${
                          token.preset === "degen" 
                            ? "bg-accent/5 border border-accent/20" 
                            : "hover:bg-muted/20"
                        }`}>
                          <input
                            type="radio"
                            name="preset"
                            value="degen"
                            checked={token.preset === "degen"}
                            onChange={(e) => handleFormFieldChange("preset", e)}
                            className="text-primary focus:ring-primary mt-1 w-5 h-5 border-2 border-primary/30 checked:bg-primary checked:border-primary transition-all duration-200"
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-fg font-medium">
                                Degen Mode
                              </span>
                              <span className="bg-accent/20 text-accent text-xs px-2 py-1 rounded-full">
                                No Safeguards
                              </span>
                            </div>
                            <p className="text-muted text-sm mt-1">
                              No authority changes, maximum flexibility for
                              rapid deployment
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Vibe Selector */}
                    <div className="mt-6">
                      <label className="block text-muted mb-3 font-semibold">
                        Token Vibe
                      </label>
                      <div className="space-y-3">
                        <label className={`flex items-start space-x-3 cursor-pointer p-3 rounded-lg transition-all duration-200 ${
                          token.vibe === "funny" 
                            ? "bg-primary/5 border border-primary/20" 
                            : "hover:bg-muted/20"
                        }`}>
                          <input
                            type="radio"
                            name="vibe"
                            value="funny"
                            checked={token.vibe === "funny"}
                            onChange={(e) => handleFormFieldChange("vibe", e)}
                            className="text-primary focus:ring-primary mt-1 w-5 h-5 border-2 border-primary/30 checked:bg-primary checked:border-primary transition-all duration-200"
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-fg font-medium">Funny</span>
                              <span className="bg-primary/20 text-primary text-xs px-2 py-1 rounded-full">
                                Humorous
                              </span>
                            </div>
                            <p className="text-muted text-sm mt-1">
                              Light-hearted and meme-worthy content with lots of
                              emojis
                            </p>
                          </div>
                        </label>
                        <label className={`flex items-start space-x-3 cursor-pointer p-3 rounded-lg transition-all duration-200 ${
                          token.vibe === "serious" 
                            ? "bg-secondary/5 border border-secondary/20" 
                            : "hover:bg-muted/20"
                        }`}>
                          <input
                            type="radio"
                            name="vibe"
                            value="serious"
                            checked={token.vibe === "serious"}
                            onChange={(e) => handleFormFieldChange("vibe", e)}
                            className="text-primary focus:ring-primary mt-1 w-5 h-5 border-2 border-primary/30 checked:bg-primary checked:border-primary transition-all duration-200"
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-fg font-medium">
                                Serious
                              </span>
                              <span className="bg-secondary/20 text-secondary text-xs px-2 py-1 rounded-full">
                                Professional
                              </span>
                            </div>
                            <p className="text-muted text-sm mt-1">
                              Business-focused with technical terms and
                              professional tone
                            </p>
                          </div>
                        </label>
                        <label className={`flex items-start space-x-3 cursor-pointer p-3 rounded-lg transition-all duration-200 ${
                          token.vibe === "degen" 
                            ? "bg-accent/5 border border-accent/20" 
                            : "hover:bg-muted/20"
                        }`}>
                          <input
                            type="radio"
                            name="vibe"
                            value="degen"
                            checked={token.vibe === "degen"}
                            onChange={(e) => handleFormFieldChange("vibe", e)}
                            className="text-primary focus:ring-primary mt-1 w-5 h-5 border-2 border-primary/30 checked:bg-primary checked:border-primary transition-all duration-200"
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-fg font-medium">Degen</span>
                              <span className="bg-accent/20 text-accent text-xs px-2 py-1 rounded-full">
                                Hype
                              </span>
                            </div>
                            <p className="text-muted text-sm mt-1">
                              Extremely hype with rocket emojis and moon
                              references
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:ps-0 flex flex-col p-10 pb-0">
                  <div className="">
                    <div className="text-center text-right">
                      <ul className="flex flex-wrap gap-2 justify-end">
                        <li>
                          <a
                            onClick={() => setOpenCreateModal(false)}
                            className="group inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted/20 backdrop-blur-2xl transition-all duration-500 hover:bg-secondary-600/60"
                          >
                            <i className="text-xl text-fg group-hover:text-fg">
                              <AiOutlineClose />
                            </i>
                          </a>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="pb-6 my-auto">
                    <h4 className="mb-4 text-2xl font-bold text-fg">
                      Solana Token Creator
                    </h4>
                    <p className="text-muted mb-8 max-w-sm">
                      Kindly provide all the details about your token.
                    </p>

                    <div className="text-start">
                      <InputView
                        name="Name"
                        placeholder="name"
                        clickhandle={(e) => handleFormFieldChange("name", e)}
                      />

                      <InputView
                        name="Symbol"
                        placeholder="symbol"
                        clickhandle={(e) => handleFormFieldChange("symbol", e)}
                      />

                      <InputView
                        name="Decimals"
                        placeholder="decimals"
                        clickhandle={(e) =>
                          handleFormFieldChange("decimals", e)
                        }
                      />

                      <InputView
                        name="Amount"
                        placeholder="amount"
                        clickhandle={(e) => handleFormFieldChange("amount", e)}
                      />

                      <textarea
                        rows={6}
                        onChange={(e) =>
                          handleFormFieldChange("description", e)
                        }
                        className="border-muted relative mt-6 mb-6 block w-full rounded border-muted/10 bg-transparent py-1.5 px-3 text-fg/80 focus:border-muted/25 focus:ring-transparent"
                        placeholder="Description of your token"
                      ></textarea>

                      {/* Wallet Connection Status */}
                      <div className="mb-4 text-center">
                        {!publicKey ? (
                          <div className="bg-danger/20 border border-danger/30 rounded-lg p-3 mb-4">
                            <p className="text-danger text-sm mb-2">
                              Wallet not connected
                            </p>
                            <WalletMultiButton className="bg-primary hover:bg-primary-600 text-bg font-bold py-2 px-4 rounded-lg transition-all duration-300" />
                          </div>
                        ) : (
                          <div className="bg-success/20 border border-success/30 rounded-lg p-3 mb-4">
                            <p className="text-success text-sm">
                              ✅ Wallet connected:{" "}
                              {publicKey.toString().slice(0, 4)}...
                              {publicKey.toString().slice(-4)}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="text-center">
                        <button
                          type="submit"
                          onClick={() => createToken(token)}
                          disabled={!publicKey || isLoading}
                          className={`group mt-5 inline-flex w-full items-center justify-center rounded-lg px-6 py-2 backdrop-blur-2xl transition-all duration-500 ${
                            !publicKey
                              ? "bg-muted/50 text-muted cursor-not-allowed"
                              : "bg-primary-600/90 text-white hover:bg-primary-600 hover:text-bg"
                          }`}
                        >
                          <span className="fw-bold">
                            {!publicKey
                              ? "Connect Wallet First"
                              : isLoading
                              ? "Creating Token..."
                              : "Create Token"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="flex w-full items-center py-6 px-0 lg:h-screen lg:p-10">
          <div className="container">
            <div className="bg-bg/40 mx-auto max-w-5xl overflow-hidden backdrop-blur-2xl modal-grid">
              <div className="grid gap-10 lg:grid-cols-2">
                {/* FIRST */}
                <Branding
                  image="auth-img"
                  title="To build your Solana token creator"
                  message="Try and create your first ever Solana project"
                />

                {/* SECOND */}
                <div className="lg:ps-0 flex h-full flex-col p-10">
                  <div className="pb-10">
                    <a className="flex">
                      <img
                        src="assets/images/logo1.png"
                        alt="logo"
                        className="h-10"
                      />
                    </a>
                  </div>

                  <div className="my-auto pb-6 text-center">
                    <h4 className="mb-4 text-2xl font-bold text-fg">
                      Link to your new token
                    </h4>
                    <p className="text-muted mx-auto mb-5 max-w-sm">
                      Your Solana token is successfully created, check now on
                      explorer
                    </p>

                    <div className="flex items-start justify-center">
                      <img
                        src={token.image || "assets/images/logo1.png"}
                        alt=""
                        className="h-40"
                      />
                    </div>

                    {/* Preset Badge */}
                    <div className="mt-4 text-center">
                      <PresetBadge
                        preset={token.preset}
                        isOnChainVerified={isOnChainVerified}
                      />
                    </div>

                    {/* Honest Launch Enforcer - only show for honest preset */}
                    {token.preset === "honest" && (
                      <div className="mt-4">
                        <HonestLaunchEnforcer
                          mintAddress={tokenMintAddress}
                          preset={token.preset}
                          onVerificationChange={handleVerificationChange}
                        />
                      </div>
                    )}

                    <div className="mt-5 w-full text-center">
                      <p className="text-muted text-base font-medium leading-6">
                        <InputView
                          name={"Token Address"}
                          placeholder={tokenMintAddress}
                        />
                        <span
                          className="cursor-pointer"
                          onClick={() =>
                            navigator.clipboard.writeText(tokenMintAddress)
                          }
                        >
                          Copy
                        </span>
                      </p>

                      <div className="mb-6 text-center space-y-3">
                        <a
                          href={`https://explorer.solana.com/address/${tokenMintAddress}?cluster=${networkConfiguration}`}
                          target="_blank"
                          rel="noferrer"
                          className="bg-primary-600/90 hover:bg-primary-600 group inline-flex w-full items-center justify-center rounded-lg px-6 py-2 text-bg backdrop-blur-2xl transition-all duration-500"
                        >
                          <span className="fw-bold">View on Solana</span>
                        </a>

                        <a
                          href={`/meme-kit?name=${encodeURIComponent(
                            token.name
                          )}&ticker=${encodeURIComponent(token.symbol)}`}
                          className="bg-secondary hover:bg-secondary-600 group inline-flex w-full items-center justify-center rounded-lg px-6 py-2 text-bg backdrop-blur-2xl transition-all duration-500"
                        >
                          <span className="fw-bold">Get Your Meme Kit</span>
                        </a>

                        <a
                          href={`/liquidity?tokenMint=${encodeURIComponent(
                            tokenMintAddress
                          )}&dex=Raydium&pair=SOL/TOKEN`}
                          className="bg-accent hover:bg-accent/80 group inline-flex w-full items-center justify-center rounded-lg px-6 py-2 text-bg backdrop-blur-2xl transition-all duration-500"
                        >
                          <span className="fw-bold">Add Liquidity</span>
                        </a>

                        <a
                          href={`/token/${tokenMintAddress}`}
                          className="bg-muted/20 hover:bg-muted/30 group inline-flex w-full items-center justify-center rounded-lg px-6 py-2 text-fg backdrop-blur-2xl transition-all duration-500"
                        >
                          <span className="fw-bold">View Share Page</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="">
                    <div className="text-center">
                      <ul className="flex flex-wrap items-center justify-center gap-2">
                        <li>
                          <a
                            onClick={() => setOpenCreateModal(false)}
                            className="group inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted/20 backdrop-blur-2xl transition-all duration-500 hover:bg-secondary-600/60"
                          >
                            <i className="text-2xl text-fg group-hover:text-fg">
                              <AiOutlineClose />
                            </i>
                          </a>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
};
