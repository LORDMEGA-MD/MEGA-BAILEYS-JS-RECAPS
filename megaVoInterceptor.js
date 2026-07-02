// ═══════════════════════════════════════════════════════════════════════
// VIEWONCE INTERCEPTOR — @lordmega/baileys
// Captures view-once media the moment it reaches the device, before
// WhatsApp's client-side view-once expiry can matter. Requires the
// Android browser fingerprint to be active (see fingerprint-switch
// snippet) — without it, mediaKey will be empty and this does nothing.
//
// Usage: call interceptViewOnce(sock, mek) at the top of your
// messages.upsert handler, before you strip the ephemeralMessage
// wrapper or return early on any other condition.
// ═══════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

async function interceptViewOnce(sock, mek) {
    try {
        if (!mek?.message) return;

        const outerMsg = mek.message;
        const msg      = outerMsg.ephemeralMessage?.message || outerMsg;

        const voContainer =
            msg.viewOnceMessageV2?.message ||
            msg.viewOnceMessageV2Extension?.message ||
            msg.viewOnceMessage?.message;

        const isViewOnce = !!(voContainer ||
            msg.imageMessage?.viewOnce ||
            msg.videoMessage?.viewOnce ||
            msg.audioMessage?.viewOnce);

        if (!isViewOnce) return;

        let mediaMsg = null, mediaType = null, ext = 'bin';

        if (voContainer?.imageMessage)       { mediaMsg = voContainer.imageMessage; mediaType = 'image'; ext = 'jpg'; }
        else if (voContainer?.videoMessage)  { mediaMsg = voContainer.videoMessage; mediaType = 'video'; ext = 'mp4'; }
        else if (voContainer?.audioMessage)  { mediaMsg = voContainer.audioMessage; mediaType = 'audio'; ext = 'ogg'; }
        else if (msg.imageMessage?.viewOnce) { mediaMsg = msg.imageMessage;         mediaType = 'image'; ext = 'jpg'; }
        else if (msg.videoMessage?.viewOnce) { mediaMsg = msg.videoMessage;         mediaType = 'video'; ext = 'mp4'; }
        else if (msg.audioMessage?.viewOnce) { mediaMsg = msg.audioMessage;         mediaType = 'audio'; ext = 'ogg'; }

        if (!mediaMsg || !mediaType) return;

        // Empty mediaKey means WhatsApp didn't actually deliver the
        // payload — almost always because the wrong browser fingerprint
        // was active when the message was received.
        const key = mediaMsg.mediaKey;
        if (!key || (Buffer.isBuffer(key) && key.length === 0)) return;

        const stream = await downloadContentFromMessage(mediaMsg, mediaType);
        let buffer   = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        if (!buffer || buffer.length === 0) return;

        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        const savePath = path.join(tmpDir, `${mek.key.id}.${ext}`);
        fs.writeFileSync(savePath, buffer);

        const sender   = mek.key.participant || mek.key.remoteJid;
        const groupJid = mek.key.remoteJid?.endsWith('@g.us') ? mek.key.remoteJid : null;

        // Hand off to your own storage/indexing logic here — e.g. an
        // antidelete store keyed by message ID, so it can be resent if
        // the sender deletes the original.
        //
        // await storeViewOnceEntry(sock, mek.key.id, sender, savePath, mediaType, groupJid, mek.key.remoteJidAlt || null);

        console.log(`[ViewOnce] captured ${mediaType} from ${sender} — saved to ${savePath}`);

    } catch (err) {
        // "empty media key" / "mediaKey" errors are expected when the
        // wrong fingerprint was active — don't spam logs for those.
        if (!err.message?.includes('empty media key') && !err.message?.includes('mediaKey')) {
            console.error('[ViewOnce] interceptor error:', err.message);
        }
    }
}

module.exports = { interceptViewOnce };
