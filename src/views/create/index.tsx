import React, { FC, useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { DEV_RELAX_CONFIRM_MS } from "../../lib/env";
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
import { normalizeError } from "../../lib/errors";
import { retryWithBackoff } from "../../lib/confirmRetry";
import { withRpc } from "../../lib/rpc";
import { ClipLoader } from "react-spinners";
import { useNetworkConfiguration } from "contexts/NetworkConfigurationProvider";
import { tokenStorage } from "../../utils/tokenStorage";

import { AiOutlineClose } from "react-icons/ai";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import CreateSVG from "../../components/SVG/CreateSVG";
import { Branding } from "../../components/Branding";
import { PresetBadge } from "../../components/PresetBadge";
import HonestLaunchEnforcer from "../../components/HonestLaunchEnforcer";
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

      // Validate numeric fields
      const decimals = Number(token.decimals);
      const amount = Number(token.amount);
      
      if (isNaN(decimals) || decimals < 0 || decimals > 9) {
        notify({
          type: "error",
          message: "Decimals must be a number between 0 and 9",
        });
        return;
      }
      
      if (isNaN(amount) || amount <= 0) {
        notify({
          type: "error",
          message: "Amount must be a positive number",
        });
        return;
      }
      
      // Check if mint amount would overflow
      const mintAmount = amount * Math.pow(10, decimals);
      if (mintAmount > Number.MAX_SAFE_INTEGER) {
        notify({
          type: "error",
          message: "Token amount is too large. Please reduce the amount or decimals.",
        });
        return;
      }

      setIsLoading(true);
      
      // Use RPC fallback system with retry logic for maximum reliability
      const lamports = await withRpc(async (rpcConnection) => {
        return await retryWithBackoff(() => 
          getMinimumBalanceForRentExemptMint(rpcConnection)
        );
      });
      const mintKeypair = Keypair.generate();
      const tokenATA = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        publicKey
      );

      try {
        console.log("[createToken] Uploading metadata...");
        const metadataUrl = await uploadMetadata(token);
        console.log("[createToken] Metadata uploaded to:", metadataUrl);

        console.log("[createToken] Creating metadata instruction...");
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
        console.log("[createToken] Metadata instruction created successfully");

        // Debug transaction parameters
        console.log("[createToken] Transaction parameters:");
        console.log("- publicKey:", publicKey.toBase58());
        console.log("- mintKeypair:", mintKeypair.publicKey.toBase58());
        console.log("- tokenATA:", tokenATA.toBase58());
        console.log("- decimals:", Number(token.decimals));
        console.log("- amount:", Number(token.amount));
        console.log("- mint amount:", Number(token.amount) * Math.pow(10, Number(token.decimals)));
        console.log("- lamports:", lamports);
        
        // Create the transaction
        const createNewTokenTransaction = new Transaction().add(
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

        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        createNewTokenTransaction.recentBlockhash = blockhash;
        createNewTokenTransaction.feePayer = publicKey;
        
        // Create a copy for simulation (we'll partially sign this one)
        const simulationTransaction = Transaction.from(createNewTokenTransaction.serialize({ requireAllSignatures: false }));
        simulationTransaction.partialSign(mintKeypair);
        
        // Simulate the transaction first to catch issues
        console.log("[createToken] Simulating transaction...");
        try {
          const simulation = await connection.simulateTransaction(simulationTransaction);
          console.log("[createToken] Simulation result:", simulation);
          
          if (simulation.value.err) {
            console.error("[createToken] Simulation failed:", simulation.value.err);
            throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`);
          }
          
          console.log("[createToken] Simulation successful, sending transaction...");
        } catch (simError) {
          console.error("[createToken] Simulation error:", simError);
          throw new Error(`Transaction simulation failed: ${simError.message}`);
        }

        // Send the original (unsigned) transaction
        const signature = await sendTransaction(
          createNewTokenTransaction,
          connection,
          {
            signers: [mintKeypair],
          }
        );

        // Wait for transaction confirmation before setting tokenMintAddress
        console.log("Waiting for transaction confirmation...");
        
        // Use retry logic for transaction confirmation
        await retryWithBackoff(() => {
          const confirmPromise = connection.confirmTransaction(
            signature,
            "confirmed"
          );

          return (DEV_RELAX_CONFIRM_MS > 0
            ? Promise.race([
                confirmPromise,
                new Promise<never>((_, reject) =>
                  setTimeout(
                    () => reject(new Error("Confirmation timeout")),
                    DEV_RELAX_CONFIRM_MS
                  )
                ),
              ])
            : confirmPromise);
        });
        console.log("Transaction confirmed!");

        const mintAddress = mintKeypair.publicKey.toString();
        setTokenMintAddress(mintAddress);

        // Create complete token metadata
        const tokenMetadata = {
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
          creatorWallet: publicKey.toBase58(),
          links: token.links || {},
        };

        // Store token data locally
        tokenStorage.storeToken(tokenMetadata);

        // Log complete token metadata to database (non-blocking)
        console.log('[CreateToken] Logging token to database:', tokenMetadata);
        fetch("/api/my-tokens/log", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(tokenMetadata),
        }).then((response) => {
          console.log('[CreateToken] Database logging response:', response.status, response.statusText);
          return response.json();
        }).then((result) => {
          console.log('[CreateToken] Database logging result:', result);
        }).catch((error) => {
          console.error("Failed to log token creation:", error);
          // Non-blocking - don't show error to user
        });

        notify({
          type: "success",
          message: "Token was created successfully",
          txid: signature,
        });
      } catch (error: any) {
        // Log the actual error for debugging
        console.error("Token creation error:", error);
        console.error("Error name:", error?.name);
        console.error("Error message:", error?.message);
        console.error("Error stack:", error?.stack);
        
        // Use the error normalization system for better error messages
        const normalizedError = normalizeError(error);
        
        notify({
          type: "error",
          message: normalizedError.message,
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

        // Upload via secure server-side API endpoint
        const response = await axios({
          method: "POST",
          url: "/api/ipfs/upload",
          data: formData,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        if (!response.data.ok) {
          throw new Error(response.data.message || "Upload failed");
        }

        const ImgHash = response.data.ipfsUrl;
        setIsLoading(false);
        return ImgHash;
      } catch (error: any) {
        console.error(`IPFS image file upload error: ${error}`);
        notify({ 
          type: "error", 
          message: error?.response?.data?.message || "Upload image failed" 
        });
        setIsLoading(false);
        return;
      }
    }
  };

  // METADATA UPLOAD - Secure server-side upload
  const uploadMetadata = async (token): Promise<string> => {
    setIsLoading(true);
    const { name, symbol, description, image } = token;
    if (!name || !symbol || !description || !image) {
      notify({ type: "error", message: "Data is missing" });
      return "";
    }

    const metadata = {
      name: name,
      symbol: symbol,
      description: description,
      image: image,
    };

    try {
      // Upload via secure server-side API endpoint
      const response = await axios({
        method: "POST",
        url: "/api/ipfs/upload",
        data: { metadata },
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.data.ok) {
        throw new Error(response.data.message || "Metadata upload failed");
      }

      return response.data.ipfsUrl;
    } catch (error: any) {
      console.error("IPFS metadata upload error:", error);
      notify({ 
        type: "error", 
        message: error?.response?.data?.message || "Upload to IPFS failed" 
      });
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
                        <label
                          className={`flex items-start space-x-3 cursor-pointer p-3 rounded-lg transition-all duration-200 ${
                            token.preset === "honest"
                              ? "bg-primary/5 border border-primary/20"
                              : "hover:bg-muted/20"
                          }`}
                        >
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
                        <label
                          className={`flex items-start space-x-3 cursor-pointer p-3 rounded-lg transition-all duration-200 ${
                            token.preset === "degen"
                              ? "bg-accent/5 border border-accent/20"
                              : "hover:bg-muted/20"
                          }`}
                        >
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
                        <label
                          className={`flex items-start space-x-3 cursor-pointer p-3 rounded-lg transition-all duration-200 ${
                            token.vibe === "funny"
                              ? "bg-primary/5 border border-primary/20"
                              : "hover:bg-muted/20"
                          }`}
                        >
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
                        <label
                          className={`flex items-start space-x-3 cursor-pointer p-3 rounded-lg transition-all duration-200 ${
                            token.vibe === "serious"
                              ? "bg-secondary/5 border border-secondary/20"
                              : "hover:bg-muted/20"
                          }`}
                        >
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
                        <label
                          className={`flex items-start space-x-3 cursor-pointer p-3 rounded-lg transition-all duration-200 ${
                            token.vibe === "degen"
                              ? "bg-accent/5 border border-accent/20"
                              : "hover:bg-muted/20"
                          }`}
                        >
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
              <div>
                {/* FIRST */}
                {/*                 <Branding
                  image="auth-img"
                  title="To build your Solana token creator"
                  message="Try and create your first ever Solana project"
                /> */}

                {/* SECOND */}
                <div className="lg:ps-0 flex h-full flex-col p-6">
                  <div className="pb-10 grid grid-cols-2">
                    <div>
                      <a className="flex">
                        <img
                          src="assets/images/logo1.png"
                          alt="logo"
                          className="h-10"
                        />
                      </a>
                    </div>
                    <div>
                      <ul className="text-right">
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

                  <div className="my-auto text-center">
                    <h4 className="mb-4 text-2xl font-bold text-fg">
                      Your new token
                    </h4>
                    <p className="text-muted mx-auto mb-5 max-w-sm">
                      Your Solana token is successfully created, check now on explorer
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

                    {/* Honest Launch Enforcer - only show for honest preset and when token is created */}
                    {token.preset === "honest" && tokenMintAddress && (
                      <div className="mt-4">
                        <HonestLaunchEnforcer
                          mintAddress={tokenMintAddress}
                          preset={token.preset}
                          onVerificationChange={handleVerificationChange}
                        />
                      </div>
                    )}

                    <div className="mt-5 w-full text-center">
                      <div className="text-muted text-base font-medium leading-6">
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
                      </div>

                      <div className="mt-6">
                        <p className="text-muted mb-4 text-sm">
                          3 quick steps to maximize your token's success
                        </p>
                        
                        <a
                          href={`/token/created/${tokenMintAddress}/honest-launch`}
                          className="btn btn-primary items-center rounded-lg px-8 py-3 transition-all duration-500 text-lg font-semibold"
                        >
                          <span className="fw-bold">Complete Your Launch</span>
                        </a>
                        
                        <div className="mt-4">
                          <a
                            href={`https://explorer.solana.com/address/${tokenMintAddress}?cluster=${networkConfiguration}`}
                            target="_blank"
                            rel="noferrer"
                            className="btn btn-secondary items-center rounded-lg px-6 py-2 transition-all duration-500 mr-2"
                          >
                            <span className="fw-bold">View on Solana</span>
                          </a>
                          
                          <a
                            href={`/token/${tokenMintAddress}`}
                            className="btn btn-secondary items-center rounded-lg px-6 py-2 transition-all duration-500"
                          >
                            <span className="fw-bold">View Share Page</span>
                          </a>
                        </div>
                      </div>
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
