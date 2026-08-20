"use client";

import { useState } from "react";
import { MessageCircle, X, Phone, CreditCard, HelpCircle, ArrowRight } from "lucide-react";

const PHONE = "233530941750";

const QUICK_REPLIES = [
  {
    icon: "💰",
    label: "Pricing Plans",
    message: "Hello! I'd like to know about your pricing plans for GES School MIS.",
  },
  {
    icon: "🎮",
    label: "Free Demo",
    message: "Hi! I'd like to try the free demo of GES School MIS.",
  },
  {
    icon: "🏫",
    label: "Multi-school Package",
    message: "Hello! I'm interested in a multi-school package. How does it work?",
  },
  {
    icon: "📱",
    label: "Desktop & Mobile Apps",
    message: "Hi! I'd like to know more about the desktop and mobile apps.",
  },
  {
    icon: "💳",
    label: "Payment Methods",
    message: "Hello! What payment methods do you accept?",
  },
  {
    icon: "❓",
    label: "General Inquiry",
    message: "Hello! I have a question about GES School MIS.",
  },
];

const PRICING_REPLIES = [
  { plan: "1 Month", price: "GH₵300", schools: "1 school (PRY/JHS)", emoji: "🟢" },
  { plan: "12 Months", price: "GH₵2,500", schools: "2 schools (PRY and JHS)", emoji: "🔵" },
  { plan: "12 Months", price: "GH₵2,800", schools: "2 schools (PRY, JHS and SHS)", emoji: "🟣" },
  { plan: "24 Months", price: "GH₵4,000", schools: "3 schools (PRY, JHS and SHS)", emoji: "🟠" },
];

export function WhatsAppChatbot() {
  const [open, setOpen] = useState(false);
  const [showPricing, setShowPricing] = useState(false);

  const sendWhatsApp = (message: string) => {
    const url = `https://wa.me/${PHONE}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => { setOpen(!open); setShowPricing(false); }}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white shadow-xl shadow-green-500/30 transition-all duration-300 hover:scale-110 hover:shadow-green-500/50"
        aria-label="Chat on WhatsApp"
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
        {/* Pulse animation when closed */}
        {!open && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-20" />
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[340px] max-w-[calc(100vw-3rem)] animate-in slide-in-from-bottom-4 duration-200">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">GES School MIS</p>
                  <p className="text-xs text-green-100">Typically replies in minutes</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-4">
              {!showPricing ? (
                <>
                  {/* Welcome message */}
                  <div className="mb-4 rounded-xl rounded-tl-sm bg-slate-100 p-3 text-sm text-slate-700">
                    👋 Hello! I&apos;m the GES School MIS assistant. How can I help you today?
                  </div>

                  {/* Quick Replies */}
                  <div className="space-y-2">
                    {QUICK_REPLIES.map((qr) => (
                      <button
                        key={qr.label}
                        onClick={() => {
                          if (qr.label === "Pricing Plans") {
                            setShowPricing(true);
                          } else {
                            sendWhatsApp(qr.message);
                          }
                        }}
                        className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-green-200 hover:bg-green-50 hover:text-green-700"
                      >
                        <span className="text-lg">{qr.icon}</span>
                        <span className="flex-1">{qr.label}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {/* Pricing Cards */}
                  <div className="mb-3 rounded-xl rounded-tl-sm bg-slate-100 p-3 text-sm text-slate-700">
                    💰 Here are our pricing plans. Tap one to ask about it on WhatsApp:
                  </div>

                  <div className="space-y-2">
                    {PRICING_REPLIES.map((p) => (
                      <button
                        key={p.plan + p.price}
                        onClick={() => sendWhatsApp(`Hello! I'm interested in the ${p.plan} plan at ${p.price} for ${p.schools}. Can you tell me more?`)}
                        className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-left transition hover:border-green-200 hover:bg-green-50"
                      >
                        <span className="text-lg">{p.emoji}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-900">{p.plan}</span>
                            <span className="text-sm font-extrabold text-green-600">{p.price}</span>
                          </div>
                          <p className="text-xs text-slate-500">{p.schools}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* More than 3 schools */}
                  <button
                    onClick={() => sendWhatsApp("Hello! I need a custom package for more than 3 schools. Can you help?")}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 transition hover:bg-amber-100"
                  >
                    🏫 More than 3 schools? Contact developer
                  </button>

                  <button
                    onClick={() => setShowPricing(false)}
                    className="mt-2 text-center text-xs text-slate-400 hover:text-slate-600 w-full"
                  >
                    ← Back to main menu
                  </button>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Phone className="h-3.5 w-3.5" />
                  <span>+233 530 941 750</span>
                </div>
                <button
                  onClick={() => sendWhatsApp("Hello!")}
                  className="flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-green-600"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Chat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
