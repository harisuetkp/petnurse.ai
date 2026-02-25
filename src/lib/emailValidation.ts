// Disposable/temporary email domain blocklist
const DISPOSABLE_DOMAINS = new Set([
  // Major disposable email providers
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
  // Common typo/fake patterns
  "test.com", "example.com", "fake.com", "asdf.com", "qwerty.com",
  "abc.com", "xyz.com", "aaa.com", "zzz.com", "none.com",
  "noemail.com", "noreply.com",
]);

// Common typo domains mapped to their correct versions
const TYPO_DOMAIN_MAP: Record<string, string> = {
  // Gmail typos
  "glail.com": "gmail.com", "gmial.com": "gmail.com", "gmal.com": "gmail.com",
  "gamil.com": "gmail.com", "gnail.com": "gmail.com", "gmaill.com": "gmail.com",
  "gmil.com": "gmail.com", "gmaik.com": "gmail.com", "gmali.com": "gmail.com",
  "gmsil.com": "gmail.com", "gmqil.com": "gmail.com", "gmaol.com": "gmail.com",
  "gail.com": "gmail.com", "gimail.com": "gmail.com", "gemail.com": "gmail.com",
  "gmail.co": "gmail.com", "gmail.om": "gmail.com", "gmail.con": "gmail.com",
  "gmail.cm": "gmail.com", "gmail.cim": "gmail.com", "gmail.vom": "gmail.com",
  "gmail.com.com": "gmail.com", "gmail.comm": "gmail.com",
  // Yahoo typos
  "yahooo.com": "yahoo.com", "yaho.com": "yahoo.com", "yhoo.com": "yahoo.com",
  "yhaoo.com": "yahoo.com", "yaoo.com": "yahoo.com", "yahoo.co": "yahoo.com",
  "yahoo.con": "yahoo.com", "yahoo.om": "yahoo.com",
  // Outlook/Hotmail typos
  "outlok.com": "outlook.com", "outloo.com": "outlook.com", "outlool.com": "outlook.com",
  "otulook.com": "outlook.com", "outlook.co": "outlook.com", "outlook.con": "outlook.com",
  "hotmal.com": "hotmail.com", "hotmial.com": "hotmail.com", "hotmil.com": "hotmail.com",
  "hotmaill.com": "hotmail.com", "hotmail.co": "hotmail.com", "hotmail.con": "hotmail.com",
  // iCloud typos
  "iclod.com": "icloud.com", "iclould.com": "icloud.com", "icoud.com": "icloud.com",
};

export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return true;
  return DISPOSABLE_DOMAINS.has(domain);
}

export function isTypoDomain(email: string): string | null {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return null;
  return TYPO_DOMAIN_MAP[domain] || null;
}

export function isValidEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return "Email is required";
  if (!isValidEmailFormat(trimmed)) return "Please enter a valid email address";
  if (isDisposableEmail(trimmed)) return "Disposable or temporary emails are not allowed. Please use a real email.";
  const suggestedDomain = isTypoDomain(trimmed);
  if (suggestedDomain) {
    const localPart = trimmed.split("@")[0];
    return `Did you mean ${localPart}@${suggestedDomain}?`;
  }
  return null;
}
