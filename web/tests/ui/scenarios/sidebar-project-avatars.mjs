export async function runSidebarProjectAvatars({ page }) {
  const project = page.getByTestId('sidebar-project-mock-project-1');
  await project.waitFor({ state: 'visible' });

  const img = project.locator('img').first();
  await img.waitFor({ state: 'visible' });

  const box = await img.boundingBox();
  if (!box) throw new Error('missing sidebar project avatar bounding box');
  if (Math.round(box.width) !== 18 || Math.round(box.height) !== 18) {
    throw new Error(`expected sidebar project avatar to be 18x18, got ${box.width}x${box.height}`);
  }
}

