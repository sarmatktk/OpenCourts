import {expect,type Locator,type Page} from '@playwright/test';

// Exercise the visible site picker rather than its hidden native form field.
export async function chooseOption(page:Page, trigger:Locator, label:string){
 await trigger.click();
 await page.getByRole('listbox').getByRole('option',{name:label,exact:true}).click();
 await expect(trigger).toHaveText(label);
 await expect(page.getByRole('listbox')).toHaveCount(0);
}
