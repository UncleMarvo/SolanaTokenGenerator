import React, { FC, useCallback, useState } from "react";
import Head from "next/head";
import Link from "next/link";
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
} from "@metaplex-foundation/mpl-token-metadata";
import axios from "axios";
import { notify } from "../../utils/notifications";
import { normalizeError } from "../../lib/errors";
import { retryWithBackoff } from "../../lib/confirmRetry";
import { withRpc } from "../../lib/rpc";
import { ClipLoader } from "react-spinners";
import { useNetworkConfiguration } from "contexts/NetworkConfigurationProvider";
import { tokenStorage } from "../../utils/tokenStorage";
import { hasFeature } from "../../lib/tokenPricing";

import { ArrowLeft, Upload, Lock } from "lucide-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import CreateSVG from "../../components/SVG/CreateSVG";
import { Branding } from "../../components/Branding";
import { PresetBadge } from "../../components/PresetBadge";
import HonestLaunchEnforcer from "../../components/HonestLaunchEnforcer";
// Remove InputView import as we'll implement image upload directly

interface FreeTokenCreationPageProps {}

export const FreeTokenCreationPage: FC<FreeTokenCreationPageProps> = () => {
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

  // IMAGE UPLOAD FUNCTION
  const handleImageChange = async (event) => {
    const file = event.target.files[0];

    if (file) {
      const imgUrl = await uploadImagePinata(file);
      setToken({ ...token, image: imgUrl });
    }
  };

  const uploadImagePinata = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios({
        method: "POST",
        url: "https://api.pinata.cloud/pinning/pinFileToIPFS",
        data: formData,
        headers: {
          pinata_api_key: process.env.NEXT_PUBLIC_PINATA_API_KEY,
          pinata_secret_api_key: process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY,
          "Content-Type": "multipart/form-data",
        },
      });

      return `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;
    } catch (error: any) {
      notify({ type: "error", message: "Upload to Pinata failed" });
      return "";
    }
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
      
      try {
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

        // Create the token metadata URI
        const tokenMetadata = {
          name: token.name,
          symbol: token.symbol,
          description: token.description,
          image: token.image,
          attributes: [
            {
              trait_type: "Preset",
              value: token.preset,
            },
            {
              trait_type: "Vibe",
              value: token.vibe,
            },
            {
              trait_type: "Creation Type",
              value: "free",
            },
          ],
        };

        // Upload metadata to IPFS
        const metadataResponse = await axios.post(
          "https://api.pinata.cloud/pinning/pinJSONToIPFS",
          tokenMetadata,
          {
            headers: {
              "Content-Type": "application/json",
              pinata_api_key: process.env.NEXT_PUBLIC_PINATA_API_KEY,
              pinata_secret_api_key: process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY,
            },
          }
        );

        const tokenUri = `https://gateway.pinata.cloud/ipfs/${metadataResponse.data.IpfsHash}`;
        setTokenUri(tokenUri);

        // Create the transaction
        const transaction = new Transaction();

        // Add rent exemption instruction
        transaction.add(
          SystemProgram.createAccount({
            fromPubkey: publicKey,
            newAccountPubkey: mintKeypair.publicKey,
            space: MINT_SIZE,
            lamports,
            programId: TOKEN_PROGRAM_ID,
          })
        );

        // Initialize mint
        transaction.add(
          createInitializeMintInstruction(
            mintKeypair.publicKey,
            decimals,
            publicKey,
            publicKey
          )
        );

        // Create metadata account
        transaction.add(
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
                  uri: tokenUri,
                  sellerFeeBasisPoints: 0,
                  creators: null,
                  collection: null,
                  uses: null,
                },
                isMutable: true,
                collectionDetails: null,
              },
            }
          )
        );

        // Create associated token account
        transaction.add(
          createAssociatedTokenAccountInstruction(
            publicKey,
            tokenATA,
            publicKey,
            mintKeypair.publicKey
          )
        );

        // Mint tokens to the associated token account
        transaction.add(
          createMintToInstruction(
            mintKeypair.publicKey,
            tokenATA,
            publicKey,
            mintAmount
          )
        );

        // Get recent blockhash and send transaction
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        // Sign and send transaction
        const signature = await sendTransaction(transaction, connection, {
          signers: [mintKeypair],
        });

        // Wait for confirmation
        await connection.confirmTransaction(signature, "confirmed");

        const mintAddress = mintKeypair.publicKey.toString();
        setTokenMintAddress(mintAddress);

        // Create complete token metadata
        const completeTokenMetadata = {
          mintAddress,
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          amount: token.amount,
          image: token.image,
          description: token.description,
          preset: token.preset,
          vibe: token.vibe || "degen",
          createdAt: Date.now(),
          creatorWallet: publicKey.toBase58(),
          links: {},
          tokenType: "free", // Free token creation
          paymentTxSig: null, // No payment for free tokens
          paidAmount: null, // No payment amount for free tokens
        };

        // Store token data locally
        tokenStorage.storeToken(completeTokenMetadata);

        // Log complete token metadata to database (non-blocking)
        fetch("/api/my-tokens/log", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(completeTokenMetadata),
        }).catch((error) => {
          console.error("Failed to log token creation:", error);
        });

        notify({
          type: "success",
          message: "Token was created successfully",
          txid: signature,
        });

        // Redirect to token page or show success
        window.location.href = `/token/${mintAddress}`;
      } catch (error: any) {
        console.error("Token creation error:", error);
        notify({
          type: "error",
          message: normalizeError(error).message,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [connection, publicKey, sendTransaction, networkConfiguration]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    createToken(token);
  };

  return (
    <>
      <Head>
        <title>Create Token - Free | Solana Token Creator</title>
        <meta
          name="description"
          content="Create your Solana token for free with basic features"
        />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Header */}
        <div className="border-b border-muted/10 bg-bg/40 backdrop-blur-2xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Link href="/pricing">
                  <a className="flex items-center space-x-2 text-muted hover:text-fg transition-colors">
                    <ArrowLeft size={20} />
                    <span>Back to Pricing</span>
                  </a>
                </Link>
                <div className="h-6 w-px bg-muted/20" />
                <h1 className="text-xl font-semibold text-fg">
                  Create Your Token - Free
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <WalletMultiButton className="wallet-adapter-button" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Side - Form */}
            <div className="space-y-8">
              {/* Token Type Info */}
              <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-6 border border-muted/10">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                    <CreateSVG />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-fg">Free Token Creation</h2>
                    <p className="text-sm text-muted">Basic features included</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-accent mb-2">Free</div>
                <p className="text-sm text-muted">
                  No payment required. Create your token instantly with basic features.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Image Upload */}
                <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-6 border border-muted/10">
                  <h3 className="text-lg font-semibold text-fg mb-4">Token Image</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-center w-full">
                      <label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-muted/20 border-dashed rounded-xl cursor-pointer bg-muted/5 hover:bg-muted/10 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-2 text-muted" />
                          <p className="mb-2 text-sm text-muted">
                            <span className="font-semibold">Click to upload</span> your token image
                          </p>
                          <p className="text-xs text-muted">PNG, JPG or GIF (MAX. 10MB)</p>
                        </div>
                        <input
                          id="image-upload"
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleImageChange}
                        />
                      </label>
                    </div>
                    {token.image && (
                      <div className="mt-4">
                        <p className="text-sm text-muted mb-2">Preview:</p>
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted/10">
                          <img
                            src={token.image}
                            alt="Token preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Basic Token Info */}
                <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-6 border border-muted/10">
                  <h3 className="text-lg font-semibold text-fg mb-4">Token Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-fg mb-2">
                        Token Name *
                      </label>
                      <input
                        type="text"
                        value={token.name}
                        onChange={(e) => handleFormFieldChange("name", e)}
                        className="w-full px-4 py-3 bg-bg/60 border border-muted/20 rounded-xl text-fg placeholder-muted focus:border-accent focus:ring-1 focus:ring-accent/20 transition-colors"
                        placeholder="My Awesome Token"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-fg mb-2">
                        Token Symbol *
                      </label>
                      <input
                        type="text"
                        value={token.symbol}
                        onChange={(e) => handleFormFieldChange("symbol", e)}
                        className="w-full px-4 py-3 bg-bg/60 border border-muted/20 rounded-xl text-fg placeholder-muted focus:border-accent focus:ring-1 focus:ring-accent/20 transition-colors"
                        placeholder="MAT"
                        maxLength={10}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-fg mb-2">
                          Decimals *
                        </label>
                        <input
                          type="number"
                          value={token.decimals}
                          onChange={(e) => handleFormFieldChange("decimals", e)}
                          className="w-full px-4 py-3 bg-bg/60 border border-muted/20 rounded-xl text-fg placeholder-muted focus:border-accent focus:ring-1 focus:ring-accent/20 transition-colors"
                          placeholder="9"
                          min="0"
                          max="9"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-fg mb-2">
                          Initial Amount *
                        </label>
                        <input
                          type="number"
                          value={token.amount}
                          onChange={(e) => handleFormFieldChange("amount", e)}
                          className="w-full px-4 py-3 bg-bg/60 border border-muted/20 rounded-xl text-fg placeholder-muted focus:border-accent focus:ring-1 focus:ring-accent/20 transition-colors"
                          placeholder="1000000"
                          min="1"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-fg mb-2">
                        Description *
                      </label>
                      <textarea
                        value={token.description}
                        onChange={(e) => handleFormFieldChange("description", e)}
                        className="w-full px-4 py-3 bg-bg/60 border border-muted/20 rounded-xl text-fg placeholder-muted focus:border-accent focus:ring-1 focus:ring-accent/20 transition-colors resize-none"
                        placeholder="Describe your token..."
                        rows={3}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Launch Preset */}
                <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-6 border border-muted/10">
                  <h3 className="text-lg font-semibold text-fg mb-4">Launch Preset</h3>
                  <div className="space-y-4">
                    <div className="flex space-x-4">
                      <button
                        type="button"
                        onClick={() => setToken({ ...token, preset: "honest" })}
                        className={`flex-1 p-4 rounded-xl border transition-all duration-300 ${
                          token.preset === "honest"
                            ? "border-accent/50 bg-accent/5"
                            : "border-muted/20 hover:border-muted/40"
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-lg font-semibold text-fg mb-2">Honest Launch</div>
                          <div className="text-sm text-muted">
                            Revoke mint & freeze authority for transparency
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setToken({ ...token, preset: "degen" })}
                        className={`flex-1 p-4 rounded-xl border transition-all duration-300 ${
                          token.preset === "degen"
                            ? "border-accent/50 bg-accent/5"
                            : "border-muted/20 hover:border-muted/40"
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-lg font-semibold text-fg mb-2">Degen Mode</div>
                          <div className="text-sm text-muted">
                            Keep mint authority for future tokenomics
                          </div>
                        </div>
                      </button>
                    </div>

                    <PresetBadge preset={token.preset} />
                  </div>
                </div>

                {/* Token Vibe */}
                <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-6 border border-muted/10">
                  <h3 className="text-lg font-semibold text-fg mb-4">Token Vibe</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {["funny", "serious", "degen"].map((vibe) => (
                      <button
                        key={vibe}
                        type="button"
                        onClick={() => setToken({ ...token, vibe: vibe as any })}
                        className={`p-3 rounded-xl border transition-all duration-300 capitalize ${
                          token.vibe === vibe
                            ? "border-accent/50 bg-accent/5"
                            : "border-muted/20 hover:border-muted/40"
                        }`}
                      >
                        {vibe}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pro Features (Disabled) */}
                <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-6 border border-muted/10 opacity-60">
                  <div className="flex items-center space-x-3 mb-4">
                    <Lock className="text-muted" size={20} />
                    <h3 className="text-lg font-semibold text-muted">Pro Features</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted/5 rounded-lg">
                      <span className="text-muted">Honest Launch Enforcement</span>
                      <span className="text-xs text-muted bg-muted/20 px-2 py-1 rounded">Pro Only</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/5 rounded-lg">
                      <span className="text-muted">AI Meme Kit Generation</span>
                      <span className="text-xs text-muted bg-muted/20 px-2 py-1 rounded">Pro Only</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/5 rounded-lg">
                      <span className="text-muted">Liquidity Pool Setup</span>
                      <span className="text-xs text-muted bg-muted/20 px-2 py-1 rounded">Pro Only</span>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <p className="text-sm text-primary">
                      Upgrade to Pro for advanced features and enhanced token launch capabilities.
                    </p>
                    <Link href="/pricing">
                      <a className="inline-flex items-center mt-2 text-sm text-primary hover:text-primary/80 transition-colors">
                        View Pro Features →
                      </a>
                    </Link>
                  </div>
                </div>

                {/* Create Token Button */}
                <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-6 border border-muted/10">
                  <button
                    type="submit"
                    disabled={isLoading || !publicKey}
                    className="w-full btn btn-accent py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center space-x-3">
                        <ClipLoader size={20} color="currentColor" />
                        <span>Creating Token...</span>
                      </div>
                    ) : (
                      "Create Free Token"
                    )}
                  </button>
                  <p className="text-center text-sm text-muted mt-3">
                    No payment required. Your token will be created instantly.
                  </p>
                </div>
              </form>
            </div>

            {/* Right Side - Preview */}
            <div className="space-y-6">
              <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-6 border border-muted/10 sticky top-8">
                <h3 className="text-lg font-semibold text-fg mb-4">Token Preview</h3>
                <div className="space-y-4">
                  {token.image && (
                    <div className="aspect-square w-full rounded-xl overflow-hidden bg-muted/10">
                      <img
                        src={token.image}
                        alt="Token preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  {!token.image && (
                    <div className="aspect-square w-full rounded-xl bg-muted/10 flex items-center justify-center">
                      <Upload className="text-muted" size={48} />
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-fg">
                      {token.name || "Token Name"}
                    </div>
                    <div className="text-lg text-muted">
                      ${token.symbol || "SYMBOL"}
                    </div>
                    {token.description && (
                      <div className="text-sm text-muted">
                        {token.description}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Type:</span>
                    <span className="text-accent font-semibold">Free</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FreeTokenCreationPage;
