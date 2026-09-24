import { test, expect } from '@playwright/test';

test.describe('BKLG-0219 paid recruitment landing page', () => {
  test('keeps one dominant conversion path and tags acquisition requests', async ({ page }) => {
    const requests=[];
    await page.route('**/functions/v1/public-acquisition-v2', async route => {
      const body=route.request().postDataJSON();
      requests.push(body);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok:true }) });
    });

    await page.goto('/join/recruit/');
    await expect(page.getByRole('heading',{name:'Make the practice hours feel like progress.'})).toBeVisible();
    await expect(page.locator('nav')).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Start free'})).toBeVisible();
    await expect(page.locator('input[name="email"]')).toHaveAttribute('type','email');
    await expect.poll(()=>requests.some(item=>item?.action==='view'&&item?.source==='PAID_RECRUITMENT')).toBe(true);

    const buttonBox=await page.getByRole('button',{name:'Start free'}).boundingBox();
    expect(buttonBox).not.toBeNull();
    expect(buttonBox.height).toBeGreaterThanOrEqual(48);
  });

  test('mobile presentation keeps the primary CTA usable', async ({ page }) => {
    await page.route('**/functions/v1/public-acquisition-v2', route => route.fulfill({ status:200, contentType:'application/json', body:'{"ok":true}' }));
    await page.setViewportSize({width:390,height:844});
    await page.goto('/join/recruit/');
    const form=page.locator('#dv-acquisition-v2-form');
    const button=page.getByRole('button',{name:'Start free'});
    await expect(form).toBeVisible();
    await expect(button).toBeVisible();
    const [formBox,buttonBox]=await Promise.all([form.boundingBox(),button.boundingBox()]);
    expect(formBox).not.toBeNull();
    expect(buttonBox).not.toBeNull();
    expect(buttonBox.width).toBeGreaterThanOrEqual(formBox.width-40);
    expect(buttonBox.height).toBeGreaterThanOrEqual(48);
  });
});
