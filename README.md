# wikidata-company-lookup

Company name → **official website, logo, country, industry, founding year, employees, stock
tickers and main social accounts**, from [Wikidata](https://www.wikidata.org) (public domain, CC0).
No key, no dependencies, Node 18+.

```bash
node company.mjs Toyota Siemens "Novo Nordisk"
```

```json
{
  "input": "Toyota",
  "name": "Toyota",
  "description": "Japanese multinational automotive manufacturer",
  "website": "https://global.toyota",
  "logo": "https://commons.wikimedia.org/wiki/Special:FilePath/Toyota.svg",
  "country": "Japan",
  "industry": ["automotive industry"],
  "founded": 1937,
  "employees": 359542,
  "tickers": [{ "exchange": "Tokyo Stock Exchange", "ticker": "7203" }, { "exchange": "New York Stock Exchange", "ticker": "TM" }],
  "x": "https://x.com/ToyotaMotorCorp",
  "wikidata": "Q53268"
}
```

## Things that bite

- **Picking the right "Apple".** Search returns fruit, albums and people too. The script drops
  humans and creative works and **requires an official website (P856)**, which removes most noise.
- **`preferred` rank.** Properties like employee count have many values over the years; the
  `preferred` one is current. Otherwise take the latest.
- **Regional social accounts.** Toyota lists dozens of X/LinkedIn/Instagram accounts (Serbia,
  Zimbabwe, Türkiye…). The script takes the preferred one, then the one with the most followers
  recorded, then a handle matching the company name, and otherwise returns `null`: better empty than wrong.
- **`mul` labels.** Some newer items only have a multilingual label, not an English one; ask for
  `languages: en|mul` or you'll print raw Q-ids.
- **Be polite.** Identify your client in the User-Agent, send `maxlag`, and keep a pause between requests.

## Hosted version

Bulk lookups, **domain → company** as well, logos and icons from the company's own homepage when
Wikidata has none, headquarters, parent company and more: **[Company Domain & Logo Finder](https://apify.com/swiftkit/company-lookup)**
on Apify.

## License

MIT (code). Data: Wikidata, CC0. Logos are trademarks of their owners.
