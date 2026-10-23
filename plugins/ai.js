// ============================================================
// HASINDU-MD AI CHAT + IMAGE GENERATION + PER-USER MEMORY
// Provider: Pollinations API (requires an API key and available credits/quota)
// Commands: .ai, .imagine, .remember, .memory, .forget
// ============================================================
const axios = require('axios');
const mongoose = require('mongoose');
const config = require('../config');
const { connectdb } = require('../lib/database');
const { cmd } = require('../hasindu');

const API_BASE = 'https://gen.pollinations.ai';
const TEXT_MODEL = process.env.POLLINATIONS_TEXT_MODEL || 'openai/gpt-4o-mini';
const IMAGE_MODEL = process.env.POLLINATIONS_IMAGE_MODEL || 'flux';
const USER_DAILY_TEXT_LIMIT = Math.max(1, Number(process.env.AI_MAX_DAILY_MESSAGES || 15));
const USER_DAILY_IMAGE_LIMIT = Math.max(0, Number(process.env.AI_MAX_DAILY_IMAGES || 1));
const GLOBAL_DAILY_TEXT_LIMIT = Math.max(1, Number(process.env.AI_GLOBAL_DAILY_MESSAGES || 100));
const GLOBAL_DAILY_IMAGE_LIMIT = Math.max(0, Number(process.env.AI_GLOBAL_DAILY_IMAGES || 5));
const HISTORY_LIMIT = 12;
const FACT_LIMIT = 30;

function getApiKey() {
  return process.env.POLLINATIONS_API_KEY || '';
}
function getCollection() {
  if (!mongoose.connection.db) throw new Error('MongoDB is not connected');
  return mongoose.connection.db.collection('hasindu_ai_memories');
}
async function ensureCollection() {
  await connectdb();
  if (!mongoose.connection.db) throw new Error('MongoDB is not connected. Set MONGODB_URI.');
  return getCollection();
}
function cleanJid(value) {
  return String(value || '').split(':')[0].trim();
}
function getIdentity(conn, mek, m, ctx) {
  const bot = cleanJid(conn?.user?.id).split('@')[0].replace(/\D/g, '') || 'default-bot';
  const senderJid = cleanJid(ctx?.sender || m?.sender || mek?.key?.participant || ctx?.from || m?.chat || mek?.key?.remoteJid);
  const senderNumber = senderJid.split('@')[0].replace(/\D/g, '') || senderJid;
  return { bot, senderJid, senderNumber, key: `${bot}:${senderJid}` };
}
function today() { return new Date().toISOString().slice(0, 10); }
function sensitive(text) {
  return /\b(password|passcode|otp|one[- ]time code|pin number|bank account|credit card|private key|api key|national id|passport number|home address|medical diagnosis)\b/i.test(text)
    || /(?:මුරපද|password|otp|පින් අංක|බැංකු ගිණුම්|ජාතික හැඳුනුම්පත් අංක)/i.test(text);
}
function extractMemoryInstruction(text) {
  const patterns = [
    /^(?:please\s+)?remember(?:\s+that)?\s+(.{3,300})$/i,
    /^(?:please\s+)?(?:mathaka thiyaganna|mata mathaka thiyaganna)\s+(.{3,300})$/i,
    /^(?:please\s+)?(?:මතක තියාගන්න|මතක තබාගන්න)\s+(.{3,300})$/i
  ];
  for (const re of patterns) { const match = String(text || '').trim().match(re); if (match) return match[1].trim(); }
  return null;
}
function extractSimpleFact(text) {
  const s = String(text || '').trim();
  if (s.length > 240 || sensitive(s)) return null;
  const patterns = [
    /^(?:my name is|call me)\s+(.{2,80})$/i,
    /^(?:mage nama|මගේ නම)\s+(.{2,80})$/i,
    /^(?:i like|i love|i prefer|my favourite(?: thing)? is|my favorite(?: thing)? is|i enjoy)\s+(.{2,140})$/i,
    /^(?:mata)\s+(.{2,100})\s+(?:kamathi|කැමතියි)$/i
  ];
  for (const re of patterns) { const match = s.match(re); if (match) return s; }
  return null;
}
async function getDoc(col, key, identity) {
  let doc = await col.findOne({ key });
  if (!doc) {
    doc = { key, bot: identity.bot, senderJid: identity.senderJid, senderNumber: identity.senderNumber, facts: [], history: [], day: today(), textCount: 0, imageCount: 0, updatedAt: new Date() };
    await col.updateOne({ key }, { $setOnInsert: doc }, { upsert: true });
  }
  if (doc.day !== today()) {
    await col.updateOne({ key }, { $set: { day: today(), textCount: 0, imageCount: 0, updatedAt: new Date() } });
    doc.day = today(); doc.textCount = 0; doc.imageCount = 0;
  }
  return doc;
}
async function saveFact(col, key, fact) {
  const trimmed = String(fact || '').trim().slice(0, 300);
  if (!trimmed || sensitive(trimmed)) return false;
  await col.updateOne({ key }, { $addToSet: { facts: trimmed }, $set: { updatedAt: new Date() } }, { upsert: true });
  await col.updateOne({ key }, { $push: { facts: { $each: [], $slice: -FACT_LIMIT } } });
  return true;
}
async function reserveUsage(col, identity, type) {
  const isImage = type === 'image';
  const userField = isImage ? 'imageCount' : 'textCount';
  const userLimit = isImage ? USER_DAILY_IMAGE_LIMIT : USER_DAILY_TEXT_LIMIT;
  const globalLimit = isImage ? GLOBAL_DAILY_IMAGE_LIMIT : GLOBAL_DAILY_TEXT_LIMIT;
  if (userLimit === 0 || globalLimit === 0) return false;
  const doc = await getDoc(col, identity.key, identity);
  if ((doc[userField] || 0) >= userLimit) return false;
  const globalKey = `GLOBAL:${today()}:${type}`;
  const globalDoc = await col.findOne({ key: globalKey });
  if ((globalDoc?.count || 0) >= globalLimit) return false;
  await col.updateOne({ key: identity.key }, { $inc: { [userField]: 1 }, $set: { updatedAt: new Date() } });
  const currentGlobal = await col.findOne({ key: globalKey });
  if ((currentGlobal?.count || 0) >= globalLimit) {
    await col.updateOne({ key: identity.key }, { $inc: { [userField]: -1 } });
    return false;
  }
  await col.updateOne({ key: globalKey }, { $inc: { count: 1 }, $set: { day: today(), updatedAt: new Date() }, $setOnInsert: { key: globalKey } }, { upsert: true });
  return true;
}
async function releaseUsage(col, identity, type) {
  const isImage = type === 'image';
  const field = isImage ? 'imageCount' : 'textCount';
  const globalKey = `GLOBAL:${today()}:${type}`;
  await col.updateOne({ key: identity.key }, { $inc: { [field]: -1 } });
  await col.updateOne({ key: globalKey }, { $inc: { count: -1 } });
}
function getTextContent(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) return content.map(x => x?.text || '').join('\n').trim();
  return '';
}
async function askAI(conn, mek, m, ctx, prompt) {
  const key = getApiKey();
  if (!key) return ctx.reply('⚠️ AI is not configured yet. Add POLLINATIONS_API_KEY to the host Environment Variables. Do not put API keys in public code.');
  const identity = getIdentity(conn, mek, m, ctx);
  const col = await ensureCollection();
  const allowed = await reserveUsage(col, identity, 'text');
  if (!allowed) return ctx.reply('⚠️ Free AI daily limit reached. Please try again tomorrow.');
  try {
    const doc = await getDoc(col, identity.key, identity);
    const facts = (doc.facts || []).slice(-FACT_LIMIT);
    const history = (doc.history || []).slice(-HISTORY_LIMIT);
    const system = 'You are Hasindu-MD, a friendly WhatsApp AI assistant. Reply naturally in the language and style the user uses, including Sinhala and Singlish. Be helpful and honest. Keep replies reasonably concise for WhatsApp. Do not claim to have generated an image unless the image command actually generated one. Respect privacy. Saved user memories are preferences or non-sensitive facts only.\nSaved memories for this chat: ' + (facts.length ? facts.join(' | ') : 'None yet.');
    const response = await axios.post(`${API_BASE}/v1/chat/completions`, {
      model: TEXT_MODEL,
      messages: [{ role: 'system', content: system }, ...history, { role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 650
    }, { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 60000 });
    const answer = getTextContent(response.data);
    if (!answer) throw new Error('AI returned an empty reply');
    const nextHistory = [...history, { role: 'user', content: prompt }, { role: 'assistant', content: answer }].slice(-HISTORY_LIMIT);
    await col.updateOne({ key: identity.key }, { $set: { history: nextHistory, updatedAt: new Date() } });
    const fact = extractSimpleFact(prompt);
    if (fact) await saveFact(col, identity.key, fact);
    await ctx.reply(answer);
  } catch (err) {
    await releaseUsage(col, identity, 'text');
    console.error('[HASINDU AI] Text request failed:', err.response?.status, err.message);
    await ctx.reply('❌ AI reply ekak ganna bari una. API key/quota eka check karala aye try karanna. Free quota iwara nam paid top-up karanna one ne; quota reset wenakan inna puluwan.');
  }
}
async function makeImage(conn, mek, m, ctx, prompt) {
  const key = getApiKey();
  if (!key) return ctx.reply('⚠️ Image AI is not configured. Add POLLINATIONS_API_KEY to the host Environment Variables.');
  if (!prompt || !prompt.trim()) return ctx.reply('🖼️ Image prompt eka denna. Example: .imagine a black neon ninja logo');
  const identity = getIdentity(conn, mek, m, ctx);
  const col = await ensureCollection();
  const allowed = await reserveUsage(col, identity, 'image');
  if (!allowed) return ctx.reply('⚠️ Free image-generation daily limit reached. Please try again tomorrow.');
  try {
    await ctx.reply('🎨 Hasindu-MD AI image eka hadanawa...');
    const response = await axios.post(`${API_BASE}/v1/images/generations`, {
      model: IMAGE_MODEL,
      prompt: prompt.trim().slice(0, 1000),
      n: 1,
      size: '1024x1024',
      response_format: 'url'
    }, { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 90000 });
    const item = response.data?.data?.[0];
    let buffer;
    if (item?.b64_json) buffer = Buffer.from(item.b64_json, 'base64');
    else if (item?.url) {
      const img = await axios.get(item.url, { responseType: 'arraybuffer', timeout: 60000, maxContentLength: 15 * 1024 * 1024 });
      buffer = Buffer.from(img.data);
    } else throw new Error('Image API returned no image URL/data');
    const chat = ctx.from || m.chat || mek.key.remoteJid;
    await conn.sendMessage(chat, { image: buffer, caption: `🎨 *Hasindu-MD AI*\n${prompt.trim().slice(0, 300)}` }, { quoted: mek });
  } catch (err) {
    await releaseUsage(col, identity, 'image');
    console.error('[HASINDU AI] Image request failed:', err.response?.status, err.message);
    await ctx.reply('❌ Image eka generate karanna bari una. API key, available free credits, saha image model availability check karanna. Paid top-up karanna one ne.');
  }
}

cmd({ pattern: 'ai', alias: ['ask', 'chatgpt'], desc: 'Ask Hasindu-MD AI', category: 'ai' }, async (conn, mek, m, ctx) => {
  const prompt = String(ctx.q || ctx.text || '').trim();
  if (!prompt) return ctx.reply('💬 Example: .ai Explain photosynthesis simply');
  return askAI(conn, mek, m, ctx, prompt);
});
cmd({ pattern: 'imagine', alias: ['img', 'imagegen'], desc: 'Generate an AI image', category: 'ai' }, async (conn, mek, m, ctx) => {
  return makeImage(conn, mek, m, ctx, String(ctx.q || ctx.text || '').trim());
});
cmd({ pattern: 'remember', desc: 'Save a non-sensitive memory for this chat', category: 'ai' }, async (conn, mek, m, ctx) => {
  const fact = String(ctx.q || ctx.text || '').trim();
  if (!fact) return ctx.reply('Example: .remember My favourite colour is black');
  if (sensitive(fact)) return ctx.reply('🔒 Passwords, OTPs, private keys, financial details, and sensitive personal data are not saved.');
  const identity = getIdentity(conn, mek, m, ctx); const col = await ensureCollection(); await getDoc(col, identity.key, identity);
  await saveFact(col, identity.key, fact);
  return ctx.reply('🧠 Hari! Me chat ekata adala memory ekata save kala. .memory gahala balanna, .forget gahala delete karanna puluwan.');
});
cmd({ pattern: 'memory', alias: ['mymemory'], desc: 'View memories saved for this chat', category: 'ai' }, async (conn, mek, m, ctx) => {
  const identity = getIdentity(conn, mek, m, ctx); const col = await ensureCollection(); const doc = await getDoc(col, identity.key, identity); const facts = (doc.facts || []).slice(-FACT_LIMIT);
  return ctx.reply(facts.length ? '🧠 *Hasindu-MD Memory*\n\n' + facts.map((f, i) => `${i + 1}. ${f}`).join('\n') + '\n\nDelete: .forget' : '🧠 Me chat ekata thama saved memory naha. Example: .remember My favourite colour is black');
});
cmd({ pattern: 'forget', alias: ['forgetme', 'clearmemory'], desc: 'Delete memories for this chat', category: 'ai' }, async (conn, mek, m, ctx) => {
  const identity = getIdentity(conn, mek, m, ctx); const col = await ensureCollection();
  await col.updateOne({ key: identity.key }, { $set: { facts: [], history: [], updatedAt: new Date() } }, { upsert: true });
  return ctx.reply('🧹 Me chat ekata save karapu AI memories saha recent chat context clear kala.');
});

// Automatic replies for normal, non-command private messages.
cmd({ on: 'body', dontAddCommandList: true, desc: 'Automatic AI chat replies', category: 'ai' }, async (conn, mek, m, ctx) => {
  try {
    if (!ctx || ctx.isCmd || mek?.key?.fromMe || m?.fromMe) return;
    const body = String(ctx.body || m?.body || '').trim();
    if (!body || body.length < 1 || body.length > 2000) return;
    const chat = String(ctx.from || m?.chat || mek?.key?.remoteJid || '');
    if (chat === 'status@broadcast' || chat.endsWith('@newsletter') || chat.endsWith('@broadcast')) return;
    // AI auto-replies are private-chat only. Never auto-reply in groups,
    // even if an environment variable is accidentally enabled.
    const isGroup = Boolean(ctx.isGroup || m?.isGroup || chat.endsWith('@g.us'));
    if (isGroup || !chat.endsWith('@s.whatsapp.net')) return;

    if (config.AI_ENABLED === false || config.AI_AUTO_REPLY === false) return;

    // Natural-language image requests work without a command prefix.
    const imageIntent = /(?:\b(?:make|generate|create|draw|design)\b.{0,50}\b(?:image|picture|photo|wallpaper|logo|artwork)\b|\b(?:image|picture|photo|wallpaper|logo)\b.{0,50}\b(?:make|generate|create|draw|please)\b|mata\s+(?:image|picture|photo)\s+ekak\s+(?:hadala|hadanna|hadala denna)|(?:image|picture|photo)\s+ekak\s+(?:hadala denna|hadanna|hadapan)|(?:ඡායාරූපයක්|පින්තූරයක්|රූපයක්).{0,35}(?:හදලා දෙන්න|නිර්මාණය කරන්න))/i.test(body);
    if (imageIntent) return makeImage(conn, mek, m, ctx, body);

    const memoryRequest = extractMemoryInstruction(body);
    if (memoryRequest) {
      if (sensitive(memoryRequest)) return ctx.reply('🔒 Sensitive details (passwords, OTPs, private keys, financial/medical data) will not be saved.');
      const identity = getIdentity(conn, mek, m, ctx); const col = await ensureCollection(); await getDoc(col, identity.key, identity); await saveFact(col, identity.key, memoryRequest);
      return ctx.reply('🧠 Hari, e de mathaka thiyaganna save kala.');
    }
    if (/^(?:\.remember|\.memory|\.forget|\.imagine|\.img|\.imagegen|\.ai|\.ask|\.chatgpt)\b/i.test(body)) return;
    return askAI(conn, mek, m, ctx, body);
  } catch (err) {
    console.error('[HASINDU AI] Auto chat error:', err.message);
  }
});
