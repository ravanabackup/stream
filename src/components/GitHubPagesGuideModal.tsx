import React, { useState } from 'react';
import { X, Globe, Copy, Check, ShieldCheck, Zap } from 'lucide-react';

interface GitHubPagesGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubPagesGuideModal: React.FC<GitHubPagesGuideModalProps> = ({ isOpen, onClose }) => {
  const [copiedAction, setCopiedAction] = useState(false);

  if (!isOpen) return null;

  const githubActionYaml = `name: Deploy to GitHub Pages

on:
  push:
    branches: ['main']
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Build project
        run: npm run build
      - name: Setup Pages
        uses: actions/configure-pages@v4
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4`;

  const copyYaml = () => {
    navigator.clipboard.writeText(githubActionYaml);
    setCopiedAction(true);
    setTimeout(() => setCopiedAction(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700/80 p-6 md:p-8 shadow-2xl text-slate-100 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              GitHub Pages Deployment Guide
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                100% Static & Free
              </span>
            </h3>
            <p className="text-xs text-slate-400">Zero backend server required. Runs anywhere!</p>
          </div>
        </div>

        {/* Why it works */}
        <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 mb-6 space-y-2">
          <h4 className="text-sm font-semibold text-indigo-300 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            How Real-Time Broadcasting Works on GitHub Pages:
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            GitHub Pages only hosts static files (HTML, CSS, JS). This app uses <strong className="text-white">WebRTC Peer-to-Peer</strong>. 
            Once the URL is opened on your receiver device, audio and video stream <span className="text-emerald-400 font-medium">directly from PC to device</span> over your local Wi-Fi or the internet. 
            Signaling is handled automatically via free public cloud brokers without running your own server!
          </p>
        </div>

        {/* Deployment Steps */}
        <div className="space-y-4 mb-6">
          <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Quick Setup (3 Steps)</h4>

          <div className="flex gap-3 text-xs bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0">1</div>
            <div>
              <div className="font-semibold text-white">Push to a GitHub Repository</div>
              <p className="text-slate-400 mt-0.5">Commit and push this project into any public or private GitHub repository.</p>
            </div>
          </div>

          <div className="flex gap-3 text-xs bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0">2</div>
            <div className="w-full">
              <div className="font-semibold text-white flex items-center justify-between">
                <span>Add GitHub Actions Workflow (Recommended)</span>
                <button
                  onClick={copyYaml}
                  className="px-2 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded border border-indigo-500/30 flex items-center gap-1 transition"
                >
                  {copiedAction ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedAction ? 'Copied Workflow!' : 'Copy Workflow YAML'}
                </button>
              </div>
              <p className="text-slate-400 mt-1">
                Save the copied YAML into <code className="text-indigo-300 font-mono">.github/workflows/deploy.yml</code>. 
                Whenever you push to <code className="text-indigo-300 font-mono">main</code>, GitHub automatically builds and publishes!
              </p>
            </div>
          </div>

          <div className="flex gap-3 text-xs bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0">3</div>
            <div>
              <div className="font-semibold text-white">Enable GitHub Pages in Repo Settings</div>
              <p className="text-slate-400 mt-0.5">
                Go to <span className="text-slate-200 font-medium">Settings &rarr; Pages &rarr; Build and deployment</span>. 
                Select <span className="text-emerald-400 font-medium">GitHub Actions</span> as Source.
              </p>
            </div>
          </div>
        </div>

        {/* HTTPS Notice */}
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-200">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-emerald-300">Automatic HTTPS on GitHub Pages</div>
            <p className="text-emerald-400/80 mt-0.5">
              Modern browsers require HTTPS to grant camera and microphone access. GitHub Pages automatically provides free SSL certificates on all <code className="font-mono text-emerald-200">*.github.io</code> domains!
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Got it, Let's Stream!
          </button>
        </div>
      </div>
    </div>
  );
};
