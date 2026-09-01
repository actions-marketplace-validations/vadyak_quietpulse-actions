# QuietPulse Heartbeat for GitHub Actions

Monitor scheduled GitHub Actions workflows with QuietPulse heartbeat pings. If a cron workflow stops running, runs too late, or fails before sending its heartbeat, QuietPulse can alert you through Telegram or webhooks.

This action is useful for:

- nightly backups
- scheduled imports and exports
- billing, reports, and cleanup jobs
- data sync workflows
- repository maintenance tasks
- any workflow triggered by `on.schedule`

## Quick Start

Create a QuietPulse job, copy its ping URL, store it as a GitHub Actions secret, and send a heartbeat at the end of your scheduled workflow.

```yaml
name: Nightly Backup

on:
  schedule:
    - cron: '0 2 * * *'

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Backup database
        run: |
          pg_dump "$DATABASE_URL" > backup.sql

      - name: Send heartbeat to QuietPulse
        uses: vadyak/quietpulse-actions@v1
        with:
          ping_url: ${{ secrets.QUIETPULSE_PING_URL }}
```

## Setup

1. Create a QuietPulse account at [quietpulse.xyz](https://quietpulse.xyz).
2. Create a job for the scheduled workflow you want to monitor.
3. Copy the job's ping URL.
4. In your GitHub repository, go to **Settings -> Secrets and variables -> Actions**.
5. Add a repository secret named `QUIETPULSE_PING_URL`.
6. Use the action in the scheduled workflow that should report success.

Recommended secret value:

```text
https://quietpulse.xyz/ping/your-endpoint-token
```

The action masks the ping URL/token in logs before sending the request.

## Why Heartbeat Monitoring?

GitHub Actions already shows failed workflow runs, but scheduled workflows can still fail quietly:

- the schedule does not trigger
- the workflow is disabled after repository inactivity
- a job is cancelled before the important step runs
- a secret or dependency changes
- a workflow succeeds but the business-critical command never happened

QuietPulse watches for the expected heartbeat. If the heartbeat does not arrive within the job's configured interval and grace period, it sends an alert.

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `ping_url` | No | - | Full QuietPulse ping URL. Recommended. Store it in a GitHub Actions secret. |
| `endpoint_token` | No | - | Token from the end of the ping URL. Kept for compatibility with older workflows. |
| `timeout_seconds` | No | `10` | HTTP request timeout in seconds. |
| `grace_period_minutes` | No | `5` | Deprecated. Configure grace period in QuietPulse job settings. |

Set either `ping_url` or `endpoint_token`.

## Outputs

| Output | Description |
| --- | --- |
| `status` | Heartbeat result: `success`, `failed`, or `error`. |
| `http_status` | HTTP status returned by QuietPulse when available. |
| `message` | Success message when the heartbeat is delivered. |
| `error` | Error details when the heartbeat fails. |

## Examples

### Recommended: Store the Full Ping URL

```yaml
- name: Send heartbeat to QuietPulse
  uses: vadyak/quietpulse-actions@v1
  with:
    ping_url: ${{ secrets.QUIETPULSE_PING_URL }}
```

### Backward Compatible: Store Only the Token

```yaml
- name: Send heartbeat to QuietPulse
  uses: vadyak/quietpulse-actions@v1
  with:
    endpoint_token: ${{ secrets.QUIETPULSE_ENDPOINT_TOKEN }}
```

### Run the Heartbeat Even if Earlier Steps Fail

Use this when you want QuietPulse to receive a final signal from the workflow attempt and let GitHub Actions handle the failed job status.

```yaml
- name: Send heartbeat to QuietPulse
  if: always()
  uses: vadyak/quietpulse-actions@v1
  with:
    ping_url: ${{ secrets.QUIETPULSE_PING_URL }}
```

For strict "only successful completion counts" monitoring, place the heartbeat after the critical work and do not use `if: always()`.

### Check the Action Output

```yaml
- name: Send heartbeat to QuietPulse
  id: quietpulse
  uses: vadyak/quietpulse-actions@v1
  with:
    ping_url: ${{ secrets.QUIETPULSE_PING_URL }}

- name: Print heartbeat result
  run: echo "QuietPulse status: ${{ steps.quietpulse.outputs.status }}"
```

## Troubleshooting

| Issue | What to check |
| --- | --- |
| `Set either ping_url or endpoint_token` | Add `ping_url` or `endpoint_token` to the action inputs. |
| `Invalid QuietPulse ping URL` | Make sure the secret contains a full URL like `https://quietpulse.xyz/ping/...`. |
| `404` or `Endpoint not found` | Confirm the QuietPulse job still exists and the token is correct. |
| `403 Forbidden` | Regenerate the ping URL/token in QuietPulse and update the GitHub secret. |
| `429 Too Many Requests` | The job is pinging too often for the current plan. |
| Timeout | Increase `timeout_seconds` or check network availability from GitHub-hosted runners. |

## Security

- Store the ping URL or token in GitHub Actions secrets.
- Do not paste the ping URL directly into workflow YAML.
- This action masks the supplied `ping_url` and `endpoint_token` before logging.
- The action does not print the full ping URL.

## Related

- QuietPulse: <https://quietpulse.xyz>
- GitHub Actions schedule troubleshooting guide: <https://quietpulse.xyz/blog/github-actions-schedule-not-triggering-fix>
- GitHub Actions monitoring guide: <https://quietpulse.xyz/blog/github-actions-monitoring-cron-fail-alerts>

## License

MIT
