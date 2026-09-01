import * as fs from 'fs';
import * as os from 'os';
import axios from 'axios';

function escapeCommandValue(value: string): string {
  return value
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A');
}

function inputName(name: string): string {
  return `INPUT_${name.replace(/ /g, '_').toUpperCase()}`;
}

function getInput(name: string): string {
  return (process.env[inputName(name)] || '').trim();
}

function info(message: string): void {
  console.log(message);
}

function warning(message: string): void {
  console.log(`::warning::${escapeCommandValue(message)}`);
}

function setFailed(message: string): void {
  console.log(`::error::${escapeCommandValue(message)}`);
  process.exitCode = 1;
}

function setSecret(value: string): void {
  if (value) {
    console.log(`::add-mask::${escapeCommandValue(value)}`);
  }
}

function setOutput(name: string, value: string | number): void {
  const output = process.env.GITHUB_OUTPUT;
  const serialized = String(value);

  if (output) {
    const delimiter = `quietpulse_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    fs.appendFileSync(output, `${name}<<${delimiter}${os.EOL}${serialized}${os.EOL}${delimiter}${os.EOL}`);
  } else {
    console.log(`::set-output name=${name}::${escapeCommandValue(serialized)}`);
  }
}

function normalizePingUrl(input: string): string {
  try {
    const parsed = new URL(input);

    if (!parsed.pathname.includes('/ping/')) {
      throw new Error('Ping URL must include /ping/<token>');
    }

    return parsed.toString();
  } catch (error: any) {
    throw new Error(`Invalid QuietPulse ping URL: ${error.message}`);
  }
}

function buildPingUrl(): string {
  const pingUrl = getInput('ping_url');
  const endpointToken = getInput('endpoint_token');

  if (pingUrl) {
    setSecret(pingUrl);
    return normalizePingUrl(pingUrl);
  }

  if (!endpointToken) {
    throw new Error('Set either ping_url or endpoint_token');
  }

  setSecret(endpointToken);

  if (endpointToken.startsWith('http://') || endpointToken.startsWith('https://')) {
    warning('endpoint_token received a full URL. Prefer the ping_url input for full QuietPulse ping URLs.');
    setSecret(endpointToken);
    return normalizePingUrl(endpointToken);
  }

  const baseUrl = (process.env.QUIETPULSE_API_URL || 'https://quietpulse.xyz').replace(/\/+$/, '');
  return `${baseUrl}/ping/${encodeURIComponent(endpointToken)}`;
}

async function run() {
  try {
    const url = buildPingUrl();
    const timeoutSeconds = parseInt(getInput('timeout_seconds') || '10', 10);

    info('Pinging QuietPulse heartbeat endpoint');
    info(`Timeout: ${timeoutSeconds}s`);

    const response = await axios.get(url, {
      timeout: timeoutSeconds * 1000,
      headers: {
        'User-Agent': 'QuietPulse-GitHub-Action/1.0',
      },
    });

    if (response.status === 200) {
      info('Heartbeat sent successfully');
      setOutput('status', 'success');
      setOutput('message', 'Ping delivered to QuietPulse');
      setOutput('http_status', response.status);
      process.exit(0);
    } else {
      throw new Error(`Unexpected response status: ${response.status}`);
    }
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response) {
      setFailed(`QuietPulse ping failed: ${error.response.status} ${error.response.statusText}`);
      setOutput('status', 'failed');
      setOutput('http_status', error.response.status);
      setOutput('error', typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data));
    } else {
      setFailed(`QuietPulse ping error: ${error.message}`);
      setOutput('status', 'error');
      setOutput('error', error.message);
    }
    process.exit(1);
  }
}

run();
