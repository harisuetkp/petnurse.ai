import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

// Comprehensive disposable email domain blocklist
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "guerrillamail.org",
  "tempmail.com", "temp-mail.org", "throwaway.email", "fakeinbox.com",
  "sharklasers.com", "guerrillamailblock.com", "grr.la", "dispostable.com",
  "yopmail.com", "yopmail.fr", "cool.fr.nf", "jetable.fr.nf", "nospam.ze.tc",
  "nomail.xl.cx", "mega.zik.dj", "speed.1s.fr", "courriel.fr.nf", "moncourrier.fr.nf",
  "monemail.fr.nf", "monmail.fr.nf",
  "tempail.com", "tempr.email", "discard.email", "discardmail.com", "discardmail.de",
  "trashmail.com", "trashmail.me", "trashmail.net", "trashmail.org", "trashmail.at",
  "trashmail.io", "trashmails.com",
  "mailnesia.com", "maildrop.cc", "mailcatch.com", "mailexpire.com",
  "mailnull.com", "mailscrap.com", "mailseal.de", "mailshell.com",
  "mailsiphon.com", "mailslite.com", "mailtemp.info", "mailtothis.com",
  "mailzilla.com", "mailzilla.org",
  "getairmail.com", "filzmail.com", "inboxalias.com",
  "spamfree24.org", "spamgourmet.com", "spamhereplease.com",
  "10minutemail.com", "10minutemail.net", "20minutemail.com",
  "minutemail.com", "tempinbox.com", "emailondeck.com",
  "getnada.com", "abyssmail.com", "emkei.cz",
  "burnermail.io", "harakirimail.com", "maildu.de",
  "mohmal.com", "mytemp.email", "mt2015.com",
  "nada.email", "nada.ltd", "putsbox.com", "receiveee.com",
  "rhyta.com", "tmail.ws", "tmpmail.net", "tmpmail.org",
  "wegwerfmail.de", "wegwerfmail.net", "wh4f.org",
  "emailfake.com", "crazymailing.com", "armyspy.com",
  "dayrep.com", "einrot.com", "fleckens.hu", "gustr.com",
  "jourrapide.com", "superrito.com", "teleworm.us",
  "tempmailo.com", "tempmailaddress.com", "throwam.com",
  "trbvm.com", "trbvn.com",
  "test.com", "example.com", "fake.com", "asdf.com", "qwerty.com",
  "abc.com", "xyz.com", "aaa.com", "zzz.com", "none.com",
  "noemail.com", "noreply.com",
  // Additional domains commonly used for fake signups
  "guerrillamail.info", "guerrillamail.biz", "guerrillamail.de",
  "mailforspam.com", "safetymail.info", "trashymail.com",
  "mailinator.net", "mailinator.org", "mailinator.us",
  "bugmenot.com", "devnullmail.com", "dodgit.com",
  "dodgeit.com", "e4ward.com", "emailigo.de",
  "emailsensei.com", "emailtemporario.com.br",
  "ephemail.net", "eyepaste.com", "fastacura.com",
  "filzmail.com", "fizmail.com", "frapmail.com",
  "gishpuppy.com", "grandmamail.com", "greensloth.com",
  "haltospam.com", "hulapla.de", "imails.info",
  "incognitomail.com", "incognitomail.net", "incognitomail.org",
  "ipoo.org", "irish2me.com", "jetable.com",
  "kasmail.com", "koszmail.pl", "kurzepost.de",
  "letthemeatspam.com", "lhsdv.com", "lifebyfood.com",
  "lookugly.com", "lopl.co.cc", "lr78.com",
  "maileater.com", "mailexpire.com", "mailfreeonline.com",
  "mailimate.com", "mailin8r.com", "mailinator.com",
  "mailinator2.com", "mailincubator.com", "mailismagic.com",
  "mailme.ir", "mailme.lv", "mailmetrash.com",
  "mailmoat.com", "mailms.com", "mailnator.com",
  "mailnull.com", "mailorg.org", "mailpick.biz",
  "mailproxsy.com", "mailquack.com", "mailrock.biz",
  "mailscrap.com", "mailshell.com", "mailsiphon.com",
  "mailslapping.com", "mailslite.com", "mailtemp.info",
  "mailtothis.com", "mailtrash.net", "mailtv.net",
  "mailtv.tv", "mailzilla.com", "mailzilla.org",
  "makemetheking.com", "manifestgenerator.com",
  "messagebeamer.de", "mezimages.net", "mfsa.ru",
  "mintemail.com", "misterpinball.de", "mmmmail.com",
  "moakt.com", "mobi.web.id", "mobileninja.co.uk",
  "moncourrier.fr.nf", "monemail.fr.nf", "monmail.fr.nf",
  "msa.minsmail.com", "mt2009.com", "mx0.wwwnew.eu",
  "my10minutemail.com", "myalias.pw", "mycard.net.ua",
  "mycleaninbox.net", "myemailboxy.com", "mymail-in.net",
  "mymailoasis.com", "mynetstore.de", "mypacks.net",
  "mypartyclip.de", "myphantom.com", "mysamp.de",
  "myspaceinc.com", "myspaceinc.net", "myspaceinc.org",
  "myspacepimpedup.com", "mytemp.email", "mytempmail.com",
  "mytrashmail.com", "nabala.com", "neomailbox.com",
  "nepwk.com", "nervmich.net", "nervtansen.de",
  "netmails.com", "netmails.net", "neverbox.com",
  "no-spam.ws", "noblepioneer.com", "nobulk.com",
  "noclickemail.com", "nogmailspam.info",
  "nomail.ch", "nomail.xl.cx", "nomail2me.com",
  "nomorespamemails.com", "nonspam.eu", "nonspammer.de",
  "noref.in", "nospam.ze.tc", "nospam4.us",
  "nospamfor.us", "nospammail.net", "nospamthanks.info",
  "nothingtoseehere.ca", "nowmymail.com",
  "nurfuerspam.de", "nus.edu.sg", "nwldx.com",
]);

function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return true;
  return DISPOSABLE_DOMAINS.has(domain);
}

function isValidEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

// Check for obviously fake local parts
function isSuspiciousLocalPart(email: string): boolean {
  const local = email.split("@")[0]?.toLowerCase();
  if (!local) return true;
  
  // All same character (e.g. "aaaa", "bbbbb")
  if (/^(.)\1+$/.test(local)) return true;
  // Only block exact matches of obviously fake local parts
  const exactFakes = new Set([
    "asdf", "asdfg", "asdfgh", "asdfghjkl",
    "qwer", "qwert", "qwerty", "qwertyuiop",
    "zxcv", "zxcvb", "zxcvbn", "zxcvbnm",
    "1234", "12345", "123456", "1234567", "12345678",
    "abcd", "abcde", "abcdef", "abcdefg",
    "fake", "fakeemail", "fakename", "fakeuser",
    "nope", "none", "null", "void",
    "spam", "trash", "junk", "throwaway",
    "noemail", "noreply", "no-reply",
  ]);
  if (exactFakes.has(local)) return true;
  // Too short
  if (local.length < 2) return true;
  
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const headers = { ...getCorsHeaders(req), "Content-Type": "application/json" };

  try {
    const { email } = await req.json();
    
    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ valid: false, reason: "Email is required" }),
        { status: 400, headers }
      );
    }

    const trimmed = email.trim().toLowerCase();

    if (!isValidEmailFormat(trimmed)) {
      return new Response(JSON.stringify({ valid: false, reason: "Invalid email format" }), { headers });
    }

    if (isDisposableEmail(trimmed)) {
      return new Response(JSON.stringify({ valid: false, reason: "Disposable or temporary email addresses are not allowed. Please use your real email." }), { headers });
    }

    if (isSuspiciousLocalPart(trimmed)) {
      return new Response(JSON.stringify({ valid: false, reason: "This email address appears invalid. Please use your real email." }), { headers });
    }

    return new Response(JSON.stringify({ valid: true }), { headers });
  } catch (err) {
    console.error("Email validation error:", err);
    return new Response(
      JSON.stringify({ valid: false, reason: "Validation error" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
