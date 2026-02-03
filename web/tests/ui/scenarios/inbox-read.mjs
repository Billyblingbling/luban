import { sleep, waitForDataAttribute } from '../lib/utils.mjs';

export async function runInboxRead({ page }) {
  await page.getByTestId('nav-inbox-button').click();
  await page.getByTestId('inbox-view').waitFor({ state: 'visible' });

  const unreadRows = page.locator('[data-testid^="inbox-notification-row-"][data-read="false"]');
  const start = Date.now();
  while (Date.now() - start < 20_000) {
    if ((await unreadRows.count()) > 0) break;
    await sleep(250);
  }
  const unreadCount = await unreadRows.count();
  if (unreadCount === 0) {
    throw new Error('expected at least one unread inbox notification');
  }

  const rowTestId = await unreadRows.first().getAttribute('data-testid');
  if (!rowTestId) throw new Error('expected inbox notification row to have a data-testid');
  const row = page.getByTestId(rowTestId);
  await row.waitFor({ state: 'visible' });
  await waitForDataAttribute(row, 'data-read', 'false', 20_000);

  await row.click();
  await row.waitFor({ state: 'visible' });
  await waitForDataAttribute(row, 'data-read', 'true', 20_000);
}
