import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, '..', 'src', 'data', 'opportunities.json');
const QUERY = `SELECT Id, Name, LocationAddress__c, StageName, StageName2__c, AccountId FROM Opportunity WHERE Name != null ORDER BY CreatedDate DESC LIMIT 500`;

try {
  console.log('Querying Salesforce Opportunities...');
  const raw = execSync(`sf data query --query "${QUERY}" --json`, {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
  });
  const result = JSON.parse(raw);
  if (result.status !== 0) {
    console.error('SF CLI returned non-zero status:', result.message);
    process.exit(1);
  }
  const records = result.result?.records ?? [];
  const opportunities = records.map((r) => ({
    id: r.Id,
    name: r.Name,
    address: r.LocationAddress__c || '',
    stage: r.StageName2__c || r.StageName,
  }));
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(opportunities, null, 2), 'utf-8');
  console.log(`Synced ${opportunities.length} opportunities to ${OUTPUT_PATH}`);
} catch (err) {
  console.error('Failed to sync Salesforce data:', err.message);
  process.exit(1);
}
