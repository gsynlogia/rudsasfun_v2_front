import { test, Page } from '@playwright/test';
const S='/Volumes/Backup_TM/projects/radsasfun_v2/cypress/screenshots-proof';
const TS=new Date().toISOString().replace(/[:.]/g,'-');
async function login(p:Page){await p.goto('/admin-panel/login');await p.locator('input#login').fill('sguzik');await p.locator('input#password').fill('Glob@l2026!');await p.locator('button[type="submit"]').click();await p.waitForURL(/\/admin-panel(?!\/login)/,{timeout:20000});}
const VIEWS=['camps','documents','transports','diets','promotions','protections','sources','cms','wiadomosci','settings','online-klienci'];
test('navy all', async ({page})=>{await login(page);await page.setViewportSize({width:1440,height:900});
  for(const v of VIEWS){
    try{await page.goto(`/admin-panel/${v}`);await page.waitForLoadState('domcontentloaded');await page.waitForTimeout(2200);
      await page.screenshot({path:`${S}/navy-${v}_${TS}.png`,clip:{x:0,y:0,width:1440,height:160}});
      console.log(`SHOT ${v} OK`);
    }catch(e){console.log(`SHOT ${v} ERR`, String(e).slice(0,80));}
  }
});
