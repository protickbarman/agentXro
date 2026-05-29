#!/usr/bin/env node
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const TOOLS_DIR = path.join(ROOT, 'tools');
const TEMP_DIR = path.join('/tmp/opencode', 'tool-smoke');

const args = new Set(process.argv.slice(2));
const includeNetwork = args.has('--network') || args.has('--all');
const includeUnsafe = args.has('--unsafe') || args.has('--all');

const networkToolFiles = new Set([
  'tools/web/HttpGetTool.js',
  'tools/web/HttpPostTool.js',
  'tools/web/HttpPutTool.js',
  'tools/web/HttpDeleteTool.js',
  'tools/web/WebSearchTool.js',
  'tools/web/RssFetchTool.js',
  'tools/web/WebhookTool.js',
  'tools/api/DictionaryTool.js',
  'tools/api/DiscordWebhookTool.js',
  'tools/api/SlackSendTool.js',
  'tools/api/TelegramSendTool.js',
  'tools/api/GitHubApiTool.js',
  'tools/api/ExchangeRateTool.js',
  'tools/api/NewsApiTool.js',
  'tools/api/OpenWeatherTool.js',
  'tools/api/IpGeolocationTool.js',
  'tools/network/DnsLookupTool.js',
  'tools/network/MxLookupTool.js',
  'tools/network/WhoisTool.js',
  'tools/network/PingTool.js',
  'tools/network/PortScanTool.js',
  'tools/network/TracerouteTool.js',
  'tools/network/SslCheckTool.js',
  'tools/network/IpInfoTool.js',
  'tools/image/QrEncodeTool.js',
  'tools/image/QrDecodeTool.js',
]);

const skipByName = new Map([
  ['file_list', 'requires database and conversation context'],
  ['file_save', 'requires database and user context'],
  ['file_read_content', 'requires database and user context'],
  ['file_delete', 'requires database and user context'],
  ['certificate', 'requires valid PEM certificate input'],
]);

const secretTools = new Map([
  ['discord_webhook', ['DISCORD_WEBHOOK_URL']],
  ['slack_send', ['SLACK_WEBHOOK_URL']],
  ['telegram_send', ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']],
]);

const SAMPLE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5f9acAAAAASUVORK5CYII=';

function log(status, toolName, relPath, message) {
  const label = status.toUpperCase().padEnd(5, ' ');
  const suffix = message ? ` - ${message}` : '';
  console.log(`[${label}] ${toolName} (${relPath})${suffix}`);
}

async function listToolFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'base') continue;
      files.push(...await listToolFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      if (full.endsWith(path.join('tools', 'ToolRegistry.js'))) continue;
      files.push(full);
    }
  }
  return files;
}

async function prepareTemp() {
  await fs.mkdir(TEMP_DIR, { recursive: true });
  const sampleFile = path.join(TEMP_DIR, 'sample.txt');
  const moveSource = path.join(TEMP_DIR, 'move.txt');
  const deleteTarget = path.join(TEMP_DIR, 'delete-me.txt');
  const imageFile = path.join(TEMP_DIR, 'sample.png');
  await fs.writeFile(sampleFile, 'sample content for tools\nline2', 'utf8');
  await fs.writeFile(moveSource, 'move me', 'utf8');
  await fs.writeFile(deleteTarget, 'delete me', 'utf8');
  await fs.writeFile(imageFile, Buffer.from(SAMPLE_PNG_BASE64, 'base64'));
  return { sampleFile, moveSource, deleteTarget, imageFile };
}

function buildEncryptedSample(key, value) {
  const derivedKey = crypto.scryptSync(key, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', derivedKey, iv);
  let encrypted = cipher.update(String(value), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

function getTestParams(toolName, relPath, schema, ctx) {
  if (relPath === 'tools/shared/BasicWebSearchTool.js') {
    return { query: 'open source', maxResults: 3 };
  }

  const cases = {
    embedding: () => ({ text: ctx.sampleText, dimensions: 8 }),
    entity_extract: () => ({ text: ctx.sampleEntityText }),
    keyword_extract: () => ({ text: ctx.sampleText, count: 5 }),
    language_detect: () => ({ text: 'This is an English sentence.' }),
    sentiment: () => ({ text: 'I love this great product, but the price is bad.' }),
    spell_check: () => ({ text: 'Ths is a smple txt with errrs.' }),
    summarize: () => ({ text: ctx.sampleLongText, maxSentences: 2, method: 'keyword' }),
    text_classify: () => ({ text: 'The server and API are running on Linux with database.', categories: ['technology', 'sports'] }),

    dictionary: () => ({ word: 'test', op: 'define' }),
    email_send: () => ({ to: 'test@example.com', subject: 'Smoke Test', body: 'Hello from tool smoke test' }),
    exchange_rate: () => ({ from: 'USD', to: 'EUR', amount: 10 }),
    github_api: () => ({ endpoint: '/rate_limit', method: 'GET' }),
    ip_geolocation: () => ({ ip: '8.8.8.8' }),
    news_api: () => ({ query: 'technology', count: 3, source: 'bbc' }),
    open_weather: () => ({ location: 'London' }),

    code_diff: () => ({ old: 'a\nb\nc', new: 'a\nb2\nc', context: 1 }),
    js_eval: () => ({ code: 'return x + y;', context: { x: 2, y: 3 } }),
    json_to_schema: () => ({ data: { name: 'x', count: 2 }, title: 'Sample' }),
    jwt_decode: () => ({ token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.sig' }),
    jwt_encode: () => ({ payload: { sub: '123', role: 'user' }, secret: 'secret' }),
    minify: () => ({ code: 'function test(){ return 1; }', type: 'js' }),
    regex_replace: () => ({ pattern: 'foo', replacement: 'bar', text: 'foo foo', flags: 'g' }),
    regex_test: () => ({ pattern: '\\b\\w+\\b', text: 'hello world', flags: 'g' }),
    sql_format: () => ({ sql: 'select * from users where id = 1', dialect: 'postgres' }),
    syntax_highlight: () => ({ code: 'const x = 1;', language: 'javascript' }),

    checksum: () => ({ value: 'hello', algorithm: 'crc32' }),
    decrypt: () => ({ value: buildEncryptedSample('secret', 'hello'), key: 'secret' }),
    encrypt: () => ({ value: 'hello', key: 'secret' }),
    hash: () => ({ value: 'hello', algorithm: 'sha256', encoding: 'hex' }),
    hmac: () => ({ value: 'hello', key: 'secret', algorithm: 'sha256', encoding: 'hex' }),
    key_pair: () => ({ type: 'rsa', bits: 1024 }),
    password_gen: () => ({ length: 12, count: 2, useUppercase: true, useLowercase: true, useDigits: true, useSymbols: false }),
    random_string: () => ({ length: 12, charset: 'alphanumeric' }),
    uuid: () => ({ version: 'v4', count: 2 }),

    base64: () => ({ value: 'hello', direction: 'encode', charset: 'utf8' }),
    csv_parse: () => ({ csv: 'name,age\nAlice,30\nBob,25', delimiter: ',', hasHeader: true }),
    csv_stringify: () => ({ data: [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }], columns: ['name', 'age'], delimiter: ',' }),
    data_filter: () => ({ data: [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }], conditions: JSON.stringify([{ field: 'age', op: 'gt', value: 26 }]) }),
    data_group: () => ({ data: [{ city: 'A', value: 1 }, { city: 'A', value: 2 }, { city: 'B', value: 3 }], key: 'city', aggregate: 'sum', aggregateField: 'value' }),
    data_merge: () => ({ a: { a: 1, nested: { x: 1 }, arr: [1] }, b: { b: 2, nested: { y: 2 }, arr: [2] }, mode: 'deep' }),
    data_sort: () => ({ data: [{ name: 'Bob', age: 25 }, { name: 'Alice', age: 30 }], keys: ['name'], order: ['asc'] }),
    data_validate: () => ({ data: { email: 'test@example.com', age: 20 }, rules: { email: { type: 'string', required: true, pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' }, age: { type: 'number', min: 18, max: 99 } } }),
    json_parse: () => ({ json: JSON.stringify({ a: 1, b: [2, 3] }), format: true }),
    json_query: () => ({ data: { a: { b: [{ c: 1 }, { c: 2 }] } }, path: 'a.b[1].c' }),
    json_transform: () => ({ data: { a: 1, b: 2, c: 3 }, op: 'pick', keys: ['a', 'c'] }),
    xml_parse: () => ({ xml: '<root><item>One</item></root>' }),
    xml_stringify: () => ({ data: { item: 'One' }, rootName: 'root' }),
    yaml_parse: () => ({ yaml: 'name: Xro\nvalue: 42\nitems:\n  - a\n  - b\n' }),
    yaml_stringify: () => ({ data: { name: 'Xro', items: ['a', 'b'] } }),

    cron_parse: () => ({ expression: '*/5 * * * *', count: 3 }),
    current_time: () => ({ format: 'iso' }),
    date_add: () => ({ date: '2024-01-01T00:00:00Z', amount: 1, unit: 'days' }),
    date_diff: () => ({ start: '2024-01-01T00:00:00Z', end: '2024-01-02T00:00:00Z', unit: 'days' }),
    date_format: () => ({ date: '2024-01-02T03:04:05Z', format: 'YYYY-MM-DD HH:mm:ss' }),
    date_parse: () => ({ date: '2024-01-02T03:04:05Z' }),
    date_subtract: () => ({ date: '2024-01-02T03:04:05Z', amount: 1, unit: 'days' }),
    stopwatch: () => ({ action: 'start', id: 'smoke' }),
    timestamp: () => ({ value: 1700000000, direction: 'to_date' }),
    timezone_convert: () => ({ date: '2024-01-02T03:04:05Z', fromOffset: 0, toOffset: 6 }),

    copy_file: () => ({ source: ctx.sampleFile, dest: path.join(TEMP_DIR, 'copy.txt') }),
    delete_file: () => ({ path: ctx.deleteTarget, recursive: false }),
    file_hash: () => ({ path: ctx.sampleFile, algorithm: 'sha256' }),
    file_info: () => ({ path: ctx.sampleFile }),
    list_dir: () => ({ path: TEMP_DIR, recursive: false }),
    move_file: () => ({ source: ctx.moveSource, dest: path.join(TEMP_DIR, 'moved.txt') }),
    read_file: () => ({ path: ctx.sampleFile, encoding: 'utf8' }),
    search_files: () => ({ root: TEMP_DIR, pattern: '*.txt', content: 'sample' }),
    temp_file: () => ({ content: 'temp content', prefix: 'smoke-', suffix: '.txt' }),
    write_file: () => ({ path: path.join(TEMP_DIR, 'write.txt'), content: 'written' }),

    compound_interest: () => ({ principal: 1000, rate: 5, periods: 2, compoundPerYear: 12 }),
    currency_format: () => ({ amount: 1234.56, currency: 'USD', locale: 'en-US' }),
    discount_calc: () => ({ originalPrice: 100, discountPercent: 10 }),
    investment_calc: () => ({ presentValue: 1000, rate: 5, periods: 3, op: 'future_value' }),
    loan_calc: () => ({ principal: 10000, rate: 5, years: 1 }),
    mortgage_calc: () => ({ principal: 200000, rate: 4, years: 30 }),
    tax_calc: () => ({ income: 50000, brackets: [{ min: 0, max: 10000, rate: 10 }, { min: 10000, max: 40000, rate: 20 }, { min: 40000, rate: 30 }] }),
    tip_calc: () => ({ amount: 100, tipPercent: 15, split: 2 }),

    ascii_art: () => ({ text: 'HI', font: 'simple' }),
    color_convert: () => ({ value: '#ff0000', from: 'hex', to: 'rgb' }),
    color_info: () => ({ color: '#00ff00', format: 'hex' }),
    color_palette: () => ({ name: 'ocean', count: 3 }),
    image_info: () => ({ data: `data:image/png;base64,${SAMPLE_PNG_BASE64}`, format: 'base64' }),
    pixelate: () => ({ data: `data:image/png;base64,${SAMPLE_PNG_BASE64}`, blockSize: 4 }),

    angle: () => ({ value: 180, from: 'deg', to: 'rad' }),
    basic_stats: () => ({ values: [1, 2, 3, 4, 5], ops: ['mean', 'median'] }),
    calculator: () => ({ expression: '2+2' }),
    combinatorics: () => ({ n: 5, k: 2, op: 'combination' }),
    complex: () => ({ re1: 1, im1: 2, re2: 3, im2: 4, op: 'add' }),
    correlation: () => ({ x: [1, 2, 3], y: [1, 2, 3], method: 'pearson' }),
    linear_regression: () => ({ x: [1, 2, 3], y: [2, 4, 6] }),
    matrix_ops: () => ({ operation: 'transpose', matrixA: '[[1,2],[3,4]]' }),
    number_theory: () => ({ a: 12, b: 18, op: 'gcd' }),
    percentage: () => ({ value: 25, total: 200, op: 'percent_of' }),
    polynomial: () => ({ coeffs: [1, 2, 3], op: 'evaluate', x: 2 }),
    probability: () => ({ dist: 'binomial_pmf', params: { n: 5, p: 0.5 }, x: 2 }),
    random: () => ({ op: 'integer', min: 1, max: 6, count: 3 }),
    rounding: () => ({ value: 3.14159, precision: 2, mode: 'round' }),
    sequence: () => ({ type: 'arithmetic', start: 1, diff: 2, count: 5 }),
    set_theory: () => ({ a: [1, 2, 3], b: [3, 4], op: 'union' }),
    statistics: () => ({ values: [1, 2, 3, 4, 5, 6], ops: ['quartiles'] }),
    trigonometry: () => ({ func: 'sin', angle: 90, unit: 'deg' }),
    unit_converter: () => ({ value: 1, from: 'km', to: 'm', category: 'length' }),
    vector: () => ({ a: [1, 2, 3], b: [4, 5, 6], op: 'dot_product' }),

    http_status: () => ({ code: 200 }),
    mac_lookup: () => ({ mac: '00:1A:2B:3C:4D:5E' }),

    chemical_formula: () => ({ formula: 'H2O', op: 'weight' }),
    distance_convert: () => ({ value: 1000, from: 'm', to: 'km' }),
    periodic_table: () => ({ query: 'O' }),
    pressure_convert: () => ({ value: 1, from: 'atm', to: 'Pa' }),
    scientific_notation: () => ({ value: 12345, direction: 'to_sci' }),
    si_prefix: () => ({ value: 1000, from: '', to: 'k' }),
    temperature_convert: () => ({ value: 0, from: 'C', to: 'F' }),
    weight_convert: () => ({ value: 1, from: 'kg', to: 'g' }),

    json_parser: () => ({ json: JSON.stringify({ a: 1, b: [2, 3] }), format: true }),
    timer: () => ({ operation: 'start', timerId: 'smoke' }),

    cpu_info: () => ({}),
    disk_info: () => ({ path: TEMP_DIR }),
    env_get: () => ({ key: 'PATH' }),
    memory_info: () => ({}),
    os_info: () => ({}),
    platform: () => ({}),
    process_info: () => ({}),
    sleep: () => ({ ms: 10 }),
    uptime: () => ({}),
    which: () => ({ command: 'node' }),

    escape: () => ({ text: '<tag>', mode: 'html', direction: 'encode' }),
    glob_match: () => ({ text: 'file.txt', pattern: '*.txt', caseSensitive: false }),
    indent: () => ({ text: 'line1\nline2', level: 2, char: ' ', op: 'add' }),
    line_sort: () => ({ text: 'b\na\nc', mode: 'alpha', caseSensitive: true }),
    slugify: () => ({ text: 'Hello World!', separator: '-', lowercase: true }),
    string_case: () => ({ text: 'hello world', format: 'camel' }),
    string_join: () => ({ parts: ['a', 'b', 'c'], delimiter: ', ', lastDelimiter: ' and ' }),
    string_length: () => ({ text: 'hello world', unit: 'words' }),
    string_pad: () => ({ text: 'hi', length: 5, side: 'end', char: '.' }),
    string_replace: () => ({ text: 'foo bar foo', search: 'foo', replace: 'baz', mode: 'global', caseSensitive: true }),
    string_reverse: () => ({ text: 'abc', mode: 'chars' }),
    string_similarity: () => ({ a: 'kitten', b: 'sitting', method: 'levenshtein' }),
    string_slice: () => ({ text: 'abcdef', start: 1, end: 4 }),
    string_split: () => ({ text: 'a,b,c', mode: 'delimiter', delimiter: ',' }),
    string_trim: () => ({ text: '  hello  ', mode: 'both' }),
    substring: () => ({ text: 'hello world', pattern: 'world', op: 'find' }),
    template: () => ({ template: 'Hello {{name}}', data: { name: 'Xro' } }),
    text_diff: () => ({ old: 'a b c', new: 'a b d', unit: 'word' }),
    text_wrap: () => ({ text: 'This is a long line to wrap', width: 10, indent: '' }),
    truncate: () => ({ text: 'This is a long sentence', maxLength: 10, ellipsis: '...' }),

    cache: () => ({ op: 'set', key: 'k', value: 'v', ttl: 1 }),
    compare: () => ({ a: '10', b: '2', type: 'number', op: 'gt' }),
    counter: () => ({ key: 'k', op: 'inc' }),
    debounce: () => ({ action: 'ping', wait: 10 }),
    deep_clone: () => ({ value: { a: 1, b: { c: 2 } } }),
    echo: () => ({ message: 'hello' }),
    id_generator: () => ({ length: 8, prefix: 'id_' }),
    json_schema: () => ({ data: { a: 1, b: 'x' }, title: 'Sample' }),
    morse_code: () => ({ text: 'SOS', direction: 'encode' }),
    object_path: () => ({ obj: { a: { b: 1 } }, path: 'a.b', op: 'get' }),
    roman_numeral: () => ({ value: '10', direction: 'to_roman' }),
    semver: () => ({ version: '1.2.3', op: 'parse' }),
    throttle: () => ({ ms: 10 }),
    type_check: () => ({ value: 123, op: 'is_number' }),
    validator: () => ({ value: 'test@example.com', type: 'email' }),

    cookie_parse: () => ({ cookies: 'a=1; b=2', direction: 'parse' }),
    html_to_text: () => ({ html: '<p>Hello <a href="https://example.com">link</a></p>', preserveLinks: true, preserveNewlines: true }),
    markdown_to_html: () => ({ markdown: '# Title\n\nHello **world**' }),
    mime_type: () => ({ value: '.html', direction: 'from_ext' }),
    screenshot: () => ({ url: 'https://example.com', width: 800, height: 600 }),
    url_encode: () => ({ value: 'a b', direction: 'encode', component: true }),
    url_parse: () => ({ url: 'https://example.com/path?x=1#hash' }),
    user_agent: () => ({ ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }),
  };

  if (cases[toolName]) {
    return cases[toolName]();
  }

  return buildDefaultParams(schema, ctx);
}

function buildDefaultParams(schema, ctx) {
  const params = {};
  const required = schema?.parameters?.required || [];
  const props = schema?.parameters?.properties || {};
  for (const key of required) {
    const prop = props[key] || {};
    params[key] = defaultValueFor(key, prop, ctx);
  }
  return Object.keys(params).length ? params : null;
}

function defaultValueFor(key, prop, ctx) {
  if (prop.enum && prop.enum.length > 0) return prop.enum[0];
  const type = Array.isArray(prop.type) ? prop.type[0] : prop.type;
  if (type === 'string') {
    if (key.includes('url')) return 'https://example.com';
    if (key.includes('path')) return ctx.sampleFile || TEMP_DIR;
    if (key.includes('json')) return JSON.stringify({ a: 1 });
    if (key.includes('yaml')) return 'a: 1\n';
    if (key.includes('xml')) return '<root></root>';
    if (key.includes('sql')) return 'select 1';
    if (key.includes('code')) return 'return 1;';
    if (key.includes('text') || key.includes('message') || key.includes('content')) return ctx.sampleText || 'test';
    if (key.includes('email')) return 'test@example.com';
    return 'test';
  }
  if (type === 'number') {
    if (key.includes('port')) return 80;
    if (key.includes('ms')) return 10;
    if (key.includes('count') || key.includes('length')) return 3;
    if (key.includes('rate')) return 5;
    return 1;
  }
  if (type === 'boolean') return true;
  if (type === 'array') return [1, 2];
  if (type === 'object') return { a: 1 };
  return 'test';
}

function getSkipReason(toolName, relPath) {
  if (skipByName.has(toolName)) return skipByName.get(toolName);
  if (networkToolFiles.has(relPath) && !includeNetwork) return 'network disabled (use --network)';
  if (secretTools.has(toolName)) {
    if (!includeUnsafe) return 'requires credentials (use --unsafe)';
    const envKeys = secretTools.get(toolName);
    const missing = envKeys.filter(k => !process.env[k]);
    if (missing.length > 0) return `missing env: ${missing.join(', ')}`;
  }
  return null;
}

async function run() {
  const tempFiles = await prepareTemp();
  const ctx = {
    ...tempFiles,
    sampleText: 'hello world sample text',
    sampleLongText: 'This is a longer text. It has multiple sentences. It should be summarized. The goal is to extract key sentences.',
    sampleEntityText: 'Email test@example.com, visit https://example.com, call +1 555 0100, #hashtag @user, date 2024-01-01.',
  };

  const toolFiles = (await listToolFiles(TOOLS_DIR)).sort();
  const results = [];

  for (const filePath of toolFiles) {
    const relPath = path.relative(ROOT, filePath);
    let ToolClass;
    try {
      ToolClass = require(filePath);
    } catch (err) {
      results.push({ status: 'fail', relPath, toolName: 'unknown', error: `require failed: ${err.message}` });
      log('fail', 'unknown', relPath, `require failed: ${err.message}`);
      continue;
    }

    let tool;
    try {
      tool = new ToolClass();
    } catch (err) {
      results.push({ status: 'fail', relPath, toolName: 'unknown', error: `init failed: ${err.message}` });
      log('fail', 'unknown', relPath, `init failed: ${err.message}`);
      continue;
    }

    const schema = tool.getSchema ? tool.getSchema() : { name: 'unknown', parameters: {} };
    const toolName = schema.name || 'unknown';
    const skipReason = getSkipReason(toolName, relPath);
    if (skipReason) {
      results.push({ status: 'skip', relPath, toolName, reason: skipReason });
      log('skip', toolName, relPath, skipReason);
      continue;
    }

    const params = getTestParams(toolName, relPath, schema, ctx);
    if (!params) {
      results.push({ status: 'skip', relPath, toolName, reason: 'no test params' });
      log('skip', toolName, relPath, 'no test params');
      continue;
    }

    try {
      const res = await tool.execute(params);
      if (res && typeof res === 'object' && res.success === false) {
        results.push({ status: 'fail', relPath, toolName, error: res.error || 'reported failure' });
        log('fail', toolName, relPath, res.error || 'reported failure');
      } else {
        results.push({ status: 'pass', relPath, toolName });
        log('pass', toolName, relPath);
      }
    } catch (err) {
      results.push({ status: 'fail', relPath, toolName, error: err.message });
      log('fail', toolName, relPath, err.message);
    }
  }

  const summary = results.reduce((acc, r) => {
    acc.total += 1;
    acc[r.status] += 1;
    return acc;
  }, { total: 0, pass: 0, fail: 0, skip: 0 });

  console.log('\nSummary');
  console.log(`Total: ${summary.total}`);
  console.log(`Passed: ${summary.pass}`);
  console.log(`Failed: ${summary.fail}`);
  console.log(`Skipped: ${summary.skip}`);

  if (summary.fail > 0) {
    const fails = results.filter(r => r.status === 'fail');
    console.log('\nFailures');
    for (const f of fails) {
      console.log(`- ${f.toolName} (${f.relPath}) - ${f.error}`);
    }
  }

  if (summary.skip > 0) {
    const skips = results.filter(r => r.status === 'skip');
    console.log('\nSkipped');
    for (const s of skips) {
      console.log(`- ${s.toolName} (${s.relPath}) - ${s.reason}`);
    }
  }
}

run().catch(err => {
  console.error(`Smoke run failed: ${err.message}`);
  process.exitCode = 1;
});
