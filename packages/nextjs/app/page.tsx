"use client";

import type { NextPage } from "next";
import { useState, useEffect } from "react";  // Add useEffect here
import { useAccount, useChainId } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { formatEther, parseEther } from "viem";
import deployedContracts from "~~/contracts/deployedContracts";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const currentChainId = useChainId() || 11155111;

  // Solución: Cast el chainId al tipo correcto
  const chainId = currentChainId as keyof typeof deployedContracts;
  
  // Siempre declarar los hooks primero
  const [tokenAAmount, setTokenAAmount] = useState<string>("");
  const [tokenBAmount, setTokenBAmount] = useState<string>("");
  const [isSwappingAForB, setIsSwappingAForB] = useState<boolean>(true);

  const { writeContractAsync: writeMyTokenMint } = useScaffoldWriteContract("MyToken");
  const { writeContractAsync: writeMyToken2Mint } = useScaffoldWriteContract("MyToken2");
  //const { writeContractAsync: writeMyTokenTransfer } = useScaffoldWriteContract("MyToken");
  //const { writeContractAsync: writeMyToken2Transfer } = useScaffoldWriteContract("MyToken2");
  const { writeContractAsync: writeMyTokenApprove } = useScaffoldWriteContract("MyToken");
  const { writeContractAsync: writeMyToken2Approve } = useScaffoldWriteContract("MyToken2");
  const { writeContractAsync: writeSimpleSwapAddLiquidity } = useScaffoldWriteContract("SimpleSwap");
  const { writeContractAsync: writeSimpleSwapSwapTokens } = useScaffoldWriteContract("SimpleSwap");

  const { data: reserveA } = useScaffoldReadContract({
    contractName: "SimpleSwap",
    functionName: "reserveA",
  });

  const { data: reserveB } = useScaffoldReadContract({
    contractName: "SimpleSwap",
    functionName: "reserveB",
  });

  const { data: amountOut } = useScaffoldReadContract({
    contractName: "SimpleSwap",
    functionName: "getAmountOut",
    args: [
      isSwappingAForB ? parseEther(tokenAAmount || "0") : parseEther(tokenBAmount || "0"),
      isSwappingAForB ? reserveA : reserveB,
      isSwappingAForB ? reserveB : reserveA,
    ],
    enabled: (isSwappingAForB && tokenAAmount !== "") || (!isSwappingAForB && tokenBAmount !== ""),
  });

  const { data: myTokenBalance } = useScaffoldReadContract({
    contractName: "MyToken",
    functionName: "balanceOf",
    args: [connectedAddress],
    watch: true, // To keep the balance updated
  });

  const { data: myToken2Balance } = useScaffoldReadContract({
    contractName: "MyToken2",
    functionName: "balanceOf",
    args: [connectedAddress],
    watch: true, // To keep the balance updated
  });

  // Verificar si el chainId existe en deployedContracts DESPUÉS de los hooks
  if (!deployedContracts[chainId]) {
    console.error(`Chain ID ${currentChainId} not found in deployed contracts`);
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Unsupported Network</h2>
          <p>Chain ID {currentChainId} is not supported</p>
        </div>
      </div>
    );
  }

  const myTokenAddress = deployedContracts[chainId].MyToken.address;
  const myToken2Address = deployedContracts[chainId].MyToken2.address;
  const simpleSwapAddress = deployedContracts[chainId].SimpleSwap.address;


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, tokenType: "A" | "B") => {
    const value = e.target.value;
    if (tokenType === "A") {
      setTokenAAmount(value);
    } else {
      setTokenBAmount(value);
    }
  };

  // Update tokenBAmount when amountOut changes (for A to B swap)
  useEffect(() => {
    if (isSwappingAForB && amountOut !== undefined) {
      setTokenBAmount(formatEther(amountOut));
    }
  }, [amountOut, isSwappingAForB]);

  // Update tokenAAmount when amountOut changes (for B to A swap)
  useEffect(() => {
    if (!isSwappingAForB && amountOut !== undefined) {
      setTokenAAmount(formatEther(amountOut));
    }
  }, [amountOut, isSwappingAForB]);

 

  const handleAddLiquidity = async () => {
    const amountA = parseEther("100");
    const amountB = parseEther("100");

    try {
      await writeMyTokenMint({
        functionName: "mint",
        args: [amountA],
      });
      await writeMyToken2Mint({
        functionName: "mint",
        args: [amountB],
      });

      await writeMyTokenApprove({
        functionName: "approve",
        args: [simpleSwapAddress, amountA],
      });
      await writeMyToken2Approve({
        functionName: "approve",
        args: [simpleSwapAddress, amountB],
      });

      await writeSimpleSwapAddLiquidity({
        functionName: "addLiquidity",
        args: [
          myTokenAddress,
          myToken2Address,
          amountA,
          amountB,
          0,
          0,
          connectedAddress,
          BigInt(Math.floor(Date.now() / 1000) + 60 * 20),
        ],
      });
    } catch (e) {
      console.error("Error adding liquidity:", e);
    }
  };

  const handleSwap = async () => {
    try {
      const amountIn = isSwappingAForB ? parseEther(tokenAAmount) : parseEther(tokenBAmount);
      const amountOutMin = amountOut ? amountOut : 0n;
      const path = isSwappingAForB ? [myTokenAddress, myToken2Address] : [myToken2Address, myTokenAddress];
      const to = connectedAddress;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);

      if (isSwappingAForB) {
        await writeMyTokenApprove({
          functionName: "approve",
          args: [simpleSwapAddress, amountIn],
        });
      } else {
        await writeMyToken2Approve({
          functionName: "approve",
          args: [simpleSwapAddress, amountIn],
        });
      }

      await writeSimpleSwapSwapTokens({
        functionName: "swapExactTokensForTokens",
        args: [amountIn, amountOutMin, path, to, deadline],
      });
    } catch (e) {
      console.error("Error during swap:", e);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-end p-6 max-w-7xl mx-auto w-full">
          <div className="flex items-center space-x-4">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl px-4 py-2 border border-slate-700">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-gray-300 text-sm">
                  <Address address={connectedAddress} />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-around p-6">
          <img src="/images/image.jpg" alt="SwapPorFavor Logo" className="w-220 h-40 rounded-xl object-cover shadow-lg" />
          <div className="w-full max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              
              {/* Left side - Add Liquidity */}
              <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50 hover:border-purple-500/50 transition-all duration-300">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Add Liquidity</h3>
                  <p className="text-gray-400 mb-8">Provide liquidity, its may take up to 5 txs</p>
                  <button
                    onClick={handleAddLiquidity}
                    disabled={!connectedAddress}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed"
                  >
                    {connectedAddress ? "Add Liquidity" : "Connect Wallet"}
                  </button>
                </div>
              </div>

              {/* Right side - Swap Interface */}
              <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50 hover:border-purple-500/50 transition-all duration-300">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">Swap Tokens</h3>
                  {/*<p className="text-gray-400">Trade tokens instantly</p>*/}
                </div>

                <div className="space-y-4">
                  {/* From Token */}
                  <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-600/30">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400 text-sm">From</span>
                      <span className="text-gray-400 text-sm">Balance: {isSwappingAForB ? (myTokenBalance !== undefined ? formatEther(myTokenBalance) : "0.00") : (myToken2Balance !== undefined ? formatEther(myToken2Balance) : "0.00")}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2 bg-slate-800 rounded-lg px-3 py-2">
                        <img 
                          src={isSwappingAForB ? "/icons/usdc.svg" : "/icons/wbtc.svg"} 
                          alt="Token" 
                          className="w-6 h-6" 
                        />
                        <span className="text-white font-medium">
                          {isSwappingAForB ? "USDC" : "WBTC"}
                        </span>
                      </div>
                      <input
                        type="text"
                        placeholder="0.0"
                        className="flex-1 bg-transparent text-white text-xl font-medium outline-none placeholder-gray-500"
                        value={isSwappingAForB ? tokenAAmount : tokenBAmount}
                        onChange={(e) => handleInputChange(e, isSwappingAForB ? "A" : "B")}
                      />
                    </div>
                  </div>

                  {/* Swap Button */}
                  <div className="flex justify-center">
                    <button
                      onClick={() => setIsSwappingAForB(prev => !prev)}
                      className="w-12 h-12 bg-slate-700 hover:bg-slate-600 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110"
                    >
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                    </button>
                  </div>

                  {/* To Token */}
                  <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-600/30">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400 text-sm">To</span>
                      <span className="text-gray-400 text-sm">Balance: {isSwappingAForB ? (myToken2Balance !== undefined ? formatEther(myToken2Balance) : "0.00") : (myTokenBalance !== undefined ? formatEther(myTokenBalance) : "0.00")}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2 bg-slate-800 rounded-lg px-3 py-2">
                        <img 
                          src={isSwappingAForB ? "/icons/wbtc.svg" : "/icons/usdc.svg"} 
                          alt="Token" 
                          className="w-6 h-6" 
                        />
                        <span className="text-white font-medium">
                          {isSwappingAForB ? "WBTC" : "USDC"}
                        </span>
                      </div>
                      <input
                        type="text"
                        placeholder="0.0"
                        className="flex-1 bg-transparent text-white text-xl font-medium outline-none placeholder-gray-500"
                        value={isSwappingAForB ? tokenBAmount : tokenAAmount}
                        disabled
                      />
                    </div>
                  </div>

                  {/* Price Info */}
                  {amountOut && (
                    <div className="bg-slate-900/30 rounded-lg p-3 border border-slate-600/20">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Expected Output</span>
                        <span className="text-white">
                          {formatEther(amountOut)} {isSwappingAForB ? "WBTC" : "USDC"}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Swap Button */}
                  <button
                    onClick={handleSwap}
                    disabled={!connectedAddress || (!tokenAAmount && !tokenBAmount)}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    {!connectedAddress ? "Connect Wallet" : (!tokenAAmount && !tokenBAmount ? "Enter amount" : "Swap")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.1); opacity: 0.3; }
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animate-pulse {
          animation: pulse 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Home;