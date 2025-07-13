"use client";

import React, { useRef, useState } from "react";
{/*import Image from "next/image";*/}
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hardhat } from "viem/chains";
import { Bars3Icon, BugAntIcon } from "@heroicons/react/24/outline";
import { FaucetButton, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useOutsideClick, useTargetNetwork } from "~~/hooks/scaffold-eth";

type HeaderMenuLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
  onClick?: () => void;
};

export const menuLinks: HeaderMenuLink[] = [
  {
    label: "Home",
    href: "/",
  },
  {
    label: "Debug Contracts",
    href: "/debug",
    icon: <BugAntIcon className="h-4 w-4" />,
  },
];

export const HeaderMenuLinks = ({ onCoverageClick }: { onCoverageClick: () => void }) => {
  const pathname = usePathname();

  const allMenuLinks: HeaderMenuLink[] = [
    ...menuLinks,
    {
      label: "Coverage Report",
      href: "#",
      onClick: onCoverageClick,
    },
  ];

  return (
    <>
      {allMenuLinks.map(({ label, href, icon, onClick }) => {
        const isActive = pathname === href;
        return (
          <li key={label}>
            <Link
              href={href}
              passHref
              className={`${
                isActive 
                  ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/50 text-purple-200" 
                  : "text-gray-300 hover:text-white"
              } hover:bg-slate-700/50 hover:border-slate-600 focus:!bg-slate-700/50 active:!text-white py-2 px-4 text-sm rounded-xl gap-2 grid grid-flow-col transition-all duration-300 border border-transparent`}
              onClick={onClick}
            >
              {icon}
              <span>{label}</span>
            </Link>
          </li>
        );
      })}
    </>
  );
};

/**
 * Site header
 */
export const Header = () => {
  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;

  const burgerMenuRef = useRef<HTMLDetailsElement>(null);
  useOutsideClick(burgerMenuRef, () => {
    burgerMenuRef?.current?.removeAttribute("open");
  });

  const [showCoveragePopup, setShowCoveragePopup] = useState(false);
  const [coverageReportContent, setCoverageReportContent] = useState("");

  const fetchCoverageReport = async () => {
    try {
      const response = await fetch("/coverage_report.md");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const text = await response.text();
      setCoverageReportContent(text);
      setShowCoveragePopup(true);
    } catch (error) {
      console.error("Failed to fetch coverage report:", error);
      setCoverageReportContent("Error loading report.");
      setShowCoveragePopup(true);
    }
  };

  return (
    <>
      <div className="sticky lg:static top-0 navbar bg-slate-900/95 backdrop-blur-sm min-h-0 shrink-0 justify-between z-20 shadow-lg shadow-slate-900/20 px-0 sm:px-2 border-b border-slate-700/50">
        <div className="navbar-start w-auto lg:w-1/2">
          <details className="dropdown" ref={burgerMenuRef}>
            <summary className="ml-1 btn btn-ghost lg:hidden hover:bg-slate-800/50 text-gray-300 hover:text-white transition-colors duration-300">
              <Bars3Icon className="h-1/2" />
            </summary>
            <ul
              className="menu menu-compact dropdown-content mt-3 p-2 shadow-lg bg-slate-800/95 backdrop-blur-sm rounded-xl w-52 border border-slate-700/50"
              onClick={() => {
                burgerMenuRef?.current?.removeAttribute("open");
              }}
            >
              <HeaderMenuLinks onCoverageClick={fetchCoverageReport} />
            </ul>
          </details>
          
          <ul className="hidden lg:flex lg:flex-nowrap menu menu-horizontal px-1 gap-2">
            <HeaderMenuLinks onCoverageClick={fetchCoverageReport} />
          </ul>
        </div>
        <div className="navbar-end grow mr-4">
          <RainbowKitCustomConnectButton />
          {isLocalNetwork && <FaucetButton />}
        </div>
      </div>

      {/* Modern Coverage Report Popup */}
      {showCoveragePopup && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden relative">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-b border-slate-700/50 p-6 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Coverage Report</h2>
                  <p className="text-gray-400 text-sm">Test coverage analysis</p>
                </div>
              </div>
              <button
                className="w-10 h-10 bg-slate-700/50 hover:bg-slate-600/50 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105"
                onClick={() => setShowCoveragePopup(false)}
              >
                <svg className="w-5 h-5 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-100px)]">
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-600/30">
                <pre className="whitespace-pre-wrap text-sm text-gray-300 leading-relaxed font-mono">
                  {coverageReportContent}
                </pre>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-900/50 border-t border-slate-700/50 p-4 flex justify-end">
              <button
                onClick={() => setShowCoveragePopup(false)}
                className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold py-2 px-6 rounded-xl transition-all duration-300 transform hover:scale-105"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animated background elements for the header */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};