import { test, expect } from '@playwright/test';
import { signIn, personas } from './helpers.mjs';

test('staged leads requires login and offers exact return path',async({page})=>{
  await page.goto('/staging/operator-leads/');
  await expect(page.locator('#lead-signin')).toBeVisible();
  await expect(page.locator('#operator-dashboard')).toBeHidden();
  await expect(page.locator('#lead-signin a')).toHaveAttribute('href','/log/?return=%2Fstaging%2Foperator-leads%2F');
  await expect(page.locator('#environment-notice')).toContainText('Synthetic data');
});
test('ordinary account cannot open staged lead data',async({page})=>{
  await signIn(page,personas.guardianSingle);
  await page.goto('/staging/operator-leads/');
  await expect(page.locator('#lead-access-status')).toContainText('Operator access required');
  await expect(page.locator('#operator-dashboard')).toBeHidden();
});
test('operator returns from login and loads staged data without changing Operator home',async({page})=>{
  await signIn(page,personas.operator);
  await page.goto('/log/?return=%2Fstaging%2Foperator-leads%2F');
  await expect(page).toHaveURL(/\/staging\/operator-leads\/$/);
  await expect(page.locator('#operator-dashboard')).toBeVisible();
  await expect(page.locator('#lead-error')).toBeHidden();
  await expect(page.locator('#lead-rows tr').first()).toBeVisible();
  await page.getByRole('button',{name:'Refresh leads'}).click();
  await expect(page.locator('#lead-error')).toBeHidden();
  await page.goto('/operator/');
  await expect(page.locator('#operator-dashboard')).toBeVisible();
  await expect(page.locator('#lead-lifecycle')).toHaveCount(0);
});
