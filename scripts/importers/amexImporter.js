const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const csv = require('csv-parse');

const connectDB = require('../../backend/src/config/database');
const logger = require('../../backend/src/config/logger');
const Transaction = require('../../backend/src/models/Transaction');
const Account = require('../../backend/src/models/Account');

function computeHash(obj) {
  const str = JSON.stringify(obj);
  return crypto.createHash('sha256').update(str).digest('hex');
}

function parseDate(mmddyyyy) {
  const [mm, dd, yyyy] = mmddyyyy.split('/');
  return new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
}

const US_STATES = new Set(['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']);
const INTERNAL_DESCRIPTIONS = new Set([
  'INTEREST CHARGE ON PURCHASES',
  'MOBILE PAYMENT - THANK YOU',
  'RENEWAL MEMBERSHIP FEE'
]);

function toTitleCase(s) {
  return s
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(w => w[0] ? (w[0].toUpperCase() + w.slice(1)) : w)
    .join(' ');
}

function extractDetails(rawDescription) {
  // Extract phone, url, and city/state when present in the padded tail of description
  const contact = {};
  const location = {};
  let cleaned = rawDescription;

  // 1) Internal whitelist: keep description as-is, no parsing
  const rawUpper = (rawDescription || '').trim().toUpperCase();
  if (INTERNAL_DESCRIPTIONS.has(rawUpper)) {
    return { contact, location, cleanedDescription: rawDescription };
  }

  const phoneMatch = rawDescription.match(/\(\d{3}\)\d{3}-\d{4}|\d{3}[- ]\d{3}[- ]\d{4}/);
  if (phoneMatch) {
    contact.phone = phoneMatch[0];
    cleaned = cleaned.replace(phoneMatch[0], '').trim();
  }

  const urlMatch = rawDescription.match(/https?:\/\/[\w.-]+(?:\/[\w./-]*)?/i);
  if (urlMatch) {
    contact.url = urlMatch[0];
    cleaned = cleaned.replace(urlMatch[0], '').trim();
  }

  // Always take first 20 chars as merchant (Title Case only), for merchant-type rows
  const merchantRaw = rawDescription.slice(0, 20);
  const merchantTitle = toTitleCase(merchantRaw);

  // Fixed-width heuristic (AMEX 42-char descriptions): [0:20]=merchant, [20:40]=mid, [40:42]=code
  const descLen = rawDescription.length;
  if (descLen === 42) {
    const mid = rawDescription.slice(20, 40);
    const code = rawDescription.slice(40, 42).trim().toUpperCase();

    // Classify mid
    const midTrim = mid.trim();
    const midIsPhone = /\(\d{3}\)\d{3}-\d{4}|\d{3}[- ]\d{3}[- ]\d{4}/.test(midTrim);
    const midIsUrl = /https?:\/\/[\w.-]+(?:\/[\w./-]*)?/i.test(midTrim) || /[A-Za-z0-9]+\.[A-Za-z]{2,}/.test(midTrim);
    if (midIsPhone) {
      contact.phone = contact.phone || midTrim;
    } else if (midIsUrl) {
      contact.url = contact.url || midTrim;
    } else {
      // Treat as city
      let cityCandidate = midTrim.replace(/^[-\s\d]+/, '');
      cityCandidate = cityCandidate.replace(/\s{2,}/g, ' ').trim();
      if (cityCandidate && cityCandidate.toUpperCase() !== 'NA') {
        location.city = toTitleCase(cityCandidate);
      }
    }

    // Classify code
    if (/^[A-Z]{2}$/.test(code)) {
      if (US_STATES.has(code)) {
        location.state = code;
      } else {
        location.country = code;
      }
    }

    cleaned = merchantTitle; // description becomes merchant only
  }

  // Non-42 length handling
  if (descLen !== 42) {
    const remainder = rawDescription.slice(20);
    // Check trailing pattern: space + 2 letters at the very end
    const tailMatch = remainder.match(/\s([A-Za-z]{2})$/);
    if (tailMatch) {
      const code = tailMatch[1].toUpperCase();
      const before = remainder.slice(0, remainder.length - 3);
      const midTrim = before.trim();
      const midIsPhone = /\(\d{3}\)\d{3}-\d{4}|\d{3}[- ]\d{3}[- ]\d{4}/.test(midTrim);
      const midIsUrl = /https?:\/\/[\w.-]+(?:\/[\w./-]*)?/i.test(midTrim) || /[A-Za-z0-9]+\.[A-Za-z]{2,}/.test(midTrim);
      if (midIsPhone) {
        contact.phone = contact.phone || midTrim;
      } else if (midIsUrl) {
        contact.url = contact.url || midTrim;
      } else {
        let cityCandidate = midTrim.replace(/^[-\s\d]+/, '');
        cityCandidate = cityCandidate.replace(/\s{2,}/g, ' ').trim();
        if (cityCandidate && cityCandidate.toUpperCase() !== 'NA') {
          location.city = toTitleCase(cityCandidate);
        }
      }
      if (US_STATES.has(code)) {
        location.state = code;
      } else if (/^[A-Z]{2}$/.test(code)) {
        location.country = code;
      }
      cleaned = merchantTitle;
    } else {
      // No trailing code: classify the remainder as mid (city/url/phone)
      const midTrim = remainder.trim();
      const midIsPhone = /\(\d{3}\)\d{3}-\d{4}|\d{3}[- ]\d{3}[- ]\d{4}/.test(midTrim);
      const midIsUrl = /https?:\/\/[\w.-]+(?:\/[\w./-]*)?/i.test(midTrim) || /[A-Za-z0-9]+\.[A-Za-z]{2,}/.test(midTrim);
      if (midIsPhone) {
        contact.phone = contact.phone || midTrim;
      } else if (midIsUrl) {
        contact.url = contact.url || midTrim;
      } else {
        let cityCandidate = midTrim.replace(/^[-\s\d]+/, '');
        cityCandidate = cityCandidate.replace(/\s{2,}/g, ' ').trim();
        if (cityCandidate && cityCandidate.toUpperCase() !== 'NA') {
          location.city = toTitleCase(cityCandidate);
        }
      }
      cleaned = merchantTitle;
    }
  }

  // Normalize internal multiple spaces
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  return { contact, location, cleanedDescription: cleaned };
}

async function ensureAmexAccount() {
  let account = await Account.findOne({ name: 'American Express Bonvoy Credit Card' });
  if (!account) {
    const liabilities = await Account.findOne({ type: 'liability', name: 'Credit Cards' });
    account = await Account.create({
      name: 'American Express Bonvoy Credit Card',
      type: 'liability',
      description: 'Imported from AMEX CSV',
      parent: liabilities?._id || null,
      unit: 'USD'
    });
  }
  return account;
}

async function importFile(filePath, amexAccount) {
  logger.info(`Importing AMEX CSV: ${filePath}`);
  const parser = fs.createReadStream(filePath).pipe(csv.parse({ columns: true, trim: false, bom: true, skip_empty_lines: true }));

  let line = 1; // header is line 0 logically
  for await (const record of parser) {
    // Expected columns: Date,Description,Card Member,Account #,Amount
    try {
      const raw = { ...record };
      const dateStr = (record['Date'] || '').trim();
      if (!dateStr) {
        throw new Error(`Missing Date column`);
      }
      const date = parseDate(dateStr);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid Date format: '${dateStr}'`);
      }

      const rawDescription = (record['Description'] ?? '').toString();
      if (!rawDescription) {
        throw new Error(`Missing Description column`);
      }

      const cardMember = (record['Card Member'] || '').trim();
      const amexAcctSuffix = (record['Account #'] || '').trim();
      // Amount sign: purchases typically positive; payments/refunds negative in some exports
      const amountStr = (record['Amount'] ?? '').toString();
      const signed = parseFloat(amountStr);
      if (!isFinite(signed)) {
        throw new Error(`Invalid Amount: '${amountStr}'`);
      }
      const amount = Math.abs(signed);
      const entryType = signed >= 0 ? 'credit' : 'debit'; // increase liability on charge, decrease on payment

      // Extended fields from expanded CSV (if present)
      const extendedDetails = (record['Extended Details'] ?? '').toString() || undefined;
      const appearsAs = (record['Appears On Your Statement As'] ?? '').toString(); // ignored per requirements
      const address = (record['Address'] ?? '').toString();
      const cityState = (record['City/State'] ?? '').toString();
      const zipCode = (record['Zip Code'] ?? '').toString() || undefined;
      const country = (record['Country'] ?? '').toString();
      const referenceRaw = (record['Reference'] ?? '').toString();
      const reference = referenceRaw ? referenceRaw.replace(/^'+|'+$/g, '') : undefined;
      const category = (record['Category'] ?? '').toString() || undefined;

      let location = {};
      let contact = {};
      let cleanedDescription;
      let owner = cardMember || undefined;

      if (address || cityState || zipCode || country || extendedDetails || reference || category) {
        // Prefer extended CSV fields
        // Merchant is always first 20 chars (Title Case only), discard remainder
        const merchantTitle = toTitleCase(rawDescription.slice(0, 20));
        cleanedDescription = merchantTitle;

        if (address) location.address = address;
        if (zipCode) {
          // keep zip as-is
        }
        if (cityState) {
          const parts = cityState.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
          // Expect format: CITY on first line, STATE on second line in samples
          if (parts[0]) location.city = toTitleCase(parts[0]);
          if (parts[1]) {
            const st = parts[1].toUpperCase();
            if (US_STATES.has(st)) location.state = st; else location.country = st;
          }
        }
        if (country && !location.country) location.country = country;
      } else {
        // Fallback to legacy parsing
        const parsed = extractDetails(rawDescription);
        contact = parsed.contact;
        location = parsed.location;
        cleanedDescription = parsed.cleanedDescription;
      }
      const meta = { cardMember, amexAccountSuffix: amexAcctSuffix };

      const dedupeKey = {
        src: 'amex-csv-v1',
        file: path.basename(filePath),
        line,
        date: date.toISOString().slice(0,10),
        description: rawDescription,
        amount
      };
      const hash = computeHash(dedupeKey);

      // Check if exists by hash
      const exists = await Transaction.findOne({ 'source.hash': hash }).select('_id');
      if (exists) {
        line += 1;
        continue;
      }

      // Create one-sided entry: credit card purchase -> credit on CC account
      const txnData = {
        date,
        description: cleanedDescription || rawDescription,
        notes: undefined,
        source: {
          importer: 'amex-csv-v1',
          file: filePath,
          line,
          hash
        },
        rawSource: raw,
        metadata: meta,
        owner,
        category,
        zipCode,
        memo: extendedDetails,
        contact: Object.keys(contact).length ? contact : undefined,
        location: Object.keys(location).length ? location : undefined,
        entries: [{
          accountId: amexAccount._id,
          amount,
          type: entryType,
          unit: 'USD',
          description: cleanedDescription || rawDescription
        }]
      };

      if (reference) {
        txnData.reference = reference;
      }

      await Transaction.create(txnData);
      line += 1;
    } catch (e) {
      logger.error(`[AMEX importer] Row error at ${filePath}:${line} -> ${e.message} | row=${JSON.stringify(record)}`);
      throw e; // Fast-fail as requested
    }
  }
}

async function main() {
  try {
    await connectDB();
    const dir = process.argv[2] || '/storage/Accounting/raw/amex';
    const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.csv'));
    const amexAccount = await ensureAmexAccount();
    for (const f of files) {
      await importFile(path.join(dir, f), amexAccount);
    }
    logger.info('AMEX import complete');
    process.exit(0);
  } catch (e) {
    logger.error('AMEX import failed:', e);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { importFile };


