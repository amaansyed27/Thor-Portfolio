import { expect, test } from '@playwright/test';

async function modelDiagnostics(page) {
  return page.evaluate(() => {
    const world = globalThis.__THOR_WORLD__;
    if (!world?.modelObject || !world?.camera) return null;
    world.scene.updateMatrixWorld(true);
    world.camera.updateMatrixWorld(true);

    let meshCount = 0;
    let visibleCorners = 0;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    world.modelObject.traverse((mesh) => {
      if (!mesh.isMesh || !mesh.geometry) return;
      meshCount += 1;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      const box = mesh.geometry.boundingBox;
      if (!box) return;
      const valuesX = [box.min.x, box.max.x];
      const valuesY = [box.min.y, box.max.y];
      const valuesZ = [box.min.z, box.max.z];
      for (const x of valuesX) {
        for (const y of valuesY) {
          for (const z of valuesZ) {
            const point = box.min.clone().set(x, y, z).applyMatrix4(mesh.matrixWorld).project(world.camera);
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
            if (point.x >= -1 && point.x <= 1 && point.y >= -1 && point.y <= 1 && point.z >= -1 && point.z <= 1) visibleCorners += 1;
          }
        }
      }
    });

    const overlapX = Math.max(0, Math.min(1, maxX) - Math.max(-1, minX));
    const overlapY = Math.max(0, Math.min(1, maxY) - Math.max(-1, minY));
    return {
      meshCount,
      visibleCorners,
      pixelWidth: overlapX * innerWidth * 0.5,
      pixelHeight: overlapY * innerHeight * 0.5,
      mountScale: world.modelMount.scale.x,
      modelReady: world.modelReady,
    };
  });
}

test('loads and visibly renders the supplied Stormbreaker through the full cinematic page', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('html[data-stormbreaker="loaded"]').waitFor({ timeout: 35_000 });
  await expect(page.locator('#loader')).toBeHidden({ timeout: 8_000 });
  await page.locator('#skip-intro').click({ force: true });
  await expect(page.locator('body')).not.toHaveClass(/is-cinematic/);
  await page.waitForTimeout(900);

  const diagnostics = await modelDiagnostics(page);
  expect(diagnostics).not.toBeNull();
  expect(diagnostics.modelReady).toBe(true);
  expect(diagnostics.meshCount).toBeGreaterThan(0);
  expect(diagnostics.visibleCorners).toBeGreaterThan(0);
  expect(diagnostics.pixelWidth).toBeGreaterThan(80);
  expect(diagnostics.pixelHeight).toBeGreaterThan(120);
  expect(diagnostics.mountScale).toBeGreaterThan(0);

  await page.screenshot({ path: 'artifacts/screens/hero-stormbreaker.png', fullPage: false });

  await page.evaluate(() => window.scrollTo(0, document.querySelector('#origin').offsetTop + innerHeight * 0.25));
  await page.waitForTimeout(900);
  expect((await modelDiagnostics(page)).visibleCorners).toBeGreaterThan(0);
  await page.screenshot({ path: 'artifacts/screens/origin-scroll.png', fullPage: false });

  await page.evaluate(() => window.scrollTo(0, document.querySelector('#sagas').offsetTop + innerHeight * 1.6));
  await page.waitForTimeout(1200);
  const transform = await page.locator('.sagas__track').evaluate((element) => getComputedStyle(element).transform);
  expect(transform).not.toBe('none');
  await page.screenshot({ path: 'artifacts/screens/pinned-saga.png', fullPage: false });

  await page.locator('#contact').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  const contactTitle = await page.locator('#contact h2').boundingBox();
  expect(contactTitle).not.toBeNull();
  expect(contactTitle.width).toBeGreaterThan(contactTitle.height * 1.5);
  await page.screenshot({ path: 'artifacts/screens/contact-finale.png', fullPage: false });

  expect(pageErrors).toEqual([]);
});
