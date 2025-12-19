"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "@/lib/api";
import { useWeb3 } from "@/hooks/useWeb3";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import type { TokenStandard, NFTAttribute } from "@/types";

export default function CreatePage() {
  const router = useRouter();
  const { isConnected, signMessage } = useWeb3();
  const { isAuthenticated, login } = useAuth();
  const { address } = useWeb3();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tokenStandard, setTokenStandard] = useState<TokenStandard>("ERC721");
  const [editionSize, setEditionSize] = useState(1);
  const [royalty, setRoyalty] = useState(5);
  const [attributes, setAttributes] = useState<NFTAttribute[]>([]);

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [uploadedUrl, setUploadedUrl] = useState("");

  // Loading states
  const [uploading, setUploading] = useState(false);
  const [minting, setMinting] = useState(false);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error("Please select a valid image file (JPEG, PNG, GIF, or WebP)");
      return;
    }

    // Validate file size (10MB max)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setUploadedUrl("");
  }, []);

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    setUploading(true);
    try {
      const result = await api.uploadImage(file);
      setUploadedUrl(result.ipfs_url);
      toast.success("Image uploaded to IPFS!");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleAddAttribute = () => {
    setAttributes([...attributes, { trait_type: "", value: "" }]);
  };

  const handleRemoveAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const handleAttributeChange = (index: number, field: "trait_type" | "value", value: string) => {
    const updated = [...attributes];
    updated[index][field] = value;
    setAttributes(updated);
  };

  const handleMint = async () => {
    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }

    if (!uploadedUrl) {
      toast.error("Please upload an image first");
      return;
    }

    setMinting(true);
    try {
      // Filter out empty attributes
      const validAttributes = attributes.filter((a) => a.trait_type && a.value);

      const result = await api.mintNFT({
        name: name.trim(),
        description: description.trim() || undefined,
        image_url: uploadedUrl,
        token_standard: tokenStandard,
        edition_size: tokenStandard === "ERC1155" ? editionSize : 1,
        royalty_percentage: royalty,
        attributes: validAttributes.length > 0 ? validAttributes : undefined,
      });

      toast.success("NFT metadata created! Sign the transaction to mint.");
      console.log("Mint result:", result);

      // In a real app, you would now prompt the user to sign the mint transaction
      // and then call the sync endpoint after the transaction is confirmed

      router.push("/explore");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setMinting(false);
    }
  };

  const handleConnect = async () => {
    if (address) {
      await login(address, signMessage);
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create NFT</h1>
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          Connect your wallet to start creating NFTs
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-8 px-8 py-3 rounded-lg font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create NFT</h1>
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          Please sign in to create NFTs
        </p>
        <button
          onClick={handleConnect}
          className="mt-8 px-8 py-3 rounded-lg font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create NFT</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        Upload your artwork and create a new NFT
      </p>

      <div className="mt-8 space-y-6">
        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Artwork *
          </label>
          <div
            className={cn(
              "border-2 border-dashed rounded-xl p-6 text-center",
              "hover:border-primary-500 transition-colors cursor-pointer",
              preview ? "border-primary-500" : "border-gray-300 dark:border-gray-600"
            )}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            {preview ? (
              <div className="relative aspect-square max-w-sm mx-auto">
                <Image
                  src={preview}
                  alt="Preview"
                  fill
                  className="object-contain rounded-lg"
                />
              </div>
            ) : (
              <div className="py-8">
                <svg
                  className="w-12 h-12 mx-auto text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="mt-4 text-gray-600 dark:text-gray-400">
                  Click to upload or drag and drop
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
                  PNG, JPG, GIF, or WebP (max 10MB)
                </p>
              </div>
            )}
            <input
              id="file-input"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {file && !uploadedUrl && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="mt-4 w-full px-4 py-2 rounded-lg font-medium bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
            >
              {uploading ? "Uploading to IPFS..." : "Upload to IPFS"}
            </button>
          )}

          {uploadedUrl && (
            <p className="mt-2 text-sm text-green-600 dark:text-green-400">
              Uploaded to IPFS successfully
            </p>
          )}
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter NFT name"
            className="w-full px-4 py-2 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter NFT description"
            rows={4}
            className="w-full px-4 py-2 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
        </div>

        {/* Token Standard */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Token Standard
          </label>
          <div className="flex gap-4">
            {(["ERC721", "ERC1155"] as const).map((standard) => (
              <button
                key={standard}
                onClick={() => setTokenStandard(standard)}
                className={cn(
                  "flex-1 px-4 py-3 rounded-lg font-medium border transition-colors",
                  tokenStandard === standard
                    ? "border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
                    : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                )}
              >
                <span className="block font-semibold">{standard}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {standard === "ERC721" ? "Single edition" : "Multiple editions"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Edition Size (for ERC-1155) */}
        {tokenStandard === "ERC1155" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Edition Size
            </label>
            <input
              type="number"
              min={1}
              value={editionSize}
              onChange={(e) => setEditionSize(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-4 py-2 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        )}

        {/* Royalty */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Royalty Percentage
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={10}
              step={0.5}
              value={royalty}
              onChange={(e) => setRoyalty(parseFloat(e.target.value))}
              className="flex-1"
            />
            <span className="w-12 text-right text-gray-900 dark:text-white">{royalty}%</span>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            You'll earn this percentage on all secondary sales
          </p>
        </div>

        {/* Attributes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Attributes
            </label>
            <button
              onClick={handleAddAttribute}
              className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              + Add attribute
            </button>
          </div>
          {attributes.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Add attributes to describe your NFT's traits
            </p>
          ) : (
            <div className="space-y-2">
              {attributes.map((attr, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Trait name"
                    value={attr.trait_type}
                    onChange={(e) => handleAttributeChange(index, "trait_type", e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={attr.value}
                    onChange={(e) => handleAttributeChange(index, "value", e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    onClick={() => handleRemoveAttribute(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleMint}
          disabled={!name || !uploadedUrl || minting}
          className="w-full px-4 py-3 rounded-lg font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {minting ? "Creating NFT..." : "Create NFT"}
        </button>
      </div>
    </div>
  );
}
