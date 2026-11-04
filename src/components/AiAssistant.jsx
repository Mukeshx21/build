import React, { useState } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  HelpCircle,
  FileCheck2,
  Shield,
  Scale,
  Calculator,
  Compass,
  ArrowRight
} from 'lucide-react';

const KNOWLEDGE_RESPONSES = {
  guideline: {
    title: 'Guideline Value vs. Market Value Explained',
    content: `In Tamil Nadu and Karnataka, property pricing involves two distinct figures:
1. Guideline Value (Circle Rate): The minimum valuation fixed by the state revenue/registration department for calculating stamp duty and registration fees. 
2. Market Value: The actual agreed transaction price between buyer and seller, driven by demand, road access, and future infrastructure.
Tip: Registration fees are calculated on whichever value is higher (Market Value or Guideline Value). In Tamil Nadu, stamp duty is 7% and registration fee is 4%.`,
  },
  dtcp: {
    title: 'DTCP vs. CMDA vs. Local Panchayat Approval',
    content: `Before purchasing land in South India, verify the appropriate planning body:
• DTCP (Directorate of Town and Country Planning): Applicable for all municipal and town planning layouts outside Chennai Metropolitan area in Tamil Nadu. Ensures approved road widths (min 30ft or 40ft), OSR (Open Space Reservation), and proper zoning.
• CMDA (Chennai Metropolitan Development Authority): Covers Chennai metropolitan area with strict land-use zoning.
• Panchayat Unapproved (Unapproved Plots): Buying agricultural or non-converted land with only local panchayat permission is high risk. You will not receive bank loans or building permits without regularisation under Section 113-A. Always insist on DTCP/CMDA layout approval.`,
  },
  patta: {
    title: 'How to Verify Patta and Chitta Online',
    content: `A Patta is a primary legal revenue record establishing title ownership:
1. Online Verification: Visit Tamil Nadu Any-Where e-Services (eservices.tn.gov.in) to view Patta/Chitta extracts by district, taluk, village, and survey number.
2. Check Owner Name: Ensure the seller's name exactly matches the Patta extract.
3. Chitta Record: Confirms whether the land is Nanjai (wetland) or Punjai (dryland) and specifies the total extent in hectares/ares.
4. "A" Register & FMB: Cross-examine with the Field Measurement Book sketch to check physical plot dimensions and sub-division numbers.`,
  },
  checklist: {
    title: 'Essential Legal Checklist Before Token Advance',
    content: `Follow this 6-point due diligence checklist before paying any property token:
1. Parent Title Documents: Inspect minimum 30 years of continuous title history (Sale Deeds, Partition Deeds, Gift Deeds).
2. Encumbrance Certificate (EC): Obtain an EC for 30+ years from the Sub-Registrar Office to ensure no existing mortgages, court attachments, or prior sale agreements.
3. Current Patta Transfer: Verify the patta stands in the present seller's name.
4. Physical Survey Demarcation: Measure with an authorized surveyor to verify that physical boundaries match the FMB sketch.
5. Conversion & Layout Approval: Check agricultural-to-residential land use conversion order and layout approval.
6. Identity Verification: Validate the seller's Aadhaar/PAN against executant records.`,
  },
};

export default function AiAssistant({ onNavigateVerification }) {
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: 'Hello! I am your Terra AI Property Advisor. Ask me anything about property valuation, DTCP/CMDA regulations, Patta/Chitta records, or legal due diligence.',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [busy, setBusy] = useState(false);

  const quickPrompts = [
    { key: 'guideline', label: 'Guideline vs Market Value', icon: Calculator },
    { key: 'dtcp', label: 'DTCP vs Panchayat Approval', icon: Shield },
    { key: 'patta', label: 'Verify Patta Online', icon: FileCheck2 },
    { key: 'checklist', label: 'Land Buying Due Diligence', icon: Scale },
  ];

  const handleSend = (textToSend) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    const userMsg = { sender: 'user', text: query };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setBusy(true);

    setTimeout(() => {
      let reply = '';
      const lower = query.toLowerCase();

      if (lower.includes('guideline') || lower.includes('stamp') || lower.includes('registration fee')) {
        reply = KNOWLEDGE_RESPONSES.guideline.content;
      } else if (lower.includes('dtcp') || lower.includes('cmda') || lower.includes('panchayat') || lower.includes('approval')) {
        reply = KNOWLEDGE_RESPONSES.dtcp.content;
      } else if (lower.includes('patta') || lower.includes('chitta') || lower.includes('fmb') || lower.includes('survey')) {
        reply = KNOWLEDGE_RESPONSES.patta.content;
      } else if (lower.includes('checklist') || lower.includes('due diligence') || lower.includes('token') || lower.includes('advance') || lower.includes('documents')) {
        reply = KNOWLEDGE_RESPONSES.checklist.content;
      } else if (lower.includes('coimbatore') || lower.includes('bengaluru') || lower.includes('chennai')) {
        reply = `For ${query}: Prime growth corridors feature DTCP or CMDA approved residential sites ranging between ₹2,000/sq.ft to ₹5,500/sq.ft. Always ensure the parent title has a minimum 30-year clean track record and upload your sale deed into our Document Verification engine to check extracted survey numbers.`;
      } else {
        reply = `Regarding your query on "${query}": In South Indian real estate, sound decisions rely on verifying survey numbers in the Patta/Chitta, checking the 30-year Encumbrance Certificate, and confirming layout zoning approvals (DTCP/CMDA/BDA). You can also run our Document Verification engine to extract and validate specific deed clauses.`;
      }

      setMessages((prev) => [...prev, { sender: 'assistant', text: reply }]);
      setBusy(false);
    }, 600);
  };

  return (
    <section className="ai-assistant-page">
      <div className="section-header-block">
        <div>
          <div className="hero-eyebrow">
            <span className="eyebrow-pill">INTELLIGENT REALTY ADVISOR</span>
            <span className="eyebrow-note">REGULATORY &amp; ZONING AI</span>
          </div>
          <h1>AI Property Assistant</h1>
          <p className="section-subtext">
            Ask questions regarding land legalities, registration charges, zoning regulations, and verification checklists.
          </p>
        </div>
      </div>

      <div className="assistant-layout-grid">
        {/* Chat Console */}
        <div className="assistant-chat-panel">
          <div className="chat-messages-container">
            {messages.map((m, idx) => (
              <div key={idx} className={`chat-bubble-row ${m.sender}`}>
                {m.sender === 'assistant' && (
                  <div className="assistant-avatar">
                    <Bot size={16} />
                  </div>
                )}
                <div className="chat-bubble-content">
                  <p>{m.text}</p>
                </div>
              </div>
            ))}
            {busy && (
              <div className="chat-bubble-row assistant">
                <div className="assistant-avatar">
                  <Bot size={16} />
                </div>
                <div className="chat-bubble-content typing">
                  <span>Synthesizing legal guidelines…</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompts Bar */}
          <div className="quick-prompts-row">
            <span className="quick-prompts-label">Suggested Inquiries:</span>
            <div className="prompts-chips-wrapper">
              {quickPrompts.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.key}
                    type="button"
                    className="prompt-chip"
                    onClick={() => handleSend(p.label)}
                  >
                    <Icon size={13} />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Input Box */}
          <form
            className="chat-input-bar"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask about DTCP rules, stamp duty rates, patta verification, or survey numbers..."
            />
            <button type="submit" className="chat-send-btn" disabled={!inputText.trim() || busy}>
              <Send size={15} />
            </button>
          </form>
        </div>

        {/* Right Reference Cards */}
        <div className="assistant-knowledge-sidebar">
          <div className="knowledge-card">
            <div className="knowledge-header">
              <FileCheck2 size={18} />
              <h4>Have Documents on Hand?</h4>
            </div>
            <p>
              Rather than asking generic legal questions, upload your actual property deed or patta to extract survey numbers and check consistency.
            </p>
            <button
              type="button"
              className="knowledge-action-btn"
              onClick={onNavigateVerification}
            >
              <span>Verify your document now</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="knowledge-card">
            <div className="knowledge-header">
              <Scale size={18} />
              <h4>Key State Stamp Duty Summary</h4>
            </div>
            <ul className="knowledge-bullets">
              <li>
                <strong>Tamil Nadu:</strong> 7% Stamp Duty + 4% Registration Fee (Total: 11% on higher of market vs guideline value).
              </li>
              <li>
                <strong>Karnataka:</strong> 5% Stamp Duty + 2% Registration Fee + Surcharge (Approx 7.6% total).
              </li>
              <li>
                <strong>Conveyance Deeds:</strong> Require physical verification at the respective Sub-Registrar Office (SRO).
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
