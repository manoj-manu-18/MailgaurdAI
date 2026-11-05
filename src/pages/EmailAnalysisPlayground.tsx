import React, { useState } from 'react';
import { Sparkles, Play, Cpu, ShieldAlert, CheckCircle, ArrowRight, RefreshCw, AlertTriangle, PlusCircle } from 'lucide-react';
import { NormalizedEmail, ThreatAnalysis } from '../types';
import { DEMO_EMAILS } from '../../server/data/demoEmails';
import { ThreatSeverityBadge } from '../components/ThreatSeverityBadge';
import { ThreatCategoryBadge } from '../components/ThreatCategoryBadge';
import { playThreatAlertSound } from '../utils/sound';

interface Props {
  onAnalyzeCustom: (customData: any) => Promise<ThreatAnalysis>;
  onSelectThreat: (threat: ThreatAnalysis) => void;
  soundEnabled: boolean;
}

export const EmailAnalysisPlayground: React.FC<Props> = ({ onAnalyzeCustom, onSelectThreat, soundEnabled }) => {
  const [selectedDemoId, setSelectedDemoId] = useState<string>(DEMO_EMAILS[1].id);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStep, setAnalysisStep] = useState<number>(0);
  const [currentAnalysisResult, setCurrentAnalysisResult] = useState<ThreatAnalysis | null>(null);

  // Custom email builder state
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [customSubject, setCustomSubject] = useState<string>('Urgent Security Update Required');
  const [customSenderName, setCustomSenderName] = useState<string>('IT System Admin');
  const [customSenderEmail, setCustomSenderEmail] = useState<string>('admin@security-check-portal.xyz');
  const [customBody, setCustomBody] = useState<string>('Your account has been locked due to suspicious activity. Click here http://192.168.1.1/login immediately to verify your password.');
  const [customUrls, setCustomUrls] = useState<string>('http://192.168.1.1/login');
  const [customExt, setCustomExt] = useState<string>('exe');

  const selectedEmail = DEMO_EMAILS.find(e => e.id === selectedDemoId) || DEMO_EMAILS[0];

  const handleRunDemoPipeline = async () => {
    setIsAnalyzing(true);
    setAnalysisStep(1); // Email Normalization
    setCurrentAnalysisResult(null);

    await new Promise(r => setTimeout(r, 400));
    setAnalysisStep(2); // Multi-Agent execution

    await new Promise(r => setTimeout(r, 600));
    setAnalysisStep(3); // Risk Engine

    const payload = {
      senderEmail: selectedEmail.sender.email,
      senderName: selectedEmail.sender.name,
      subject: selectedEmail.subject,
      bodyText: selectedEmail.bodyText,
      urls: selectedEmail.urls.map(u => u.url),
      fileExtensions: selectedEmail.attachments.map(a => a.fileExtension)
    };

    const result = await onAnalyzeCustom(payload);
    
    setAnalysisStep(4); // Gemini GenAI Explanation
    await new Promise(r => setTimeout(r, 400));

    setCurrentAnalysisResult(result);
    setIsAnalyzing(false);

    if (soundEnabled && result.riskScore.severity !== 'SAFE') {
      playThreatAlertSound('POLICE_SIREN', 80);
    }
  };

  const handleRunCustomPipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowCustomModal(false);
    setIsAnalyzing(true);
    setAnalysisStep(1);

    await new Promise(r => setTimeout(r, 400));
    setAnalysisStep(2);
    await new Promise(r => setTimeout(r, 600));
    setAnalysisStep(3);

    const payload = {
      senderEmail: customSenderEmail,
      senderName: customSenderName,
      subject: customSubject,
      bodyText: customBody,
      urls: customUrls ? customUrls.split(',').map(s => s.trim()) : [],
      fileExtensions: customExt ? [customExt] : []
    };

    const result = await onAnalyzeCustom(payload);
    setAnalysisStep(4);
    await new Promise(r => setTimeout(r, 300));

    setCurrentAnalysisResult(result);
    setIsAnalyzing(false);

    if (soundEnabled && result.riskScore.severity !== 'SAFE') {
      playThreatAlertSound('SECURITY_PING', 80);
    }
  };

  return (
    <div className="space-y-6 text-[#e4e4e7] pb-12">
      
      {/* Header Banner */}
      <div className="p-6 bg-[#161618] border border-[#26262a] rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/30 text-xs font-semibold uppercase flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-[#3b82f6]" />
              <span>Interactive DEMO MODE</span>
            </span>
            <span className="text-xs text-[#a1a1aa]">Isolated Sandbox</span>
          </div>
          <h1 className="text-2xl font-bold text-[#e4e4e7]">Live Threat Pipeline Simulator</h1>
          <p className="text-xs text-[#a1a1aa] max-w-2xl mt-1">
            Test pre-configured sample attack vectors or custom email content through the real 5-Agent security orchestrator, Risk Engine, and Gemini GenAI reasoning.
          </p>
        </div>

        <button
          onClick={() => setShowCustomModal(true)}
          className="px-4 py-2 rounded-lg bg-[#3b82f6] hover:bg-blue-600 text-white font-semibold text-xs transition flex items-center space-x-2"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Craft Custom Test Email</span>
        </button>
      </div>

      {/* Email Selection List (7 Pre-seeded Emails) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {DEMO_EMAILS.map((sample, idx) => {
          const isSelected = sample.id === selectedDemoId;
          return (
            <div
              key={sample.id}
              onClick={() => {
                setSelectedDemoId(sample.id);
                setCurrentAnalysisResult(null);
              }}
              className={`p-3.5 rounded-xl border transition cursor-pointer space-y-2 ${
                isSelected
                  ? 'bg-[#3b82f6]/10 border-[#3b82f6] text-[#e4e4e7]'
                  : 'bg-[#161618] border-[#26262a] hover:border-[#3b82f6]/50 text-[#a1a1aa]'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] uppercase font-bold text-[#a1a1aa]">
                <span>Sample #{idx + 1}</span>
                <span className="text-[#3b82f6] font-mono">{sample.sender.domain}</span>
              </div>
              <div className="font-semibold text-xs text-[#e4e4e7] truncate">{sample.subject}</div>
              <div className="text-[11px] text-[#a1a1aa] truncate">From: {sample.sender.name}</div>
            </div>
          );
        })}
      </div>

      {/* Active Selected Sample Box */}
      <div className="p-6 bg-[#161618] border border-[#26262a] rounded-xl space-y-4">
        
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#26262a] pb-3">
          <div>
            <span className="text-[10px] text-[#a1a1aa] font-bold uppercase block">Selected Demo Sample</span>
            <h2 className="text-base font-bold text-[#e4e4e7]">{selectedEmail.subject}</h2>
          </div>

          <button
            onClick={handleRunDemoPipeline}
            disabled={isAnalyzing}
            className="px-6 py-2 rounded-lg bg-[#3b82f6] hover:bg-blue-600 text-white font-semibold text-xs transition flex items-center space-x-2 disabled:opacity-50"
          >
            {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isAnalyzing ? 'Executing Agents...' : 'Run Security Orchestrator'}</span>
          </button>
        </div>

        {/* Selected Sample Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-[#0a0a0b] p-4 rounded-lg border border-[#26262a]">
          <div>
            <span className="text-[#a1a1aa] text-[10px] font-bold block uppercase">Sender & Domain</span>
            <div className="font-semibold text-[#e4e4e7]">{selectedEmail.sender.name} &lt;{selectedEmail.sender.email}&gt;</div>
            <div className="text-[11px] text-[#a1a1aa]">Reply-To: {selectedEmail.sender.replyTo || 'None'}</div>
          </div>

          <div>
            <span className="text-[#a1a1aa] text-[10px] font-bold block uppercase">URLs & Attachments</span>
            <div className="text-[#e4e4e7]">
              URLs: {selectedEmail.urls.length > 0 ? selectedEmail.urls.map(u => u.url).join(', ') : 'None'}
            </div>
            <div className="text-[#e4e4e7]">
              Attachments: {selectedEmail.attachments.length > 0 ? selectedEmail.attachments.map(a => a.filename).join(', ') : 'None'}
            </div>
          </div>
        </div>

        <div className="p-3 bg-[#0a0a0b] border border-[#26262a] rounded-lg font-mono text-xs text-[#e4e4e7] whitespace-pre-wrap max-h-36 overflow-y-auto">
          {selectedEmail.bodyText}
        </div>

      </div>

      {/* Live Analysis Pipeline Step Tracker */}
      {isAnalyzing && (
        <div className="p-6 bg-[#161618] border border-[#3b82f6] rounded-xl space-y-4 animate-pulse">
          <div className="flex items-center space-x-2 text-[#3b82f6] font-semibold text-sm">
            <Cpu className="w-5 h-5 animate-spin" />
            <span>Multi-Agent Pipeline Processing...</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className={`p-3 rounded-lg border text-center ${analysisStep >= 1 ? 'bg-[#3b82f6]/10 border-[#3b82f6] text-[#3b82f6]' : 'bg-[#0a0a0b] border-[#26262a] text-[#a1a1aa]'}`}>
              <div className="font-bold">Step 1</div>
              <div>Email Normalizer</div>
            </div>
            <div className={`p-3 rounded-lg border text-center ${analysisStep >= 2 ? 'bg-[#3b82f6]/10 border-[#3b82f6] text-[#3b82f6]' : 'bg-[#0a0a0b] border-[#26262a] text-[#a1a1aa]'}`}>
              <div className="font-bold">Step 2</div>
              <div>5 Security Agents</div>
            </div>
            <div className={`p-3 rounded-lg border text-center ${analysisStep >= 3 ? 'bg-[#3b82f6]/10 border-[#3b82f6] text-[#3b82f6]' : 'bg-[#0a0a0b] border-[#26262a] text-[#a1a1aa]'}`}>
              <div className="font-bold">Step 3</div>
              <div>Risk Engine Matrix</div>
            </div>
            <div className={`p-3 rounded-lg border text-center ${analysisStep >= 4 ? 'bg-[#3b82f6]/10 border-[#3b82f6] text-[#3b82f6]' : 'bg-[#0a0a0b] border-[#26262a] text-[#a1a1aa]'}`}>
              <div className="font-bold">Step 4</div>
              <div>Gemini Explanation</div>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Output Result Card */}
      {currentAnalysisResult && !isAnalyzing && (
        <div className="p-6 bg-[#161618] border border-[#26262a] rounded-xl space-y-6">
          
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#26262a] pb-4">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <ThreatSeverityBadge severity={currentAnalysisResult.riskScore.severity} />
                <ThreatCategoryBadge threatType={currentAnalysisResult.primaryThreat} />
              </div>
              <h2 className="text-xl font-bold text-[#e4e4e7]">Pipeline Threat Assessment Complete</h2>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-[#a1a1aa] uppercase font-bold block">Calculated Risk Score</span>
              <span className="text-2xl font-bold text-[#ef4444]">{currentAnalysisResult.riskScore.overallScore} / 100</span>
            </div>
          </div>

          {/* AI Explanation Box */}
          <div className="p-4 bg-[#0a0a0b] border border-[#26262a] rounded-lg space-y-2 text-xs">
            <span className="text-[#3b82f6] font-bold uppercase text-[10px] tracking-wider block">Gemini Security Explanation</span>
            <p className="text-[#e4e4e7] text-sm font-medium leading-relaxed">
              "{currentAnalysisResult.aiExplanation.summary}"
            </p>
          </div>

          {/* Action Callout */}
          <div className="p-4 bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-lg flex items-center justify-between text-xs">
            <div>
              <span className="text-[#22c55e] font-bold uppercase text-[10px] block">Recommended Action</span>
              <div className="font-bold text-[#e4e4e7] text-sm">{currentAnalysisResult.recommendation.title}</div>
              <div className="text-[#a1a1aa]">{currentAnalysisResult.recommendation.explanation}</div>
            </div>

            <button
              onClick={() => onSelectThreat(currentAnalysisResult)}
              className="px-4 py-2 rounded-md bg-[#3b82f6] hover:bg-blue-600 text-white font-semibold text-xs flex items-center space-x-1.5 transition shrink-0"
            >
              <span>Inspect Full Evidence</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      )}

      {/* Modal for Crafting Custom Test Email */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161618] border border-[#26262a] rounded-xl max-w-lg w-full p-6 text-xs text-[#e4e4e7] space-y-4">
            <div className="flex items-center justify-between border-b border-[#26262a] pb-3">
              <h2 className="font-semibold text-[#e4e4e7] text-sm flex items-center space-x-2">
                <PlusCircle className="w-4 h-4 text-[#3b82f6]" />
                <span>Craft Custom Test Email</span>
              </h2>
              <button onClick={() => setShowCustomModal(false)} className="text-[#a1a1aa] hover:text-[#e4e4e7]">✕</button>
            </div>

            <form onSubmit={handleRunCustomPipeline} className="space-y-3">
              <div>
                <label className="block text-[#a1a1aa] font-semibold mb-1">Subject Line:</label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={e => setCustomSubject(e.target.value)}
                  className="w-full bg-[#0a0a0b] border border-[#26262a] rounded-lg p-2 text-[#e4e4e7] focus:outline-none focus:border-[#3b82f6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#a1a1aa] font-semibold mb-1">Sender Display Name:</label>
                  <input
                    type="text"
                    value={customSenderName}
                    onChange={e => setCustomSenderName(e.target.value)}
                    className="w-full bg-[#0a0a0b] border border-[#26262a] rounded-lg p-2 text-[#e4e4e7] focus:outline-none focus:border-[#3b82f6]"
                  />
                </div>

                <div>
                  <label className="block text-[#a1a1aa] font-semibold mb-1">Sender Email:</label>
                  <input
                    type="text"
                    value={customSenderEmail}
                    onChange={e => setCustomSenderEmail(e.target.value)}
                    className="w-full bg-[#0a0a0b] border border-[#26262a] rounded-lg p-2 text-[#e4e4e7] focus:outline-none focus:border-[#3b82f6]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#a1a1aa] font-semibold mb-1">Email Body Text:</label>
                <textarea
                  rows={3}
                  value={customBody}
                  onChange={e => setCustomBody(e.target.value)}
                  className="w-full bg-[#0a0a0b] border border-[#26262a] rounded-lg p-2 text-[#e4e4e7] focus:outline-none focus:border-[#3b82f6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#a1a1aa] font-semibold mb-1">Embedded URLs (comma separated):</label>
                  <input
                    type="text"
                    value={customUrls}
                    onChange={e => setCustomUrls(e.target.value)}
                    className="w-full bg-[#0a0a0b] border border-[#26262a] rounded-lg p-2 text-[#e4e4e7] focus:outline-none focus:border-[#3b82f6]"
                  />
                </div>

                <div>
                  <label className="block text-[#a1a1aa] font-semibold mb-1">Attachment Extension:</label>
                  <input
                    type="text"
                    value={customExt}
                    onChange={e => setCustomExt(e.target.value)}
                    className="w-full bg-[#0a0a0b] border border-[#26262a] rounded-lg p-2 text-[#e4e4e7] focus:outline-none focus:border-[#3b82f6]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2 rounded-md bg-[#161618] border border-[#26262a] text-[#a1a1aa] hover:text-[#e4e4e7] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-[#3b82f6] hover:bg-blue-600 text-white font-semibold"
                >
                  Analyze Live
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
