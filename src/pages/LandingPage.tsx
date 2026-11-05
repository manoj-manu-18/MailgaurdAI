import React from 'react';
import { ShieldCheck, Sparkles, Cpu, Lock, ArrowRight, ShieldAlert, CheckCircle2, FileSearch, Eye } from 'lucide-react';

interface Props {
  onNavigate: (view: string) => void;
}

export const LandingPage: React.FC<Props> = ({ onNavigate }) => {
  return (
    <div className="space-y-12 pb-12 text-slate-200">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border border-slate-800 p-8 sm:p-12">
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/80 text-cyan-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Final-Year Cybersecurity Engineering Major Project</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            MailGuard <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400">AI</span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            GenAI-Powered Intelligent Gmail Security Agent for Real-Time Threat Detection and Explainable Response. Protects enterprise mailboxes against phishing, brand impersonation, malicious attachments, and credential theft.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <button
              onClick={() => onNavigate('demo')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-sm shadow-xl shadow-cyan-950/50 hover:from-cyan-400 hover:to-indigo-500 transition flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Explore Interactive Demo Mode</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate('dashboard')}
              className="px-6 py-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 font-bold text-sm transition flex items-center space-x-2"
            >
              <Eye className="w-4 h-4 text-cyan-400" />
              <span>Open SOC Dashboard</span>
            </button>

            <button
              onClick={() => onNavigate('connected-accounts')}
              className="px-6 py-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 font-bold text-sm transition flex items-center space-x-2"
            >
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Connect Gmail Account</span>
            </button>
          </div>
        </div>
      </section>

      {/* High Level Architecture Flow Visualizer */}
      <section className="space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-white">End-to-End Threat Pipeline Architecture</h2>
          <p className="text-xs text-slate-400">Real-time Gmail event processing with multi-agent intelligence and human-in-the-loop approval</p>
        </div>

        <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl overflow-x-auto">
          <div className="flex items-center justify-between min-w-[800px] space-x-3 text-xs">
            
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center w-32 space-y-1 shrink-0">
              <div className="w-8 h-8 mx-auto rounded-lg bg-red-950 text-red-400 flex items-center justify-center font-bold">M</div>
              <div className="font-bold text-slate-200">Gmail API</div>
              <div className="text-[10px] text-slate-500">Watch / Push</div>
            </div>

            <span className="text-cyan-500 font-bold">→</span>

            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center w-36 space-y-1 shrink-0">
              <FileSearch className="w-5 h-5 mx-auto text-cyan-400" />
              <div className="font-bold text-slate-200">Email Normalizer</div>
              <div className="text-[10px] text-slate-500">Headers, Body, URLs</div>
            </div>

            <span className="text-cyan-500 font-bold">→</span>

            <div className="p-3 bg-cyan-950/80 border border-cyan-800 rounded-xl text-center w-44 space-y-1 shrink-0 ring-1 ring-cyan-500/30">
              <Cpu className="w-5 h-5 mx-auto text-cyan-300" />
              <div className="font-bold text-cyan-200">5 Specialized Agents</div>
              <div className="text-[10px] text-cyan-400">Content, Sender, URL, Attachment, Scam</div>
            </div>

            <span className="text-cyan-500 font-bold">→</span>

            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center w-36 space-y-1 shrink-0">
              <ShieldAlert className="w-5 h-5 mx-auto text-amber-400" />
              <div className="font-bold text-slate-200">Risk Engine</div>
              <div className="text-[10px] text-slate-500">0-100 Score & Matrix</div>
            </div>

            <span className="text-cyan-500 font-bold">→</span>

            <div className="p-3 bg-indigo-950/80 border border-indigo-800 rounded-xl text-center w-40 space-y-1 shrink-0">
              <Sparkles className="w-5 h-5 mx-auto text-indigo-300" />
              <div className="font-bold text-indigo-200">Gemini GenAI</div>
              <div className="text-[10px] text-indigo-400">Human Explanation</div>
            </div>

            <span className="text-cyan-500 font-bold">→</span>

            <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-center w-36 space-y-1 shrink-0">
              <CheckCircle2 className="w-5 h-5 mx-auto text-emerald-400" />
              <div className="font-bold text-emerald-200">Human Approval</div>
              <div className="text-[10px] text-emerald-400">Gmail Action</div>
            </div>

          </div>
        </div>
      </section>

      {/* 4 Major Pillars */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
          <div className="w-9 h-9 rounded-lg bg-cyan-950 text-cyan-400 flex items-center justify-center font-bold">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-100 text-sm">Multi-Agent Security Architecture</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Decomposes incoming emails across 5 autonomous agents evaluating domain spoofing, URL paths, attachment binaries, urgency speech patterns, and scam signatures.
          </p>
        </div>

        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
          <div className="w-9 h-9 rounded-lg bg-indigo-950 text-indigo-400 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-100 text-sm">Explainable GenAI Analysis</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Leverages Google Gemini 3.6 Flash to translate complex multi-agent telemetry into plain-language security explanations and actionable recommendations.
          </p>
        </div>

        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
          <div className="w-9 h-9 rounded-lg bg-emerald-950 text-emerald-400 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-100 text-sm">Human-In-The-Loop Approval</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Never automatically deletes user mail. Destructive mailbox actions require explicit human review and approval before invoking Gmail API label modifications.
          </p>
        </div>

        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
          <div className="w-9 h-9 rounded-lg bg-amber-950 text-amber-400 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-100 text-sm">Feedback & Learning Loop</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            User approval/rejection feedback is stored in a structured dataset for offline model evaluation, tuning, and benchmark research comparisons.
          </p>
        </div>

      </section>

    </div>
  );
};
