export async function runActivityTerminalCommand({ page }) {
  await page.getByTestId('sidebar-project-mock-project-1').click();
  await page.getByTestId('task-list-view').waitFor({ state: 'visible' });
  await page.getByText('Mock task 2').first().click();

  await page.getByTestId('chat-scroll-container').waitFor({ state: 'visible' });

  await page.getByTestId('chat-mode-toggle').click();

  const cmdWithOutput = `echo terminal-smoke-${Date.now()}`;
  await page.getByTestId('chat-input').fill(cmdWithOutput);
  await page.getByTestId('chat-send').click();

  await page
    .getByTestId('activity-terminal-command')
    .filter({ hasText: cmdWithOutput })
    .first()
    .waitFor({ state: 'visible' });

  const cmdNoOutput = 'true';
  await page.getByTestId('chat-input').fill(cmdNoOutput);
  await page.getByTestId('chat-send').click();

  await page
    .getByTestId('activity-event')
    .filter({ hasText: `ran ${cmdNoOutput}` })
    .first()
    .waitFor({ state: 'visible' });
}

