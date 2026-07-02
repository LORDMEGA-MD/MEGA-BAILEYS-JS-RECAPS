> *`VIEWONCE RECOVERY NOTICE`*
> https://www.npmjs.com/package/@lordmega/baileys

_Desktop-fingerprinted sessions often don't receive full view-once media from WhatsApp, only stripped metadata. Switch to an Android fingerprint after registration to receive the real payload._
*EXAMPLE OF USAGE.*

> const isRegistered = !!state.creds?.registered;
>
> const sock = makeWASocket({    browser: isRegistered        ? Browsers.android('Chrome')        : ['Ubuntu', 'Chrome', '20.0.04'],    auth: { creds: state.creds, keys }})

_Not registered → Ubuntu/Chrome, required for pairing code to succeed. Registered → Android/Chrome, required for WhatsApp to deliver the actual view-once media. state.creds is re-read on every boot so this switches automatically, no manual toggle needed._

_Interceptor file (captures the media on arrival, before it expires) attached separately — viewonce-interceptor.js_

_Caveat: the device registers as Ubuntu but runs as Android afterward, a visible mismatch in Linked Devices. Doesn't break anything, just worth knowing._
# MEGA-BAILEYS-JS-RECAPS