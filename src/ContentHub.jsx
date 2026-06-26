import { useState, useCallback, useEffect } from "react";
import { fetchTopics, upsertTopic, deleteTopic, fetchTopicContent, saveContent } from "./api.js";

// ─── BRAND ────────────────────────────────────────────────────────────────────
const BRAND = {
  agent: "Shaya Mohebbi", team: "Shaya Digital",
  brokerage: "eXp Realty, Brokerage", phone: "647-370-9588",
  email: "tcops.ca@gmail.com", site: "shayamohebbi.com",
  valuation: "shayamohebbi.com/home-valuation",
};

// ─── PRODUCTION STAGES ────────────────────────────────────────────────────────
const STAGES = [
  { key:"not_started",    label:"Not started",        color:"#888780", bg:"#F1EFE8" },
  { key:"script_written", label:"Script written",     color:"#185FA5", bg:"#E6F1FB" },
  { key:"teleprompter",   label:"Teleprompter ready", color:"#534AB7", bg:"#EEEDFE" },
  { key:"heygen_done",    label:"HeyGen done",        color:"#0F6E56", bg:"#E1F5EE" },
  { key:"broll_done",     label:"B-roll done",        color:"#BA7517", bg:"#FAEEDA" },
  { key:"recorded",       label:"Recorded",           color:"#993C1D", bg:"#FAECE7" },
  { key:"edited",         label:"Edited",             color:"#993556", bg:"#FBEAF0" },
  { key:"posted",         label:"Posted",             color:"#3B6D11", bg:"#EAF3DE" },
];
const STAGE_KEYS = STAGES.map(s => s.key);

// ─── CATEGORY VISUAL CONFIG ───────────────────────────────────────────────────
const CAT_CONFIG = {
  // Short form
  "Home Buying Tips":      { icon:"ti-home",         accent:"#185FA5", light:"#E6F1FB", mid:"#B5D4F4", dark:"#0C447C" },
  "Home Selling Tips":     { icon:"ti-currency-dollar",accent:"#3B6D11",light:"#EAF3DE", mid:"#C0DD97", dark:"#27500A" },
  "Relocation Information":{ icon:"ti-map-pin",       accent:"#BA7517", light:"#FAEEDA", mid:"#FAC775", dark:"#633806" },
  "Local Lifestyle":       { icon:"ti-coffee",        accent:"#993556", light:"#FBEAF0", mid:"#F4C0D1", dark:"#72243E" },
  // Long form
  "Relocation Guides":     { icon:"ti-route",         accent:"#534AB7", light:"#EEEDFE", mid:"#CECBF6", dark:"#26215C" },
  "Market Updates":        { icon:"ti-chart-line",    accent:"#0F6E56", light:"#E1F5EE", mid:"#9FE1CB", dark:"#085041" },
  "Neighbourhood Tours":   { icon:"ti-building-community",accent:"#993C1D",light:"#FAECE7",mid:"#F5C4B3",dark:"#4A1B0C"},
};

// Maps each category to its default pillar + audience when adding a new topic
const CAT_DEFAULTS = {
  // Short form
  "Home Buying Tips":       { pillar:"Education",           audience:"First-time buyers"       },
  "Home Selling Tips":      { pillar:"Seller Strategy",     audience:"Sellers & homeowners"    },
  "Relocation Information": { pillar:"Neighbourhood Guides",audience:"Relocators from Toronto" },
  "Local Lifestyle":        { pillar:"Local Lifestyle",     audience:"Relocators from Toronto" },
  // Long form
  "Relocation Guides":      { pillar:"Neighbourhood Guides",audience:"Relocators from Toronto" },
  "Market Updates":         { pillar:"Market Intelligence", audience:"Sellers & homeowners"    },
  "Neighbourhood Tours":    { pillar:"Neighbourhood Guides",audience:"Move-up & family buyers" },
};


// ─── TOPIC DATA ───────────────────────────────────────────────────────────────
function makeId() { return "t_" + Math.random().toString(36).slice(2,9); }
function T(title, hook, audience, pillar) {
  return { id:makeId(), title, hook, audience, pillar, stage:"not_started" };
}

const SHORT_TOPICS = {
  "Home Buying Tips": [
    T("What $800K, $1M, and $1.5M actually gets you in Richmond Hill right now","Contrast Frame","Move-up & family buyers","Market Intelligence"),
    T("5 things I wish I knew before buying my first home in Richmond Hill","Bold Claim","First-time buyers","Education"),
    T("The truth about bidding wars in Richmond Hill — are they actually back?","Surprising Insight","First-time buyers","Market Intelligence"),
    T("The real closing costs nobody tells first-time buyers in Ontario","Surprising Insight","First-time buyers","Education"),
    T("Why your mortgage pre-approval doesn't mean you'll actually get the mortgage","Counterintuitive Take","First-time buyers","Education"),
    T("Richmond Hill vs Markham — which one should you actually buy in?","Contrast Frame","Move-up & family buyers","Neighbourhood Guides"),
    T("The home inspection clause that could save you $30,000 in York Region","Bold Claim","First-time buyers","Education"),
    T("How the First-Time Home Buyer Incentive actually works in Ontario","Specific Question","First-time buyers","Education"),
    T("Why the cheapest home on the street is rarely the best deal in Richmond Hill","Counterintuitive Take","First-time buyers","Education"),
    T("What a buyer's agent actually does — and why you're leaving money on the table without one","Specific Question","First-time buyers","Education"),
    T("The biggest mistake move-up buyers make when upgrading to a detached in Richmond Hill","Bold Claim","Move-up & family buyers","Education"),
    T("How to win a multiple offer situation in York Region without overpaying","Specific Question","Move-up & family buyers","Education"),
    T("What no one tells you about buying a new build in Richmond Hill","Surprising Insight","First-time buyers","Education"),
    T("The land transfer tax rebate in Ontario — here's exactly what you get back","Surprising Insight","First-time buyers","Education"),
    T("How rising interest rates have actually changed what you can buy in Richmond Hill","Contrast Frame","First-time buyers","Market Intelligence"),
  ],
  "Home Selling Tips": [
    T("The worst time to list your Richmond Hill home — and when to actually sell","Counterintuitive Take","Sellers & homeowners","Market Intelligence"),
    T("3 things sellers do that kill their sale price in Richmond Hill","Bold Claim","Sellers & homeowners","Education"),
    T("Why overpricing your home in York Region actually costs you money","Counterintuitive Take","Sellers & homeowners","Education"),
    T("The staging trick that added $40,000 to a Jefferson listing","Surprising Insight","Sellers & homeowners","Real Stories"),
    T("Should you renovate before listing? The honest answer for Richmond Hill sellers","Specific Question","Sellers & homeowners","Education"),
    T("How I got 11 offers on a home in Westbrook — what we did differently","Bold Claim","Sellers & homeowners","Real Stories"),
    T("Why your neighbour's sale price means nothing for your home's value","Counterintuitive Take","Sellers & homeowners","Education"),
    T("The pre-listing inspection strategy that's changing how sellers compete in York Region","Surprising Insight","Sellers & homeowners","Education"),
    T("What buyers are actually looking for in Richmond Hill right now (it's not what you think)","Counterintuitive Take","Sellers & homeowners","Market Intelligence"),
    T("How to read an offer on your home — the clauses that actually matter","Specific Question","Sellers & homeowners","Education"),
    T("The real cost of sitting on the market too long in Richmond Hill","Bold Claim","Sellers & homeowners","Market Intelligence"),
    T("Why spring isn't always the best time to sell in York Region","Counterintuitive Take","Sellers & homeowners","Market Intelligence"),
    T("The photography mistake that's costing Richmond Hill sellers thousands","Surprising Insight","Sellers & homeowners","Education"),
    T("What happens when your home doesn't sell — and how to recover","Specific Question","Sellers & homeowners","Real Stories"),
    T("How to price your home in a shifting Richmond Hill market","Specific Question","Sellers & homeowners","Market Intelligence"),
  ],
  "Relocation Information": [
    T("Honest pros and cons of moving from Toronto to Richmond Hill","Contrast Frame","Relocators from Toronto","Neighbourhood Guides"),
    T("What the GO Train commute from Richmond Hill to downtown Toronto actually looks like","Specific Question","Relocators from Toronto","Local Lifestyle"),
    T("Richmond Hill vs Vaughan — which suburb actually wins for Toronto families?","Contrast Frame","Relocators from Toronto","Neighbourhood Guides"),
    T("What $1.2M gets you in Toronto vs Richmond Hill right now","Contrast Frame","Relocators from Toronto","Market Intelligence"),
    T("5 things nobody tells you before moving to Richmond Hill from the city","Bold Claim","Relocators from Toronto","Neighbourhood Guides"),
    T("Is Richmond Hill actually family-friendly? An honest answer for city buyers","Specific Question","Relocators from Toronto","Neighbourhood Guides"),
    T("The best neighbourhoods in Richmond Hill for families moving from Toronto","Surprising Insight","Relocators from Toronto","Neighbourhood Guides"),
    T("What I tell every Toronto buyer considering a move to York Region","Bold Claim","Relocators from Toronto","Neighbourhood Guides"),
    T("Oak Ridges vs Jefferson — what's the difference and who's each neighbourhood for?","Contrast Frame","Move-up & family buyers","Neighbourhood Guides"),
    T("The school system in Richmond Hill — what relocating parents actually need to know","Specific Question","Relocators from Toronto","Neighbourhood Guides"),
    T("How long does it really take to feel at home after moving to Richmond Hill?","Specific Question","Relocators from Toronto","Local Lifestyle"),
    T("The hidden costs of moving from Toronto to a York Region suburb","Surprising Insight","Relocators from Toronto","Education"),
    T("Why so many Toronto renters are buying in Richmond Hill instead — the real math","Surprising Insight","Relocators from Toronto","Market Intelligence"),
    T("What the Richmond Hill community is actually like — the truth beyond the listing photos","Bold Claim","Relocators from Toronto","Neighbourhood Guides"),
    T("Bayview Hill vs Westbrook — the Richmond Hill neighbourhood comparison nobody makes","Contrast Frame","Relocators from Toronto","Neighbourhood Guides"),
  ],
  "Local Lifestyle": [
    T("The 5 best restaurants in Richmond Hill that locals actually go to","Specific Question","Relocators from Toronto","Local Lifestyle"),
    T("A Saturday morning in Oak Ridges — what it actually looks like to live here","Bold Claim","Relocators from Toronto","Local Lifestyle"),
    T("The hidden gem parks in Richmond Hill you won't find on a Google search","Surprising Insight","Move-up & family buyers","Local Lifestyle"),
    T("Lake Wilcox in Richmond Hill — why this is the neighbourhood's best kept secret","Bold Claim","Relocators from Toronto","Local Lifestyle"),
    T("The best coffee shops in Richmond Hill for remote workers","Specific Question","Relocators from Toronto","Local Lifestyle"),
    T("What a weekend looks like in Richmond Hill — the honest version","Bold Claim","Relocators from Toronto","Local Lifestyle"),
    T("The Mill Pond area in Richmond Hill — why everyone who visits wants to move here","Surprising Insight","Relocators from Toronto","Local Lifestyle"),
    T("Best family-friendly things to do in Richmond Hill this summer","Specific Question","Move-up & family buyers","Local Lifestyle"),
    T("The farmers market scene in York Region — what you need to know","Surprising Insight","Relocators from Toronto","Local Lifestyle"),
    T("Richmond Hill's best kept dining secret — a street food guide to the Yonge corridor","Bold Claim","Relocators from Toronto","Local Lifestyle"),
    T("What the Richmond Hill arts and culture scene actually looks like (it's better than you think)","Counterintuitive Take","Relocators from Toronto","Local Lifestyle"),
    T("The top 5 trails in Richmond Hill for people who came from the city","Specific Question","Relocators from Toronto","Local Lifestyle"),
    T("Why Richmond Hill has one of the best food diversity scenes in the GTA","Surprising Insight","Relocators from Toronto","Local Lifestyle"),
    T("The annual events in Richmond Hill that actually bring the community together","Bold Claim","Move-up & family buyers","Local Lifestyle"),
    T("A day in Jefferson — morning coffee to sunset walk, this is suburban living done right","Contrast Frame","Relocators from Toronto","Local Lifestyle"),
  ],
};

const LONG_TOPICS = {
  "Relocation Guides": [
    T("Moving to Richmond Hill, Ontario — the complete 2025 relocation guide","Fear-based Intro","Relocators from Toronto","Neighbourhood Guides"),
    T("Toronto to Richmond Hill: what nobody tells you before you make the move","Fear-based Intro","Relocators from Toronto","Neighbourhood Guides"),
    T("Richmond Hill vs Markham vs Vaughan — which GTA suburb is right for your family?","Contrast Frame","Relocators from Toronto","Neighbourhood Guides"),
  ],
  "Market Updates": [
    T("Richmond Hill real estate market 2025 — prices, trends and what's coming next","Surprising Insight","Sellers & homeowners","Market Intelligence"),
    T("York Region housing market: is now the right time to buy or wait?","Specific Question","First-time buyers","Market Intelligence"),
    T("How Bank of Canada rate changes are affecting Richmond Hill buyers right now","Surprising Insight","First-time buyers","Market Intelligence"),
  ],
  "Neighbourhood Tours": [
    T("Living in Oak Ridges, Richmond Hill — everything you need to know before you move","Fear-based Intro","Move-up & family buyers","Neighbourhood Guides"),
    T("Jefferson vs Westbrook — which Richmond Hill neighbourhood is right for your family?","Contrast Frame","Move-up & family buyers","Neighbourhood Guides"),
  ],
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const HOOKS     = ["Bold Claim","Surprising Insight","Counterintuitive Take","Specific Question","Contrast Frame","Fear-based Intro","Myth Busting","Story-led","Data Drop","Local Insider"];
const AUDIENCES = ["First-time buyers","Move-up & family buyers","Relocators from Toronto","Sellers & homeowners","Downsizers","Investors","Renters considering buying"];
const PILLARS   = ["Education","Market Intelligence","Neighbourhood Guides","Real Stories","Local Lifestyle","Buyer Mistakes","Seller Strategy","Investment & Wealth","School & Family","Commute & Lifestyle","Hidden Costs","Process Walkthrough","Community Spotlight"];

const AUD_STYLE = {
  "First-time buyers":       { bg:"#E6F1FB", color:"#0C447C", border:"#B5D4F4" },
  "Move-up & family buyers": { bg:"#EAF3DE", color:"#3B6D11", border:"#C0DD97" },
  "Relocators from Toronto": { bg:"#FAEEDA", color:"#854F0B", border:"#FAC775" },
  "Sellers & homeowners":    { bg:"#FBEAF0", color:"#993556", border:"#F4C0D1" },
  "Downsizers":              { bg:"#EEF0FE", color:"#3730A3", border:"#C7CAF7" },
  "Investors":               { bg:"#F0FDF4", color:"#166534", border:"#86EFAC" },
  "Renters considering buying":{ bg:"#FFF7ED", color:"#9A3412", border:"#FDC89A" },
};
const PILLAR_COLOR = {
  "Education":"#534AB7","Market Intelligence":"#0F6E56","Neighbourhood Guides":"#BA7517",
  "Real Stories":"#993C1D","Local Lifestyle":"#993556",
  "Buyer Mistakes":"#185FA5","Seller Strategy":"#3B6D11","Investment & Wealth":"#0F6E56",
  "School & Family":"#854F0B","Commute & Lifestyle":"#534AB7","Hidden Costs":"#993C1D",
  "Process Walkthrough":"#185FA5","Community Spotlight":"#BA7517",
};

// ─── SHORT & LONG GENERATION SECTIONS ────────────────────────────────────────
// Section group colours for visual grouping in the UI
const SEC_GROUPS = {
  script:     { color:"#534AB7", bg:"#EEEDFE" },
  voice:      { color:"#0F6E56", bg:"#E1F5EE" },
  video:      { color:"#993C1D", bg:"#FAECE7" },
  publish:    { color:"#185FA5", bg:"#E6F1FB" },
};

const SHORT_SECTIONS = [
  // ── Script & voice
  { key:"hook",      label:"3-Second Hook",              icon:"ti-bolt",         desc:"Scroll-stopping opener",             group:"script" },
  { key:"script60",  label:"60-sec Teleprompter Script", icon:"ti-microphone-2", desc:"~150 words, spoken paragraph",       group:"script" },
  { key:"script30",  label:"30-sec Teleprompter Script", icon:"ti-clock",        desc:"~75 words, alternate cut",           group:"script" },
  { key:"elevenlabs",label:"ElevenLabs Voice Script",    icon:"ti-waveform",     desc:"v2 natural prose or v3 audio tags",  group:"voice"  },
  // ── Video production
  { key:"heygen",    label:"HeyGen — Talking Head",      icon:"ti-user-circle",  desc:"Desk / studio Avatar prompt",        group:"video"  },
  { key:"higgsfield_walk",label:"Higgsfield — Walking Location",icon:"ti-walk",  desc:"Soul ID outdoor walk prompt",        group:"video"  },
  { key:"broll",     label:"Higgsfield — B-Roll Batch",  icon:"ti-video",        desc:"Numbered shot list for CapCut",      group:"video"  },
  // ── Publishing
  { key:"thumbnail", label:"Thumbnail Concepts",         icon:"ti-photo",        desc:"3 clickbait ideas",                  group:"publish"},
  { key:"caption",   label:"Caption & Hashtags",         icon:"ti-hash",         desc:"Instagram / TikTok / YouTube Shorts",group:"publish"},
];

const LONG_SECTIONS = [
  // ── Script & voice
  { key:"titles",      label:"5 YouTube Titles",          icon:"ti-cursor-text",  desc:"High CTR angles",                    group:"publish"},
  { key:"script",      label:"Full Script (8–12 min)",    icon:"ti-file-text",    desc:"Feelings / facts / fun audiences",   group:"script" },
  { key:"elevenlabs",  label:"ElevenLabs Voice Script",   icon:"ti-waveform",     desc:"v2 natural prose or v3 audio tags",  group:"voice"  },
  // ── Video production
  { key:"heygen",      label:"HeyGen — Talking Head",     icon:"ti-user-circle",  desc:"Desk / studio Avatar prompt",        group:"video"  },
  { key:"higgsfield_walk",label:"Higgsfield — Walking Location",icon:"ti-walk",   desc:"Soul ID outdoor walk prompt",        group:"video"  },
  { key:"broll",       label:"Higgsfield — B-Roll Batch", icon:"ti-video",        desc:"Numbered shot list for CapCut",      group:"video"  },
  // ── Publishing
  { key:"description", label:"YouTube Description",       icon:"ti-search",       desc:"SEO-optimised, keyword-rich",        group:"publish"},
  { key:"tags",        label:"Tags (≤500 chars)",          icon:"ti-tag",          desc:"Highest searched keywords",          group:"publish"},
  { key:"thumbnail",   label:"Thumbnail Concepts",        icon:"ti-photo",        desc:"3 clickbait ideas + Higgsfield",     group:"publish"},
];

// ─── API ──────────────────────────────────────────────────────────────────────
async function streamClaude(system, user, onChunk) {
  const res = await fetch("/api/generate", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ system, user }),
  });
  const reader=res.body.getReader(), dec=new TextDecoder(); let buf="";
  while(true){
    const {done,value}=await reader.read(); if(done)break;
    buf+=dec.decode(value,{stream:true});
    const lines=buf.split("\n"); buf=lines.pop();
    for(const line of lines){
      if(!line.startsWith("data: "))continue;
      const d=line.slice(6).trim(); if(d==="[DONE]")return;
      try{const p=JSON.parse(d);if(p.delta?.text)onChunk(p.delta.text);}catch{}
    }
  }
}

function buildPrompt(type, key, topic, instructions="") {
  const instrBlock=instructions.trim()
    ?`\n\nCUSTOM INSTRUCTIONS (apply to all generated content):\n${instructions.trim()}`:"";
  const sys=`You are ${BRAND.agent}, REALTOR® with ${BRAND.team} at ${BRAND.brokerage}.
Market: Richmond Hill, York Region, GTA. Phone: ${BRAND.phone}. Site: ${BRAND.site}.
Audience: ${topic.audience}. Hook: ${topic.hook}. Pillar: ${topic.pillar}.
Brand voice: Confident, specific, warm. NEVER use "stunning", "dream home", "In today's market". No invented statistics.${instrBlock}`;

  const shared={
    // ── HeyGen: Talking Head / Desk / Studio
    heygen_short:`Write a production-ready HeyGen Avatar prompt for a SHORT-FORM talking-head video (portrait 9:16, 60 seconds max) about: "${topic.title}".

Format exactly as follows:

SCENE SETUP
Describe the studio or desk background: modern real estate office, clean bookshelf, soft warm lighting, neutral charcoal tones. Avatar is seated or standing at a desk. Frame: mid-shot, centred.

AVATAR DELIVERY NOTES
- Tone: [confident / warm / direct — pick the right one for this topic]
- Pacing: speak at a natural conversational pace, slightly faster on data points
- Energy: [calm authority / excited local expert / empathetic advisor — pick one]
- Eye contact: direct to camera throughout
- Gestures: natural hand gestures to emphasise key numbers or points

ON-SCREEN TEXT OVERLAYS (CapCut / HeyGen text layer)
List each overlay as: [Timecode approx] — [Text] — [Style: headline / stat / CTA]

AVATAR SCRIPT CUE
One sentence describing where the avatar pauses for emphasis and where they smile or nod.`,

    heygen_long:`Write a production-ready HeyGen Avatar prompt for a LONG-FORM YouTube video (landscape 16:9, 8–12 minutes) about: "${topic.title}".

Format exactly as follows:

SCENE SETUP
Describe the studio or desk background: modern real estate office, warm ambient lighting, bookshelf with subtle Shaya Digital branding. Avatar seated at a clean desk. Camera: medium shot, slightly off-centre.

CHAPTER STRUCTURE FOR AVATAR
List each chapter (max 6) with: Chapter title | Approximate duration | Delivery tone shift for that section

AVATAR DELIVERY NOTES
- Opening tone: fear/curiosity hook — draw viewer in hard in the first 10 seconds
- Body tone: authoritative but conversational; vary energy between chapters
- Closing tone: warm, inviting CTA — never salesy
- Pacing: slower on key data points; faster during story or anecdote sections
- Gestures: lean in slightly for emphasis; open palms when making reassuring points

ON-SCREEN TEXT OVERLAYS
List the 5 most important stat or key-point overlays with approximate timecodes.

LOWER THIRDS
Contact CTA: ${BRAND.phone} | ${BRAND.site} — appears at chapter transitions and final 30 seconds.`,

    // ── Higgsfield: Walking Location / Soul ID
    higgsfield_walk_short:`Write a production-ready Higgsfield Soul ID walking-location prompt for a SHORT-FORM Reel (portrait 9:16, ~60 seconds) about: "${topic.title}".

Format exactly as follows:

SOUL ID SETTINGS
- Mode: Walking / outdoor
- Aspect ratio: 9:16 portrait
- Duration: 60 seconds
- Location feel: Richmond Hill, Ontario — suburban neighbourhood street, or specific landmark (Oak Ridges, Lake Wilcox, Mill Pond, Bayview Hill, Jefferson community — pick the most relevant)

WALKING PROMPT (paste directly into Higgsfield)
[Write one detailed, cinematic prompt paragraph describing: the environment, the walking path, lighting (golden hour / overcast / bright midday), season (pick the most appropriate), what is visible in the background (homes, trees, streets, parks), and the overall mood. Make it specific to Richmond Hill or York Region. This paragraph goes directly into the Higgsfield prompt field.]

DELIVERY NOTES
- The presenter walks confidently, speaking to camera while moving
- Camera follows smoothly — gimbal-stabilised look
- Background context reinforces the topic (e.g. for a buying tips video, walk past a residential street with homes for sale)`,

    higgsfield_walk_long:`Write a production-ready Higgsfield Soul ID walking-location prompt for a LONG-FORM YouTube video (landscape 16:9, 8–12 minutes) about: "${topic.title}".

Format exactly as follows:

SOUL ID SETTINGS
- Mode: Walking / outdoor
- Aspect ratio: 16:9 landscape
- Duration: Use for intro segment (60–90 seconds) and chapter transitions
- Location feel: Richmond Hill, Ontario — pick 2 distinct locations relevant to this topic

LOCATION 1 — INTRO WALK (paste into Higgsfield)
[Cinematic walking prompt paragraph: environment, lighting, season, background details, mood. Specific to Richmond Hill / York Region.]

LOCATION 2 — MID-VIDEO TRANSITION WALK (paste into Higgsfield)
[Second distinct location — different feel from Location 1. Could be a park, main street, neighbourhood entrance, or landmark.]

DELIVERY NOTES
- Presenter speaks directly to camera while walking; transitions between sit-down desk sections
- Gimbal-stabilised, smooth movement throughout
- Location choice should reinforce the video topic visually`,

    // ── Higgsfield: B-Roll Batch (numbered list for CapCut)
    broll_short:`Write a Higgsfield b-roll batch prompt list for a short-form Reel about: "${topic.title}".

These shots will be generated individually in Higgsfield and cut together in CapCut to minimise credit usage. Write each as a self-contained, paste-ready prompt.

FORMAT — one shot per line, numbered:

1. [Full cinematic prompt for shot 1 — include: subject, action, camera angle, movement, lighting, location in Richmond Hill/York Region, mood, duration hint (e.g. "3-second push-in")]
2. [Shot 2]
3. [Shot 3]
4. [Shot 4]
5. [Shot 5]

RULES:
- All shots must be 9:16 portrait orientation
- Shots must be visually varied: mix wide establishing, medium, and close-up
- Each shot should relate to a specific moment or point in the script
- Location details must feel like Richmond Hill, York Region, or suburban GTA (not generic city footage)
- No text overlays in the b-roll prompts (those are added in CapCut)
- Shots should be 3–6 seconds each`,

    broll_long:`Write a Higgsfield b-roll batch prompt list for a long-form YouTube video about: "${topic.title}".

These shots will be generated individually in Higgsfield and cut together in CapCut. Write each as a self-contained, paste-ready prompt.

FORMAT — one shot per line, numbered:

1. [Full cinematic prompt — subject, action, camera angle, movement, lighting, Richmond Hill location, mood, duration hint]
2. [Shot 2]
3. [Shot 3]
4. [Shot 4]
5. [Shot 5]
6. [Shot 6]
7. [Shot 7]
8. [Shot 8]

RULES:
- All shots 16:9 landscape orientation
- Shots must be visually varied: mix wide establishing, medium, close-up, and detail shots
- Map each shot to a chapter or script segment (add a short label before each prompt, e.g. "INTRO —" or "CHAPTER 2 —")
- Location details specific to Richmond Hill, York Region, or suburban GTA
- No text overlays in b-roll prompts
- Shots should be 4–8 seconds each`,

    // ── ElevenLabs v3 Voice Script
    elevenlabs_short:`Write an ElevenLabs v3 voice script for a short-form Reel (60 seconds max) about: "${topic.title}".

This script will be pasted directly into ElevenLabs Text-to-Speech. Use ElevenLabs v3 audio tags throughout to control pacing, emotion, and intonation.

ElevenLabs v3 audio tag reference:
- [pause] = short natural pause (~0.5s)
- [long pause] = longer pause (~1s)
- [sigh] = audible breath/sigh
- [laughs] = light laugh or chuckle
- [excited] = raise energy and pace
- [serious] = lower energy, more deliberate
- [whispers] = soft, intimate delivery
- Commas and periods also create natural micro-pauses

FORMAT:
Write the complete spoken script as one flowing paragraph with audio tags embedded naturally. No stage directions, no scene labels — only the words and tags that will be read aloud.

RULES:
- ~150 words for 60 seconds (or ~75 words for a 30-second cut)
- Opens with a ${topic.hook} style hook — use [pause] after the hook for impact
- Speaks naturally to ${topic.audience}
- Woven with Richmond Hill / York Region specifics
- Ends with a warm CTA
- Tone: confident, warm, and human — never robotic or salesy
- Do NOT use "stunning", "dream home", or "In today's market"`,

    elevenlabs_long:`Write an ElevenLabs v3 voice script for a long-form YouTube video (8–12 minutes, ~1400–1800 words) about: "${topic.title}".

This script will be pasted directly into ElevenLabs Text-to-Speech. Use ElevenLabs v3 audio tags throughout to control pacing, emotion, and intonation across different chapters.

ElevenLabs v3 audio tag reference:
- [pause] = short natural pause (~0.5s)
- [long pause] = longer pause (~1s)
- [sigh] = audible breath
- [laughs] = light laugh
- [excited] = raise energy and pace
- [serious] = deliberate, lower energy
- [whispers] = intimate/close delivery
- Commas and periods create natural micro-pauses

FORMAT:
Write the complete script chapter by chapter, with a clear CHAPTER label before each section (these labels will NOT be read aloud — only the script text and tags will). Embed audio tags naturally throughout.

CHAPTER STRUCTURE (adapt to topic):
CHAPTER 1 — HOOK (fear/curiosity, ~60 seconds)
CHAPTER 2 — [Main point 1]
CHAPTER 3 — [Main point 2]
CHAPTER 4 — [Main point 3]
CHAPTER 5 — CLOSE & CTA (~60 seconds, warm and inviting)

RULES:
- Each chapter: written as flowing spoken prose with embedded v3 tags
- [pause] after every major claim or data point
- [long pause] at chapter transitions
- [excited] when revealing a surprising insight or local stat
- [serious] when discussing risks, mistakes, or common errors
- CTA chapter: warm, inviting, never salesy — references ${BRAND.phone} and ${BRAND.site}
- Richmond Hill / York Region specifics throughout
- Never invent statistics`,
  };

  const sp={
    hook:`Write ONE 3-second hook line for this Reel: "${topic.title}". Hook style: ${topic.hook}. One sentence only — no preamble, no labels.`,
    script30:`Write a 30-sec teleprompter script (~75 words) for: "${topic.title}". One flowing paragraph of natural spoken language. Opens with a ${topic.hook} hook. Ends with a CTA. No bullets, no stage directions, no bold text, no audio tags or markup of any kind.`,
    script60:`Write a 60-sec teleprompter script (~150 words) for: "${topic.title}". One flowing paragraph of natural spoken language. Opens with a ${topic.hook} hook. Ends with a CTA. No bullets, no stage directions, no bold text, no audio tags or markup of any kind. This is the raw spoken text only — tags will be added separately.`,
    elevenlabs: shared.elevenlabs_short,
    heygen: shared.heygen_short,
    higgsfield_walk: shared.higgsfield_walk_short,
    broll: shared.broll_short,
    thumbnail:`Write 3 thumbnail design concepts for this short-form video: "${topic.title}". For each — numbered 1, 2, 3 — include: background scene, bold text overlay (≤5 words), key visual element, colour scheme (charcoal & warm gold palette), and the emotional hook that makes someone stop scrolling.`,
    caption:`Write an Instagram/TikTok/Shorts caption for: "${topic.title}". Start with a strong first line (no hashtag). Write 2–3 short value paragraphs. End with a CTA (DM, comment, or link in bio to ${BRAND.site}). Then on a new line, list exactly 20 hashtags mixing local (#RichmondHill #YorkRegion #GTA #RichmondHillRealEstate) with niche audience tags.`,
  };

  const lp={
    titles:`Write 5 YouTube video titles for maximum click-through rate for: "${topic.title}". Each title must be: curiosity-driven, keyword-rich for SEO, and specific to Richmond Hill / York Region / GTA. Number them 1–5. No preamble.`,
    script:`Write a complete YouTube video script (8–12 minutes, ~1600 words) for: "${topic.title}". Structure: fear-based hook intro → main chapters with real depth and local specifics → warm CTA. Connect with 30% feelings-based viewers, 25% facts-based viewers, and 20% fun/humour-based viewers simultaneously. CTA directs viewers to call ${BRAND.phone} or visit ${BRAND.site}. Never invent statistics. Be specific to Richmond Hill / York Region. Output clean spoken prose only — no audio tags, no markup, no stage directions.`,
    elevenlabs: shared.elevenlabs_long,
    heygen: shared.heygen_long,
    higgsfield_walk: shared.higgsfield_walk_long,
    broll: shared.broll_long,
    description:`Write a YouTube video description (250–350 words) for: "${topic.title}". Open with a compelling 2-sentence hook. List the key topics covered. Naturally embed SEO keywords: Richmond Hill real estate, York Region homes for sale, moving to Richmond Hill, GTA suburbs, Richmond Hill REALTOR. Include contact info: ${BRAND.phone} | ${BRAND.email} | ${BRAND.site}. End with a CTA.`,
    tags:`Write YouTube video tags for: "${topic.title}". Rules: total must be under 500 characters. Mix broad and niche tags. Must include variations of: Richmond Hill real estate, York Region, GTA suburbs, and topic-specific terms. Output as a single comma-separated list — nothing else.`,
    thumbnail:`Write 3 clickbait-style YouTube thumbnail concepts for: "${topic.title}". For each — numbered 1, 2, 3 — include: background/scene, bold text overlay (≤6 words), key visual element, colour treatment (high contrast, charcoal & gold or bright accent), what makes it stand out vs competitors, and a Higgsfield image-generation prompt to create the background.`,
  };

  return { system:sys, user:type==="short"?sp[key]:lp[key] };
}

// ─── SMALL UI ATOMS ───────────────────────────────────────────────────────────
function Pill({children, bg, color, border}) {
  return <span style={{display:"inline-flex",alignItems:"center",padding:"2px 8px",
    borderRadius:20,fontSize:11,fontWeight:500,background:bg,color,
    border:`0.5px solid ${border||color+"55"}`,lineHeight:1.4,whiteSpace:"nowrap"}}>{children}</span>;
}
function AudBadge({aud}){
  const a=AUD_STYLE[aud]||{bg:"#F1EFE8",color:"#5F5E5A",border:"#D3D1C7"};
  return <Pill bg={a.bg} color={a.color} border={a.border}>{aud}</Pill>;
}
function PillarDot({pillar}){
  const c=PILLAR_COLOR[pillar]||"#888";
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,color:c,fontWeight:500}}>
    <span style={{width:6,height:6,borderRadius:"50%",background:c,flexShrink:0}}/>{pillar}
  </span>;
}
function ProgressBar({pct,color="#1D9E75",h=3}){
  return <div style={{height:h,borderRadius:h,background:"var(--color-border-tertiary)",overflow:"hidden"}}>
    <div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:h,transition:"width .4s"}}/>
  </div>;
}

function StageSelector({current,onChange}){
  const si=STAGE_KEYS.indexOf(current);
  return <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
    {STAGES.map((s,i)=>{
      const active=current===s.key, past=si>i;
      return <button key={s.key} onClick={()=>onChange(s.key)} style={{
        display:"inline-flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:20,fontSize:11,
        fontWeight:active?600:400, cursor:"pointer",transition:"all .15s",
        border:active?`1.5px solid ${s.color}`:`0.5px solid ${past?"var(--color-border-secondary)":"var(--color-border-tertiary)"}`,
        background:active?s.bg:past?"var(--color-background-secondary)":"transparent",
        color:active?s.color:"var(--color-text-secondary)",
      }}>
        {past&&!active&&<i className="ti ti-check" style={{fontSize:9,color:"#1D9E75"}}/>}
        {active&&<span style={{width:5,height:5,borderRadius:"50%",background:s.color}}/>}
        {s.label}
      </button>;
    })}
  </div>;
}

// ─── GENERATION SECTION ───────────────────────────────────────────────────────
const GROUP_META = {
  script:  { label:"Script",           icon:"ti-file-text",   color:"#534AB7", bg:"#EEEDFE" },
  voice:   { label:"Voice (ElevenLabs)",icon:"ti-waveform",   color:"#0F6E56", bg:"#E1F5EE" },
  video:   { label:"Video Production", icon:"ti-video",       color:"#993C1D", bg:"#FAECE7" },
  publish: { label:"Publishing",       icon:"ti-send",        color:"#185FA5", bg:"#E6F1FB" },
};

function SectionGroupDivider({group}){
  const g=GROUP_META[group]||{};
  return(
    <div style={{display:"flex",alignItems:"center",gap:8,margin:"16px 0 8px"}}>
      <div style={{width:24,height:24,borderRadius:6,background:g.bg,
        display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <i className={`ti ${g.icon}`} style={{fontSize:12,color:g.color}}/>
      </div>
      <span style={{fontSize:11,fontWeight:600,color:g.color,textTransform:"uppercase",
        letterSpacing:"0.06em"}}>{g.label}</span>
      <div style={{flex:1,height:"0.5px",background:g.color+"33"}}/>
    </div>
  );
}

// Dependency chain: teleprompter → elevenlabs → heygen + higgsfield_walk
// Keys that derive from the teleprompter master
const DERIVED_FROM_TELEPROMPTER = new Set(["elevenlabs","heygen","higgsfield_walk"]);
// Keys that derive from the ElevenLabs secondary master
const DERIVED_FROM_ELEVENLABS   = new Set(["heygen","higgsfield_walk"]);
// The primary master key per format
const MASTER_KEY = { short:"script60", long:"script" };

// ─── buildDerivedPrompt ───────────────────────────────────────────────────────
function buildDerivedPrompt(key, sourceScript, topic, type, instructions, elVersion="v3") {
  const instrBlock = instructions.trim()
    ? `\n\nCUSTOM INSTRUCTIONS:\n${instructions.trim()}` : "";
  const sys = `You are ${BRAND.agent}, REALTOR® with ${BRAND.team} at ${BRAND.brokerage}.
Market: Richmond Hill, York Region, GTA. Phone: ${BRAND.phone}. Site: ${BRAND.site}.
Audience: ${topic.audience}. Pillar: ${topic.pillar}.
Brand voice: Confident, specific, warm. NEVER alter the substance of the provided script.${instrBlock}`;

  const isShort = type === "short";

  const prompts = {
    elevenlabs: elVersion === "v2"
      ? `Below is the exact teleprompter script. Reformat it for ElevenLabs v2 Text-to-Speech using natural prose pacing only — no special tags or markup.

TELEPROMPTER SCRIPT:
"""
${sourceScript}
"""

RULES FOR v2 (natural prose — no tags):
- Do NOT change, add, or remove any words
- Use punctuation and sentence structure to control pacing:
  • Commas create short pauses
  • Em dashes (—) create a brief dramatic beat
  • Ellipses (...) create a lingering pause
  • Periods end a thought fully; new sentences reset the rhythm
  • Short sentences speed up; longer sentences slow down
  • Break one long sentence into two short ones where a pause is needed
- You MAY reformat punctuation and sentence breaks to improve flow — but NO word changes
- Output ONLY the reformatted script — no preamble, no labels, no version markers`
      : `Below is the exact teleprompter script. Take this EXACT text — same words, same order, nothing added or removed — and layer in ElevenLabs v3 audio tags for pacing, emotion, and intonation.

TELEPROMPTER SCRIPT:
"""
${sourceScript}
"""

RULES FOR v3 (audio tags):
- Do NOT change, add, or remove any words
- Only insert: [pause], [long pause], [excited], [serious], [laughs], [sigh], [whispers], [smile]
- [pause] after the hook line and after data points
- [long pause] between major topic shifts
- [excited] on surprising insights, [serious] on risks/mistakes
- Commas and periods already create micro-pauses — don't over-tag
- Output ONLY the tagged script — no preamble, no labels`,

    heygen: `Below is the script for this video. Build a complete HeyGen Avatar prompt using this EXACT script as the spoken content.

SCRIPT:
"""
${sourceScript}
"""

FORMAT exactly as:

SCENE SETUP
${isShort
  ? "Portrait 9:16. Modern real estate desk/studio. Warm ambient lighting, charcoal and gold tones. Avatar mid-shot, centred, seated or standing at a clean desk."
  : "Landscape 16:9. Modern real estate office, clean desk, warm lighting, subtle Shaya Digital branding. Avatar medium shot, slightly off-centre."}

SPOKEN SCRIPT (paste into HeyGen teleprompter)
[Copy the exact script above here — word for word]

AVATAR DELIVERY NOTES
- Tone: [pick: confident / warm / direct / empathetic based on topic]
- Pacing: natural conversational pace; slow on numbers and key claims
- Energy level: [pick: calm authority / local expert / trusted advisor]
- Eye contact: direct to camera throughout
- Gestures: natural hand movement on emphasis; open palms on reassuring lines

ON-SCREEN TEXT OVERLAYS
[List 3–5 key stat or claim overlays with approximate timecode positions]

LOWER THIRDS / CTA
Contact: ${BRAND.phone} | ${BRAND.site} — show in final 10 seconds`,

    higgsfield_walk: `Below is the script for this video. Build a Higgsfield Soul ID walking-location prompt where the presenter delivers this exact script while walking outdoors.

SCRIPT (spoken while walking — do not alter):
"""
${sourceScript}
"""

FORMAT exactly as:

SOUL ID SETTINGS
- Mode: Walking / outdoor
- Aspect ratio: ${isShort ? "9:16 portrait" : "16:9 landscape"}
- Duration: ${isShort ? "60 seconds" : "Use for intro (60–90s) and chapter transitions"}

WALKING PROMPT (paste directly into Higgsfield)
[One detailed cinematic paragraph: outdoor environment, specific Richmond Hill / York Region location (Oak Ridges trail, Lake Wilcox path, Jefferson neighbourhood street, Mill Pond boardwalk, Bayview Hill community entrance — pick the most relevant to the script topic), lighting (golden hour / bright midday / overcast), season, camera movement (smooth gimbal follow), mood. Must feel unmistakably like Richmond Hill / York Region.]

DELIVERY NOTES
- Presenter walks confidently, speaking directly to camera
- Camera follows at chest height, smooth gimbal
- Background reinforces the script topic visually`,
  };

  return { system: sys, user: prompts[key] };
}

// ─── GEN SECTION ──────────────────────────────────────────────────────────────
function GenSection({
  section, topic, type, instructions,
  masterScript, masterVersion,
  elScript, elVersion,
  onMasterGenerated, onElGenerated,
  onAppendInstruction,
  initialOut,      // content loaded from Supabase
  onContentSaved,  // (content, elVer) => void
}) {
  const [out, setOut]               = useState("");
  const [loading, setLoading]       = useState(false);
  const [open, setOpen]             = useState(false);
  const [genMeta, setGenMeta]       = useState(null);
  const [editing, setEditing]       = useState(false);
  const [draft, setDraft]           = useState("");
  const [copied, setCopied]         = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [elVoiceVer, setElVoiceVer] = useState("v3");

  // Initialise from Supabase-saved content when topic opens
  useEffect(() => {
    if (initialOut && !out) {
      setOut(initialOut);
      setOpen(false);
      setGenMeta({ date: "Saved", instructionsSnapshot: instructions, sourceVersion: 0 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOut]);

  // ── Feedback flow state
  const [fbOpen, setFbOpen]         = useState(false);
  const [fbText, setFbText]         = useState("");
  const [fbLoading, setFbLoading]   = useState(false);
  const [suggestedRule, setSuggestedRule] = useState("");
  const [ruleEditing, setRuleEditing]    = useState(false);
  const [ruleAdded, setRuleAdded]        = useState(false);

  const g = GROUP_META[section.group] || { color:"#888780", bg:"#F1EFE8" };

  const isMaster    = section.key === MASTER_KEY[type];
  const isElSection = section.key === "elevenlabs";
  const isHeyHig    = DERIVED_FROM_ELEVENLABS.has(section.key);
  const isDerived   = DERIVED_FROM_TELEPROMPTER.has(section.key);

  const sourceScript  = isHeyHig ? (elScript || masterScript) : masterScript;
  const sourceVersion = isHeyHig ? (elScript ? elVersion : masterVersion) : masterVersion;
  const needsMaster   = isDerived && !masterScript;
  const sourceLabel   = isHeyHig && elScript ? "ElevenLabs script" : "teleprompter script";

  const masterChanged = isDerived && out && genMeta && genMeta.sourceVersion !== sourceVersion;
  const instrChanged  = out && genMeta && genMeta.instructionsSnapshot !== instructions;
  const isStale       = masterChanged || instrChanged;

  // ── Generate
  const generate = async () => {
    if (needsMaster) return;
    setLoading(true); setOut(""); setOpen(true); setEditing(false);
    setFbOpen(false); setSuggestedRule(""); setRuleAdded(false);
    const dateStr = new Date().toLocaleString("en-CA",
      { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });
    let system, user;
    if (isDerived) {
      ({ system, user } = buildDerivedPrompt(section.key, sourceScript, topic, type, instructions, isElSection ? elVoiceVer : "v3"));
    } else {
      ({ system, user } = buildPrompt(type, section.key, topic, instructions));
    }
    let full = "";
    await streamClaude(system, user, chunk => { full += chunk; setOut(p => p + chunk); });
    setGenMeta({ date: dateStr, instructionsSnapshot: instructions, sourceVersion, elVer: isElSection ? elVoiceVer : undefined });
    if (isMaster)    onMasterGenerated?.(full, masterVersion + 1);
    if (isElSection) onElGenerated?.(full, elVersion + 1);
    onContentSaved?.(full, isElSection ? elVoiceVer : undefined);
    setLoading(false);
  };

  // ── Edit / save
  const startEdit = () => { setDraft(out); setEditing(true); setFbOpen(false); };
  const cancelEdit = () => setEditing(false);
  const saveEdit = () => {
    const saved = draft.trim();
    setOut(saved);
    setEditing(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
    if (isMaster)    onMasterGenerated?.(saved, masterVersion + 1);
    if (isElSection) onElGenerated?.(saved, elVersion + 1);
    setGenMeta(m => m ? { ...m, sourceVersion } : m);
    onContentSaved?.(saved, undefined);
  };

  // ── Copy
  const copy = () => {
    try {
      // Primary: Clipboard API
      navigator.clipboard.writeText(out.trim()).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      }).catch(() => fallbackCopy());
    } catch {
      fallbackCopy();
    }
  };
  const fallbackCopy = () => {
    // Fallback: create a textarea, select it, execCommand
    const ta = document.createElement("textarea");
    ta.value = out.trim();
    ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    try { document.execCommand("copy"); } catch {}
    document.body.removeChild(ta);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  // ── Feedback: ask Claude to write an instruction rule
  const generateRule = useCallback(async () => {
    if (!fbText.trim()) return;
    setFbLoading(true); setSuggestedRule(""); setRuleEditing(false);
    await streamClaude(
      `You are a prompt-engineering assistant for a real estate video content system used by ${BRAND.agent} in Richmond Hill, Ontario.
The user generated a "${section.label}" output and was not satisfied with it. Your job is to write ONE clear, concise instruction rule (1–3 sentences) that, if added to the system instructions, would fix the problem they describe.
Write ONLY the rule text itself — no preamble, no explanation, no bullet point prefix. Start with the section name so it is specific: e.g. "HeyGen prompts should always..." or "ElevenLabs scripts should..." or "Teleprompter scripts must..."`,
      `SECTION: ${section.label}
GENERATED OUTPUT:
"""
${out.slice(0, 600)}${out.length > 600 ? "…" : ""}
"""
USER FEEDBACK: ${fbText.trim()}

Write one precise instruction rule that fixes this going forward.`,
      chunk => setSuggestedRule(p => p + chunk)
    );
    setRuleEditing(true);
    setFbLoading(false);
  }, [fbText, out, section.label]);

  // ── Add rule to global instructions
  const addRule = () => {
    if (!suggestedRule.trim()) return;
    onAppendInstruction?.(suggestedRule.trim());
    setRuleAdded(true);
    setFbOpen(false);
    setFbText("");
    setSuggestedRule("");
    setRuleEditing(false);
    setTimeout(() => setRuleAdded(false), 3000);
  };

  return (
    <div style={{
      background:"var(--color-background-primary)",
      border:`0.5px solid ${open ? g.color+"55" : "var(--color-border-tertiary)"}`,
      borderLeft:`3px solid ${needsMaster ? "#D3D1C7" : g.color}`,
      borderRadius:10, marginBottom:5, overflow:"hidden", transition:"border-color .15s",
      opacity: needsMaster ? 0.55 : 1,
    }}>
      {/* ── Row header ── */}
      <div
        onClick={() => { if (!needsMaster && !editing) setOpen(o => !o); }}
        style={{
          display:"flex", alignItems:"center", gap:10, padding:"11px 14px",
          cursor: needsMaster ? "not-allowed" : "pointer",
          background: open ? g.bg+"66" : "var(--color-background-primary)",
        }}
      >
        <div style={{
          width:30, height:30, borderRadius:7, flexShrink:0,
          display:"flex", alignItems:"center", justifyContent:"center",
          background: needsMaster ? "var(--color-background-secondary)" : g.bg,
        }}>
          <i className={`ti ${section.icon}`}
            style={{ fontSize:14, color: needsMaster ? "var(--color-text-secondary)" : g.color }}/>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:5, flexWrap:"wrap" }}>
            <span style={{ fontSize:13, fontWeight:500 }}>{section.label}</span>
            {isMaster && (
              <span style={{ fontSize:10, padding:"1px 6px", borderRadius:10, fontWeight:600,
                background:"#534AB711", color:"#534AB7", border:"0.5px solid #534AB744" }}>
                Primary master
              </span>
            )}
            {isElSection && out && (
              <span style={{ fontSize:10, padding:"1px 6px", borderRadius:10, fontWeight:600,
                background:"#E1F5EE", color:"#0F6E56", border:"0.5px solid #9FE1CB" }}>
                Secondary master
              </span>
            )}
            {isDerived && !isMaster && (
              <span style={{
                fontSize:10, padding:"1px 6px", borderRadius:10, fontWeight:500,
                background: needsMaster ? "#F1EFE8" : g.bg,
                color: needsMaster ? "#888780" : g.color,
                border:`0.5px solid ${needsMaster ? "#D3D1C7" : g.color+"44"}`,
              }}>
                {needsMaster ? "⚠ Generate teleprompter first" : `Derived from ${sourceLabel}`}
              </span>
            )}
          </div>
          <div style={{ fontSize:11, color:"var(--color-text-secondary)", marginTop:1 }}>{section.desc}</div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
          {isStale && !loading && !editing && (
            <span style={{ fontSize:10, color:"#BA7517", fontWeight:600, display:"flex",
              alignItems:"center", gap:3, background:"#FAEEDA",
              padding:"2px 7px", borderRadius:10, border:"0.5px solid #FAC775" }}>
              <i className="ti ti-refresh-alert" style={{ fontSize:10 }}/>
              {masterChanged ? `${sourceLabel.split(" ")[0]} changed` : "Instructions changed"}
            </span>
          )}
          {ruleAdded && <Pill bg="#EAF3DE" color="#3B6D11">Rule added ✓</Pill>}
          {savedFlash && !ruleAdded && <Pill bg="#EAF3DE" color="#3B6D11">Saved ✓</Pill>}
          {out && !loading && !isStale && !savedFlash && !ruleAdded && <Pill bg="#EAF3DE" color="#3B6D11">Done ✓</Pill>}
          {loading && <Pill bg="#FAEEDA" color="#854F0B">Generating…</Pill>}

          {out && !loading && !editing && (
            <>
              <button onClick={e => { e.stopPropagation(); startEdit(); }} style={{
                display:"inline-flex", alignItems:"center", gap:4,
                padding:"5px 10px", borderRadius:7,
                border:`0.5px solid ${g.color}44`, background:"transparent",
                fontSize:11, fontWeight:500, cursor:"pointer", color:g.color,
              }}>
                <i className="ti ti-edit" style={{ fontSize:11 }}/>Edit
              </button>
              <button onClick={e => { e.stopPropagation(); setFbOpen(o=>!o); }} style={{
                display:"inline-flex", alignItems:"center", gap:4,
                padding:"5px 10px", borderRadius:7,
                border:"0.5px solid #BA751766", background: fbOpen ? "#FAEEDA" : "transparent",
                fontSize:11, fontWeight:500, cursor:"pointer", color:"#BA7517",
              }}>
                <i className="ti ti-mood-sad" style={{ fontSize:11 }}/>Not right
              </button>
            </>
          )}
          {editing && (
            <>
              <button onClick={e => { e.stopPropagation(); cancelEdit(); }} style={{
                display:"inline-flex", alignItems:"center", gap:4, padding:"5px 10px",
                borderRadius:7, border:"0.5px solid var(--color-border-secondary)",
                background:"transparent", fontSize:11, cursor:"pointer",
                color:"var(--color-text-secondary)",
              }}>Cancel</button>
              <button onClick={e => { e.stopPropagation(); saveEdit(); }} style={{
                display:"inline-flex", alignItems:"center", gap:4, padding:"5px 12px",
                borderRadius:7, border:"none", background:g.color,
                fontSize:11, fontWeight:600, cursor:"pointer", color:"#fff",
              }}>
                <i className="ti ti-device-floppy" style={{ fontSize:11 }}/>Save
              </button>
            </>
          )}
          {!needsMaster && !editing && (
            <button onClick={e => { e.stopPropagation(); generate(); }} disabled={loading} style={{
              display:"inline-flex", alignItems:"center", gap:5,
              padding:"6px 12px", borderRadius:7,
              border:`0.5px solid ${g.color}`, background:g.bg,
              fontSize:12, fontWeight:600,
              cursor: loading ? "not-allowed" : "pointer",
              color:g.color, opacity: loading ? .6 : 1,
            }}>
              <i className={`ti ${loading ? "ti-loader-2" : isStale ? "ti-refresh" : "ti-sparkles"}`}
                style={{ fontSize:12, animation: loading ? "spin 1s linear infinite" : "" }}/>
              {out ? (isStale ? "Re-derive" : "Regen") : (isDerived ? "Derive" : "Generate")}
            </button>
          )}
          {!needsMaster && !editing && (
            <i className={`ti ti-chevron-${open ? "up" : "down"}`}
              style={{ fontSize:13, color:"var(--color-text-secondary)" }}/>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      {open && !needsMaster && (
        <div style={{ padding:"0 14px 14px" }}>

          {/* ── Feedback panel ── */}
          {fbOpen && out && !editing && (
            <div style={{
              marginBottom:10, borderRadius:10, overflow:"hidden",
              border:"1px solid #FAC775",
            }}>
              {/* FB header */}
              <div style={{
                padding:"8px 12px", background:"#FAEEDA",
                display:"flex", alignItems:"center", gap:8,
                borderBottom:"0.5px solid #FAC77566",
              }}>
                <i className="ti ti-wand" style={{ fontSize:14, color:"#BA7517" }}/>
                <span style={{ fontSize:12, fontWeight:600, color:"#BA7517", flex:1 }}>
                  What's wrong with this output?
                </span>
                <button onClick={() => { setFbOpen(false); setFbText(""); setSuggestedRule(""); setRuleEditing(false); }}
                  style={{ background:"none", border:"none", cursor:"pointer",
                    color:"#BA7517", fontSize:16, lineHeight:1, padding:0 }}>×</button>
              </div>

              <div style={{ padding:"12px 14px", background:"var(--color-background-primary)" }}>
                {/* Step 1: feedback input */}
                <div style={{ marginBottom:10 }}>
                  <label style={{ fontSize:11, color:"var(--color-text-secondary)",
                    display:"block", marginBottom:5 }}>
                    Describe what was wrong — in plain language
                  </label>
                  <div style={{ display:"flex", gap:8 }}>
                    <textarea
                      value={fbText}
                      onChange={e => setFbText(e.target.value)}
                      placeholder={`e.g. "The scene setup is too generic — I always want it set in a Richmond Hill neighbourhood" or "Too formal, make it feel more like talking to a friend"`}
                      rows={3}
                      style={{
                        flex:1, padding:"9px 12px", borderRadius:8, fontSize:12,
                        lineHeight:1.6, resize:"none", boxSizing:"border-box",
                        border:"1px solid #FAC775", outline:"none",
                        background:"var(--color-background-secondary)",
                        color:"var(--color-text-primary)",
                      }}
                    />
                  </div>
                </div>

                <button onClick={generateRule} disabled={fbLoading || !fbText.trim()} style={{
                  display:"inline-flex", alignItems:"center", gap:5,
                  padding:"7px 14px", borderRadius:7, border:"none",
                  background: fbText.trim() ? "#BA7517" : "var(--color-background-secondary)",
                  color: fbText.trim() ? "#fff" : "var(--color-text-secondary)",
                  fontSize:12, fontWeight:600,
                  cursor: fbText.trim() && !fbLoading ? "pointer" : "not-allowed",
                  opacity: fbLoading ? .7 : 1,
                }}>
                  <i className={`ti ${fbLoading ? "ti-loader-2" : "ti-sparkles"}`}
                    style={{ fontSize:12, animation: fbLoading ? "spin 1s linear infinite" : "" }}/>
                  {fbLoading ? "Writing rule…" : "Write fix as instruction"}
                </button>

                {/* Step 2: suggested rule */}
                {(suggestedRule || fbLoading) && (
                  <div style={{ marginTop:12 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:"#0F6E56",
                      marginBottom:6, display:"flex", alignItems:"center", gap:5 }}>
                      <i className="ti ti-check-circle" style={{ fontSize:12 }}/>
                      Suggested instruction rule — review and edit if needed
                    </div>
                    <textarea
                      value={suggestedRule}
                      onChange={e => setSuggestedRule(e.target.value)}
                      readOnly={!ruleEditing}
                      rows={3}
                      style={{
                        width:"100%", padding:"9px 12px", borderRadius:8,
                        fontSize:12, lineHeight:1.6, resize:"vertical",
                        boxSizing:"border-box", outline:"none",
                        border:`1px solid ${ruleEditing ? "#0F6E56" : "#9FE1CB"}`,
                        background: ruleEditing ? "var(--color-background-primary)" : "#E1F5EE",
                        color:"var(--color-text-primary)",
                        fontFamily: ruleEditing ? "inherit" : "'SF Mono','Fira Code',monospace",
                        cursor: ruleEditing ? "text" : "default",
                      }}
                    />
                    {suggestedRule && !fbLoading && (
                      <div style={{ display:"flex", gap:8, marginTop:8, justifyContent:"flex-end" }}>
                        <button onClick={() => setRuleEditing(r=>!r)} style={{
                          display:"inline-flex", alignItems:"center", gap:4,
                          padding:"6px 12px", borderRadius:7,
                          border:"0.5px solid #9FE1CB", background:"transparent",
                          fontSize:11, cursor:"pointer", color:"#0F6E56",
                        }}>
                          <i className={`ti ${ruleEditing ? "ti-check" : "ti-edit"}`} style={{ fontSize:11 }}/>
                          {ruleEditing ? "Done editing" : "Edit rule"}
                        </button>
                        <button onClick={addRule} style={{
                          display:"inline-flex", alignItems:"center", gap:5,
                          padding:"6px 16px", borderRadius:7, border:"none",
                          background:"#0F6E56", color:"#fff",
                          fontSize:12, fontWeight:600, cursor:"pointer",
                        }}>
                          <i className="ti ti-circle-plus" style={{ fontSize:13 }}/>
                          Add to Instructions
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Main content area ── */}
          {/* ElevenLabs version selector — shown only for EL section */}
          {isElSection && (
            <div style={{
              display:"flex",alignItems:"center",gap:10,marginBottom:12,
              padding:"10px 14px",borderRadius:9,
              background:"var(--color-background-secondary)",
              border:"0.5px solid var(--color-border-tertiary)",
            }}>
              <span style={{fontSize:12,fontWeight:600,color:g.color,flexShrink:0}}>
                ElevenLabs version:
              </span>
              <div style={{display:"flex",gap:6}}>
                {["v2","v3"].map(v=>(
                  <button key={v} onClick={()=>setElVoiceVer(v)} style={{
                    padding:"5px 16px",borderRadius:20,fontSize:12,fontWeight:elVoiceVer===v?700:400,
                    cursor:"pointer",transition:"all .15s",
                    border:elVoiceVer===v?`1.5px solid ${g.color}`:`1px solid var(--color-border-secondary)`,
                    background:elVoiceVer===v?g.bg:"transparent",
                    color:elVoiceVer===v?g.color:"var(--color-text-secondary)",
                  }}>
                    {v.toUpperCase()}
                  </button>
                ))}
              </div>
              <span style={{fontSize:11,color:"var(--color-text-secondary)",flex:1}}>
                {elVoiceVer==="v2"
                  ? "Natural prose — punctuation & sentence breaks control pacing, no tags"
                  : "Audio tags — [pause], [excited], [serious], [smile], [laughs] etc."}
              </span>
              {out && genMeta?.elVer && genMeta.elVer !== elVoiceVer && (
                <span style={{fontSize:10,color:"#BA7517",fontWeight:600,
                  background:"#FAEEDA",padding:"2px 8px",borderRadius:10,
                  border:"0.5px solid #FAC775",flexShrink:0}}>
                  Version changed
                </span>
              )}
            </div>
          )}

          {!out && !loading
            ? <div style={{
                padding:"1.5rem", textAlign:"center", color:"var(--color-text-secondary)",
                fontSize:13, background:"var(--color-background-secondary)", borderRadius:8,
                border:"0.5px solid var(--color-border-tertiary)",
              }}>
                {isDerived
                  ? `Click "Derive" to generate from your ${sourceLabel}`
                  : "Click Generate to create AI-powered content for this section"}
              </div>

            : editing
              ? <div>
                  <div style={{ fontSize:11, color:g.color, fontWeight:600, marginBottom:6,
                    display:"flex", alignItems:"center", gap:5 }}>
                    <i className="ti ti-edit" style={{ fontSize:12 }}/>
                    Editing — make your changes, then click Save
                    {(isMaster || isElSection) && (
                      <span style={{ fontWeight:400, color:"var(--color-text-secondary)" }}>
                        · saving will mark derived sections as stale
                      </span>
                    )}
                  </div>
                  <textarea value={draft} onChange={e => setDraft(e.target.value)}
                    style={{
                      width:"100%", minHeight:220, padding:"12px 14px", borderRadius:10,
                      border:`1.5px solid ${g.color}`,
                      background:"var(--color-background-primary)",
                      fontFamily:"'SF Mono','Fira Code','Fira Mono','Roboto Mono',monospace",
                      fontSize:12.5, lineHeight:1.85, color:"var(--color-text-primary)",
                      resize:"vertical", boxSizing:"border-box", outline:"none",
                    }} autoFocus/>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center", marginTop:8 }}>
                    <span style={{ fontSize:11, color:"var(--color-text-secondary)" }}>
                      {draft.trim().split(/\s+/).filter(Boolean).length} words
                    </span>
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={cancelEdit} style={{
                        padding:"7px 14px", borderRadius:7, fontSize:12, cursor:"pointer",
                        border:"0.5px solid var(--color-border-secondary)",
                        background:"none", color:"var(--color-text-secondary)",
                      }}>Cancel</button>
                      <button onClick={saveEdit} style={{
                        display:"inline-flex", alignItems:"center", gap:5,
                        padding:"7px 16px", borderRadius:7, fontSize:12, fontWeight:600,
                        cursor:"pointer", border:"none", background:g.color, color:"#fff",
                      }}>
                        <i className="ti ti-device-floppy" style={{ fontSize:13 }}/>Save changes
                      </button>
                    </div>
                  </div>
                </div>

              : <div style={{ borderRadius:10, overflow:"hidden", border:`1px solid ${g.color}33` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                    padding:"7px 12px", background:g.bg, borderBottom:`1px solid ${g.color}22` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <i className={`ti ${section.icon}`} style={{ fontSize:12, color:g.color }}/>
                      <span style={{ fontSize:11, fontWeight:600, color:g.color, letterSpacing:"0.03em" }}>
                        {section.label.toUpperCase()}
                      </span>
                      {genMeta?.elVer && (
                        <span style={{ fontSize:10, fontWeight:700, color:g.color,
                          background:"#fff3", padding:"0 6px", borderRadius:8, marginLeft:4 }}>
                          {genMeta.elVer.toUpperCase()}
                        </span>
                      )}
                    {genMeta?.date && (
                        <span style={{ fontSize:10, color:g.color, opacity:.6, marginLeft:4 }}>
                          · {genMeta.date}
                        </span>
                      )}
                    </div>
                    {out && !loading && (
                      <button onClick={copy} style={{
                        display:"inline-flex", alignItems:"center", gap:5,
                        padding:"4px 10px", borderRadius:6,
                        border:`0.5px solid ${g.color}55`, background:"transparent",
                        fontSize:11, fontWeight:500, cursor:"pointer", color:g.color,
                      }}>
                        <i className={`ti ${copied ? "ti-check" : "ti-copy"}`} style={{ fontSize:12 }}/>
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    )}
                  </div>
                  <div style={{
                    padding:"14px 16px", background:"var(--color-background-secondary)",
                    fontFamily:"'SF Mono','Fira Code','Fira Mono','Roboto Mono',monospace",
                    fontSize:12.5, lineHeight:1.85, whiteSpace:"pre-wrap",
                    color:"var(--color-text-primary)", minHeight:60,
                  }}>
                    {out}
                    {loading && <span style={{
                      display:"inline-block", width:7, height:14,
                      background:g.color, marginLeft:2, opacity:.7,
                      animation:"blink 1s step-end infinite", verticalAlign:"middle", borderRadius:1,
                    }}/>}
                  </div>
                </div>
          }
        </div>
      )}
    </div>
  );
}

function TopicDetail({topic,format,catName,onBack,onStageChange,onDelete,onEdit,instructions,onAppendInstruction}){
  const [tab,setTab]     = useState("short");
  const sections         = tab==="short" ? SHORT_SECTIONS : LONG_SECTIONS;
  const s                = STAGES.find(x=>x.key===topic.stage) || STAGES[0];
  const si               = STAGE_KEYS.indexOf(topic.stage);
  const pct              = Math.round(si/(STAGES.length-1)*100);
  const cc               = CAT_CONFIG[catName] || {accent:"#534AB7",light:"#EEEDFE"};

  // ── Master script state (teleprompter) — one per format tab
  const [masterShort, setMasterShort] = useState({ text:"", version:0 });
  const [masterLong,  setMasterLong]  = useState({ text:"", version:0 });
  const master    = tab==="short" ? masterShort : masterLong;
  const setMaster = tab==="short" ? setMasterShort : setMasterLong;

  // ── Secondary master state (ElevenLabs) — one per format tab
  const [elShort, setElShort] = useState({ text:"", version:0 });
  const [elLong,  setElLong]  = useState({ text:"", version:0 });
  const el    = tab==="short" ? elShort : elLong;
  const setEl = tab==="short" ? setElShort : setElLong;

  const handleMasterGenerated = useCallback((text, nextVersion) => {
    setMaster({ text, version: nextVersion });
  }, [setMaster]);

  const handleElGenerated = useCallback((text, nextVersion) => {
    setEl({ text, version: nextVersion });
  }, [setEl]);

  // ── Supabase: load saved content when topic opens
  const [savedContent, setSavedContent] = useState({});
  useEffect(() => {
    setSavedContent({});
    fetchTopicContent(topic.id).then(rows => {
      const map = {};
      rows.forEach(r => { map[`${r.format}_${r.section_key}`] = r; });
      setSavedContent(map);
    });
  }, [topic.id]);

  const handleContentSaved = useCallback((format, sectionKey, content, elVer) => {
    saveContent(topic.id, { format, sectionKey, content, elVersion: elVer }).then(saved => {
      if (saved) setSavedContent(prev => ({ ...prev, [`${format}_${sectionKey}`]: saved }));
    });
  }, [topic.id]);

  return(
    <div>
      <button onClick={onBack} style={{display:"inline-flex",alignItems:"center",gap:6,
        background:"none",border:"none",color:"var(--color-text-secondary)",fontSize:13,
        cursor:"pointer",padding:"0 0 16px"}}>
        <i className="ti ti-arrow-left" style={{fontSize:14}}/> Back to topics
      </button>

      {/* Topic header */}
      <div style={{background:"var(--color-background-primary)",
        border:"0.5px solid var(--color-border-tertiary)",borderRadius:14,
        overflow:"hidden",marginBottom:18}}>
        {/* Accent top bar */}
        <div style={{height:4,background:`linear-gradient(90deg,${cc.accent},${cc.mid||cc.accent}88)`}}/>
        <div style={{padding:"16px 18px"}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:12,
            flexWrap:"wrap",marginBottom:12}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
                <AudBadge aud={topic.audience}/>
                <PillarDot pillar={topic.pillar}/>
                <Pill bg="#EEEDFE" color="#534AB7">
                  <i className="ti ti-bolt" style={{fontSize:9,marginRight:3}}/>{topic.hook}
                </Pill>
              </div>
              <h2 style={{margin:0,fontSize:16,fontWeight:500,lineHeight:1.4}}>{topic.title}</h2>
            </div>
            <div style={{display:"flex",gap:8,flexShrink:0,alignItems:"flex-start"}}>
              <button onClick={onEdit} style={{display:"inline-flex",alignItems:"center",gap:5,
                padding:"8px 14px",borderRadius:8,
                border:"0.5px solid #534AB7",background:"#EEEDFE",
                fontSize:12,fontWeight:600,cursor:"pointer",color:"#534AB7"}}>
                <i className="ti ti-edit" style={{fontSize:13}}/>Edit topic
              </button>
              <DetailDeleteBtn onDelete={onDelete}/>
            </div>
          </div>

          {/* Stage tracker */}
          <div style={{background:"var(--color-background-secondary)",borderRadius:10,padding:"12px 14px"}}>
            <div style={{fontSize:11,fontWeight:500,color:"var(--color-text-secondary)",
              textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>Production stage</div>
            <StageSelector current={topic.stage} onChange={onStageChange}/>
            <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10}}>
              <div style={{flex:1}}><ProgressBar pct={pct} color={s.color} h={4}/></div>
              <span style={{fontSize:11,color:s.color,fontWeight:600,flexShrink:0}}>{pct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Format tabs — folder style */}
      <div style={{display:"flex",gap:0,marginBottom:0,position:"relative",zIndex:1}}>
        {[
          {key:"short",label:"Short Form",sub:"Reels · TikTok · Shorts",icon:"ti-brand-instagram",color:"#185FA5",bg:"#E6F1FB"},
          {key:"long", label:"Long Form", sub:"YouTube",                 icon:"ti-brand-youtube",  color:"#993C1D",bg:"#FAECE7"},
        ].map((t,i)=>(
          <button key={t.key} onClick={()=>setTab(t.key)} style={{
            display:"flex",flexDirection:"column",alignItems:"center",gap:1,
            padding:"10px 20px 12px",cursor:"pointer",transition:"all .15s",
            marginRight:4,borderRadius:"10px 10px 0 0",
            border:`0.5px solid ${tab===t.key?"var(--color-border-secondary)":"var(--color-border-tertiary)"}`,
            borderBottom:tab===t.key?"0.5px solid var(--color-background-primary)":"none",
            background:tab===t.key?"var(--color-background-primary)":t.bg,
            color:tab===t.key?"var(--color-text-primary)":t.color,
            position:"relative",zIndex:tab===t.key?2:1,
          }}>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <i className={`ti ${t.icon}`} style={{fontSize:14,color:tab===t.key?t.color:"inherit"}}/>
              <span style={{fontSize:13,fontWeight:tab===t.key?600:400}}>{t.label}</span>
            </div>
            <span style={{fontSize:10,opacity:.7}}>{t.sub}</span>
          </button>
        ))}
      </div>

      {/* Sections panel with group dividers */}
      <div style={{background:"var(--color-background-primary)",
        border:"0.5px solid var(--color-border-secondary)",
        borderRadius:"0 10px 10px 10px",padding:"16px",
        position:"relative",zIndex:0,marginTop:-1}}>

        {/* Master script notice banner when not yet generated */}
        {!master.text && (
          <div style={{
            display:"flex",alignItems:"center",gap:10,padding:"10px 14px",
            background:"#534AB711",border:"0.5px solid #534AB744",
            borderRadius:8,marginBottom:12,
          }}>
            <i className="ti ti-info-circle" style={{fontSize:15,color:"#534AB7",flexShrink:0}}/>
            <div>
              <span style={{fontSize:12,fontWeight:600,color:"#534AB7"}}>
                Start with the {tab==="short"?"60-sec Teleprompter Script":"Full Script"} —
              </span>
              <span style={{fontSize:12,color:"#534AB7",opacity:.8}}>
                {" "}ElevenLabs, HeyGen, and Higgsfield Walking will all derive from that master script so every version stays perfectly in sync.
              </span>
            </div>
          </div>
        )}

        {sections.map((sec,i)=>{
          const prevGroup=i>0?sections[i-1].group:null;
          const showDivider=sec.group!==prevGroup;
          return(
            <div key={`${tab}-${sec.key}`}>
              {showDivider&&<SectionGroupDivider group={sec.group}/>}
              <GenSection
                section={sec} topic={topic} type={tab} instructions={instructions}
                masterScript={master.text}
                masterVersion={master.version}
                elScript={el.text}
                elVersion={el.version}
                onMasterGenerated={handleMasterGenerated}
                onElGenerated={handleElGenerated}
                onAppendInstruction={onAppendInstruction}
                initialOut={savedContent[`${tab}_${sec.key}`]?.content || ""}
                onContentSaved={(content, elVer) => handleContentSaved(tab, sec.key, content, elVer)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── DETAIL DELETE BUTTON (inline confirm — no confirm() dialog) ──────────────
function DetailDeleteBtn({onDelete}){
  const [step,setStep]=useState(false);
  if(step) return(
    <span style={{display:"inline-flex",alignItems:"center",gap:6}}>
      <span style={{fontSize:12,color:"#993556",fontWeight:500}}>Delete this topic?</span>
      <button onClick={()=>{onDelete();setStep(false);}} style={{
        display:"inline-flex",alignItems:"center",gap:4,
        padding:"7px 12px",borderRadius:7,border:"none",
        background:"#993556",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>
        <i className="ti ti-check" style={{fontSize:12}}/>Yes, delete
      </button>
      <button onClick={()=>setStep(false)} style={{
        padding:"7px 12px",borderRadius:7,fontSize:12,cursor:"pointer",
        border:"0.5px solid #d0d0d0",background:"#f5f5f5",color:"#555"}}>Cancel</button>
    </span>
  );
  return(
    <button onClick={()=>setStep(true)} style={{
      display:"inline-flex",alignItems:"center",gap:5,
      padding:"8px 14px",borderRadius:8,
      border:"0.5px solid #F4C0D1",background:"#FBEAF0",
      fontSize:12,fontWeight:600,cursor:"pointer",color:"#993556"}}>
      <i className="ti ti-trash" style={{fontSize:13}}/>Delete
    </button>
  );
}

// ─── TOPIC MODAL ──────────────────────────────────────────────────────────────
const CITIES = [
  "Richmond Hill","Markham","Vaughan","Aurora","Newmarket",
  "King City","Stouffville","Thornhill","Woodbridge","York Region","Greater Toronto Area",
];

function TopicModal({initial,onSave,onClose,catName,type}){
  const catDef = CAT_DEFAULTS[catName] || {};
  const [category, setCategory] = useState(initial?.category || catName || "");
  const [title,    setTitle]    = useState(initial?.title    || "");
  const [hook,    setHook]    = useState(initial?.hook     || "Bold Claim");
  const [aud,     setAud]     = useState(initial?.audience || catDef.audience || "First-time buyers");
  const [pillar,  setPillar]  = useState(initial?.pillar   || catDef.pillar   || "Education");
  const [city,    setCity]    = useState(initial?.city     || "Richmond Hill");
  const [customCity, setCustomCity] = useState("");
  const [aiLoading, setAiLoading]   = useState(false);

  const effectiveCity = city === "__custom__" ? customCity.trim() : city;

  // AI suggestions state
  const [suggestions,  setSuggestions]  = useState([]); // [{title, category, reason}]
  const [sugLoading,   setSugLoading]   = useState(false);
  const [selectedSugs, setSelectedSugs] = useState(new Set()); // indices of checked suggestions

  const genSuggestions = async () => {
    if (!effectiveCity) return;
    setSugLoading(true); setSuggestions([]); setTitle(""); setSelectedSugs(new Set());
    let raw = "";
    await streamClaude(
      `You are a real estate content strategist for ${BRAND.team} in ${effectiveCity}, York Region, Ontario.
You generate viral short-form and long-form video content for real estate buyers, sellers, and relocators.
Respond ONLY with valid JSON — no preamble, no markdown, no explanation.`,
      `Generate exactly 3 distinct video topic suggestions based on these selections:
- Format: ${type==="short"?"Short-form Reel/TikTok/YouTube Shorts":"Long-form YouTube"}
- Location: ${effectiveCity}
- Target audience: ${effectiveAud}
- Hook style: ${effectiveHook}
- Content pillar: ${effectivePillar}
- Current category context: "${catName}"

For each suggestion, recommend the best category it belongs to. The category can be the current one ("${catName}") OR a new, more specific category if the topic naturally fits better elsewhere.

Respond with this exact JSON structure — no other text:
[
  {"title":"...", "category":"...", "reason":"one sentence why this category fits"},
  {"title":"...", "category":"...", "reason":"..."},
  {"title":"...", "category":"...", "reason":"..."}
]

Rules:
- Each title must mention or clearly imply ${effectiveCity}
- Titles must be specific, data-driven or insight-driven, scroll-stopping
- No "stunning", "dream home", "In today's market"
- Categories should be short (2-4 words), e.g. "Home Buying Tips", "Relocation Information", "Market Updates"
- Make the 3 suggestions genuinely different from each other in angle and format`,
      chunk => { raw += chunk; }
    );
    // Parse JSON
    try {
      const cleaned = raw.trim().replace(/^```json|^```|```$/gm,"").trim();
      const parsed  = JSON.parse(cleaned);
      setSuggestions(Array.isArray(parsed) ? parsed.slice(0,3) : []);
    } catch(e) {
      // If parse fails, try to extract titles with regex as fallback
      const titles = [...raw.matchAll(/"title"\s*:\s*"([^"]+)"/g)].map(m=>m[1]);
      const cats   = [...raw.matchAll(/"category"\s*:\s*"([^"]+)"/g)].map(m=>m[1]);
      setSuggestions(titles.map((t,i)=>({title:t, category:cats[i]||catName, reason:""})));
    }
    setSugLoading(false);
  };


  // Custom value state for fields that allow free entry
  const [customAud,    setCustomAud]    = useState("");
  const [customHook,   setCustomHook]   = useState("");
  const [customPillar, setCustomPillar] = useState("");

  const effectiveAud    = aud    === "__custom__" ? customAud.trim()    : aud;
  const effectiveHook   = hook   === "__custom__" ? customHook.trim()   : hook;
  const effectivePillar = pillar === "__custom__" ? customPillar.trim() : pillar;

  const fields = [
    {
      label:"Target audience", val:aud, set:setAud, opts:AUDIENCES,
      custom:customAud, setCustom:setCustomAud,
      placeholder:"e.g. Luxury buyers, Foreign investors…"
    },
    {
      label:"Hook style", val:hook, set:setHook, opts:HOOKS,
      custom:customHook, setCustom:setCustomHook,
      placeholder:"e.g. Emotional story, Trending sound…"
    },
    {
      label:"Content pillar", val:pillar, set:setPillar, opts:PILLARS,
      custom:customPillar, setCustom:setCustomPillar,
      placeholder:"e.g. Mortgage tips, Pre-construction…"
    },
  ];

  return(
    <div style={{color:"#111"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <h3 style={{margin:0,fontSize:15,fontWeight:600,color:"#111"}}>
          {initial?"Edit topic":"Add topic"}
          {category.trim() && category !== catName
            ? <span style={{color:"#0F6E56"}}> — {category.trim()}</span>
            : <span style={{color:"#555"}}> — {catName}</span>}
        </h3>
        <button onClick={onClose} style={{background:"none",border:"none",
          cursor:"pointer",fontSize:22,color:"#666",lineHeight:1}}>×</button>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:14}}>

        {/* Category */}
        <div>
          <label style={{fontSize:12,fontWeight:600,color:"#333",display:"block",marginBottom:6}}>
            Category
            {category !== catName && category.trim() && (
              <span style={{marginLeft:8,fontSize:11,fontWeight:400,color:"#0F6E56",
                background:"#E1F5EE",padding:"1px 7px",borderRadius:10,border:"0.5px solid #9FE1CB"}}>
                New category will be created
              </span>
            )}
          </label>
          <input
            value={category}
            onChange={e=>setCategory(e.target.value)}
            placeholder="Category name…"
            style={{width:"100%",padding:"9px 12px",borderRadius:8,fontSize:13,
              border:`1px solid ${category!==catName&&category.trim()?"#9FE1CB":"#d0d0d0"}`,
              background:category!==catName&&category.trim()?"#F0FDF4":"#f9f9f9",
              color:"#111",boxSizing:"border-box",fontWeight:500}}/>
          {category !== catName && category.trim() && (
            <button onClick={()=>setCategory(catName)}
              style={{marginTop:5,background:"none",border:"none",cursor:"pointer",
                fontSize:11,color:"#888",padding:0,display:"flex",alignItems:"center",gap:3}}>
              <i className="ti ti-rotate" style={{fontSize:11}}/>Reset to "{catName}"
            </button>
          )}
        </div>

        {/* City / Neighbourhood */}
        <div>
          <label style={{fontSize:12,fontWeight:600,color:"#333",display:"block",marginBottom:6}}>
            City / Neighbourhood
          </label>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {CITIES.map(c=>(
              <button key={c} onClick={()=>{setCity(c);setCustomCity("");}}
                style={{padding:"5px 12px",borderRadius:20,fontSize:12,cursor:"pointer",
                  fontWeight:city===c?600:400,
                  border:city===c?"1.5px solid #534AB7":"1px solid #d0d0d0",
                  background:city===c?"#EEEDFE":"#f9f9f9",
                  color:city===c?"#534AB7":"#555"}}>
                {c}
              </button>
            ))}
            <button onClick={()=>setCity("__custom__")}
              style={{padding:"5px 12px",borderRadius:20,fontSize:12,cursor:"pointer",
                fontWeight:city==="__custom__"?600:400,
                border:city==="__custom__"?"1.5px solid #BA7517":"1px solid #d0d0d0",
                background:city==="__custom__"?"#FAEEDA":"#f9f9f9",
                color:city==="__custom__"?"#BA7517":"#555"}}>
              + Custom
            </button>
          </div>
          {city==="__custom__" && (
            <input value={customCity} onChange={e=>setCustomCity(e.target.value)}
              placeholder="Type neighbourhood or area…"
              style={{marginTop:8,width:"100%",padding:"8px 10px",borderRadius:7,
                fontSize:13,border:"1px solid #BA751766",background:"#FAEEDA33",
                color:"#111",boxSizing:"border-box"}}/>
          )}
        </div>

        {/* Audience / Hook / Pillar — each with Custom option */}
        {fields.map(f=>(
          <div key={f.label}>
            <label style={{fontSize:12,fontWeight:600,color:"#333",display:"block",marginBottom:6}}>
              {f.label}
            </label>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom: f.val==="__custom__"?8:0}}>
              {f.opts.map(o=>(
                <button key={o} onClick={()=>f.set(o)}
                  style={{padding:"4px 11px",borderRadius:20,fontSize:11,cursor:"pointer",
                    fontWeight:f.val===o?600:400,
                    border:f.val===o?"1.5px solid #534AB7":"1px solid #d0d0d0",
                    background:f.val===o?"#EEEDFE":"#f9f9f9",
                    color:f.val===o?"#534AB7":"#555",
                    transition:"all .1s"}}>
                  {o}
                </button>
              ))}
              <button onClick={()=>f.set("__custom__")}
                style={{padding:"4px 11px",borderRadius:20,fontSize:11,cursor:"pointer",
                  fontWeight:f.val==="__custom__"?600:400,
                  border:f.val==="__custom__"?"1.5px solid #BA7517":"1px solid #d0d0d0",
                  background:f.val==="__custom__"?"#FAEEDA":"#f9f9f9",
                  color:f.val==="__custom__"?"#BA7517":"#555"}}>
                + Custom
              </button>
            </div>
            {f.val==="__custom__" && (
              <input
                value={f.custom} onChange={e=>f.setCustom(e.target.value)}
                placeholder={f.placeholder}
                autoFocus
                style={{width:"100%",padding:"8px 10px",borderRadius:7,fontSize:12,
                  border:"1px solid #BA751766",background:"#FAEEDA44",
                  color:"#111",boxSizing:"border-box",outline:"none"}}/>
            )}
          </div>
        ))}

        {/* Title + AI Suggestions */}
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <label style={{fontSize:12,fontWeight:600,color:"#333"}}>Video title</label>
            <button onClick={genSuggestions}
              disabled={sugLoading||(city==="__custom__"&&!customCity.trim())}
              style={{display:"inline-flex",alignItems:"center",gap:5,
                padding:"6px 12px",borderRadius:7,fontSize:11,fontWeight:600,
                border:"none",cursor:sugLoading?"not-allowed":"pointer",
                background:sugLoading?"#e0e0e0":"#534AB7",color:"#fff",
                opacity:sugLoading?.7:1}}>
              <i className={`ti ${sugLoading?"ti-loader-2":"ti-sparkles"}`}
                 style={{fontSize:12,animation:sugLoading?"spin 1s linear infinite":""}}/>
              {sugLoading?"Generating suggestions…":"AI Suggest 3 topics"}
            </button>
          </div>

          {/* AI suggestion cards — multi-select */}
          {sugLoading && (
            <div style={{padding:"14px",borderRadius:10,border:"1px dashed #534AB744",
              background:"#EEEDFE44",textAlign:"center",color:"#534AB7",fontSize:12,marginBottom:10}}>
              <i className="ti ti-loader-2" style={{fontSize:14,animation:"spin 1s linear infinite",marginRight:6}}/>
              Generating 3 topic suggestions with category recommendations…
            </div>
          )}
          {suggestions.length>0 && (
            <div style={{marginBottom:10}}>
              {/* Header row */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:11,color:"#555",fontWeight:500}}>
                    Select one, two, or all three:
                  </span>
                  <button onClick={()=>setSelectedSugs(
                    selectedSugs.size===suggestions.length ? new Set() : new Set(suggestions.map((_,i)=>i))
                  )} style={{fontSize:11,color:"#534AB7",background:"none",border:"none",
                    cursor:"pointer",fontWeight:500,padding:0}}>
                    {selectedSugs.size===suggestions.length?"Deselect all":"Select all"}
                  </button>
                </div>
                <button onClick={()=>{setSuggestions([]);setSelectedSugs(new Set());}}
                  style={{fontSize:11,color:"#999",background:"none",border:"none",
                    cursor:"pointer",padding:0}}>✕ Dismiss</button>
              </div>

              {/* Suggestion cards */}
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {suggestions.map((s,i)=>{
                  const checked = selectedSugs.has(i);
                  const isNew   = s.category && s.category !== catName;
                  return(
                    <div key={i}
                      onClick={()=>{
                        const next = new Set(selectedSugs);
                        checked ? next.delete(i) : next.add(i);
                        setSelectedSugs(next);
                      }}
                      style={{
                        display:"flex",alignItems:"flex-start",gap:10,
                        padding:"10px 12px",borderRadius:10,cursor:"pointer",
                        border:`1.5px solid ${checked?(isNew?"#0F6E56":"#534AB7"):(isNew?"#9FE1CB":"#CECBF6")}`,
                        background:checked?(isNew?"#E8FAF2":"#EEEDFE"):(isNew?"#F0FDF4":"#fafafa"),
                        transition:"all .12s",
                      }}>
                      {/* Checkbox */}
                      <div style={{
                        width:18,height:18,borderRadius:5,flexShrink:0,marginTop:1,
                        border:`2px solid ${checked?(isNew?"#0F6E56":"#534AB7"):"#ccc"}`,
                        background:checked?(isNew?"#0F6E56":"#534AB7"):"#fff",
                        display:"flex",alignItems:"center",justifyContent:"center",
                      }}>
                        {checked && <i className="ti ti-check" style={{fontSize:11,color:"#fff"}}/>}
                      </div>
                      {/* Content */}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:600,color:"#111",lineHeight:1.4,marginBottom:4}}>
                          {s.title}
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                          <span style={{fontSize:10,padding:"1px 7px",borderRadius:10,fontWeight:500,
                            background:isNew?"#E1F5EE":"#EEEDFE",
                            color:isNew?"#0F6E56":"#534AB7",
                            border:`0.5px solid ${isNew?"#9FE1CB":"#CECBF6"}`}}>
                            {isNew?"✦ ":""}Category: {s.category}
                          </span>
                          {s.reason && (
                            <span style={{fontSize:10,color:"#777",fontStyle:"italic"}}>{s.reason}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add selected button */}
              {selectedSugs.size>0 && (
                <button
                  onClick={()=>{
                    // Save each selected suggestion as a separate topic
                    [...selectedSugs].forEach(i=>{
                      const s = suggestions[i];
                      onSave({
                        id:makeId(),
                        title:s.title,
                        hook:effectiveHook,
                        audience:effectiveAud,
                        pillar:effectivePillar,
                        city:effectiveCity,
                        stage:"not_started",
                        category:(s.category||catName).trim(),
                      });
                    });
                    onClose();
                  }}
                  style={{
                    display:"flex",alignItems:"center",justifyContent:"center",gap:7,
                    width:"100%",marginTop:10,padding:"10px",borderRadius:9,
                    border:"none",cursor:"pointer",fontWeight:600,fontSize:13,
                    background:"#534AB7",color:"#fff",
                  }}>
                  <i className="ti ti-circle-plus" style={{fontSize:15}}/>
                  Add {selectedSugs.size} selected topic{selectedSugs.size>1?"s":""}
                  {selectedSugs.size>1 && (
                    <span style={{fontSize:11,opacity:.8,fontWeight:400}}>
                      · across {new Set([...selectedSugs].map(i=>suggestions[i].category)).size} categor{new Set([...selectedSugs].map(i=>suggestions[i].category)).size>1?"ies":"y"}
                    </span>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Manual title input */}
          <input value={title} onChange={e=>setTitle(e.target.value)}
            placeholder={suggestions.length>0?"Or type your own title…":"Type a title or use AI Suggest above…"}
            style={{width:"100%",padding:"9px 12px",borderRadius:8,fontSize:13,
              border:`1px solid ${title?"#534AB7":"#d0d0d0"}`,
              background:title?"#EEEDFE22":"#f9f9f9",color:"#111",
              boxSizing:"border-box",outline:"none"}}/>
          {title && (
            <p style={{margin:"5px 0 0",fontSize:11,color:"#534AB7",fontStyle:"italic",lineHeight:1.4}}>
              ✓ {title}
            </p>
          )}
        </div>
      </div>

      <div style={{display:"flex",gap:8,marginTop:20,justifyContent:"flex-end",
        borderTop:"1px solid #eee",paddingTop:16}}>
        <button onClick={onClose} style={{padding:"9px 18px",borderRadius:8,fontSize:13,
          border:"1px solid #d0d0d0",background:"none",cursor:"pointer",color:"#555"}}>
          Cancel
        </button>
        <button
          onClick={()=>{
            if(!title.trim())return;
            onSave({
              ...(initial||{id:makeId()}),
              title:title.trim(),
              hook:effectiveHook, audience:effectiveAud, pillar:effectivePillar,
              city:effectiveCity, stage:initial?.stage||"not_started",
              category: category.trim() || catName,
            });
            onClose();
          }}
          disabled={!title.trim()}
          style={{padding:"9px 20px",borderRadius:8,fontSize:13,fontWeight:600,
            border:"none",cursor:title.trim()?"pointer":"not-allowed",
            background:title.trim()?"#534AB7":"#e0e0e0",
            color:title.trim()?"#fff":"#999"}}>
          {initial?"Save changes":"Add topic"}
        </button>
      </div>
    </div>
  );
}

// ─── CATEGORY VIEW ────────────────────────────────────────────────────────────
function CategoryView({catName,type,topics,onBack,onTopicsChange,instructions,onAppendInstruction,onNewCategory}){
  const [filter,setFilter]=useState("all");
  const [search,setSearch]=useState("");
  const [modal,setModal]=useState(null);
  const [selected,setSelected]=useState(null);
  const [deleteId,setDeleteId]=useState(null); // inline delete confirm
  const cc=CAT_CONFIG[catName]||{accent:"#534AB7",light:"#EEEDFE",icon:"ti-video"};

  const update=t=>{
    onTopicsChange(topics.map(x=>x.id===t.id?t:x));
    upsertTopic(t, type, catName);
  };
  const del=id=>{
    onTopicsChange(topics.filter(t=>t.id!==id));
    if(selected?.id===id)setSelected(null);
    deleteTopic(id);
  };
  const add=t=>{
    onTopicsChange([...topics,t]);
    upsertTopic(t, type, catName);
  };
  const save=t=>{
    const targetCat = (t.category||"").trim() || catName;
    if(targetCat !== catName) {
      onNewCategory?.(targetCat, t);
      upsertTopic(t, type, targetCat);
      setModal(null);
      return;
    }
    if(topics.find(x=>x.id===t.id)) update(t); else add(t);
    if(selected?.id===t.id) setSelected(t);
  };

  // When modal is open, render it as a full overlay (replaces current view)
  if(modal) return(
    <div style={{
      background:"rgba(0,0,0,0.88)",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:24,minHeight:520,borderRadius:12,
    }} onClick={()=>setModal(null)}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:"#fff",borderRadius:14,padding:"1.5rem",
        width:"100%",maxWidth:460,
        border:"1px solid #e0e0e0",
        boxShadow:"0 12px 48px rgba(0,0,0,.6)",
      }}>
        <TopicModal
          initial={modal==="add"?null:modal}
          catName={catName} type={type}
          onSave={t=>{
            save(t);
            if(selected&&modal!=="add") setSelected(t);
            // Note: TopicModal calls onClose() itself after saving
          }}
          onClose={()=>setModal(null)}
        />
      </div>
    </div>
  );

  if(selected) return(
    <TopicDetail topic={selected} format={type} catName={catName}
      instructions={instructions}
      onAppendInstruction={onAppendInstruction}
      onBack={()=>{setSelected(null);}}
      onStageChange={stage=>{const u={...selected,stage};update(u);setSelected(u);}}
      onDelete={()=>{del(selected.id);setSelected(null);}}
      onEdit={()=>setModal(selected)}/>
  );

  const filtered=topics.filter(t=>{
    const mf=filter==="all"||t.stage===filter;
    const ms=!search||t.title.toLowerCase().includes(search.toLowerCase());
    return mf&&ms;
  });
  const posted=topics.filter(t=>t.stage==="posted").length;
  const pct=topics.length?Math.round(posted/topics.length*100):0;
  const inProg=topics.filter(t=>t.stage!=="not_started"&&t.stage!=="posted").length;

  return(
    <div>

      <button onClick={onBack} style={{display:"inline-flex",alignItems:"center",gap:6,
        background:"none",border:"none",color:"var(--color-text-secondary)",
        fontSize:13,cursor:"pointer",padding:"0 0 14px"}}>
        <i className="ti ti-arrow-left" style={{fontSize:14}}/> Back
      </button>

      {/* Category header with colour */}
      <div style={{background:cc.light,borderRadius:14,padding:"16px 18px",
        marginBottom:16,border:`0.5px solid ${cc.accent}33`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:42,height:42,borderRadius:10,background:cc.accent,
              display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <i className={`ti ${cc.icon}`} style={{fontSize:20,color:"#fff"}}/>
            </div>
            <div>
              <div style={{fontSize:10,color:cc.dark||cc.accent,textTransform:"uppercase",
                letterSpacing:"0.06em",marginBottom:2}}>
                {type==="short"?"Short Form · Reels / TikTok / Shorts":"Long Form · YouTube"}
              </div>
              <h2 style={{margin:0,fontSize:17,fontWeight:600,color:cc.dark||cc.accent}}>{catName}</h2>
              <div style={{fontSize:12,color:cc.dark||cc.accent,opacity:.7,marginTop:2}}>
                {topics.length} topics · {inProg} in progress · {posted} posted
              </div>
            </div>
          </div>
          <button onClick={()=>setModal("add")} style={{display:"inline-flex",alignItems:"center",
            gap:5,padding:"8px 14px",borderRadius:8,border:"none",background:cc.accent,
            color:"#fff",fontSize:13,fontWeight:500,cursor:"pointer",flexShrink:0}}>
            <i className="ti ti-plus" style={{fontSize:13}}/>Add topic
          </button>
        </div>
        <div style={{marginTop:12}}>
          <ProgressBar pct={pct} color={cc.accent} h={5}/>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:5}}>
            <span style={{fontSize:11,color:cc.dark||cc.accent,opacity:.7}}>Progress</span>
            <span style={{fontSize:11,color:cc.accent,fontWeight:600}}>{pct}% posted</span>
          </div>
        </div>
      </div>

      {/* Stage filter chips */}
      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>
        <button onClick={()=>setFilter("all")} style={{
          padding:"4px 10px",borderRadius:20,fontSize:11,cursor:"pointer",
          border:filter==="all"?"1.5px solid var(--color-text-primary)":"0.5px solid var(--color-border-tertiary)",
          background:filter==="all"?"var(--color-text-primary)":"transparent",
          color:filter==="all"?"var(--color-background-primary)":"var(--color-text-secondary)",fontWeight:500}}>
          All ({topics.length})
        </button>
        {STAGES.map(s=>{
          const n=topics.filter(t=>t.stage===s.key).length; if(!n)return null;
          return <button key={s.key} onClick={()=>setFilter(filter===s.key?"all":s.key)} style={{
            padding:"4px 10px",borderRadius:20,fontSize:11,cursor:"pointer",
            border:filter===s.key?`1.5px solid ${s.color}`:`0.5px solid ${s.color}44`,
            background:filter===s.key?s.bg:"transparent",color:s.color,fontWeight:filter===s.key?600:400}}>
            {n} {s.label}
          </button>;
        })}
      </div>

      {/* Search */}
      <div style={{position:"relative",marginBottom:12}}>
        <i className="ti ti-search" style={{position:"absolute",left:10,top:"50%",
          transform:"translateY(-50%)",fontSize:14,color:"var(--color-text-secondary)"}}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search topics…"
          style={{width:"100%",padding:"8px 10px 8px 32px",borderRadius:8,boxSizing:"border-box",
            border:"0.5px solid var(--color-border-secondary)",fontSize:13,
            background:"var(--color-background-primary)",color:"var(--color-text-primary)"}}/>
      </div>

      {/* Topic list */}
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {filtered.length===0&&(
          <div style={{padding:"2.5rem",textAlign:"center",color:"var(--color-text-secondary)",
            fontSize:13,background:"var(--color-background-primary)",
            border:"0.5px solid var(--color-border-tertiary)",borderRadius:10}}>
            No topics match. {filter!=="all"?"Try clearing the filter.":"Add your first topic above."}
          </div>
        )}
        {filtered.map(topic=>{
          const s=STAGES.find(x=>x.key===topic.stage)||STAGES[0];
          const si=STAGE_KEYS.indexOf(topic.stage);
          const pct=Math.round(si/(STAGES.length-1)*100);
          return(
            <div key={topic.id} onClick={()=>setSelected(topic)}
              style={{background:"var(--color-background-primary)",
                border:`0.5px solid ${topic.stage==="posted"?"#9FE1CB":"var(--color-border-tertiary)"}`,
                borderLeft:`3px solid ${s.color}`,
                borderRadius:10,padding:"12px 14px",cursor:"pointer",transition:"border-color .15s"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                {/* Stage advance circle */}
                <div onClick={e=>{e.stopPropagation();
                  const ni=Math.min(si+1,STAGES.length-1);update({...topic,stage:STAGE_KEYS[ni]});}}
                  title="Click to advance stage"
                  style={{width:30,height:30,borderRadius:"50%",
                    border:`1.5px solid ${s.color}`,background:s.bg,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    flexShrink:0,cursor:"pointer"}}>
                  {topic.stage==="posted"
                    ?<i className="ti ti-check" style={{fontSize:13,color:s.color}}/>
                    :<span style={{fontSize:9,fontWeight:700,color:s.color}}>{si}</span>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:5,alignItems:"center"}}>
                    <AudBadge aud={topic.audience}/>
                    <PillarDot pillar={topic.pillar}/>
                  </div>
                  <p style={{margin:"0 0 6px",fontSize:13,fontWeight:500,
                    color:topic.stage==="posted"?"var(--color-text-secondary)":"var(--color-text-primary)",
                    textDecoration:topic.stage==="posted"?"line-through":"none",
                    overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",
                    WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{topic.title}</p>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{flex:1}}><ProgressBar pct={pct} color={s.color}/></div>
                    <span style={{fontSize:10,color:s.color,fontWeight:600,
                      flexShrink:0,minWidth:60,textAlign:"right"}}>{s.label}</span>
                  </div>
                </div>
                <div style={{display:"flex",gap:4,flexShrink:0,alignItems:"center"}}>
                  <button onClick={e=>{e.stopPropagation();setModal(topic);}}
                    style={{display:"inline-flex",alignItems:"center",gap:4,
                      padding:"5px 10px",borderRadius:7,fontSize:11,fontWeight:500,
                      border:`0.5px solid ${s.color}44`,background:s.bg,
                      cursor:"pointer",color:s.color}}>
                    <i className="ti ti-edit" style={{fontSize:12}}/>Edit
                  </button>
                  {deleteId===topic.id
                    ? <span style={{display:"inline-flex",alignItems:"center",gap:5}}>
                        <span style={{fontSize:11,color:"#993556",fontWeight:500}}>Sure?</span>
                        <button onClick={e=>{e.stopPropagation();del(topic.id);setDeleteId(null);}}
                          style={{display:"inline-flex",alignItems:"center",gap:3,
                            padding:"4px 9px",borderRadius:6,fontSize:11,fontWeight:600,
                            border:"none",background:"#993556",color:"#fff",cursor:"pointer"}}>
                          <i className="ti ti-check" style={{fontSize:11}}/>Yes
                        </button>
                        <button onClick={e=>{e.stopPropagation();setDeleteId(null);}}
                          style={{display:"inline-flex",alignItems:"center",gap:3,
                            padding:"4px 9px",borderRadius:6,fontSize:11,fontWeight:500,
                            border:"0.5px solid #d0d0d0",background:"#f5f5f5",
                            color:"#555",cursor:"pointer"}}>No</button>
                      </span>
                    : <button onClick={e=>{e.stopPropagation();setDeleteId(topic.id);}}
                        style={{display:"inline-flex",alignItems:"center",gap:4,
                          padding:"5px 10px",borderRadius:7,fontSize:11,fontWeight:500,
                          border:"0.5px solid #F4C0D1",background:"#FBEAF0",
                          cursor:"pointer",color:"#993556"}}>
                        <i className="ti ti-trash" style={{fontSize:12}}/>Delete
                      </button>}
                  <i className="ti ti-chevron-right"
                     style={{fontSize:14,color:"var(--color-text-secondary)",marginLeft:2}}/>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── HOME — CATEGORY CARD ─────────────────────────────────────────────────────
function CatCard({name,topics,onClick}){
  const cc=CAT_CONFIG[name]||{accent:"#534AB7",light:"#EEEDFE",icon:"ti-video",mid:"#CECBF6",dark:"#26215C"};
  const posted=topics.filter(t=>t.stage==="posted").length;
  const inProg=topics.filter(t=>t.stage!=="not_started"&&t.stage!=="posted").length;
  const pct=topics.length?Math.round(posted/topics.length*100):0;
  return(
    <div onClick={onClick} style={{borderRadius:14,overflow:"hidden",cursor:"pointer",
      border:`0.5px solid ${cc.accent}44`,transition:"transform .15s, box-shadow .15s"}}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";
        e.currentTarget.style.boxShadow=`0 6px 20px ${cc.accent}22`;}}
      onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";
        e.currentTarget.style.boxShadow="none";}}>
      {/* Coloured top half */}
      <div style={{background:`linear-gradient(135deg,${cc.accent} 0%,${cc.mid||cc.accent}cc 100%)`,
        padding:"18px 18px 14px",position:"relative",overflow:"hidden"}}>
        {/* decorative circle */}
        <div style={{position:"absolute",right:-20,top:-20,width:80,height:80,borderRadius:"50%",
          background:"rgba(255,255,255,.08)"}}/>
        <div style={{position:"absolute",right:20,bottom:-30,width:60,height:60,borderRadius:"50%",
          background:"rgba(255,255,255,.06)"}}/>
        <i className={`ti ${cc.icon}`} style={{fontSize:28,color:"rgba(255,255,255,.9)",display:"block",marginBottom:10}}/>
        <div style={{fontSize:15,fontWeight:600,color:"#fff",lineHeight:1.3}}>{name}</div>
        <div style={{fontSize:11,color:"rgba(255,255,255,.7)",marginTop:3}}>{topics.length} topics</div>
      </div>
      {/* White bottom stats */}
      <div style={{background:"var(--color-background-primary)",padding:"12px 16px"}}>
        <ProgressBar pct={pct} color={cc.accent} h={4}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
          <div style={{display:"flex",gap:12}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:14,fontWeight:600,color:cc.accent}}>{posted}</div>
              <div style={{fontSize:9,color:"var(--color-text-secondary)",textTransform:"uppercase"}}>Posted</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:14,fontWeight:600,color:"#185FA5"}}>{inProg}</div>
              <div style={{fontSize:9,color:"var(--color-text-secondary)",textTransform:"uppercase"}}>In progress</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:14,fontWeight:600,color:"var(--color-text-secondary)"}}>{topics.length-posted-inProg}</div>
              <div style={{fontSize:9,color:"var(--color-text-secondary)",textTransform:"uppercase"}}>Not started</div>
            </div>
          </div>
          <div style={{display:"inline-flex",alignItems:"center",gap:4,padding:"5px 10px",
            borderRadius:20,background:cc.light,color:cc.accent,fontSize:11,fontWeight:600}}>
            {pct}% <i className="ti ti-arrow-right" style={{fontSize:11}}/>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── INSTRUCTIONS MODAL ───────────────────────────────────────────────────────
const DEFAULT_INSTRUCTIONS=`Video format: Short-form (60 seconds max for Reels/TikTok/Shorts), Long-form (8-12 minutes for YouTube).
Short-form Aspect ratio: 9:16 portrait.
Long-form Aspect ratio: 16:9 landscape.
Script style: Natural spoken language, one flowing paragraph, no bullet points.
Language: English (Canadian spelling).
Market: Richmond Hill, Markham, Vaughan, Aurora, Newmarket, York Region, Greater Toronto Area.
Tone: Confident, warm, specific — never salesy or hype-driven.
Hook style: Use the assigned hook type for each topic.
HeyGen: Desk/studio setup, mid-shot, dark navy, charcoal & warm gold brand colours.
Higgsfield: Soul ID walking location, Richmond Hill, Markham, Vaughan, Aurora, Newmarket, York Region, Greater Toronto Area outdoor settings.
B-roll: Numbered list, 9:16 for short-form, 16:9 for long-form, 3-6 seconds per shot.`;

function InstructionsModal({instructions,onSave,onClose}){
  const [val,setVal]=useState(instructions);
  const [saved,setSaved]=useState(false);
  const doSave=()=>{onSave(val);setSaved(true);setTimeout(()=>setSaved(false),1800);};
  const reset=()=>setVal(DEFAULT_INSTRUCTIONS);
  const charCount=val.length;
  return(
    <div style={{
      background:"#fff",borderRadius:16,
      width:"100%",maxWidth:600,
      border:"1px solid #e0e0e0",
      display:"flex",flexDirection:"column",
      maxHeight:560,color:"#111",
    }}>

        {/* Header */}
        <div style={{padding:"18px 20px 14px",borderBottom:"1px solid #e5e5e5",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                <div style={{width:28,height:28,borderRadius:7,background:"#EEEDFE",
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <i className="ti ti-settings-2" style={{fontSize:14,color:"#534AB7"}}/>
                </div>
                <h3 style={{margin:0,fontSize:15,fontWeight:600,color:"#111"}}>Generation Instructions</h3>
              </div>
              <p style={{margin:0,fontSize:12,color:"#555",lineHeight:1.5}}>
                These instructions are injected into every AI generation. Changes take effect immediately — existing outputs are preserved and flagged as stale when instructions differ.
              </p>
            </div>
            <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",
              fontSize:20,color:"#666",lineHeight:1,padding:"0 0 0 12px",
              flexShrink:0}}>×</button>
          </div>
        </div>

        {/* Body */}
        <div style={{padding:"16px 20px",flex:1,overflowY:"auto",color:"#111"}}>
          {/* Usage guide */}
          <div style={{background:"#EEEDFE",borderRadius:8,padding:"10px 12px",marginBottom:12,
            border:"0.5px solid #CECBF6"}}>
            <div style={{fontSize:11,fontWeight:600,color:"#534AB7",marginBottom:6,display:"flex",
              alignItems:"center",gap:5}}>
              <i className="ti ti-bulb" style={{fontSize:12}}/>What you can customise
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 16px"}}>
              {["Video length & ratio","Script tone & style","Language / market focus",
                "Platform-specific rules","ElevenLabs tag style","HeyGen scene setup",
                "Higgsfield locations","B-roll shot count"].map(x=>(
                <span key={x} style={{fontSize:11,color:"#3C3489",display:"flex",
                  alignItems:"center",gap:4}}>
                  <i className="ti ti-check" style={{fontSize:10,color:"#534AB7"}}/>
                  {x}
                </span>
              ))}
            </div>
          </div>

          <div style={{position:"relative"}}>
            <textarea value={val} onChange={e=>setVal(e.target.value)}
              style={{width:"100%",minHeight:220,padding:"12px 14px",borderRadius:10,
                border:"1px solid #d0d0d0",fontSize:12.5,lineHeight:1.8,
                fontFamily:"'SF Mono','Fira Code','Fira Mono','Roboto Mono',monospace",
                background:"#f9f9f9",color:"#111",resize:"vertical",boxSizing:"border-box"}}/>
            <div style={{position:"absolute",bottom:10,right:12,fontSize:10,
              color:"#555"}}>{charCount} chars</div>
          </div>

          {/* History note */}
          <div style={{marginTop:10,padding:"8px 12px",borderRadius:7,
            background:"#f5f5f5",border:"1px solid #e0e0e0",
            fontSize:11,color:"#555",display:"flex",
            alignItems:"flex-start",gap:6}}>
            <i className="ti ti-info-circle" style={{fontSize:13,flexShrink:0,marginTop:1}}/>
            <span>Previously generated content is saved as-is. When you save new instructions, any generated section will show an <strong style={{color:"#BA7517"}}>Instructions changed</strong> warning and a Regen button so you can selectively update.</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{padding:"12px 20px",borderTop:"1px solid #e5e5e5",
          display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <button onClick={reset} style={{display:"inline-flex",alignItems:"center",gap:5,
            padding:"7px 12px",borderRadius:7,border:"1px solid #d0d0d0",
            background:"none",fontSize:12,cursor:"pointer",color:"#555"}}>
            <i className="ti ti-rotate" style={{fontSize:12}}/>Reset to default
          </button>
          <div style={{display:"flex",gap:8}}>
            <button onClick={onClose} style={{padding:"8px 16px",borderRadius:7,fontSize:13,
              border:"1px solid #d0d0d0",background:"none",
              cursor:"pointer",color:"#555"}}>Cancel</button>
            <button onClick={doSave} style={{display:"inline-flex",alignItems:"center",gap:6,
              padding:"8px 18px",borderRadius:7,border:"none",fontSize:13,fontWeight:600,
              cursor:"pointer",
              background:saved?"#1D9E75":"#534AB7",
              color:"#fff",transition:"background .3s"}}>
              <i className={`ti ${saved?"ti-check":"ti-device-floppy"}`} style={{fontSize:13}}/>
              {saved?"Saved!":"Save instructions"}
            </button>
          </div>
        </div>
      </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function ContentHub(){
  const [tab,setTab]=useState("short");
  const [nav,setNav]=useState(null);
  const [short,setShort]=useState(SHORT_TOPICS);
  const [long,setLong]=useState(LONG_TOPICS);
  const [instructions,setInstructions]=useState(DEFAULT_INSTRUCTIONS);
  const [showInstr,setShowInstr]=useState(false);

  // Load persisted topics from Supabase on mount — overrides hardcoded defaults
  useEffect(() => {
    fetchTopics().then(rows => {
      if (!rows.length) return;
      const s={}, l={};
      rows.forEach(t => {
        const target = t.format==="short" ? s : l;
        if(!target[t.category]) target[t.category]=[];
        target[t.category].push(t);
      });
      if(Object.keys(s).length) setShort(s);
      if(Object.keys(l).length) setLong(l);
    });
  }, []);

  const data    =tab==="short"?short:long;
  const setData =tab==="short"?setShort:setLong;
  const all     =Object.values(data).flat();
  const total   =all.length;
  const posted  =all.filter(t=>t.stage==="posted").length;
  const inProg  =all.filter(t=>t.stage!=="not_started"&&t.stage!=="posted").length;
  const pct     =total?Math.round(posted/total*100):0;
  const updateCat=(cat,topics)=>setData(p=>({...p,[cat]:topics}));

  const TAB_CFG={
    short:{label:"Short Form",sub:"Reels · TikTok · Shorts",icon:"ti-brand-instagram",
           color:"#185FA5",bg:"#E6F1FB",light:"#dceefa",dark:"#0C447C"},
    long: {label:"Long Form", sub:"YouTube Videos",          icon:"ti-brand-youtube",
           color:"#993C1D",bg:"#FAECE7",light:"#fde8e0",dark:"#4A1B0C"},
  };
  const tc=TAB_CFG[tab];

  return(
    <div style={{padding:"1rem 0",maxWidth:740,margin:"0 auto",position:"relative"}}>
      <style>{`
        @keyframes spin {to{transform:rotate(360deg)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        *{box-sizing:border-box} input,select{outline:none}
        input:focus,select:focus{border-color:var(--color-border-primary)!important}
        button:active{transform:scale(0.97)}
      `}</style>
      <h2 className="sr-only">Shaya Digital — Video Content Hub</h2>

      {showInstr&&(
        <div style={{
          position:"absolute",inset:0,zIndex:50,
          background:"rgba(0,0,0,0.88)",
          display:"flex",alignItems:"flex-start",justifyContent:"center",
          padding:"24px 16px",minHeight:500,
        }} onClick={()=>setShowInstr(false)}>
          <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:600}}>
            <InstructionsModal
              instructions={instructions}
              onSave={v=>{setInstructions(v);}}
              onClose={()=>setShowInstr(false)}
            />
          </div>
        </div>
      )}

      {nav ? (
        <>
          {/* Breadcrumb */}
          <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:16,
            fontSize:12,color:"var(--color-text-secondary)"}}>
            <span style={{cursor:"pointer"}} onClick={()=>setNav(null)}>Home</span>
            <i className="ti ti-chevron-right" style={{fontSize:10}}/>
            <span style={{cursor:"pointer",color:tc.color}} onClick={()=>setNav(null)}>
              {tc.label}
            </span>
            <i className="ti ti-chevron-right" style={{fontSize:10}}/>
            <span style={{color:"var(--color-text-primary)",fontWeight:500}}>{nav}</span>
          </div>
          <CategoryView catName={nav} type={tab}
            topics={data[nav]||[]}
            instructions={instructions}
            onAppendInstruction={rule => setInstructions(prev =>
              prev.trim() ? prev.trim() + "\n" + rule.trim() : rule.trim()
            )}
            onBack={()=>setNav(null)}
            onTopicsChange={t=>updateCat(nav,t)}
            onNewCategory={(newCat, topic) => {
              // Add topic to new (or existing) category — create card if needed
              setData(prev => ({
                ...prev,
                [newCat]: prev[newCat]
                  ? [...prev[newCat], topic]
                  : [topic],
              }));
              setNav(newCat); // Navigate to the new/target category
            }}/>
        </>
      ):(
        <>
          {/* ── Header ── */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",
            marginBottom:22,flexWrap:"wrap",gap:10}}>
            <div>
              <div style={{fontSize:10,color:"var(--color-text-secondary)",letterSpacing:"0.08em",
                textTransform:"uppercase",marginBottom:4}}>
                {BRAND.team} · {BRAND.brokerage}
              </div>
              <h1 style={{margin:"0 0 2px",fontSize:22,fontWeight:600}}>Video Content Hub</h1>
              <p style={{margin:0,fontSize:13,color:"var(--color-text-secondary)"}}>
                {BRAND.agent} · {BRAND.phone} · {BRAND.site}
              </p>
            </div>
            <button onClick={()=>setShowInstr(true)} style={{
              display:"inline-flex",alignItems:"center",gap:6,
              padding:"9px 16px",borderRadius:9,
              border:"1px solid #534AB7",background:"#EEEDFE",
              fontSize:12,fontWeight:600,cursor:"pointer",color:"#534AB7",
              flexShrink:0,transition:"background .15s"}}>
              <i className="ti ti-settings-2" style={{fontSize:14}}/>
              Edit Instructions
            </button>
          </div>

          {/* ── Folder tabs ── */}
          <div style={{display:"flex",gap:0,marginBottom:0,position:"relative",zIndex:1}}>
            {Object.entries(TAB_CFG).map(([key,t])=>(
              <button key={key} onClick={()=>setTab(key)} style={{
                display:"flex",flexDirection:"column",alignItems:"center",gap:2,
                padding:"12px 24px 14px",cursor:"pointer",transition:"all .15s",
                borderRadius:"12px 12px 0 0",marginRight:5,
                border:`0.5px solid ${tab===key?"var(--color-border-secondary)":"var(--color-border-tertiary)"}`,
                borderBottom:tab===key?"0.5px solid var(--color-background-primary)":"none",
                background:tab===key?"var(--color-background-primary)":t.light,
                color:tab===key?t.color:t.color,zIndex:tab===key?2:1,position:"relative",
              }}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <i className={`ti ${t.icon}`} style={{fontSize:16}}/>
                  <span style={{fontSize:14,fontWeight:tab===key?700:500}}>{t.label}</span>
                </div>
                <span style={{fontSize:10,opacity:.65}}>{t.sub}</span>
                {tab===key&&(
                  <div style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",
                    width:24,height:2,borderRadius:"2px 2px 0 0",background:t.color}}/>
                )}
              </button>
            ))}
            <div style={{flex:1,borderBottom:"0.5px solid var(--color-border-secondary)"}}/>
          </div>

          {/* ── Stats panel ── */}
          <div style={{background:"var(--color-background-primary)",
            border:"0.5px solid var(--color-border-secondary)",
            borderTop:"none",borderRadius:"0 12px 12px 12px",
            padding:"16px 18px",marginBottom:20,position:"relative",zIndex:0}}>
            <div style={{display:"flex",gap:0,flexWrap:"wrap"}}>
              {[
                {label:"Total topics",value:total,color:"var(--color-text-primary)"},
                {label:"In progress",value:inProg,color:"#185FA5"},
                {label:"Posted",value:posted,color:"#3B6D11"},
                {label:"Remaining",value:total-posted,color:"#BA7517"},
              ].map((s,i)=>(
                <div key={s.label} style={{flex:1,minWidth:80,textAlign:"center",
                  padding:"8px 12px",
                  borderRight:i<3?"0.5px solid var(--color-border-tertiary)":"none"}}>
                  <div style={{fontSize:22,fontWeight:600,color:s.color}}>{s.value}</div>
                  <div style={{fontSize:11,color:"var(--color-text-secondary)",marginTop:2}}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{marginTop:14}}>
              <ProgressBar pct={pct} color={tc.color} h={5}/>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:5}}>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {STAGES.map(s=>{
                    const n=all.filter(t=>t.stage===s.key).length; if(!n)return null;
                    return <Pill key={s.key} bg={s.bg} color={s.color}>
                      <span style={{fontWeight:700}}>{n}</span>&nbsp;{s.label}
                    </Pill>;
                  })}
                </div>
                <span style={{fontSize:12,color:tc.color,fontWeight:600}}>{pct}% complete</span>
              </div>
            </div>
          </div>

          {/* ── Category cards ── */}
          <div style={{display:"grid",
            gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:12}}>
            {Object.entries(data).map(([cat,topics])=>(
              <CatCard key={cat} name={cat} topics={topics}
                onClick={()=>setNav(cat)}/>
            ))}
          </div>

          <div style={{marginTop:24,paddingTop:14,
            borderTop:"0.5px solid var(--color-border-tertiary)",
            fontSize:11,color:"var(--color-text-secondary)",textAlign:"center"}}>
            {BRAND.agent} · {BRAND.team} · {BRAND.phone} · {BRAND.site}
          </div>
        </>
      )}
    </div>
  );
}
