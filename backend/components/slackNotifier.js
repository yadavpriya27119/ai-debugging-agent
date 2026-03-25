/**
 * Feature 1 — Slack Notifier
 * Sends rich Slack messages when errors are detected and PRs are opened.
 * Setup: https://api.slack.com/apps → Create App → Incoming Webhooks → Add to channel
 */

const { IncomingWebhook } = require('@slack/webhook');

function getWebhook() {
  if (!process.env.SLACK_WEBHOOK_URL) return null;
  return new IncomingWebhook(process.env.SLACK_WEBHOOK_URL);
}

/**
 * Notify when an error is first detected
 */
async function notifyErrorDetected({ errorType, errorMessage, filePath, lineNumber }) {
  const webhook = getWebhook();
  if (!webhook) return;

  try {
    await webhook.send({
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🚨 Production Error Detected', emoji: true },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Type:*\n\`${errorType}\`` },
            { type: 'mrkdwn', text: `*File:*\n\`${filePath || 'unknown'}:${lineNumber || '?'}\`` },
          ],
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*Message:*\n>${errorMessage?.substring(0, 200)}` },
        },
        {
          type: 'context',
          elements: [{ type: 'mrkdwn', text: '🤖 AI Debugging Agent is analyzing this error...' }],
        },
      ],
    });
    console.log('[Slack] Error notification sent.');
  } catch (err) {
    console.error('[Slack] Failed to send error notification:', err.message);
  }
}

/**
 * Notify when a PR is opened with the fix
 */
async function notifyPROpened({ errorType, filePath, confidenceScore, prUrl, prNumber, explanation, autoMerged }) {
  const webhook = getWebhook();
  if (!webhook) return;

  const confidenceEmoji = confidenceScore >= 80 ? '🟢' : confidenceScore >= 50 ? '🟡' : '🔴';
  const mergeText = autoMerged
    ? '✅ *Auto-merged* (confidence ≥ 95%)'
    : confidenceScore < 70
    ? '⚠️ *Low confidence — manual review strongly recommended*'
    : '👀 *Ready for review*';

  try {
    await webhook.send({
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🤖 Auto-Fix PR Opened', emoji: true },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Error Type:*\n\`${errorType}\`` },
            { type: 'mrkdwn', text: `*File:*\n\`${filePath || 'unknown'}\`` },
            { type: 'mrkdwn', text: `*Confidence:*\n${confidenceEmoji} ${confidenceScore}%` },
            { type: 'mrkdwn', text: `*PR:*\n<${prUrl}|#${prNumber}>` },
          ],
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*AI Explanation:*\n>${explanation?.substring(0, 300)}` },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: mergeText },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: '🔍 Review PR', emoji: true },
              url: prUrl,
              style: 'primary',
            },
          ],
        },
      ],
    });
    console.log('[Slack] PR notification sent.');
  } catch (err) {
    console.error('[Slack] Failed to send PR notification:', err.message);
  }
}

/**
 * Notify when pipeline fails
 */
async function notifyPipelineFailed({ errorType, errorMessage, reason }) {
  const webhook = getWebhook();
  if (!webhook) return;

  try {
    await webhook.send({
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '❌ Auto-Fix Pipeline Failed', emoji: true },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Error:*\n\`${errorType}\`` },
            { type: 'mrkdwn', text: `*Reason:*\n${reason}` },
          ],
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*Original Error:*\n>${errorMessage?.substring(0, 200)}` },
        },
        {
          type: 'context',
          elements: [{ type: 'mrkdwn', text: '⚠️ Manual investigation required.' }],
        },
      ],
    });
  } catch (err) {
    console.error('[Slack] Failed to send failure notification:', err.message);
  }
}

module.exports = { notifyErrorDetected, notifyPROpened, notifyPipelineFailed };
