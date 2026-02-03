import { waitForLocatorCount } from '../lib/utils.mjs';

export async function runLatestEventsVisible({ page }) {
  await page.getByTestId('sidebar-project-mock-project-1').click();
  await page.getByTestId('task-list-view').waitFor({ state: 'visible' });
  await page.getByText('Mock task 1').first().click();

  const scrollContainer = page.getByTestId('chat-scroll-container');
  await scrollContainer.waitFor({ state: 'visible' });
  const contentWrapper = page.getByTestId('chat-content-wrapper');
  await contentWrapper.waitFor({ state: 'visible' });

  const containerMetrics = await scrollContainer.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return {
      left: rect.left,
      clientLeft: el.clientLeft,
      clientWidth: el.clientWidth,
    };
  });
  const wrapperMetrics = await contentWrapper.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return { left: rect.left, right: rect.right };
  });
  const containerInnerLeft = containerMetrics.left + containerMetrics.clientLeft;
  const containerInnerRight = containerInnerLeft + containerMetrics.clientWidth;
  const leftInset = wrapperMetrics.left - containerInnerLeft;
  const rightInset = containerInnerRight - wrapperMetrics.right;
  const insetDelta = Math.abs(leftInset - rightInset);
  const insetTolerance = 2;
  if (insetDelta > insetTolerance) {
    throw new Error(
      `expected chat content to be horizontally centered (within ${insetTolerance}px), got leftInset=${leftInset.toFixed(2)}px rightInset=${rightInset.toFixed(2)}px`,
    );
  }
  await scrollContainer.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });

  const latestTurn = page.getByTestId('agent-turn-card').filter({ hasText: 'Progress update 3' }).first();
  await latestTurn.waitFor({ state: 'visible' });
  await latestTurn.scrollIntoViewIfNeeded();
  await latestTurn.getByTestId('agent-turn-toggle').click();

  const progressEvents = latestTurn.getByTestId('agent-turn-event').filter({ hasText: 'Progress update' });
  await waitForLocatorCount(progressEvents, 3, 20_000);

  const alignmentRow = progressEvents.first();
  const avatar = latestTurn.getByTestId('agent-turn-avatar');
  await avatar.waitFor({ state: 'visible' });
  const avatarBox = await avatar.boundingBox();
  if (!avatarBox) throw new Error('missing agent avatar bounding box');

  const firstSimpleEventAvatar = page.getByTestId('event-avatar').first();
  await firstSimpleEventAvatar.waitFor({ state: 'visible' });
  const firstSimpleEventAvatarBox = await firstSimpleEventAvatar.boundingBox();
  if (!firstSimpleEventAvatarBox) throw new Error('missing simple event icon bounding box');

  const icon = alignmentRow.getByTestId('activity-event-icon');
  const title = alignmentRow.getByTestId('activity-event-title');
  await icon.waitFor({ state: 'visible' });
  await title.waitFor({ state: 'visible' });
  const iconBox = await icon.boundingBox();
  const titleBox = await title.boundingBox();
  if (!iconBox) throw new Error('missing activity icon bounding box');
  if (!titleBox) throw new Error('missing activity title bounding box');

  const avatarCenterX = avatarBox.x + avatarBox.width / 2;
  const firstSimpleEventCenterX = firstSimpleEventAvatarBox.x + firstSimpleEventAvatarBox.width / 2;
  const simpleEventDeltaX = Math.abs(avatarCenterX - firstSimpleEventCenterX);
  const simpleEventTolerance = 1.5;
  if (simpleEventDeltaX > simpleEventTolerance) {
    throw new Error(
      `expected simple event icon to align with card avatar center within ${simpleEventTolerance}px, got delta=${simpleEventDeltaX}px`,
    );
  }

  const iconCenterX = iconBox.x + iconBox.width / 2;
  const xDelta = Math.abs(avatarCenterX - iconCenterX);
  const xTolerance = 1.5;
  if (xDelta > xTolerance) {
    throw new Error(`expected activity icon to align with avatar center within ${xTolerance}px, got delta=${xDelta}px`);
  }

  const iconCenterY = iconBox.y + iconBox.height / 2;
  const titleCenterY = titleBox.y + titleBox.height / 2;
  const centerDelta = Math.abs(iconCenterY - titleCenterY);
  const centerTolerance = 1.5;
  if (centerDelta > centerTolerance) {
    throw new Error(`expected activity icon/title vertical alignment within ${centerTolerance}px, got delta=${centerDelta}px`);
  }

  const userActivityContent = page.getByTestId('activity-user-message-content');
  const agentActivityContent = page.getByTestId('activity-agent-message-content');
  if ((await userActivityContent.count()) > 0 && (await agentActivityContent.count()) > 0) {
    const lastUser = userActivityContent.last();
    const lastAgent = agentActivityContent.last();
    await lastUser.scrollIntoViewIfNeeded();
    await lastAgent.scrollIntoViewIfNeeded();

    const agentMarkdownRoot = lastAgent.locator(':scope > div').first();
    await agentMarkdownRoot.waitFor({ state: 'visible' });

    const userFontSize = await lastUser.evaluate((el) => getComputedStyle(el).fontSize);
    const agentFontSize = await agentMarkdownRoot.evaluate((el) => getComputedStyle(el).fontSize);
    if (userFontSize !== agentFontSize) {
      throw new Error(`expected user/agent message font size to match, got user=${userFontSize}, agent=${agentFontSize}`);
    }
  }

  await progressEvents.filter({ hasText: 'Progress update 2' }).first().waitFor({ state: 'visible' });
  const runningRow = progressEvents.filter({ hasText: 'Progress update 3' }).first();
  await runningRow.waitFor({ state: 'visible' });
  await runningRow.getByTestId('event-running-icon').waitFor({ state: 'visible' });
}
